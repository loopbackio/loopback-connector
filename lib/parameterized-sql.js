// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
var assert = require('assert');
var PLACEHOLDER = '?';

module.exports = ParameterizedSQL;

/**
 * A class for parameterized SQL clauses
 * @param {String|Object} sql The SQL clause. If the value is a string, treat
 * it as the template using `?` as the placeholder, for example, `(?,?)`. If
 * the value is an object, treat it as {sql: '...', params: [...]}
 * @param {Array} params An array of parameter values. The length should match the
 * number of placeholders in the template
 * @returns {ParameterizedSQL} A new instance of ParameterizedSQL
 * @class
 */
function ParameterizedSQL(sql, params) {
  if (!(this instanceof ParameterizedSQL)) {
    return new ParameterizedSQL(sql, params);
  }
  sql = sql || '';
  if (arguments.length === 1 && typeof sql === 'object') {
    this.sql = sql.sql;
    this.params = sql.params || [];
  } else {
    this.sql = sql;
    this.params = params || [];
  }
  assert(typeof this.sql === 'string', 'sql must be a string');
  assert(Array.isArray(this.params), 'params must be an array');

  var parts = this.sql.split(PLACEHOLDER);
  assert(parts.length - 1 === this.params.length,
    'The number of ? (' + (parts.length - 1) +
    ') in the sql (' + this.sql + ') must match the number of params (' +
    this.params.length +
         ') ' + this.params);
  this.collapse();
}

/**
 * Takes a tree of ParameterizedSQL objects (where some parameter values
 * are other ParameterizedSQL) and reduce it to a single ParameterizedSQL
 * object, by splicing params and sql together
 * @returns {ParameterizedSQL} The current instance
 */

ParameterizedSQL.prototype.collapse = function collapse() {
  var sfrom = 0;
  var sidx = -1;
  var sqlOut = '';
  var pOut = [];
  for (var pidx = 0; pidx < this.params.length; pidx++) {
    var p = this.params[pidx];
    sidx = this.sql.indexOf(PLACEHOLDER, sidx + 1);
    if (!(p instanceof ParameterizedSQL && sidx > -1)) {
      pOut.push(p);
      continue;
    }
    p.collapse();
    // replace the original ? with the sub sql and splice in the parameters
    sqlOut += this.sql.substring(sfrom, sidx) + '(' + p.sql + ')';
    sfrom = sidx + 1;
    pOut = pOut.concat(p.params);
  }
  this.sql = sqlOut + this.sql.substring(sfrom);
  this.params = pOut;
  return this;
};

/**
 * Merge the parameterized sqls into the current instance
 * @param {Object|Object[]} ps A parametered SQL or an array of parameterized
 * SQLs
 * @param {String} [separator] Separator, default to ` `
 * @returns {ParameterizedSQL} The current instance
 */
ParameterizedSQL.prototype.merge = function(ps, separator) {
  if (Array.isArray(ps)) {
    return this.constructor.append(this,
      this.constructor.join(ps, separator), separator);
  } else {
    return this.constructor.append(this, ps, separator);
  }
};

ParameterizedSQL.prototype.toJSON = function() {
  return {
    sql: this.sql,
    params: this.params,
  };
};

/**
 * Append the statement into the current statement
 * @param {Object} currentStmt The current SQL statement
 * @param {Object} stmt The statement to be appended
 * @param {String} [separator] Separator, default to ` `
 * @returns {*} The merged statement
 */
ParameterizedSQL.append = function(currentStmt, stmt, separator) {
  currentStmt = (currentStmt instanceof ParameterizedSQL) ?
    currentStmt : new ParameterizedSQL(currentStmt);
  stmt = (stmt instanceof ParameterizedSQL) ? stmt :
    new ParameterizedSQL(stmt);
  separator = typeof separator === 'string' ? separator : ' ';
  if (currentStmt.sql) {
    currentStmt.sql += separator;
  }
  if (stmt.sql) {
    currentStmt.sql += stmt.sql;
  }
  currentStmt.params = currentStmt.params.concat(stmt.params);
  return currentStmt;
};

/**
 * Join multiple parameterized SQLs into one
 * @param {Object[]} sqls An array of parameterized SQLs
 * @param {String} [separator] Separator, default to ` `
 * @returns {ParameterizedSQL}
 */
ParameterizedSQL.join = function(sqls, separator) {
  assert(Array.isArray(sqls), 'sqls must be an array');
  var ps = new ParameterizedSQL('', []);
  for (var i = 0, n = sqls.length; i < n; i++) {
    ParameterizedSQL.append(ps, sqls[i], separator);
  }
  return ps.collapse();
};

ParameterizedSQL.PLACEHOLDER = PLACEHOLDER;
