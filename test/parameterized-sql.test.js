// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
var expect = require('chai').expect;
var SQLConnector = require('../lib/sql');
var ParameterizedSQL = SQLConnector.ParameterizedSQL;

/* eslint-disable one-var */
var connector;
var Customer;
/* eslint-enable one-var */

describe('ParameterizedSQL functionality', function() {
  it('normalizes a SQL statement from string', function() {
    var sql = 'SELECT * FROM `CUSTOMER`';
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql, params: []});
  });

  it('normalizes a SQL statement from object without params', function() {
    var sql = {sql: 'SELECT * FROM `CUSTOMER`'};
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: []});
  });

  it('normalizes a SQL statement from object with params', function() {
    var sql =
    {sql: 'SELECT * FROM `CUSTOMER` WHERE `NAME`=?', params: ['John']};
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: ['John']});
  });

  it('should throw if the statement is not a string or object', function() {
    expect(function() {
      /* jshint unused:false */
      var stmt = new ParameterizedSQL(true);
    }).to.throw('sql must be a string');
  });

  it('concats SQL statements', function() {
    var stmt1 = {sql: 'SELECT * from `CUSTOMER`'};
    var where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']});
  });

  it('concats string SQL statements', function() {
    var stmt1 = 'SELECT * from `CUSTOMER`';
    var where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']});
  });

  it('should throw if params does not match placeholders', function() {
    expect(function() {
      var stmt1 = 'SELECT * from `CUSTOMER`';
      var where = {sql: 'WHERE `NAME`=?', params: ['John', 'Mary']};
      stmt1 = ParameterizedSQL.append(stmt1, where);
    }).to.throw('must match the number of params');
  });

  it('should collapse trees of parameterized queries', function() {
    var sql1 = 'SELECT * from `CUSTOMER` WHERE `NAME` NOT IN ? AND `NAME` IN ?';
    var sql2 = 'SELECT `NAME` FROM `CUSTOMER` WHERE ID = ? and `DELETED_ON` IS NULL';
    var sql3 = 'SELECT `NAME` FROM `CUSTOMER` WHERE ID IN ?';
    var sql4 = 'SELECT `CUSTOMER_ID` FROM `SPECIAL_DATE` WHERE ' +
          'DATE=CURRENT_TIMESTAMP AND (`EVENTTYPE`=\'birthday\' OR 1=?)';
    var expectssql = 'SELECT * from `CUSTOMER` WHERE `NAME` NOT IN (' +
          sql2 + ') AND `NAME` IN (SELECT `NAME` FROM `CUSTOMER` WHERE ID IN (' +
          sql4 + '))';

    var p1 = new ParameterizedSQL({sql: sql2, params: [1]});
    var p2 = new ParameterizedSQL({sql: sql3, params: [
      new ParameterizedSQL({sql: sql4, params: [1]}),
    ]});
    var expectsparams = [1, 1];
    var expects = {
      sql: expectssql,
      params: expectsparams,
    };
    var stmt = new ParameterizedSQL({
      sql: sql1,
      params: [p1, p2],
    }).collapse();
    expect(stmt.toJSON()).to.eql(expects);
  });
});
