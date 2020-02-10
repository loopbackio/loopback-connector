// Copyright IBM Corp. 2015,2020. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const assert = require('assert');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('loopback:connector:transaction');
const uuid = require('uuid');
const {createPromiseCallback} = require('./utils');

module.exports = Transaction;

/**
 * Create a new Transaction object
 * @param {Connector} connector The connector instance
 * @param {*} connection A connection to the DB
 * @constructor
 */
function Transaction(connector, connection) {
  this.connector = connector;
  this.connection = connection;
  EventEmitter.call(this);
}

util.inherits(Transaction, EventEmitter);

// Isolation levels
Transaction.SERIALIZABLE = 'SERIALIZABLE';
Transaction.REPEATABLE_READ = 'REPEATABLE READ';
Transaction.READ_COMMITTED = 'READ COMMITTED';
Transaction.READ_UNCOMMITTED = 'READ UNCOMMITTED';

Transaction.hookTypes = {
  BEFORE_COMMIT: 'before commit',
  AFTER_COMMIT: 'after commit',
  BEFORE_ROLLBACK: 'before rollback',
  AFTER_ROLLBACK: 'after rollback',
  TIMEOUT: 'timeout',
};

/**
 * Commit a transaction and release it back to the pool
 * @param cb
 * @returns {*}
 */
Transaction.prototype.commit = function(cb) {
  cb = cb || createPromiseCallback();
  if (cb.promise) {
    this.connector.commit(this.connection, cb);
    return cb.promise;
  } else {
    return this.connector.commit(this.connection, cb);
  }
};

/**
 * Rollback a transaction and release it back to the pool
 * @param cb
 * @returns {*|boolean}
 */
Transaction.prototype.rollback = function(cb) {
  cb = cb || createPromiseCallback();
  if (cb.promise) {
    this.connector.rollback(this.connection, cb);
    return cb.promise;
  } else {
    return this.connector.rollback(this.connection, cb);
  }
};

/**
 * Begin a new transaction
 * @param {Connector} connector The connector instance
 * @param {Object} [options] Options {isolationLevel: '...', timeout: 1000}
 * @param cb
 */
Transaction.begin = function(connector, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  cb = cb || createPromiseCallback();
  if (typeof options === 'string') {
    options = {isolationLevel: options};
  }
  const isolationLevel = options.isolationLevel || Transaction.READ_COMMITTED;
  assert(isolationLevel === Transaction.SERIALIZABLE ||
    isolationLevel === Transaction.REPEATABLE_READ ||
    isolationLevel === Transaction.READ_COMMITTED ||
    isolationLevel === Transaction.READ_UNCOMMITTED, 'Invalid isolationLevel');

  debug('Starting a transaction with options: %j', options);
  assert(typeof connector.beginTransaction === 'function',
    'beginTransaction must be function implemented by the connector');
  connector.beginTransaction(isolationLevel, function(err, connection) {
    if (err) {
      return cb(err);
    }
    let tx = connection;

    // When the connector and juggler node module have different version of this module as a dependency,
    // the transaction is not an instanceof Transaction.
    // i.e. (connection instanceof Transaction) == false
    // Check for existence of required functions and properties, instead of prototype inheritance.
    if (connection.connector == undefined || connection.connection == undefined ||
      connection.commit == undefined || connection.rollback == undefined) {
      tx = new Transaction(connector, connection);
    }
    // Set an informational transaction id
    tx.id = uuid.v1();
    // NOTE(lehni) Handling of transaction timeouts here only works with recent
    // versions of `loopback-datasource-juggler` which make its own handling of
    // timeouts conditional based on the absence of an already set `tx.timeout`,
    // see: https://github.com/strongloop/loopback-datasource-juggler/pull/1484
    if (options.timeout) {
      tx.timeout = setTimeout(function() {
        const context = {
          transaction: tx,
          operation: 'timeout',
        };
        tx.notifyObserversOf('timeout', context, function(err) {
          if (!err) {
            tx.rollback(function() {
              debug('Transaction %s is rolled back due to timeout', tx.id);
            });
          }
        });
      }, options.timeout);
    }
    cb(err, tx);
  });
  if (cb.promise) return cb.promise;
};

/**
 * Check whether a transaction has an active connection.
 */
Transaction.prototype.isActive = function() {
  return !!this.connection;
};
