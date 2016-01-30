var DataSource = require('..').DataSource;
var testConnector = require('./mocks/sql-connector');

var ds = new DataSource({
  connector: testConnector,
  debug: true
});

describe('sql connector', function() {
  beforeEach(function() {
    ds.connector._tables = {};
    ds.connector._models = {};
    ds.createModel('m1', {});
  });

  it('automigrate all models', function(done) {
    ds.automigrate(function(err) {
      expect(ds.connector._tables).have.property('m1');
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
    ds.automigrate(['m1', 'm2'], function(err) {
      expect(err).to.be.an.instanceOf(Error);
      expect(ds.connector._tables).to.not.have.property('m1');
      expect(ds.connector._tables).to.not.have.property('m2');
      done();
    });
  });

});
