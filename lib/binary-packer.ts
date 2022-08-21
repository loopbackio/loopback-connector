// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { createPromiseCallback } from './utils';
import msgpack from 'msgpack5';


/**
 * Create a new Packer instance that can be used to convert between JavaScript
 * objects and a binary representation in a Buffer.
 *
 * Compared to JSON, this encoding preserves the following JavaScript types:
 *  - Date
 */
class BinaryPacker {
  private _packer = msgpack({forceFloat64: true});

  encode(value: unknown, cb: Callback = createPromiseCallback()): Buffer {
    try {
      const data = this._packer.encode(value).slice();
      setImmediate(() => cb(null, data));
    } catch(err) {
      setImmediate(() => cb(err));
    }

    return cb.promise;
  }

  decode(value: Buffer, cb: Callback = createPromiseCallback()): unknown {
    try {
      const value = this._packer.decode(binary);
      setImmediate(function() {
        cb(null, value);
      });
    } catch (err) {
      setImmediate(function() {
        cb(err);
      });
    }
    return cb.promise;
  }
}
// /**
//  * Encode the provided value to a `Buffer`.
//  *
//  * @param {*} value Any value (string, number, object)
//  * @callback {Function} cb The callback to receive the parsed result.
//  * @param {Error} err
//  * @param {Buffer} data The encoded value
//  * @promise
//  */
// BinaryPacker.prototype.encode = function(value, cb) {
//   cb = cb || createPromiseCallback();
//   try {
//     // msgpack5 returns https://www.npmjs.com/package/bl instead of Buffer
//     // use .slice() to convert to a Buffer
//     const data = this._packer.encode(value).slice();
//     setImmediate(function() {
//       cb(null, data);
//     });
//   } catch (err) {
//     setImmediate(function() {
//       cb(err);
//     });
//   }
//   return cb.promise;
// };

/**
 * Decode the binary value back to a JavaScript value.
 * @param {Buffer} binary The binary input.
 * @callback {Function} cb The callback to receive the composed value.
 * @param {Error} err
 * @param {*} value Decoded value.
 * @promise
 */
BinaryPacker.prototype.decode = function(binary, cb) {
  cb = cb || createPromiseCallback();
  try {
    const value = this._packer.decode(binary);
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

function encodeDate(obj) {
  return new Buffer(obj.toISOString(), 'utf8');
}

function decodeDate(buf) {
  return new Date(buf.toString('utf8'));
}
