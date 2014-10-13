/*
 * A mockup connector that extends SQL connector
 */
var util = require('util');
var SqlConnector = require('../../lib/sql');

exports.initialize = function initializeDataSource(dataSource, callback) {
  process.nextTick(function() {
    if(callback) {
      var connector = new TestConnector();
      connector.dataSource = dataSource;
      dataSource.connector = connector;
      callback(null, connector);
    }
  });
};

function TestConnector() {
  SqlConnector.apply(this, [].slice.call(arguments));
  this._tables = {};
}

util.inherits(TestConnector, SqlConnector);

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
