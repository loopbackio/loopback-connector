var _hasOwnProp = Object.prototype.hasOwnProperty;

/**
 * Object.assign polyfill
 */
var assign = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (_hasOwnProp.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

exports.assign = assign;
