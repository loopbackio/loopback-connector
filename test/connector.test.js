// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const expect = require('chai').expect;
const {ModelBuilder} = require('loopback-datasource-juggler');
const Connector = require('../lib/connector');

describe('Connector', () => {
  describe('getPropertyDefinition()', () => {
    let connector, builder;

    beforeEach(() => {
      connector = new Connector('MyConnector');
      builder = new ModelBuilder();

      const MyModel = builder.define('MyModel', {
        firstname: String,
        phoneList: [
          {
            number: Number,
            label: {
              title: String,
            },
          },
        ],
        address: {
          line1: String,
        },
        someProp: {
          innerArray: [
            {
              date: Date,
            },
          ],
        },
      });

      connector.define({
        model: MyModel,
      });
    });

    it('supports retrieving first level properties definitions', () => {
      const propDefinition1 = connector.getPropertyDefinition(
        'MyModel',
        'phoneList',
      );

      expect(propDefinition1.type).to.be.an('array');

      const propDefinition2 = connector.getPropertyDefinition(
        'MyModel',
        'firstname',
      );

      expect(propDefinition2.type).to.be.equal(String);
    });

    it('supports first level nested array property definitions', () => {
      const propDefinition = connector.getPropertyDefinition(
        'MyModel',
        'phoneList.number',
      );

      expect(propDefinition.type).to.equal(Number);
    });

    it('supports second level nested array property definitions', () => {
      const propDefinition = connector.getPropertyDefinition(
        'MyModel',
        'phoneList.label.title',
      );

      expect(propDefinition.type).to.equal(String);
    });

    it('supports nested property definitions on objects', () => {
      const propDefinition = connector.getPropertyDefinition(
        'MyModel',
        'address.line1',
      );

      expect(propDefinition.type).to.equal(String);
    });

    it('supports nested property definitions on array within object', () => {
      const propDefinition = connector.getPropertyDefinition(
        'MyModel',
        'someProp.innerArray.date',
      );

      expect(propDefinition.type).to.equal(Date);
    });

    it('should return undefined for non-existing nested property', () => {
      const definition = connector.getPropertyDefinition('MyModel',
        'someProp.innerArray.foo');
      // eslint-disable-next-line no-unused-expressions
      expect(definition).to.be.undefined;
    });

    it('should preserve backward-compatibility for non-existing property', () => {
      const definition = connector.getPropertyDefinition('MyModel', 'idontexist');
      // eslint-disable-next-line no-unused-expressions
      expect(definition).to.be.undefined;
    });
  });
});
