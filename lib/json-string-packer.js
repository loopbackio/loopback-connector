// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const createPromiseCallback = require('./utils').createPromiseCallback;

module.exports = JSONStringPacker;

const ISO_DATE_REGEXP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

/**
 * Create a new Packer instance that can be used to convert between JavaScript
 * objects and a JsonString representation in a String.
 *
 * @param {String} encoding Buffer encoding refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
 */
function JSONStringPacker(encoding) {
  this.encoding = encoding || 'base64';
}

/**
 * Encode the provided value to a `JsonString`.
 *
 * @param {*} value Any value (string, number, object)
 * @callback {Function} cb The callback to receive the parsed result.
 * @param {Error} err
 * @param {Buffer} data The encoded value
 * @promise
 */
JSONStringPacker.prototype.encode = function(value, cb) {
  const encoding = this.encoding;

  cb = cb || createPromiseCallback();
  try {
    const data = JSON.stringify(value, function(key, value) {
      if (Buffer.isBuffer(this[key])) {
        return {
          type: 'Buffer',
          data: this[key].toString(encoding),
        };
      } else {
        return value;
      }
    });

    setImmediate(function() {
      cb(null, data);
    });
  } catch (err) {
    setImmediate(function() {
      cb(err);
    });
  }
  return cb.promise;
};

/**
 * Decode the JsonString value back to a JavaScript value.
 * @param {String} jsonString The JsonString input.
 * @callback {Function} cb The callback to receive the composed value.
 * @param {Error} err
 * @param {*} value Decoded value.
 * @promise
 */
JSONStringPacker.prototype.decode = function(jsonString, cb) {
  const encoding = this.encoding;

  cb = cb || createPromiseCallback();
  try {
    const value = JSON.parse(jsonString, function(k, v) {
      if (v && v.type && v.type === 'Buffer') {
        return new Buffer(v.data, encoding);
      }

      if (ISO_DATE_REGEXP.exec(v)) {
        return new Date(v);
      }

      return v;
    });

    setImmediate(function() {
      cb(null, value);
    });
  } catch (err) {
    setImmediate(function() {
      cb(err);
    });
  }
  return cb.promise;
};
