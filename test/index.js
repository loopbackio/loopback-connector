var main = require('..');
var pkgJson = require('../package.json');

describe('main', function() {
  it('should expose a version number', function() {
    main.version.should.equal(pkgJson.version);
  });
});
