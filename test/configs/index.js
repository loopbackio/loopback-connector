var chai = require('chai');
var ModelBuilder = require('loopback-model/lib/model-builder').ModelBuilder;
var Schema = require('../..').Schema;
var should = require('should');

/*
if (!process.env.TRAVIS) {
  if (typeof __cov === 'undefined') {
    process.on('exit', function() {
      require('semicov').report();
    });
  }

  require('semicov').init('lib');
}
*/

Object.defineProperties(global, {
  getModelBuilder: {
    value: function() {
      return new ModelBuilder();
    }
  },
  getSchema: {
    value: function(connector, settings) {
      connector = connector || 'memory';
      return new Schema(connector, settings);
    }
  },
  expect: {
    value: chai.expect
  },
  should: {
    value: should
  }
});
