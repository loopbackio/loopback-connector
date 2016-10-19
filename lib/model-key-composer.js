// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var createPromiseCallback = require('./utils').createPromiseCallback;
var debug = require('debug')('loopback:connector:model-key-composer');
var g = require('strong-globalize')();

/**
 * Build a single key string from a tuple (modelName, key).
 *
 * This method is typically used by KeyValue connectors to build a single
 * key string for a given modelName+key tuple.
 *
 * @param {String} modelName
 * @param {String} key
 * @callback {Function} cb The callback to receive the composed value.
 * @param {Error} err
 * @param {String} composedKey
 * @promise
 */
exports.compose = function composeKeyFromModelNameAndKey(modelName, key, cb) {
  cb = cb || createPromiseCallback();

  // Escape model name to prevent collision
  //   'model' + 'foo:bar' --vs-- 'model:foo' + 'bar'
  var value = encodeURIComponent(modelName) + ':' + key;

  setImmediate(function() {
    cb(null, value);
  });
  return cb.promise;
};

var PARSE_KEY_REGEX = /^([^:]*):(.*)/;

/**
 * Parse a composed key string into a tuple (modelName, key).
 *
 * This method is typically used by KeyValue connectors to parse a composed
 * key string returned by SCAN/ITERATE method back to the expected
 * modelName+tuple key.
 *
 * @param {String} composed The composed key as returned by `composeKey`
 * @callback {Function} cb The callback to receive the parsed result.
 * @param {Error} err
 * @param {Object} result The result with properties `modelName` and `key`.
 * @promise
 */
exports.parse = function(composed, cb) {
  cb = cb || createPromiseCallback();

  var matchResult = composed.match(PARSE_KEY_REGEX);
  if (matchResult) {
    var result = {
      modelName: matchResult[1],
      key: matchResult[2],
    };
    setImmediate(function() {
      cb(null, result);
    });
  } else {
    debug('Invalid key - missing model-name prefix: %s', composed);
    var err = new Error(g.f(
      'Invalid key %j - missing model-name prefix',
      composed));
    err.code = 'NO_MODEL_PREFIX';
    setImmediate(function() {
      cb(err);
    });
  }
  return cb.promise;
};
