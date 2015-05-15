/*
 * A mockup connector that extends SQL connector
 */
var util = require('util');
var SQLConnector = require('../../lib/sql');
var debug = require('debug')('loopback:connector:test-sql');

var transactionId = 0;

function MockTransaction(connector, name) {
  this.connector = connector;
  this.name = name;
  this.data = [];
}

MockTransaction.prototype.commit = function(cb) {
  var self = this;
  this.data.forEach(function(d) {
    self.connector.collection.data.push(d);
  });
  this.data = [];
  cb();
};

MockTransaction.prototype.rollback = function(cb) {
  this.data = [];
  cb();
};

exports.initialize = function initializeDataSource(dataSource, callback) {
  process.nextTick(function() {
    if (callback) {
      var connector = new TestConnector(dataSource.settings);
      connector.dataSource = dataSource;
      dataSource.connector = connector;
      callback(null, connector);
    }
  });
};

function TestConnector(settings) {
  SQLConnector.call(this, 'testdb', settings);
  this._tables = {};
  this.collection = {
    data: []
  };
}

util.inherits(TestConnector, SQLConnector);

TestConnector.prototype.escapeName = function(name) {
  return '`' + name + '`';
};

TestConnector.prototype.dbName = function(name) {
  return name.toUpperCase();
};

TestConnector.prototype.getPlaceholderForValue = function(key) {
  return '$' + key;
};

TestConnector.prototype.escapeValue = function(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return "'" + value + "'";
  }
  if (value == null) {
    return 'NULL';
  }
  if (typeof value === 'object') {
    return String(value);
  }
  return value;
};

TestConnector.prototype.toColumnValue = function(prop, val) {
  return val;
};

TestConnector.prototype._buildLimit = function(model, limit, offset) {
  if (isNaN(limit)) {
    limit = 0;
  }
  if (isNaN(offset)) {
    offset = 0;
  }
  if (!limit && !offset) {
    return '';
  }
  return 'LIMIT ' + (offset ? (offset + ',' + limit) : limit);
};

TestConnector.prototype.applyPagination =
  function(model, stmt, filter) {
    /*jshint unused:false */
    var limitClause = this._buildLimit(model, filter.limit,
      filter.offset || filter.skip);
    return stmt.merge(limitClause);
  };

TestConnector.prototype.escapeName = function(name) {
  return '`' + name + '`';
};

TestConnector.prototype.dbName = function(name) {
  return name.toUpperCase();
};

TestConnector.prototype.getPlaceholderForValue = function(key) {
  return '$' + key;
};

TestConnector.prototype.escapeValue = function(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return "'" + value + "'";
  }
  if (value == null) {
    return 'NULL';
  }
  if (typeof value === 'object') {
    return String(value);
  }
  return value;
};

TestConnector.prototype.toColumnValue = function(prop, val, escaping) {
  return escaping ? this.escapeValue(val) : val;
};

TestConnector.prototype._buildLimit = function(model, limit, offset) {
  if (isNaN(limit)) {
    limit = 0;
  }
  if (isNaN(offset)) {
    offset = 0;
  }
  if (!limit && !offset) {
    return '';
  }
  return 'LIMIT ' + (offset ? (offset + ',' + limit) : limit);
};

TestConnector.prototype.applyPagination =
  function(model, stmt, filter) {
    /*jshint unused:false */
    var limitClause = this._buildLimit(model, filter.limit,
      filter.offset || filter.skip);
    return stmt.merge(limitClause);
  };

TestConnector.prototype.dropTable = function(model, cb) {
  var err;
  var exists = model in this._tables;
  if (!exists) {
    err = new Error('Model doesn\'t exist: ' + model);
  } else {
    delete this._tables[model];
  }
  process.nextTick(function() {
    cb(err);
  });
};

TestConnector.prototype.createTable = function(model, cb) {
  var err;
  var exists = model in this._tables;
  if (exists) {
    err = new Error('Model already exists: ' + model);
  } else {
    this._tables[model] = model;
  }
  process.nextTick(function() {
    cb(err);
  });
};

TestConnector.prototype.getInsertedId = function(model, info) {
  return info;
};

TestConnector.prototype.fromColumnValue = function(propertyDef, value) {
  return value;
};

TestConnector.prototype.beginTransaction = function(isolationLevel, cb) {
  var name = 'tx_' + transactionId++;
  cb(null, new MockTransaction(this, name));
};

TestConnector.prototype.commit = function(tx, cb) {
  tx.commit(cb);
};

TestConnector.prototype.rollback = function(tx, cb) {
  tx.rollback(cb);
};

TestConnector.prototype.executeSQL = function(sql, params, options, callback) {
  var transaction = options.transaction;
  if (transaction && transaction.connector === this && transaction.connection) {
    if (sql.indexOf('INSERT') === 0) {
      transaction.connection.data.push({title: 't1', content: 'c1'});
      debug('INSERT', transaction.connection.data, sql,
        transaction.connection.name);
      callback(null, 1);
    }
    else {
      debug('SELECT', transaction.connection.data, sql,
        transaction.connection.name);
      callback(null, transaction.connection.data);
    }
  } else {
    if (sql.indexOf('INSERT') === 0) {
      this.collection.data.push({title: 't1', content: 'c1'});
      debug('INSERT', this.collection.data, sql);
      callback(null, 1);
    } else {
      debug('SELECT', this.collection.data, sql);
      callback(null, this.collection.data);
    }
  }
};
