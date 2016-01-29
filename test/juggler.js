var metadata = require('../package.json');
var project = require('..');
var should = require('./init.js');

describe('juggler', function() {
  it('should expose a version number', function() {
    project.version.should.equal(metadata.version);
  });
});
