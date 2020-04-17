// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const expect = require('chai').expect;
const Connector = require('../lib/connector');
const testConnector = require('./connectors/test-connector');

const juggler = require('loopback-datasource-juggler');
const ds = new juggler.DataSource({
  connector: testConnector,
  debug: true,
});

/* eslint-disable one-var */
let connector;
let Customer;
let Order;
/* eslint-enable one-var */

describe('Name mapping', function() {
  let connector, builder;

  before(() => {
    connector = ds.connector;
    connector._tables = {};
    connector._models = {};
    Customer = ds.createModel(
      'Customer',
      {
        name: {
          id: true,
          type: String,
          testdb: {
            column: 'FIRSTNAME',
            dataType: 'VARCHAR',
            dataLength: 32,
          },
        },
        middleName: {
          type: Boolean,
          name: 'middle_name',
          postgresql: {
            column: 'MIDDLENAME',
          },
        },
        lastName: {
          type: Boolean,
          testdb: {
            column: 'LASTNAME',
          },
        },
        primaryAddress: {
          type: String,
          name: 'primary_address',
        },
        address: String,
      },
      {testdb: {table: 'CUSTOMER'}},
    );

    // use field in this model to mock NoSQL DB
    Order = ds.createModel(
      'Order',
      {
        id: {
          id: true,
          type: Number,
          testdb: {
            field: 'my_id',
            dataType: 'ObjectId',
          },
        },
        des: {
          type: String,
          testdb: {
            field: 'DESCRIPTION',
          },
        },
      },
      {testdb: {table: 'ORDER'}},
    );
  });

  context('getIdDbName', function() {
    it('should map id column name', function() {
      const idCol = connector.getIdDbName('Customer');
      expect(idCol).to.eql('FIRSTNAME');
    });

    it('alias idColumn should map id column name', function() {
      const idCol = connector.idColumn('Customer');
      expect(idCol).to.eql('FIRSTNAME');
    });

    it('should map id field name', function() {
      const idCol = connector.getIdDbName('Order');
      expect(idCol).to.eql('my_id');
    });
  });
  context('getPropertyDbName', function() {
    it('prefers property name if the database name is not matched', function() {
      const column = connector.getPropertyDbName('Customer', 'middleName');
      expect(column).to.eql('middle_name');
    });

    it('prefers database-specific column name over property name', function() {
      const column = connector.getPropertyDbName('Customer', 'lastName');
      expect(column).to.eql('LASTNAME');
    });

    it('alias column should map the column name', function() {
      const column = connector.column('Customer', 'lastName');
      expect(column).to.eql('LASTNAME');
    });

    it('propertyMapping should map column name from name attribute', function() {
      const column = connector.getPropertyDbName('Customer', 'primaryAddress');
      expect(column).to.eql('primary_address');
    });

    it('connector-preffered configuration (UPPERCASE) is applied if no columm/field name is provided', function() {
      const column = connector.getPropertyDbName('Customer', 'address');
      expect(column).to.eql('ADDRESS');
    });

    it('prefers database-specific field name over property name', function() {
      const column = connector.getPropertyDbName('Order', 'des');
      expect(column).to.eql('DESCRIPTION');
    });
  });
});
