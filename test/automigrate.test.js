// Copyright IBM Corp. 2014,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const expect = require('chai').expect;
const testConnector = require('./connectors/test-sql-connector');

const juggler = require('loopback-datasource-juggler');
const ds = new juggler.DataSource({
  connector: testConnector,
  debug: true,
});

describe('sql connector', function() {
  beforeEach(function() {
    ds.connector._tables = {};
    ds.connector._models = {};
    ds.createModel('m1', {});
    ds.createModel('m2', {});
  });

  it('automigrate all models', function(done) {
    ds.automigrate(function(err) {
      expect(ds.connector._tables).have.property('m1');
      expect(ds.connector._tables).have.property('m2');
      done(err);
    });
  });

  it('automigrate one model', function(done) {
    ds.automigrate('m1', function(err) {
      expect(ds.connector._tables).have.property('m1');
      done(err);
    });
  });

  it('automigrate one or more models in an array', function(done) {
    ds.automigrate(['m1'], function(err) {
      expect(ds.connector._tables).have.property('m1');
      done(err);
    });
  });

  it('automigrate reports errors for models not attached', function(done) {
    ds.automigrate(['m1', 'm3'], function(err) {
      expect(err).to.be.an.instanceOf(Error);
      expect(ds.connector._tables).to.not.have.property('m1');
      expect(ds.connector._tables).to.not.have.property('m3');
      done();
    });
  });

  it('automigrate tables in series', function(done) {
    ds.automigrate(['m1', 'm2'], function(err) {
      expect(Object.keys(ds.connector._tables)).to.deep.equal(['m1', 'm2']);
      done();
    });
  });
});
