Object.defineProperties(exports, {
  test: {
    get: function() {
      return require('./test/common');
    }
  },
  version: {
    value: require('./package.json').version
  }
});

exports.Connector = require('./lib/connectors/base');
// Set up SqlConnector as an alias to SQLConnector
exports.SQLConnector = exports.SqlConnector = require('./lib/sql');
exports.ParameterizedSQL = exports.SQLConnector.ParameterizedSQL;
exports.Transaction = require('./lib/transaction');

exports.ModelBuilder = exports.LDL = require('loopback-model/lib/model-builder');
exports.DataSource = exports.Schema = require('./lib/datasource').DataSource;
exports.ModelBaseClass = require('loopback-model/lib/model');
exports.GeoPoint = require('loopback-model').Geo.GeoPoint;
exports.ValidationError = require('loopback-model/lib/validations').ValidationError;
