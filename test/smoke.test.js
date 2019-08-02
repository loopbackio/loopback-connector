// Copyright IBM Corp. 2014,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const assert = require('assert');
const connector = require('../');

describe('loopback-connector', function() {
  it('exports Connector', function() {
    assert(connector.Connector);
  });

  it('exports SqlConnector', function() {
    assert(connector.SqlConnector);
  });

  it('exports SQLConnector', function() {
    assert(connector.SQLConnector);
  });

  it('creates aliases to Connector.prototype.execute', function() {
    assert.equal(connector.Connector.prototype.execute,
      connector.Connector.prototype.query);
    assert.equal(connector.Connector.prototype.execute,
      connector.Connector.prototype.command);
  });

  it('creates aliases to SQLConnector.prototype.execute', function() {
    assert.equal(connector.SQLConnector.prototype.execute,
      connector.SQLConnector.prototype.query);
    assert.equal(connector.SQLConnector.prototype.execute,
      connector.SQLConnector.prototype.command);
  });
});
