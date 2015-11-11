var expect = require('chai').expect;
var SQLConnector = require('../lib/sql');
var ParameterizedSQL = SQLConnector.ParameterizedSQL;
var testConnector = require('./connectors/test-sql-connector');

var juggler = require('loopback-datasource-juggler');
var ds = new juggler.DataSource({
  connector: testConnector,
  debug: true
});
var connector;
var Customer;
var Order;
var Store;

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
            dataLength: 32
          }
        }, vip: {
        type: Boolean,
        testdb: {
          column: 'VIP'
        }
      },
        address: String
      },
      {testdb: {table: 'CUSTOMER'}});
    Order = ds.createModel('order',
      {
        id: {
          id: true
        },
        date: Date
      });
    Store = ds.createModel('store',
      {
        id: {
          id: true,
          type: String
        },
        state: String
      });
    // Relations
    Customer.hasMany(Order, {as: 'orders', foreignKey: 'customer_name'});
    Order.belongsTo(Customer, {as: 'customer', foreignKey: 'customer_name'});
    Order.belongsTo(Store, {as: 'store', foreignKey: 'store_id'});
    Store.hasMany(Order, {as: 'orders', foreignKey: 'store_id'});
    Customer.belongsTo(Store, {as: 'favorite_store', foreignKey: 'favorite_store'});
    Store.hasMany(Customer, {as: 'customers_fav', foreignKey: 'favorite_store'});
  });

  it('should map table name', function() {
    var table = connector.table('customer');
    expect(table).to.eql('CUSTOMER');
  });

  it('should map column name', function() {
    var column = connector.column('customer', 'name');
    expect(column).to.eql('NAME');
  });

  it('should find column metadata', function() {
    var column = connector.columnMetadata('customer', 'name');
    expect(column).to.eql({
      column: 'NAME',
      dataType: 'VARCHAR',
      dataLength: 32
    });
  });

  it('should map property name', function() {
    var prop = connector.propertyName('customer', 'NAME');
    expect(prop).to.eql('name');
  });

  it('should map id column name', function() {
    var idCol = connector.idColumn('customer');
    expect(idCol).to.eql('NAME');
  });

  it('should find escaped id column name', function() {
    var idCol = connector.idColumnEscaped('customer');
    expect(idCol).to.eql('`NAME`');
  });

  it('should find escaped table name', function() {
    var table = connector.tableEscaped('customer');
    expect(table).to.eql('`CUSTOMER`');
  });

  it('should find escaped column name', function() {
    var column = connector.columnEscaped('customer', 'vip');
    expect(column).to.eql('`CUSTOMER`.`VIP`');
  });

  it('should convert to escaped id column value', function() {
    var column = connector.idColumnValue('customer', 'John');
    expect(column).to.eql('John');
  });

  it('builds where', function() {
    var where = connector.buildWhere('customer', {name: 'John'});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME`=?',
      params: ['John']
    });
  });

  it('builds where with null', function() {
    var where = connector.buildWhere('customer', {name: null});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` IS NULL',
      params: []
    });
  });

  it('builds where with inq', function() {
    var where = connector.buildWhere('customer', {name: {inq: ['John', 'Mary']}});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` IN (?,?)',
      params: ['John', 'Mary']
    });
  });

  it('builds where with or', function() {
    var where = connector.buildWhere('customer',
      {or: [{name: 'John'}, {name: 'Mary'}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) OR (`CUSTOMER`.`NAME`=?)',
      params: ['John', 'Mary']
    });
  });

  it('builds where with and', function() {
    var where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {vip: true}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) AND (`CUSTOMER`.`VIP`=?)',
      params: ['John', true]
    });
  });

  it('builds where with a regexp string that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: '^J'
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: ['^J']
    });
  });

  it('builds where with a regexp string that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: '^J/i'
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: ['^J/i']
    });
  });

  it('builds where with a regexp literal that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/]
    });
  });

  it('builds where with a regexp literal that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/i
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/i]
    });
  });

  it('builds where with a regexp object that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/)
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/]
    });
  });

  it('builds where with a regexp object that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/i)
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [new RegExp(/^J/i)]
    });
  });

  it('builds where with nesting and/or', function() {
    var where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {or: [{vip: true}, {address: null}]}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) AND ((`CUSTOMER`.`VIP`=?) OR ' +
        '(`CUSTOMER`.`ADDRESS` IS NULL))',
      params: ['John', true]
    });
  });

  it('builds order by with one field', function() {
    var orderBy = connector.buildOrderBy('customer', 'name');
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME`');
  });

  it('builds order by with two fields', function() {
    var orderBy = connector.buildOrderBy('customer', ['name', 'vip']);
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`');
  });

  it('builds order by with two fields and dirs', function() {
    var orderBy = connector.buildOrderBy('customer', ['name ASC', 'vip DESC']);
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME` ASC,`CUSTOMER`.`VIP` DESC');
  });

  it('builds fields for columns', function() {
    var fields = connector.buildFields('customer',
      {name: 'John', vip: true, unknown: 'Random'});
    expect(fields.names).to.eql(['`CUSTOMER`.`NAME`', '`CUSTOMER`.`VIP`']);
    expect(fields.columnValues[0].toJSON()).to.eql(
      {sql: '?', params: ['John']});
    expect(fields.columnValues[1].toJSON()).to.eql(
      {sql: '?', params: [true]});
  });

  it('builds fields for UPDATE without ids', function() {
    var fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true});
    expect(fields.toJSON()).to.eql({
      sql: 'SET `CUSTOMER`.`VIP`=?',
      params: [true]
    });
  });

  it('builds fields for UPDATE with ids', function() {
    var fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true}, false);
    expect(fields.toJSON()).to.eql({
      sql: 'SET `CUSTOMER`.`NAME`=?,`CUSTOMER`.`VIP`=?',
      params: ['John', true]
    });
  });

  it('builds column names for SELECT', function() {
    var cols = connector.buildColumnNames('customer');
    expect(cols).to.eql('`CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,' +
      '`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE`');
  });

  it('builds column names with true fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: {name: true}});
    expect(cols).to.eql('`CUSTOMER`.`NAME`');
  });

  it('builds column names with false fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: {name: false}});
    expect(cols).to.eql('`CUSTOMER`.`VIP`,`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE`');
  });

  it('builds column names with array fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: ['name']});
    expect(cols).to.eql('`CUSTOMER`.`NAME`');
  });

  it('builds DELETE', function() {
    var sql = connector.buildDelete('customer', {name: 'John'});
    expect(sql.toJSON()).to.eql({
      sql: 'DELETE FROM `CUSTOMER` WHERE `CUSTOMER`.`NAME`=$1',
      params: ['John']
    });
  });

  it('builds UPDATE', function() {
    var sql = connector.buildUpdate('customer', {name: 'John'}, {vip: false});
    expect(sql.toJSON()).to.eql({
      sql: 'UPDATE `CUSTOMER` SET `CUSTOMER`.`VIP`=$1 WHERE `CUSTOMER`.`NAME`=$2',
      params: [false, 'John']
    });
  });

  it('builds SELECT', function() {
    var sql = connector.buildSelect('customer',
      {order: 'name', limit: 5, where: {name: 'John'}});
    expect(sql.toJSON()).to.eql({
      sql: 'SELECT `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,`CUSTOMER`.`ADDRESS`,' +
        '`CUSTOMER`.`FAVORITE_STORE` FROM `CUSTOMER` WHERE `CUSTOMER`.`NAME`=$1 ' +
        'ORDER BY `CUSTOMER`.`NAME` LIMIT 5',
      params: ['John']
    });
  });

  it('builds INSERT', function() {
    var sql = connector.buildInsert('customer', {name: 'John', vip: true});
    expect(sql.toJSON()).to.eql({
      sql: 'INSERT INTO `CUSTOMER`(`CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`) VALUES($1,$2)',
      params: ['John', true]
    });
  });

  it('builds INNER JOIN', function () {
    var sql = connector.buildJoins('customer', {orders: {where: {id: 10}}});
    expect(sql.toJSON()).to.eql({
      sql: 'INNER JOIN ( SELECT `ORDER`.`CUSTOMER_NAME` FROM `ORDER` WHERE ' +
      '`ORDER`.`ID`=? ORDER BY `ORDER`.`ID` ) AS `ORDER` ON ' +
      '`CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME`',
      params: [10]
    });
  });

  it('builds SELECT with INNER JOIN', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          where: {
            date: {between: ['2015-01-01', '2015-01-31']}
          }
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql: 'SELECT DISTINCT `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,' +
      '`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE` FROM `CUSTOMER` ' +
      'INNER JOIN ( SELECT `ORDER`.`CUSTOMER_NAME` FROM `ORDER` WHERE ' +
      '`ORDER`.`DATE` BETWEEN $1 AND $2 ORDER BY `ORDER`.`ID` ) AS `ORDER` ' +
      'ON `CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME`  ORDER BY `CUSTOMER`.`NAME`',
      params: ['2015-01-01', '2015-01-31']
    });
  });

  it('builds SELECT with multiple INNER JOIN', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          where: {
            date: {between: ['2015-01-01', '2015-01-31']}
          }
        },
        /*jshint camelcase:false */
        favorite_store: {
          where: {
            state: 'NY'
          }
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql: 'SELECT DISTINCT `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,' +
      '`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE` FROM `CUSTOMER` ' +
      'INNER JOIN ( SELECT `ORDER`.`CUSTOMER_NAME` FROM `ORDER` WHERE ' +
      '`ORDER`.`DATE` BETWEEN $1 AND $2 ORDER BY `ORDER`.`ID` ) AS `ORDER` ON ' +
      '`CUSTOMER`.`NAME`=`ORDER`.`CUSTOMER_NAME` INNER JOIN ( SELECT `STORE`.`ID` ' +
      'FROM `STORE` WHERE `STORE`.`STATE`=$3 ORDER BY `STORE`.`ID` ) AS `STORE` ' +
      'ON `CUSTOMER`.`FAVORITE_STORE`=`STORE`.`ID`  ORDER BY `CUSTOMER`.`NAME`',
      params: ['2015-01-01', '2015-01-31', 'NY']
    });
  });

  it('builds nested SELECTs', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          where: {
            store: {
              where: {
                state: 'NY'
              }
            }
          }
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql: 'SELECT DISTINCT `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,' +
      '`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE` FROM `CUSTOMER` ' +
      'INNER JOIN ( SELECT DISTINCT `ORDER`.`CUSTOMER_NAME` FROM `ORDER` ' +
      'INNER JOIN ( SELECT `STORE`.`ID` FROM `STORE` WHERE `STORE`.`STATE`=$1 ' +
      'ORDER BY `STORE`.`ID` ) AS `STORE` ON `ORDER`.`STORE_ID`=`STORE`.`ID`  ' +
      'ORDER BY `ORDER`.`ID` ) AS `ORDER` ON `CUSTOMER`.`NAME`=`ORDER`.' +
      '`CUSTOMER_NAME`  ORDER BY `CUSTOMER`.`NAME`',
      params: ['NY']
    });
  });

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
      /*jshint unused:false */
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
    var events = [];
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
});
