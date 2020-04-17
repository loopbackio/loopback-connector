// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
/*
 * A mockup connector that extends NoSQL/SQL connector
 * to check property name mapping.
 */
const util = require('util');
const Connector = require('../../lib/connector');
const debug = require('debug')('loopback:connector:test-connector');

exports.initialize = function initializeDataSource(dataSource, callback) {
  process.nextTick(function() {
    if (callback) {
      const connector = new TestConnector(dataSource.settings);
      connector.dataSource = dataSource;
      dataSource.connector = connector;
      callback(null, connector);
    }
  });
};

function TestConnector(settings) {
  Connector.call(this, 'testdb', settings);
  this._tables = {};
  this.data = {};
}

util.inherits(TestConnector, Connector);

TestConnector.prototype.dbName = function(name) {
  return name.toUpperCase();
};
