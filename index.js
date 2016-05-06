// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

exports.Connector = require('./lib/connector');
// Set up SqlConnector as an alias to SQLConnector
exports.SQLConnector = exports.SqlConnector = require('./lib/sql');
exports.ParameterizedSQL = exports.SQLConnector.ParameterizedSQL;
exports.Transaction = require('./lib/transaction');

