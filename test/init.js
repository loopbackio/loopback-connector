module.exports = require('should');

/*
 if (!process.env.TRAVIS) {
 if (typeof __cov === 'undefined') {
 process.on('exit', function () {
 require('semicov').report();
 });
 }

 require('semicov').init('lib');
 }
 */

var ModelBuilder = require('loopback-model/lib/model-builder').ModelBuilder;
var Schema = require('../').Schema;

if (!('getSchema' in global)) {
  global.getSchema = function (connector, settings) {
    return new Schema(connector || 'memory', settings);
  };
}

if (!('getModelBuilder' in global)) {
  global.getModelBuilder = function () {
    return new ModelBuilder();
  };
}
