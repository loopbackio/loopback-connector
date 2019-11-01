// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const composer = require('../lib/model-key-composer');
const expect = require('chai').expect;
const Promise = require('bluebird');

describe('ModelKeyComposer', function() {
  describe('compose()', function() {
    it('honours the key', function() {
      return Promise.all([
        composer.compose('Car', 'vin'),
        composer.compose('Car', 'name'),
      ]).spread(function(key1, key2) {
        expect(key1).to.not.equal(key2);
      });
    });

    it('honours the model name', function() {
      return Promise.all([
        composer.compose('Product', 'name'),
        composer.compose('Category', 'name'),
      ]).spread(function(key1, key2) {
        expect(key1).to.not.equal(key2);
      });
    });

    it('encodes values', function() {
      // This test is based on the knowledge that we are using ':' separator
      // when building the composed string
      return Promise.all([
        composer.compose('a', 'b:c'),
        composer.compose('a:b', 'c'),
      ]).spread(function(key1, key2) {
        expect(key1).to.not.equal(key2);
      });
    });

    it('supports invocation with a callback', function(done) {
      composer.compose('Car', 'vin', done);
    });
  });

  describe('parse()', function() {
    it('decodes valid value', function() {
      return composer.compose('Car', 'vin')
        .then(function(data) {
          return composer.parse(data);
        })
        .then(function(parsed) {
          expect(parsed).to.eql({
            modelName: 'Car',
            key: 'vin',
          });
        });
    });

    it('handles invalid values', function() {
      return composer.parse('invalid').then(
        function onSuccess() {
          throw new Error('composer.parse() should have failed');
        },
        function onError(err) {
          expect(err).to.have.property('code', 'NO_MODEL_PREFIX');
        },
      );
    });

    it('supports invocation with a callback', function(done) {
      composer.compose('Car', 'vin', function(err, key) {
        if (err) return done(err);
        composer.parse(key, function(err, parsed) {
          if (err) return done(err);
          expect(parsed).to.eql({
            modelName: 'Car',
            key: 'vin',
          });
          done();
        });
      });
    });
  });
});
