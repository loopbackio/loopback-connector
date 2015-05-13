/*
 * A mockup connector that extends SQL connector
 */
var util = require('util');
var SQLConnector = require('../../lib/sql');

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

TestConnector.prototype.executeSQL = function(sql, params, options, callback) {
  callback(null, []);
};
