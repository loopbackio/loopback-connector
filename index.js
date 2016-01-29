exports.Connector = require('./lib/connector');
// Set up SqlConnector as an alias to SQLConnector
exports.SQLConnector = exports.SqlConnector = require('./lib/sql');
exports.ParameterizedSQL = exports.SQLConnector.ParameterizedSQL;
exports.Transaction = require('./lib/transaction');

exports.ModelBuilder = exports.LDL = require('loopback-model/lib/model-builder');
exports.DataSource = exports.Schema = require('./lib/datasource.js').DataSource;
exports.ModelBaseClass = require('loopback-model/lib/model');
exports.GeoPoint = require('loopback-model').Geo.GeoPoint;
exports.ValidationError = require('loopback-model/lib/validations').ValidationError;

Object.defineProperty(exports, 'version', {
  get: function() {return require('./package.json').version;}
});

var commonTest = './test/common_test';
Object.defineProperty(exports, 'test', {
  get: function() {return require(commonTest);}
});
