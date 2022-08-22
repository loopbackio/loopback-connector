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
      const definition = connector.getPropertyDefinition(
        'MyModel',
        'someProp.innerArray.foo',
      );
      // eslint-disable-next-line no-unused-expressions
      expect(definition).to.be.undefined;
    });

    it('should preserve backward-compatibility for non-existing property', () => {
      const definition = connector.getPropertyDefinition(
        'MyModel',
        'idontexist',
      );
      // eslint-disable-next-line no-unused-expressions
      expect(definition).to.be.undefined;
    });
  });

  describe('isNullable()', () => {
    const nullableOverrideFlags = ['required', 'id'];

    const nullableFlags = ['nullable', 'null', 'allowNull'];

    const nullableValues = [1, 'Y', 'YES', true];

    const notNullableValues = [0, 'N', 'NO', false];

    for (const nullableOverrideFlag of nullableOverrideFlags) {
      const propDefNullableOverridePlainSlice = {
        [nullableOverrideFlag]: true,
      };
      it(`returns \`false\` for \`${JSON.stringify(
        propDefNullableOverridePlainSlice,
      )}`, () => {
        const result = Connector.prototype.isNullable(
          propDefNullableOverridePlainSlice,
        );
        // eslint-disable-next-line no-unused-expressions
        expect(result).to.be.false;
      });

      for (const nullableFlag of nullableFlags) {
        for (const nullableValue of nullableValues) {
          const propDefNullableOverrideSlice = {
            ...propDefNullableOverridePlainSlice,
            [nullableFlag]: nullableValue,
          };
          it(`returns \`false\` for \`${JSON.stringify(
            propDefNullableOverrideSlice,
          )}`, () => {
            const result = Connector.prototype.isNullable(
              propDefNullableOverrideSlice,
            );
            // eslint-disable-next-line no-unused-expressions
            expect(result).to.be.false;
          });
        }
      }
    }

    for (const nullableFlag of nullableFlags) {
      for (const nullableValue of nullableValues) {
        const propDefNullableSlice = {[nullableFlag]: nullableValue};
        it(`returns \`true\` for \`${JSON.stringify(
          propDefNullableSlice,
        )}\``, () => {
          const result = Connector.prototype.isNullable(propDefNullableSlice);
          // eslint-disable-next-line no-unused-expressions
          expect(result).to.be.true;
        });
      }

      for (const notNullableValue of notNullableValues) {
        const propDefNotNullableSlice = {[nullableFlag]: notNullableValue};
        it(`returns \`false\` for \`${JSON.stringify(
          propDefNotNullableSlice,
        )}\``, () => {
          const result = Connector.prototype.isNullable(
            propDefNotNullableSlice,
          );
          // eslint-disable-next-line no-unused-expressions
          expect(result).to.be.false;
        });
      }
    }
  });
});
