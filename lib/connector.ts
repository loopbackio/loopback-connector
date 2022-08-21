// Copyright IBM Corp. 2014,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import debugFactory from 'debug';
import SG from 'strong-globalisze';
const debug = debugFactory("loopback:connector");
const g = SG();

export const enum DeleteUpdateRule {
  RESTRICT = 'RESTRICT',
  SET_NULL = 'SET NULL',
  CASCADE = 'CASCADE',
  NO_ACTION = 'NO ACTION',
}

export interface ConnectorMetadata {
  types: string[];
  defaultIdType: object;
  isRelational: boolean;
  schemaForSettings: Record<string, any>;
}

export abstract class Connector {
  private _metadata?: ConnectorMetadata;
  private _models = {};
  private relational = false;

  constructor(public name: string, public settings: Record<string, any> = {}) {}

  isRelational(): boolean {
    return this.relational || this.getTypes().indexOf("rdbms") !== -1;
  }

  getTypes(): string[] {
    return ["db", "nosql"];
  }

  getDefaultIdType(prop?: object): object {
    return String;
  }

  generateValueByColumnType?(columnType: string): object;

  generateUniqueId(modelName?: string): any {
    const idType = this.getDefaultIdType && this.getDefaultIdType();
    const isTypeFunction = typeof idType === "function";
    const id = this.generateValueByColumnType
      ? this.generateValueByColumnType(idType)
      : typeof idType === "function"
      ? idType()
      : null;
    return id;
  }

  getMetadata(): ConnectorMetadata {
    if (!this._metadata) {
      this._metadata = {
        types: this.getTypes(),
        defaultIdType: this.getDefaultIdType(),
        isRelational: this.isRelational(),
        schemaForSettings: {},
      };
    }

    return this._metadata;
  }

  getModelDefinition(modelName: string) {
    return this._models[modelName];
  }

  getConnectorSpecificSettings(modelName: string) {
    return (this.getModelDefinition(modelName).settings ?? {})[this.name];
  }

  getPropertyDefinition(modelName: string, propName: string) {
    return Connector.getNestedPropertyDefinition(
      this.getModelDefinition(modelName),
      propName.split(".")
    );
  }

  static getNestedPropertyDefinition(
    definition: ModelDefinition,
    propPath: string[]
  ) {
    const properties = definition.properties ?? {};
    const prop = properties[propPath[0]];
    const isPropUndefined = typeof prop === "undefined";
    const isArray = !isPropUndefined && Array.isArray(prop.type);
    const isFunction =
      !isPropUndefined && !isArray && typeof prop.type === "function";

    if (propPath.length === 1) return prop;

    if (isPropUndefined || (isArray && prop.type.length === 0)) {
      return undefined;
    }

    const nextDefinition =
      (isArray && prop.type[0].definition) ||
      (isFunction && prop.type.definition);

    if (nextDefinition === undefined) {
      return undefined;
    } else {
      return Connector.getNestedPropertyDefinition(
        nextDefinition,
        propPath.slice(1)
      );
    }
  }

  getDataSource(modelName: string) {
    const model = this.getModelDefinition(modelName);

    if (!model) {
      debug("Model not found: " + modelName);
    }

    return model?.model.dataSource;
  }

  /**
   *
   * @param modelName
   * @returns
   *
   * @deprecated
   */
  idName(modelName: string): string {
    return this.getDataSource(modelName).idName(modelName);
  }

  idNames(modelName: string): string[] {
    return this.getDataSource(modelName).idNames(modelName);
  }

  id(modelName: string, propName: string): number | undefined {
    return this.getModelDefinition(modelName).properties[propName]?.id;
  }

  getPropertyDbName(modelName: string, propName: string) {
    const propDef = this.getPropertyDefinition(modelName, propName);
    const propConnectorDef = propDef[this.name];
    let mappingName: string;

    if (propConnectorDef) {
      const mappingName =
        propConnectorDef.column ||
        propConnectorDef.columnName ||
        propConnectorDef.field ||
        propConnectorDef.fieldName;

      if (mappingName) return mappingName;
    }

    if (propDef?.name) return propDef.name;

    mappingName = propName;
    if (typeof this.dbName === "function")
      mappingName = this.dbName(mappingName);

    return mappingName;
  }

  column = this.getPropertyDbName;

  /**
   * {@inheritDoc Connector.getIdDbNames}
   * 
   * @deprecated Use {@link Connector.getIdDbNames} instead
   */
  getIdDbName(modelName: string) {
    return this.getIdDbNames(modelName)[0];
  }

  /**
   * {@inheritDoc Conector.getIdDbName}
   * 
   * @deprecated Use {@link Connector.getIdDbNames} instead
   */
  idColumn = this.getIdDbName;

  getIdDbNames(modelName: string) {
    return this.getDataSource(modelName)
      .getModelDefinition(modelName)
      .idNames()
      .map((propName) => this.getPropertyDbName(modelName, propName));
  }

  /**
   * {@inheritDoc Connector.getIdDbNames}
   * 
   * @deprecated Use {@link Connector.getIdDbNames} instead
   */
  idColumns = this.getIdDbNames;

  /**
   * {@inheritDoc Connector.getIdValues}
   * 
   * @deprecated Use {@link Connector.getIdValues} instead
   */
  getIdValue(modelName: string, modelData?: ModelData) {
    return this.getIdValues(modelName, modelData)[0];
  }

  getIdValues(modelName: string, modelData?: ModelData): Record<string, any> {
    return this.idNames(modelName).reduce((state, idName) => {
      return {
        ...(state as unknown as Record<string, any>),
        data: modelData[idName],
      }
    })
  };

  setIdValue(modelName: string, modelData: ModelData, idValue: any) {
    if (data)
      data[this.idName(model)] = value;
  }

  static isNullable(propDef: PropertyDefinition) {
    if (propDef.required || propDef.id) {
      return false;
    } else if (propDef.nullable || propDef.null || propDef.allowNull) {
        return true;
    } else if (propDef.nullable === false || propDef.null === false || propDef.allowNull === false) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * 
   * @param propDef 
   * @returns 
   * 
   * @deprecated Use `static` {@link Connector.isNullable}
   */
  isNullable = Connector.isNullable;

  define(modelDefinition: ModelDefinition) {
    modelDefinition.settings = modelDefinition.settings || {};
    this._models[modelDefinition.model.modelName] = modelDefinition;
  }

  defineProperty(
    modelName: string,
    propName: string,
    propDef: PropertyDefinition
  ) {
    this.getModelDefinition(modelName).properties[propName] = propDef;
  }

  disconnect(cb: Callback) {
    if (cb)
      process.nextTick(cb);
  }

  abstract execute();

  command = this.execute;

  query = this.execute;

  /**
   * 
   * @param cls 
   * @param methodOrPropertyName 
   * @param aliases 
   * 
   * @deprecated
   */
  static defineAlias(cls: object, methodOrPropertyName: string, aliases: string | string[]) {
    if (typeof aliases === 'string')
      aliases = [aliases]

    aliases.forEach(alias => {
      Object.defineProperty(cls, alias, {
        get: () => {
          return this[methodOrPropertyName];
        }
      })
    });
  }
}

/**
 * Base class for LoopBack connector. This is more a collection of useful
 * methods for connectors than a super class
 * @class
 */
// function Connector(name, settings) {
//   this._models = {};
//   this.name = name;
//   this.settings = settings || {};
// }

// /**
//  * @private
//  * Set the relational property to indicate the backend is a relational DB
//  * @type {boolean}
//  */
// Connector.prototype.relational = false;

// /**
//  * Check if the connector is for a relational DB
//  * @returns {Boolean} true for relational DB
//  */
// Connector.prototype.isRelational = function() {
//   return this.isRelational ||
//     (this.getTypes().indexOf('rdbms') !== -1);
// };

// /**
//  * Get types associated with the connector
//  * @returns {String[]} The types for the connector
//  */
// Connector.prototype.getTypes = function() {
//   return ['db', 'nosql'];
// };

// /**
//  * Get the default data type for ID
//  * @param {Object} prop Property definition
//  * @returns {Function} The default type for ID
//  */
// Connector.prototype.getDefaultIdType = function(prop) {
//   /* jshint unused:false */
//   return String;
// };

// /**
//  * Generate random id.  Each data source model must override this method.
//  * @param {String} modelName Model name
//  * @returns {*} Data type varies from model to model,
//  */

// Connector.prototype.generateUniqueId = function(modelName) {
//   const idType = this.getDefaultIdType && this.getDefaultIdType();
//   const isTypeFunction = (typeof idType === 'function');
//   const id = this.generateValueByColumnType ? this.generateValueByColumnType(idType) :
//     (typeof idType === 'function' ? idType() : null);
//   return id;
// };

// /**
//  * Get the metadata for the connector
//  * @returns {Object} The metadata object
//  * @property {String} type The type for the backend
//  * @property {Function} defaultIdType The default id type
//  * @property {Boolean} [isRelational] If the connector represents a relational
//  * database
//  * @property {Object} schemaForSettings The schema for settings object
//  */
// Connector.prototype.getMetadata = function() {
//   if (!this._metadata) {
//     this._metadata = {
//       types: this.getTypes(),
//       defaultIdType: this.getDefaultIdType(),
//       isRelational: this.isRelational(),
//       schemaForSettings: {},
//     };
//   }
//   return this._metadata;
// };

// /**
//  * Execute a command with given parameters
//  * @param {String|Object} command The command such as SQL
//  * @param {Array} [params] An array of parameter values
//  * @param {Object} [options] Options object
//  * @param {Function} [callback] The callback function
//  */
// Connector.prototype.execute = function(command, params, options, callback) {
//   throw new Error(g.f('execute() must be implemented by the connector'));
// };

// /**
//  * Get the model definition by name
//  * @param {String} modelName The model name
//  * @returns {ModelDefinition} The model definition
//  */
// Connector.prototype.getModelDefinition = function(modelName) {
//   return this._models[modelName];
// };

// /**
//  * Get connector specific settings for a given model, for example,
//  * ```
//  * {
//  *   "postgresql": {
//  *     "schema": "xyz"
//  *   }
//  * }
//  * ```
//  *
//  * @param {String} modelName Model name
//  * @returns {Object} The connector specific settings
//  */
// Connector.prototype.getConnectorSpecificSettings = function(modelName) {
//   const settings = this.getModelDefinition(modelName).settings || {};
//   return settings[this.name];
// };

// /**
//  * Get model property definition
//  * @param {String} modelName Model name
//  * @param {String} propName Property name
//  * @returns {Object} Property definition
//  */
// Connector.prototype.getPropertyDefinition = function(modelName, propName) {
//   const model = this.getModelDefinition(modelName);
//   return Connector.getNestedPropertyDefinition(
//     model.model.definition,
//     propName.split('.'),
//   );
// };

// /**
//  * Helper function to get nested property definition
//  * @param {Object} definition Model name
//  * @param {Array} propPath
//  * @returns {Object} Property definition
//  */
// Connector.getNestedPropertyDefinition = function(definition, propPath) {
//   const properties = definition.properties || {};
//   const prop = properties[propPath[0]];
//   const isPropUndefined = typeof prop === 'undefined';
//   const isArray = !isPropUndefined && Array.isArray(prop.type);
//   const isFunction = !isPropUndefined && !isArray && typeof prop.type === 'function';

//   if (propPath.length === 1) return prop;

//   if (isPropUndefined || (propPath.length > 1 && (isArray && prop.type.length === 0))) {
//     return undefined;
//   }

//   const nextDefinition =
//     (isArray && prop.type[0].definition) ||
//     (isFunction && prop.type.definition);

//   if (nextDefinition === undefined) {
//     return undefined;
//   } else {
//     return Connector.getNestedPropertyDefinition(
//       nextDefinition,
//       propPath.slice(1),
//     );
//   }
// };

// /**
//  * Look up the data source by model name
//  * @param {String} model The model name
//  * @returns {DataSource} The data source
//  */
// Connector.prototype.getDataSource = function(model) {
//   const m = this.getModelDefinition(model);
//   if (!m) {
//     debug('Model not found: ' + model);
//   }
//   return m && m.model.dataSource;
// };

// /**
//  * Get the id property name
//  * @param {String} model The model name
//  * @returns {String} The id property name
//  */
// Connector.prototype.idName = function(model) {
//   return this.getDataSource(model).idName(model);
// };

// /**
//  * Get the id property names
//  * @param {String} model The model name
//  * @returns {String[]} The id property names
//  */
// Connector.prototype.idNames = function(model) {
//   return this.getDataSource(model).idNames(model);
// };

// /**
//  * Get the id index (sequence number, starting from 1)
//  * @param {String} model The model name
//  * @param {String} prop The property name
//  * @returns {Number} The id index, undefined if the property is not part
//  *   of the primary key
//  */
// Connector.prototype.id = function(model, prop) {
//   const p = this.getModelDefinition(model).properties[prop];
//   return p && p.id;
// };

// /**
//  * Return the database name of the property of the model if it exists.
//  * Otherwise return the property name.
//  * Some connectors allow the column/field name to be customized
//  * at the model property definition level as `column`,
//  * `columnName`, or `field`. For example,
//  *
//  * ```json
//  * "name": {
//  *   "type": "string",
//  *   "mysql": {
//  *     "column": "NAME"
//  *   }
//  * }
//  * ```
//  * @param {String} model The target model name
//  * @param {String} prop The property name
//  *
//  * @returns {String} The database mapping name of the property of the model if it exists
//  */
// Connector.prototype.getPropertyDbName = Connector.prototype.column =
// function(model, property) {
//   const prop = this.getPropertyDefinition(model, property);
//   let mappingName;
//   if (prop && prop[this.name]) {
//     mappingName = prop[this.name].column || prop[this.name].columnName ||
//     prop[this.name].field || prop[this.name].fieldName;
//     if (mappingName) {
//       // Explicit column name, return as-is
//       return mappingName;
//     }
//   }

//   // Check if name attribute provided for column name
//   if (prop && prop.name) {
//     return prop.name;
//   }
//   mappingName = property;
//   if (typeof this.dbName === 'function') {
//     mappingName = this.dbName(mappingName);
//   }
//   return mappingName;
// };

// /**
//  * Return the database name of the id property of the model if it exists.
//  * Otherwise return the name of the id property.
//  * @param {String} model The target model name
//  * @param {String} prop The property name
//  * @returns {String} the database mapping name of the id property of the model if it exists.
//  */
// Connector.prototype.getIdDbName = Connector.prototype.idColumn = function(model) {
//   const idName = this.getDataSource(model).getModelDefinition(model).idName();
//   return this.getPropertyDbName(model, idName);
// };

// /**
//  * Hook to be called by DataSource for defining a model
//  * @param {Object} modelDefinition The model definition
//  */
// Connector.prototype.define = function(modelDefinition) {
//   modelDefinition.settings = modelDefinition.settings || {};
//   this._models[modelDefinition.model.modelName] = modelDefinition;
// };

// /**
//  * Hook to be called by DataSource for defining a model property
//  * @param {String} model The model name
//  * @param {String} propertyName The property name
//  * @param {Object} propertyDefinition The object for property definition
//  */
// Connector.prototype.defineProperty = function(model, propertyName, propertyDefinition) {
//   const modelDef = this.getModelDefinition(model);
//   modelDef.properties[propertyName] = propertyDefinition;
// };

// /**
//  * Disconnect from the connector
//  * @param {Function} [cb] Callback function
//  */
// Connector.prototype.disconnect = function disconnect(cb) {
//   // NO-OP
//   if (cb) {
//     process.nextTick(cb);
//   }
// };

// /**
//  * Get the id value for the given model
//  * @param {String} model The model name
//  * @param {Object} data The model instance data
//  * @returns {*} The id value
//  *
//  */
// Connector.prototype.getIdValue = function (model, data) {
//   return data && data[this.idName(model)];
// };

// /**
//  * Set the id value for the given model
//  * @param {String} model The model name
//  * @param {Object} data The model instance data
//  * @param {*} value The id value
//  *
//  */
// Connector.prototype.setIdValue = function (model, data, value) {
//   if (data) {
//     data[this.idName(model)] = value;
//   }
// };

// /**
//  * Test if a property is nullable
//  * @param {Object} prop The property definition
//  * @returns {boolean} true if nullable
//  */
// Connector.prototype.isNullable = function (prop) {
//   if (prop.required || prop.id) {
//     return false;
//   }
//   if (prop.nullable || prop["null"] || prop.allowNull) {
//     return true;
//   }
//   if (
//     prop.nullable === false ||
//     prop["null"] === false ||
//     prop.allowNull === false
//   ) {
//     return false;
//   }
//   return true;
// };

// /**
//  * Return the DataAccessObject interface implemented by the connector
//  * @returns {Object} An object containing all methods implemented by the
//  * connector that can be mixed into the model class. It should be considered as
//  * the interface.
//  */
// Connector.prototype.getDataAccessObject = function () {
//   return this.DataAccessObject;
// };

// /*!
//  * Define aliases to a prototype method/property
//  * @param {Function} cls The class that owns the method/property
//  * @param {String} methodOrPropertyName The official property method/property name
//  * @param {String|String[]} aliases Aliases to the official property/method
//  */
// Connector.defineAliases = function (cls, methodOrPropertyName, aliases) {
//   if (typeof aliases === "string") {
//     aliases = [aliases];
//   }
//   if (Array.isArray(aliases)) {
//     aliases.forEach(function (alias) {
//       if (typeof alias === "string") {
//         Object.defineProperty(cls, alias, {
//           get: function () {
//             return this[methodOrPropertyName];
//           },
//         });
//       }
//     });
//   }
// };

// /**
//  * `command()` and `query()` are aliases to `execute()`
//  */
// Connector.defineAliases(Connector.prototype, "execute", ["command", "query"]);
