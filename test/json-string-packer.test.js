// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const JSONStringPacker = require('../lib/json-string-packer');
const expect = require('chai').expect;

describe('JSONStringPacker', function() {
  let packer;

  beforeEach(function createPacker() {
    packer = new JSONStringPacker();
  });

  describe('encode()', function() {
    it('supports invocation with a callback', function(done) {
      packer.encode('a-value', done);
    });
  });

  describe('decode()', function() {
    it('supports invocation with a callback', function(done) {
      packer.encode('a-value', function(err, jsonString) {
        if (err) return done(err);
        packer.decode(jsonString, function(err, result) {
          if (err) return done(err);
          expect(result).to.eql('a-value');
          done();
        });
      });
    });
  });

  describe('roundtrip', function() {
    const TEST_CASES = {
      String: 'a-value',
      Object: {a: 1, b: 2},
      Buffer: new Buffer([1, 2, 3]),
      Date: new Date('2016-08-03T11:53:03.470Z'),
      Integer: 12345,
      Float: 12.345,
      Boolean: false,
    };

    Object.keys(TEST_CASES).forEach(function(tc) {
      it('works for ' + tc + ' values', function() {
        const value = TEST_CASES[tc];
        return encodeAndDecode(value)
          .then(function(result) {
            expect(result).to.eql(value);
          });
      });
    });

    it('works for nested properties', function() {
      return encodeAndDecode(TEST_CASES)
        .then(function(result) {
          expect(result).to.eql(TEST_CASES);
        });
    });

    function encodeAndDecode(value) {
      return packer.encode(value)
        .then(function(binary) {
          return packer.decode(binary);
        });
    }
  });
});
