/*
 if (!process.env.TRAVIS) {
 var semicov = require('semicov');
 semicov.init('lib', 'LoopbackData');
 process.on('exit', semicov.report);
 }
 */

var groupName = false, EXT_EXP;
function it(should, test_case) {
  check_external_exports();
  if (groupName) {
    EXT_EXP[groupName][should] = test_case;
  } else {
    EXT_EXP[should] = test_case;
  }
}

global.it = it;

function context(name, tests) {
  check_external_exports();
  EXT_EXP[name] = {};
  groupName = name;
  tests({
    before: function (f) {
      it('setUp', f);
    },
    after: function (f) {
      it('tearDown', f);
    }
  });
  groupName = false;
}

global.context = context;

exports.init = function init(external_exports) {
  EXT_EXP = external_exports;
  if (external_exports.done) {
    external_exports.done();
  }
};

function check_external_exports() {
  if (!EXT_EXP) throw new Error(
    'Before run this, please ensure that ' +
      'require("spec_helper").init(exports); called');
}

