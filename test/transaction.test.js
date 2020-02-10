// Copyright IBM Corp. 2015,2020. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const Transaction = require('../index').Transaction;

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {expect} = chai;
const chaiAsPromised = require('chai-as-promised');
const testConnector = require('./connectors/test-sql-connector');

const juggler = require('loopback-datasource-juggler');
let db, Post, Review;
describe('transactions', function() {
  before(function(done) {
    db = new juggler.DataSource({
      connector: testConnector,
      debug: true,
    });
    db.once('connected', function() {
      Post = db.define('PostTX', {
        title: {type: String, length: 255, index: true},
        content: {type: String},
      });
      Review = db.define('ReviewTX', {
        author: String,
        content: {type: String},
      });
      Post.hasMany(Review, {as: 'reviews', foreignKey: 'postId'});
      done();
    });
  });

  let currentTx;
  let hooks = [];
  // Return an async function to start a transaction and create a post
  function createPostInTx(post, timeout) {
    return function(done) {
      // Transaction.begin(db.connector, Transaction.READ_COMMITTED,
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: timeout,
      },
      function(err, tx) {
        if (err) return done(err);
        expect(typeof tx.id).to.eql('string');
        hooks = [];
        tx.observe('before commit', function(context, next) {
          hooks.push('before commit');
          next();
        });
        tx.observe('after commit', function(context, next) {
          hooks.push('after commit');
          next();
        });
        tx.observe('before rollback', function(context, next) {
          hooks.push('before rollback');
          next();
        });
        tx.observe('after rollback', function(context, next) {
          hooks.push('after rollback');
          next();
        });
        currentTx = tx;
        Post.create(post, {transaction: tx, model: 'Post'},
          function(err, p) {
            if (err) {
              done(err);
            } else {
              p.reviews.create({
                author: 'John',
                content: 'Review for ' + p.title,
              }, {transaction: tx, model: 'Review'},
              function(err, c) {
                done(err);
              });
            }
          });
      });
    };
  }

  // Return an async function to find matching posts and assert number of
  // records to equal to the count
  function expectToFindPosts(where, count, inTx) {
    return function(done) {
      const options = {model: 'Post'};
      if (inTx) {
        options.transaction = currentTx;
      }
      Post.find({where: where}, options,
        function(err, posts) {
          if (err) return done(err);
          expect(posts.length).to.be.eql(count);
          // Make sure both find() and count() behave the same way
          Post.count(where, options,
            function(err, result) {
              if (err) return done(err);
              expect(result).to.be.eql(count);
              if (count) {
                // Find related reviews
                options.model = 'Review';
                // Please note the empty {} is required, otherwise, the options
                // will be treated as a filter
                posts[0].reviews({}, options, function(err, reviews) {
                  if (err) return done(err);
                  expect(reviews.length).to.be.eql(count);
                  done();
                });
              } else {
                done();
              }
            });
        });
    };
  }

  describe('commit', function() {
    const post = {title: 't1', content: 'c1'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should commit a transaction', function(done) {
      currentTx.commit(function(err) {
        expect(hooks).to.eql(['before commit', 'after commit']);
        done(err);
      });
    });

    it('should see the committed insert', expectToFindPosts(post, 1));

    it('should report error if the transaction is not active', function(done) {
      currentTx.commit(function(err) {
        expect(err).to.be.instanceof(Error);
        done();
      });
    });
  });

  describe('rollback', function() {
    before(function() {
      // Reset the collection
      db.connector.data = {};
    });

    const post = {title: 't2', content: 'c2'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should rollback a transaction', function(done) {
      currentTx.rollback(function(err) {
        expect(hooks).to.eql(['before rollback', 'after rollback']);
        done(err);
      });
    });

    it('should not see the rolledback insert', expectToFindPosts(post, 0));

    it('should report error if the transaction is not active', function(done) {
      currentTx.rollback(function(err) {
        expect(err).to.be.instanceof(Error);
        done();
      });
    });
  });

  describe('timeout', function() {
    const TIMEOUT = 50;
    before(function() {
      // Reset the collection
      db.connector.data = {};
    });

    const post = {title: 't3', content: 'c3'};
    beforeEach(createPostInTx(post, TIMEOUT));

    it('should report timeout', function(done) {
      // wait until the "create post" transaction times out
      setTimeout(runTheTest, TIMEOUT * 3);

      function runTheTest() {
        Post.find({where: {title: 't3'}}, {transaction: currentTx},
          function(err, posts) {
            expect(err).to.match(/transaction.*not active/);
            done();
          });
      }
    });

    it('should invoke the timeout hook', function(done) {
      currentTx.observe('timeout', function(context, next) {
        next();
        done();
      });

      // If the event is not fired quickly enough, then the test can
      // quickly fail - no need to wait full two seconds (Mocha's default)
      this.timeout(TIMEOUT * 3);
    });
  });

  describe('isActive', function() {
    it('returns true when connection is active', function(done) {
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: 1000,
      },
      function(err, tx) {
        if (err) return done(err);
        expect(tx.isActive()).to.equal(true);
        return done();
      });
    });
    it('returns false when connection is not active', function(done) {
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: 1000,
      },
      function(err, tx) {
        if (err) return done(err);
        delete tx.connection;
        expect(tx.isActive()).to.equal(false);
        return done();
      });
    });
  });

  describe('transaction instance', function() {
    function TestTransaction(connector, connection) {
      this.connector = connector;
      this.connection = connection;
    }
    Object.assign(TestTransaction.prototype, Transaction.prototype);
    TestTransaction.prototype.foo = true;
    function beginTransaction(isolationLevel, cb) {
      return cb(null, new TestTransaction(testConnector, {}));
    }

    it('should do nothing when transaction is like a Transaction', function(done) {
      testConnector.initialize(db, function(err, resultConnector) {
        resultConnector.beginTransaction = beginTransaction;
        Transaction.begin(resultConnector, Transaction.READ_COMMITTED,
          function(err, result) {
            if (err) done(err);
            expect(result).to.be.instanceof(TestTransaction);
            expect(result.foo).to.equal(true);
            done();
          });
      });
    });

    it('should create new instance when transaction is not like a Transaction',
      function(done) {
        testConnector.initialize(db, function(err, resultConnector) {
          resultConnector.beginTransaction = beginTransaction;
          delete TestTransaction.prototype.commit;
          Transaction.begin(resultConnector, Transaction.READ_COMMITTED,
            function(err, result) {
              if (err) done(err);
              expect(result).to.not.be.instanceof(TestTransaction);
              expect(result).to.be.instanceof(Transaction);
              expect(result.foo).to.equal(undefined);
              done();
            });
        });
      });
  });

  it('can return promise for commit', function() {
    const connectorObject = {};
    connectorObject.commit = function(connection, cb) {
      return cb(null, 'committed');
    };
    const transactionInstance = new Transaction(connectorObject, {});
    return expect(transactionInstance.commit()).to.eventually.equal('committed');
  });

  it('can return promise for rollback', function() {
    const connectorObject = {};
    connectorObject.rollback = function(connection, cb) {
      return cb(null, 'rolledback');
    };
    const transactionInstance = new Transaction(connectorObject, {});
    return expect(transactionInstance.rollback()).to.eventually.equal('rolledback');
  });

  it('can return promise for begin', function() {
    const connectorObject = {};
    connectorObject.beginTransaction = function(connection, cb) {
      return cb(null, 'begun');
    };

    return expect(
      Transaction.begin(connectorObject, ''),
    ).to.eventually.be.instanceOf(Transaction);
  });
});
