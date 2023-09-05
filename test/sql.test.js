// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const expect = require('chai').expect;
const SQLConnector = require('../lib/sql');
const ParameterizedSQL = SQLConnector.ParameterizedSQL;
const testConnector = require('./connectors/test-sql-connector');

const juggler = require('loopback-datasource-juggler');
const ds = new juggler.DataSource({
  connector: testConnector,
  debug: true,
});
/* eslint-disable one-var */
let connector;
let Customer;
let Order;
let Store;
/* eslint-enable one-var */

describe('sql connector', function() {
  before(function() {
    connector = ds.connector;
    connector._tables = {};
    connector._models = {};
    Customer = ds.createModel('customer',
      {
        name: {
          id: true,
          type: String,
          testdb: {
            column: 'NAME',
            dataType: 'VARCHAR',
            dataLength: 32,
          },
        }, middleName: {
          type: Boolean,
          name: 'middle_name',
          postgresql: {
            column: 'MIDDLENAME',
          },
        }, lastName: {
          type: Boolean,
          name: 'last_name',
          testdb: {
            column: 'LASTNAME',
          },
        }, vip: {
          type: Boolean,
          testdb: {
            column: 'VIP',
          },
        }, primaryAddress: {
          type: String,
          name: 'primary_address',
        }, token: {
          type: String,
          name: 'token',
          readOnly: true,
          testdb: {
            column: 'TOKEN',
          },
        },
        address: String,
      },
      {testdb: {table: 'CUSTOMER'}});
    Order = ds.createModel('order',
      {
        id: {
          id: true,
          generated: true,
          type: Number,
          testdb: {
            column: 'orderId',
            dataType: 'INTEGER',
          },
        }, des: {
          type: String,
          name: 'des',
          testdb: {
            column: 'description',
          },
        }, date: {
          type: Date,
        },
      },
      {testdb: {table: 'ORDER'}});
    Store = ds.createModel('store',
      {
        id: {
          id: true,
          type: String,
        },
        state: String,
      });
    Customer.hasMany(Order, {as: 'orders', foreignKey: 'customer_name'});
    Order.belongsTo(Customer, {as: 'customer', foreignKey: 'customer_name'});
    Order.belongsTo(Store, {as: 'store', foreignKey: 'store_id'});
    Store.hasMany(Order, {as: 'orders', foreignKey: 'store_id'});
    Store.hasMany(Customer, {
      as: 'customers',
      through: Order,
      foreignKey: 'store_id',
      keyThrough: 'customer_name',
    });
    Customer.belongsTo(Store, {as: 'favorite_store', foreignKey: 'favorite_store'});
    Store.hasMany(Customer, {as: 'customers_fav', foreignKey: 'favorite_store'});
  });

  // tests for column names mapping are moved to name-mapping.test.js

  it('should map table name', function() {
    const table = connector.table('customer');
    expect(table).to.eql('CUSTOMER');
  });

  it('should find column metadata', function() {
    const column = connector.columnMetadata('customer', 'name');
    expect(column).to.eql({
      column: 'NAME',
      dataType: 'VARCHAR',
      dataLength: 32,
    });
  });

  it('should map property name', function() {
    const prop = connector.propertyName('customer', 'NAME');
    expect(prop).to.eql('name');
  });

  it('should find escaped id column name', function() {
    const idCol = connector.idColumnEscaped('customer');
    expect(idCol).to.eql('`NAME`');
  });

  it('should find escaped table name', function() {
    const table = connector.tableEscaped('customer');
    expect(table).to.eql('`CUSTOMER`');
  });

  it('should find escaped column name', function() {
    const column = connector.columnEscaped('customer', 'vip');
    expect(column).to.eql('`VIP`');
  });

  it('should convert to escaped id column value', function() {
    const column = connector.idColumnValue('customer', 'John');
    expect(column).to.eql('John');
  });

  it('builds where', function() {
    const where = connector.buildWhere('customer', {name: 'John'});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME`=?',
      params: ['John'],
    });
  });

  it('builds where with null', function() {
    const where = connector.buildWhere('customer', {name: null});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` IS NULL',
      params: [],
    });
  });

  it('builds where with inq', function() {
    const where = connector.buildWhere('customer', {name: {inq: ['John', 'Mary']}});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` IN (?,?)',
      params: ['John', 'Mary'],
    });
  });

  it('builds where with or', function() {
    const where = connector.buildWhere('customer',
      {or: [{name: 'John'}, {name: 'Mary'}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE ((`NAME`=?) OR (`NAME`=?))',
      params: ['John', 'Mary'],
    });
  });

  it('builds where with and', function() {
    const where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {vip: true}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE ((`NAME`=?) AND (`VIP`=?))',
      params: ['John', true],
    });
  });

  it('builds where with a regexp string that does not have flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: '^J',
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: ['^J'],
    });
  });

  it('builds where with a regexp string that has flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: '^J/i',
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: ['^J/i'],
    });
  });

  it('builds where with a regexp literal that does not have flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/,
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: [/^J/],
    });
  });

  it('builds where with a regexp literal that has flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/i,
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: [/^J/i],
    });
  });

  it('builds where with a regexp object that does not have flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/),
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: [/^J/],
    });
  });

  it('builds where with a regexp object that has flags', function() {
    const where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/i),
      },
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `NAME` REGEXP ?',
      params: [new RegExp(/^J/i)],
    });
  });

  it('builds where with nesting and/or', function() {
    const where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {or: [{vip: true}, {address: null}]}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE ((`NAME`=?) AND (((`VIP`=?) OR (`ADDRESS` IS NULL))))',
      params: ['John', true],
    });
  });

  it('builds where and ignores invalid clauses in or', function() {
    const where = connector.buildWhere('customer', {
      name: 'icecream',
      or: [{notAColumnName: ''}, {notAColumnNameEither: ''}],
    });
    expect(where.sql).to.not.match(/ AND $/);
  });

  it('builds order by with one field', function() {
    const orderBy = connector.buildOrderBy('customer', 'name');
    expect(orderBy).to.eql('ORDER BY `NAME`');
  });

  it('builds order by with two fields', function() {
    const orderBy = connector.buildOrderBy('customer', ['name', 'vip']);
    expect(orderBy).to.eql('ORDER BY `NAME`,`VIP`');
  });

  it('builds order by with two fields and dirs', function() {
    const orderBy = connector.buildOrderBy('customer', ['name ASC', 'vip DESC']);
    expect(orderBy).to.eql('ORDER BY `NAME` ASC,`VIP` DESC');
  });

  it('builds fields for columns', function() {
    const fields = connector.buildFields('customer',
      {name: 'John', vip: true, unknown: 'Random'});
    expect(fields.names).to.eql(['`NAME`', '`VIP`']);
    expect(fields.columnValues[0].toJSON()).to.eql(
      {sql: '?', params: ['John']},
    );
    expect(fields.columnValues[1].toJSON()).to.eql(
      {sql: '?', params: [true]},
    );
  });

  it('builds fields for UPDATE without readOnlys', function() {
    const fields = connector.buildFieldsForReplace('customer', {
      middleName: '',
      lastName: 'Libert',
      vip: true,
      token: null,
      address: '1031 NW 7th Ave, Fort Lauderdale, Florida, United States',
      primaryAddress: '1031 NW 7th Ave, Fort Lauderdale, Florida, United States',
    });
    expect(fields.toJSON()).to.eql({
      sql: 'SET `middle_name`=?,`LASTNAME`=?,`VIP`=?,`primary_address`=?,`ADDRESS`=?',
      params: [
        '',
        'Libert',
        true,
        '1031 NW 7th Ave, Fort Lauderdale, Florida, United States',
        '1031 NW 7th Ave, Fort Lauderdale, Florida, United States',
      ],
    });
  });

  it('builds fields for UPDATE without ids', function() {
    const fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true});
    expect(fields.toJSON()).to.eql({
      sql: 'SET `VIP`=?',
      params: [true],
    });
  });

  it('builds fields for UPDATE with ids', function() {
    const fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true}, false);
    expect(fields.toJSON()).to.eql({
      sql: 'SET `NAME`=?,`VIP`=?',
      params: ['John', true],
    });
  });

  it('builds column names for SELECT', function() {
    const cols = connector.buildColumnNames('customer');
    expect(cols).to.eql('`NAME`,`middle_name`,`LASTNAME`,`VIP`,' +
      '`primary_address`,`TOKEN`,`ADDRESS`,`FAVORITE_STORE`');
  });

  it('builds column names with true fields filter for SELECT', function() {
    const cols = connector.buildColumnNames('customer', {fields: {name: true}});
    expect(cols).to.eql('`NAME`');
  });

  it('builds column names with false fields filter for SELECT', function() {
    const cols = connector.buildColumnNames('customer', {
      fields: {
        name: false,
        primaryAddress: false,
        lastName: false,
        token: false,
        middleName: false,
      },
    });
    expect(cols).to.eql('`VIP`,`ADDRESS`,`FAVORITE_STORE`');
  });

  it('builds column names with array fields filter for SELECT', function() {
    const cols = connector.buildColumnNames('customer', {fields: ['name']});
    expect(cols).to.eql('`NAME`');
  });

  it('builds DELETE', function() {
    const sql = connector.buildDelete('customer', {name: 'John'});
    expect(sql.toJSON()).to.eql({
      sql: 'DELETE FROM `CUSTOMER` WHERE `NAME`=$1',
      params: ['John'],
    });
  });

  it('builds UPDATE', function() {
    const sql = connector.buildUpdate('customer', {name: 'John'}, {vip: false});
    expect(sql.toJSON()).to.eql({
      sql: 'UPDATE `CUSTOMER` SET `VIP`=$1 WHERE `NAME`=$2',
      params: [false, 'John'],
    });
  });

  it('builds SELECT', function() {
    const sql = connector.buildSelect('customer', {
      order: 'name',
      limit: 5,
      where: {or: [{name: 'Top Cat'}, {address: 'Trash can'}], vip: true},
    });
    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT `NAME`,`middle_name`,`LASTNAME`,`VIP`,`primary_address`,' +
        '`TOKEN`,`ADDRESS`,`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` WHERE ((`NAME`=$1) OR (`ADDRESS`=$2)) ' +
        'AND `VIP`=$3 ORDER BY `NAME` LIMIT 5',
      params: ['Top Cat', 'Trash can', true],
    });
  });

  it('builds SELECT with where', function() {
    const sql = connector.buildSelect('customer',
      {order: 'name', limit: 5, where: {name: 'John'}});
    expect(sql.toJSON()).to.eql({
      sql: 'SELECT `NAME`,`middle_name`,`LASTNAME`,`VIP`,`primary_address`,`TOKEN`,' +
      '`ADDRESS`,`FAVORITE_STORE` FROM `CUSTOMER`' +
      ' WHERE `NAME`=$1 ORDER BY `NAME` LIMIT 5',
      params: ['John'],
    });
  });

  it('builds INSERT', function() {
    const sql = connector.buildInsert('customer', {name: 'John', vip: true});
    expect(sql.toJSON()).to.eql({
      sql: 'INSERT INTO `CUSTOMER`(`NAME`,`VIP`) VALUES($1,$2)',
      params: ['John', true],
    });
  });

  it('normalizes a SQL statement from string', function() {
    const sql = 'SELECT * FROM `CUSTOMER`';
    const stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql, params: []});
  });

  it('normalizes a SQL statement from object without params', function() {
    const sql = {sql: 'SELECT * FROM `CUSTOMER`'};
    const stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: []});
  });

  it('normalizes a SQL statement from object with params', function() {
    const sql =
    {sql: 'SELECT * FROM `CUSTOMER` WHERE `NAME`=?', params: ['John']};
    const stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: ['John']});
  });

  it('should throw if the statement is not a string or object', function() {
    expect(function() {
      /* jshint unused:false */
      const stmt = new ParameterizedSQL(true);
    }).to.throw('sql must be a string');
  });

  it('concats SQL statements', function() {
    let stmt1 = {sql: 'SELECT * from `CUSTOMER`'};
    const where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']},
    );
  });

  it('concats string SQL statements', function() {
    let stmt1 = 'SELECT * from `CUSTOMER`';
    const where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']},
    );
  });

  it('should throw if params does not match placeholders', function() {
    expect(function() {
      let stmt1 = 'SELECT * from `CUSTOMER`';
      const where = {sql: 'WHERE `NAME`=?', params: ['John', 'Mary']};
      stmt1 = ParameterizedSQL.append(stmt1, where);
    }).to.throw('must match the number of params');
  });

  it('should allow execute(sql, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER`', done);
  });

  it('should allow execute(sql, params, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER` WHERE `NAME`=$1',
      ['xyz'], done);
  });

  it('should allow execute(sql, params, options, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER` WHERE `NAME`=$1',
      ['xyz'], {transaction: true}, done);
  });

  it('should throw if params is not an array for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', 'xyz', function() {
      });
    }).to.throw('params must be an array');
  });

  it('should throw if options is not an object for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', [], 'xyz', function() {
      });
    }).to.throw('options must be an object');
  });

  it('should throw if callback is not a function for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', [], {}, 'xyz');
    }).to.throw('callback must be a function');
  });

  it('should invoke hooks', function(done) {
    const events = [];
    connector.observe('before execute', function(ctx, next) {
      expect(ctx.req.sql).be.a('string');
      expect(ctx.req.params).be.a('array');
      events.push('before execute');
      next();
    });
    connector.observe('after execute', function(ctx, next) {
      expect(ctx.res).be.an('array');
      events.push('after execute');
      next();
    });
    Customer.find(function(err, results) {
      expect(events).to.eql(['before execute', 'after execute']);
      done(err, results);
    });
  });

  it('should throw if the event listener limit is reached', function() {
    ds.connected = false;
    function runExecute() {
      return connector.execute('SELECT * FROM `CUSTOMER`', function(err) {
        throw err;
      });
    }

    for (let i = 0; i < 16; i++) {
      runExecute();
    }

    expect(function() { runExecute(); }).to.throw(
      'Event listener limit reached. ' +
        'Increase maxOfflineRequests value in datasources.json.',
    );
    ds.connected = true;
    ds.removeAllListeners(['connected']);
  });

  it('should not throw if the event listener limit is not reached', function() {
    ds.connected = false;
    function runExecute() {
      return connector.execute('SELECT * FROM `CUSTOMER`', function(err) {
        throw err;
      });
    }

    for (let i = 0; i < 15; i++) {
      runExecute();
    }

    expect(function() { runExecute(); }).to.not.throw();
    ds.connected = true;
  });

  it('should return null for INSERT multiple rows if multiInsertSupported is false',
    function() {
      connector.multiInsertSupported = false;
      const sql = connector.buildInsertAll('customer', [
        {name: 'Adam', middleName: 'abc', vip: true},
        {name: 'Test', middleName: null, vip: false},
      ]);
      // eslint-disable-next-line no-unused-expressions
      expect(sql).to.be.null;
    });

  it('should return null for INSERT multiple rows if multiInsertSupported not set',
    function() {
      const sql = connector.buildInsertAll('customer', [
        {name: 'Adam', middleName: 'abc', vip: true},
        {name: 'Test', middleName: null, vip: false},
      ]);
      // eslint-disable-next-line no-unused-expressions
      expect(sql).to.be.null;
    });
  it('builds INNER JOIN', function() {
    const sql = connector.buildJoins('customer', {orders: {where: {id: 10}}});
    expect(sql.toJSON()).to.eql({
      sql: 'INNER JOIN ( SELECT `CUSTOMER_NAME` FROM `ORDER` WHERE ' +
      '`orderId`=? ORDER BY `orderId` ) AS `ORDER` ON ' +
      '`CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME`',
      params: [10],
    });
  });
  it('builds SELECT with INNER JOIN (1:n relation)', function() {
    const sql = connector.buildSelect('customer', {
      where: {
        orders: {
          where: {
            date: {between: ['2015-01-01', '2015-01-31']},
          },
        },
      },
    });

    expect(sql.toJSON()).to.eql({
      sql: 'SELECT DISTINCT `NAME`,`middle_name`,`LASTNAME`,`VIP`,' +
      '`primary_address`,`TOKEN`,`ADDRESS`,`FAVORITE_STORE` FROM `CUSTOMER` ' +
      'INNER JOIN ( SELECT `CUSTOMER_NAME` FROM `ORDER` WHERE ' +
      '`DATE` BETWEEN $1 AND $2 ORDER BY `orderId` ) AS `ORDER` ' +
      'ON `CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME`  ORDER BY `NAME`',
      params: ['2015-01-01', '2015-01-31'],
    });
  });
  it('builds SELECT with INNER JOIN (n:n relation)', function() {
    const sql = connector.buildSelect('store', {
      where: {
        customers: {
          where: {
            vip: true,
          },
        },
      },
    });

    expect(sql.toJSON()).to.eql({
      sql: 'SELECT DISTINCT `ID`,`STATE` FROM `STORE` INNER JOIN' +
      ' ( SELECT `CUSTOMER_NAME`,`STORE_ID` FROM `ORDER` ' +
      'ORDER BY `orderId` ) AS `ORDER` ON `STORE`.`ID`=`ORDER`.`STORE_ID` ' +
      'INNER JOIN ( SELECT `NAME` FROM `CUSTOMER` WHERE ' +
      '`VIP`=$1 ORDER BY `NAME` ) AS `CUSTOMER` ON ' +
      '`ORDER`.`CUSTOMER_NAME`=`CUSTOMER`.`NAME`  ORDER BY `ID`',
      params: [true],
    });
  });

  context('when multiInsertSupported is true', function() {
    beforeEach(function() {
      connector.multiInsertSupported = true;
    });

    it('should build INSERT for multiple rows', function() {
      connector.multiInsertSupported = true;
      const sql = connector.buildInsertAll('customer', [
        {name: 'Adam', middleName: 'abc', vip: true},
        {name: 'Test', middleName: null, vip: false},
      ]);
      expect(sql.toJSON()).to.eql({
        sql:
      'INSERT INTO `CUSTOMER`(`NAME`,`middle_name`,`VIP`) VALUES ($1,$2,$3), ($4,$5,$6)',
        params: ['Adam', 'abc', true, 'Test', null, false],
      });
    });
    it('builds nested SELECTs', function() {
      const sql = connector.buildSelect('customer', {
        where: {
          orders: {
            where: {
              store: {
                where: {
                  state: 'NY',
                },
              },
            },
          },
        },
      });

      expect(sql.toJSON()).to.eql({
        sql: 'SELECT DISTINCT `NAME`,`middle_name`,`LASTNAME`,`VIP`,`primary_address`,' +
        '`TOKEN`,`ADDRESS`,`FAVORITE_STORE` FROM `CUSTOMER` ' +
        'INNER JOIN ( SELECT DISTINCT `CUSTOMER_NAME` FROM `ORDER` ' +
        'INNER JOIN ( SELECT `ID` FROM `STORE` WHERE `STATE`=$1 ' +
        'ORDER BY `ID` ) AS `STORE` ON `ORDER`.`STORE_ID`=`STORE`.`ID`  ' +
        'ORDER BY `orderId` ) AS `ORDER` ON `CUSTOMER`.`NAME`=`ORDER`.' +
        '`CUSTOMER_NAME`  ORDER BY `NAME`',
        params: ['NY'],
      });
    });
    it('builds count', function() {
      const sql = connector.buildCount('customer');
      expect(sql.toJSON()).to.eql({
        sql: 'SELECT count(*) as "cnt" FROM `CUSTOMER` ',
        params: [],
      });
    });
    it('builds count with WHERE', function() {
      const sql = connector.buildCount('customer', {name: 'John'});
      expect(sql.toJSON()).to.eql({
        sql: 'SELECT count(*) as "cnt" FROM `CUSTOMER` WHERE `NAME`=$1',
        params: ['John'],
      });
    });

    it('builds count with WHERE and JOIN', function() {
      const sql = connector.buildCount('customer', {
        name: 'John',
        orders: {
          where: {
            date: {between: ['2015-01-01', '2015-01-31']},
          },
        },
      });
      expect(sql.toJSON()).to.eql({
        sql: 'SELECT count(DISTINCT `NAME`) as "cnt" FROM `CUSTOMER` ' +
          'INNER JOIN ( SELECT `CUSTOMER_NAME` FROM `ORDER` WHERE ' +
          '`DATE` BETWEEN $1 AND $2 ORDER BY `orderId` ) AS `ORDER` ' +
          'ON `CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME` WHERE `NAME`=$3',
        params: ['2015-01-01', '2015-01-31', 'John'],
      });
    });

    context('getInsertedDataArray', function() {
      context('when id column is auto-generated', function() {
        it('should return back data with id column', function() {
          connector.multiInsertSupported = true;
          const insertedArr = connector.getInsertedDataArray('order', [1, 2], [
            {des: 'Description 1'},
            {des: 'Description 2'},
          ]);
          expect(insertedArr).to.eql([
            {id: 1, des: 'Description 1'},
            {id: 2, des: 'Description 2'},
          ]);
        });
      });
      context('when id column is not auto-generated', function() {
        it('should return back same data', function() {
          connector.multiInsertSupported = true;
          const insertedArr = connector.getInsertedDataArray('customer', [], [
            {name: 'Adam', middleName: 'abc', vip: true},
            {name: 'Test', middleName: null, vip: false},
          ]);
          expect(insertedArr).to.eql([
            {name: 'Adam', middleName: 'abc', vip: true},
            {name: 'Test', middleName: null, vip: false},
          ]);
        });
      });
    });
  });
});
