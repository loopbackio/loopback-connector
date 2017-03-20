// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
var SG = require('strong-globalize');
var g = SG();

var util = require('util');
var async = require('async');
var assert = require('assert');
var Connector = require('./connector');
var debug = require('debug')('loopback:connector:sql');
var ParameterizedSQL = require('./parameterized-sql');
var Transaction = require('./transaction');

module.exports = SQLConnector;

function NOOP() {}

/**
 * Base class for connectors that connect to relational databases using SQL
 * @class
 */
function SQLConnector() {
  // Call the super constructor
  Connector.apply(this, [].slice.call(arguments));
}

// Inherit from the base Connector
util.inherits(SQLConnector, Connector);

// Export ParameterizedSQL
SQLConnector.ParameterizedSQL = ParameterizedSQL;

// The generic placeholder
var PLACEHOLDER = SQLConnector.PLACEHOLDER = ParameterizedSQL.PLACEHOLDER;

SQLConnector.Transaction = Transaction;

/**
 * Set the relational property to indicate the backend is a relational DB
 * @type {boolean}
 */
SQLConnector.prototype.relational = true;

/**
 * Invoke a prototype method on the super class
 * @param {String} methodName Method name
 */
SQLConnector.prototype.invokeSuper = function(methodName) {
  var args = [].slice.call(arguments, 1);
  var superMethod = this.constructor.super_.prototype[methodName];
  return superMethod.apply(this, args);
};

/**
 * Perform autoupdate for the given models
 * @param {String[]} [models] A model name or an array of model names.
 * If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.autoupdate = function(models, cb) {
  var self = this;
  if ((!cb) && ('function' === typeof models)) {
    cb = models;
    models = undefined;
  }
  // First argument is a model name
  if ('string' === typeof models) {
    models = [models];
  }

  models = models || Object.keys(this._models);

  async.each(models, function(model, done) {
    if (!(model in self._models)) {
      return process.nextTick(function() {
        done(new Error(g.f('Model not found: %s', model)));
      });
    }
    self.getTableStatus(model, function(err, fields, indexes, FKs) {
      if (!err && fields.length) {
        self.alterTable(model, fields, indexes, done);
      } else {
        self.createTable(model, done);
      }
    });
  }, cb);
};

/**
 * Check if the models exist
 * @param {String[]} [models] A model name or an array of model names.
 * If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.isActual = function(models, cb) {
  var self = this;

  if ((!cb) && ('function' === typeof models)) {
    cb = models;
    models = undefined;
  }
  // First argument is a model name
  if ('string' === typeof models) {
    models = [models];
  }

  models = models || Object.keys(this._models);

  var changes = [];
  async.each(models, function(model, done) {
    self.getTableStatus(model, function(err, fields) {
      changes = changes.concat(self.getAddModifyColumns(model, fields));
      changes = changes.concat(self.getDropColumns(model, fields));
      done(err);
    });
  }, function done(err) {
    if (err) {
      return cb && cb(err);
    }
    var actual = (changes.length === 0);
    if (cb) cb(null, actual);
  });
};

SQLConnector.prototype.getAddModifyColumns = function(model, fields) {
  var sql = [];
  var self = this;
  sql = sql.concat(self.getColumnsToAdd(model, fields));
  return sql;
};

SQLConnector.prototype.getColumnsToAdd = function(model, fields) {
  throw new Error(g.f('{{getColumnsToAdd()}} must be implemented by the connector'));
};

SQLConnector.prototype.getDropColumns = function(model, fields) {
  var sql = [];
  var self = this;
  sql = sql.concat(self.getColumnsToDrop(model, fields));
  return sql;
};

SQLConnector.prototype.getColumnsToDrop = function(model, fields) {
  throw new Error(g.f('{{getColumnsToDrop()}} must be implemented by the connector'));
};

SQLConnector.prototype.searchForPropertyInActual = function(model, propName,
  actualFields) {
  var self = this;
  var found = false;
  actualFields.forEach(function(f) {
    if (f.column === self.column(model, propName)) {
      found = f;
      return;
    }
  });
  return found;
};

SQLConnector.prototype.addPropertyToActual = function(model, propName) {
  var self = this;
  var sqlCommand = self.columnEscaped(model, propName) +
    ' ' + self.columnDataType(model, propName) +
    (self.isNullable(self.getPropertyDefinition(model, propName)) ?
    '' : ' NOT NULL');
  return sqlCommand;
};

SQLConnector.prototype.columnDataType = function(model, property) {
  var columnMetadata = this.columnMetadata(model, property);
  var colType = columnMetadata && columnMetadata.dataType;
  if (colType) {
    colType = colType.toUpperCase();
  }
  var prop = this.getModelDefinition(model).properties[property];
  if (!prop) {
    return null;
  }
  var colLength = columnMetadata && columnMetadata.dataLength ||
    prop.length || prop.limit;
  if (colType && colLength) {
    return colType + '(' + colLength + ')';
  }
  return this.buildColumnType(prop);
};

SQLConnector.prototype.buildColumnType = function(property) {
  throw new Error(g.f('{{buildColumnType()}} must be implemented by the connector'));
};

SQLConnector.prototype.propertyHasNotBeenDeleted = function(model, propName) {
  return !!this.getModelDefinition(model).properties[propName];
};

SQLConnector.prototype.applySqlChanges = function(model, pendingChanges, cb) {
  var self = this;
  if (pendingChanges.length) {
    var thisQuery = 'ALTER TABLE ' + self.tableEscaped(model);
    var ranOnce = false;
    pendingChanges.forEach(function(change) {
      if (ranOnce) {
        thisQuery = thisQuery + ' ';
      }
      thisQuery = thisQuery + ' ' + change;
      ranOnce = true;
    });
    self.execute(thisQuery, cb);
  }
};

/**
 * Alters a table
 * @param {String} model The model name
 * @param {Object} fields Fields of the table
 * @param {Object} indexes Indexes of the table
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.alterTable = function(model, fields, indexes, cb) {
  throw new Error(g.f('{{alterTable()}} must be implemented by the connector'));
};

SQLConnector.prototype.checkFieldAndIndex = function(fields, indexes) {
  return true;
};

/**
 * Get the status of a table
 * @param {String} model The model name
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.getTableStatus = function(model, cb) {
  var fields, indexes;
  var self = this;

  this.showFields(model, function(err, data) {
    if (err) return cb(err);
    fields = data;

    self.showIndexes(model, function(err, data) {
      if (err) return cb(err);
      indexes = data;

      if (self.checkFieldAndIndex(fields, indexes))
        return cb(null, fields, indexes);
    });
  });
};

/**
 * Get fields from a table
 * @param {String} model The model name
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.showFields = function(model, cb) {
  throw new Error(g.f('{{showFields()}} must be implemented by the connector'));
};

/**
 * Get indexes from a table
 * @param {String} model The model name
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.showIndexes = function(model, cb) {
  throw new Error(g.f('{{showIndexes()}} must be implemented by the connector'));
};

/**
 * Get types associated with the connector
 * Returns {String[]} The types for the connector
 */
SQLConnector.prototype.getTypes = function() {
  return ['db', 'rdbms', 'sql'];
};

/**
 * Get the default data type for ID
 * @param prop Property definition
 * Returns {Function}
 */
SQLConnector.prototype.getDefaultIdType = function(prop) {
  return Number;
};

/**
 * Get the default database schema name
 * @returns {string} The default schema name, such as 'public' or 'dbo'
 */
SQLConnector.prototype.getDefaultSchemaName = function() {
  return '';
};

/**
 * Get the database schema name for the given model. The schema name can be
 * customized at model settings or connector configuration level as `schema` or
 * `schemaName`. For example,
 *
 * ```json
 * "Customer": {
 *   "name": "Customer",
 *   "mysql": {
 *     "schema": "MYDB",
 *     "table": "CUSTOMER"
 *   }
 * }
 * ```
 *
 * @param {String} model The model name
 * @returns {String} The database schema name
 */
SQLConnector.prototype.schema = function(model) {
  // Check if there is a 'schema' property for connector
  var dbMeta = this.getConnectorSpecificSettings(model);
  var schemaName = (dbMeta && (dbMeta.schema || dbMeta.schemaName)) ||
    (this.settings.schema || this.settings.schemaName) ||
    this.getDefaultSchemaName();
  return schemaName;
};

/**
 * Get the table name for the given model. The table name can be customized
 * at model settings as `table` or `tableName`. For example,
 *
 * ```json
 * "Customer": {
 *   "name": "Customer",
 *   "mysql": {
 *     "table": "CUSTOMER"
 *   }
 * }
 * ```
 *
 * Returns the table name (String).
 * @param {String} model The model name
 */
SQLConnector.prototype.table = function(model) {
  var dbMeta = this.getConnectorSpecificSettings(model);
  var tableName;
  if (dbMeta) {
    tableName = dbMeta.table || dbMeta.tableName;
    if (tableName) {
      // Explicit table name, return as-is
      return tableName;
    }
  }
  tableName = model;
  if (typeof this.dbName === 'function') {
    tableName = this.dbName(tableName);
  }
  return tableName;
};

/**
 * Get the column name for the given model property. The column name can be
 * customized at the model property definition level as `column` or
 * `columnName`. For example,
 *
 * ```json
 * "name": {
 *   "type": "string",
 *   "mysql": {
 *     "column": "NAME"
 *   }
 * }
 * ```
 *
 * @param {String} model The model name
 * @param {String} property The property name
 * @returns {String} The column name
 */
SQLConnector.prototype.column = function(model, property) {
  var prop = this.getPropertyDefinition(model, property);
  var columnName;
  if (prop && prop[this.name]) {
    columnName = prop[this.name].column || prop[this.name].columnName;
    if (columnName) {
      // Explicit column name, return as-is
      return columnName;
    }
  }
  columnName = property;
  if (typeof this.dbName === 'function') {
    columnName = this.dbName(columnName);
  }
  return columnName;
};

/**
 * Get the column metadata for the given model property
 * @param {String} model The model name
 * @param {String} property The property name
 * @returns {Object} The column metadata
 */
SQLConnector.prototype.columnMetadata = function(model, property) {
  return this.getDataSource(model).columnMetadata(model, property);
};

/**
 * Get the corresponding property name for the given column name
 * @param {String} model The model name
 * @param {String} column The column name
 * @returns {String} The property name for a given column
 */
SQLConnector.prototype.propertyName = function(model, column) {
  var props = this.getModelDefinition(model).properties;
  for (var p in props) {
    if (this.column(model, p) === column) {
      return p;
    }
  }
  return null;
};

/**
 * Get the id column name
 * @param {String} model The model name
 * @returns {String} The id column name
 */
SQLConnector.prototype.idColumn = function(model) {
  var name = this.getDataSource(model).idColumnName(model);
  var dbName = this.dbName;
  if (typeof dbName === 'function') {
    name = dbName(name);
  }
  return name;
};

/**
 * Get the escaped id column name
 * @param {String} model The model name
 * @returns {String} the escaped id column name
 */
SQLConnector.prototype.idColumnEscaped = function(model) {
  return this.escapeName(this.idColumn(model));
};

/**
 * Get the escaped table name
 * @param {String} model The model name
 * @returns {String} the escaped table name
 */
SQLConnector.prototype.tableEscaped = function(model) {
  return this.escapeName(this.table(model));
};

/**
 * Get the escaped column name for a given model property
 * @param {String} model The model name
 * @param {String} property The property name
 * @returns {String} The escaped column name
 */
SQLConnector.prototype.columnEscaped = function(model, property) {
  return this.escapeName(this.column(model, property));
};

/*!
 * Check if id value is set
 * @param idValue
 * @param cb
 * @param returningNull
 * @returns {boolean}
 */
function isIdValuePresent(idValue, cb, returningNull) {
  try {
    assert(idValue !== null && idValue !== undefined, 'id value is required');
    return true;
  } catch (err) {
    process.nextTick(function() {
      if (cb) cb(returningNull ? null : err);
    });
    return false;
  }
}

/**
 * Convert the id value to the form required by database column
 * @param {String} model The model name
 * @param {*} idValue The id property value
 * @returns {*} The escaped id column value
 */
SQLConnector.prototype.idColumnValue = function(model, idValue) {
  var idProp = this.getDataSource(model).idProperty(model);
  if (typeof this.toColumnValue === 'function') {
    return this.toColumnValue(idProp, idValue);
  } else {
    return idValue;
  }
};

/**
 * Replace `?` with connector specific placeholders. For example,
 *
 * ```
 * {sql: 'SELECT * FROM CUSTOMER WHERE NAME=?', params: ['John']}
 * ==>
 * {sql: 'SELECT * FROM CUSTOMER WHERE NAME=:1', params: ['John']}
 * ```
 * *LIMITATION*: We don't handle the ? inside escaped values, for example,
 * `SELECT * FROM CUSTOMER WHERE NAME='J?hn'` will not be parameterized
 * correctly.
 *
 * @param {ParameterizedSQL|Object} ps Parameterized SQL
 * @returns {ParameterizedSQL} Parameterized SQL with the connector specific
 * placeholders
 */
SQLConnector.prototype.parameterize = function(ps) {
  ps = new ParameterizedSQL(ps);

  // The value is parameterized, for example
  // {sql: 'to_point(?,?)', values: [1, 2]}
  var parts = ps.sql.split(PLACEHOLDER);
  var clause = [];
  for (var j = 0, m = parts.length; j < m; j++) {
    // Replace ? with the keyed placeholder, such as :5
    clause.push(parts[j]);
    if (j !== parts.length - 1) {
      clause.push(this.getPlaceholderForValue(j + 1));
    }
  }
  ps.sql = clause.join('');
  return ps;
};

/**
 * Build the the `INSERT INTO` statement
 * @param {String} model The model name
 * @param {Object} fields Fields to be inserted
 * @param {Object} options Options object
 * @returns {ParameterizedSQL}
 */
SQLConnector.prototype.buildInsertInto = function(model, fields, options) {
  var stmt = new ParameterizedSQL('INSERT INTO ' + this.tableEscaped(model));
  var columnNames = fields.names.join(',');
  if (columnNames) {
    stmt.merge('(' + columnNames + ')', '');
  }
  return stmt;
};

/**
 * Build the clause to return id values after insert
 * @param {String} model The model name
 * @param {Object} data The model data object
 * @param {Object} options Options object
 * @returns {string}
 */
SQLConnector.prototype.buildInsertReturning = function(model, data, options) {
  return '';
};

/**
 * Build the clause for default values if the fields is empty
 * @param {String} model The model name
 * @param {Object} data The model data object
 * @param {Object} options Options object
 * @returns {string} 'DEFAULT VALUES'
 */
SQLConnector.prototype.buildInsertDefaultValues = function(model, data, options) {
  return 'VALUES()';
};

/**
 * Build INSERT SQL statement
 * @param {String} model The model name
 * @param {Object} data The model data object
 * @param {Object} options The options object
 * @returns {string} The INSERT SQL statement
 */
SQLConnector.prototype.buildInsert = function(model, data, options) {
  var fields = this.buildFields(model, data);
  var insertStmt = this.buildInsertInto(model, fields, options);
  var columnValues = fields.columnValues;
  var fieldNames = fields.names;
  if (fieldNames.length) {
    var values = ParameterizedSQL.join(columnValues, ',');
    values.sql = 'VALUES(' + values.sql + ')';
    insertStmt.merge(values);
  } else {
    insertStmt.merge(this.buildInsertDefaultValues(model, data, options));
  }
  var returning = this.buildInsertReturning(model, data, options);
  if (returning) {
    insertStmt.merge(returning);
  }
  return this.parameterize(insertStmt);
};

/**
 * Execute a SQL statement with given parameters.
 *
 * @param {String} sql The SQL statement
 * @param {*[]} [params] An array of parameter values
 * @param {Object} [options] Options object
 * @param {Function} [callback] The callback function
 */
SQLConnector.prototype.execute = function(sql, params, options, callback) {
  assert(typeof sql === 'string', 'sql must be a string');
  if (typeof params === 'function' && options === undefined &&
    callback === undefined) {
    // execute(sql, callback)
    options = {};
    callback = params;
    params = [];
  } else if (typeof options === 'function' && callback === undefined) {
    // execute(sql, params, callback)
    callback = options;
    options = {};
  }
  params = params || [];
  options = options || {};
  assert(Array.isArray(params), 'params must be an array');
  assert(typeof options === 'object', 'options must be an object');
  assert(typeof callback === 'function', 'callback must be a function');

  var self = this;
  if (!this.dataSource.connected) {
    return this.dataSource.once('connected', function() {
      self.execute(sql, params, options, callback);
    });
  }
  var context = {
    req: {
      sql: sql,
      params: params,
    },
    options: options,
  };
  this.notifyObserversAround('execute', context, function(context, done) {
    self.executeSQL(context.req.sql, context.req.params, context.options,
    function(err, info) {
      if (err) {
        debug('Error: %j %j %j', err, context.req.sql, context.req.params);
      }

      if (!err && info != null) {
        context.res = info;
      }
      // Don't pass more than one args as it will confuse async.waterfall
      done(err, info);
    });
  }, callback);
};

/**
 * Create the data model in MySQL
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Object} options Options object
 * @param {Function} [callback] The callback function
 */
SQLConnector.prototype.create = function(model, data, options, callback) {
  var self = this;
  var stmt = this.buildInsert(model, data, options);
  this.execute(stmt.sql, stmt.params, options, function(err, info) {
    if (err) {
      callback(err);
    } else {
      var insertedId = self.getInsertedId(model, info);
      callback(err, insertedId);
    }
  });
};

/**
 * Save the model instance into the database
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Object} options Options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.save = function(model, data, options, cb) {
  var idName = this.idName(model);
  var idValue = data[idName];

  if (!isIdValuePresent(idValue, cb)) {
    return;
  }

  var where = {};
  where[idName] = idValue;

  var updateStmt = new ParameterizedSQL('UPDATE ' + this.tableEscaped(model));
  updateStmt.merge(this.buildFieldsForUpdate(model, data));
  var whereStmt = this.buildWhere(model, where);
  updateStmt.merge(whereStmt);
  updateStmt = this.parameterize(updateStmt);
  this.execute(updateStmt.sql, updateStmt.params, options,
    function(err, result) {
      if (cb) cb(err, result);
    });
};

/**
 * Check if a model instance exists for the given id value
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Object} options Options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.exists = function(model, id, options, cb) {
  if (!isIdValuePresent(id, cb, true)) {
    return;
  }
  var idName = this.idName(model);
  var where = {};
  where[idName] = id;
  var selectStmt = new ParameterizedSQL(
    'SELECT 1 FROM ' + this.tableEscaped(model) +
    ' WHERE ' + this.idColumnEscaped(model)
  );
  selectStmt.merge(this.buildWhere(model, where));
  selectStmt = this.applyPagination(model, selectStmt, {
    limit: 1,
    offset: 0,
    order: [idName],
  });
  selectStmt = this.parameterize(selectStmt);

  this.execute(selectStmt.sql, selectStmt.params, options, function(err, data) {
    if (!cb) return;
    if (err) {
      cb(err);
    } else {
      cb(null, data.length >= 1);
    }
  });
};

/**
 * ATM, this method is not used by loopback-datasource-juggler dao, which
 * maps `destroy` to `destroyAll` with a `where` filter that includes the `id`
 * instead.
 *
 * Delete a model instance by id value
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Object} options Options object
 * @param {Function} cb The callback function
 * @private
 */
SQLConnector.prototype.destroy = function(model, id, options, cb) {
  if (!isIdValuePresent(id, cb, true)) {
    return;
  }
  var idName = this.idName(model);
  var where = {};
  where[idName] = id;
  this.destroyAll(model, where, options, cb);
};

// Alias to `destroy`. Juggler checks `destroy` only.
Connector.defineAliases(SQLConnector.prototype, 'destroy',
  ['delete', 'deleteById', 'destroyById']);

/**
 * Build the `DELETE FROM` SQL statement
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} options Options object
 * @returns {ParameterizedSQL} The SQL DELETE FROM statement
 */
SQLConnector.prototype.buildDelete = function(model, where, options) {
  var deleteStmt = new ParameterizedSQL('DELETE FROM ' +
    this.tableEscaped(model));
  deleteStmt.merge(this.buildWhere(model, where));
  return this.parameterize(deleteStmt);
};

/**
 * Delete all matching model instances
 *
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.destroyAll = function(model, where, options, cb) {
  var stmt = this.buildDelete(model, where, options);
  this._executeAlteringQuery(model, stmt.sql, stmt.params, options, cb || NOOP);
};

// Alias to `destroyAll`. Juggler checks `destroyAll` only.
Connector.defineAliases(SQLConnector.prototype, 'destroyAll', ['deleteAll']);

/**
 * ATM, this method is not used by loopback-datasource-juggler dao, which
 * maps `updateAttributes` to `update` with a `where` filter that includes the
 * `id` instead.
 *
 * Update attributes for a given model instance
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Object} data The model data instance containing all properties to
 * be updated
 * @param {Object} options Options object
 * @param {Function} cb The callback function
 * @private
 */
SQLConnector.prototype.updateAttributes = function(model, id, data, options, cb) {
  if (!isIdValuePresent(id, cb)) return;
  var where = this._buildWhereObjById(model, id, data);
  this.updateAll(model, where, data, options, cb);
};

/**
 * Replace attributes for a given model instance
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Object} data The model data instance containing all properties to
 * be replaced
 * @param {Object} options Options object
 * @param {Function} cb The callback function
 * @private
 */
SQLConnector.prototype.replaceById = function(model, id, data, options, cb) {
  if (!isIdValuePresent(id, cb)) return;
  var where = this._buildWhereObjById(model, id, data);
  this._replace(model, where, data, options, cb);
};

/*
 * @param model The model name.
 * @param id The instance ID.
 * @param {Object} data The data Object.
 * @returns {Object} where The where object for a spcific instance.
 * @private
 */
SQLConnector.prototype._buildWhereObjById = function(model, id, data) {
  var idName = this.idName(model);
  delete data[idName];
  var where = {};
  where[idName] = id;
  return where;
};

/**
 * Build the UPDATE statement
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} data The data to be changed
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 * @returns {ParameterizedSQL} The UPDATE SQL statement
 */
SQLConnector.prototype.buildUpdate = function(model, where, data, options) {
  var fields = this.buildFieldsForUpdate(model, data);
  return this._constructUpdateQuery(model, where, fields);
};

/**
 * Build the UPDATE statement for replacing
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} data The data to be changed
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 * @returns {ParameterizedSQL} The UPDATE SQL statement for replacing fields
 */
SQLConnector.prototype.buildReplace = function(model, where, data, options) {
  var fields = this.buildFieldsForReplace(model, data);
  return this._constructUpdateQuery(model, where, fields);
};

/*
 * @param model The model name.
 * @param {} where The where object.
 * @param {Object} field The parameterizedSQL fileds.
 * @returns {Object} update query Constructed update query.
 * @private
 */
SQLConnector.prototype._constructUpdateQuery = function(model, where, fields) {
  var updateClause = new ParameterizedSQL('UPDATE ' + this.tableEscaped(model));
  var whereClause = this.buildWhere(model, where);
  updateClause.merge([fields, whereClause]);
  return this.parameterize(updateClause);
};

/**
 * Update all instances that match the where clause with the given data
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} data The property/value object representing changes
 * to be made
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.update = function(model, where, data, options, cb) {
  var stmt = this.buildUpdate(model, where, data, options);
  this._executeAlteringQuery(model, stmt.sql, stmt.params, options, cb || NOOP);
};

/**
 * Replace all instances that match the where clause with the given data
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} data The property/value object representing changes
 * to be made
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype._replace = function(model, where, data, options, cb) {
  var self = this;
  var stmt = this.buildReplace(model, where, data, options);
  this.execute(stmt.sql, stmt.params, options, function(err, info) {
    if (err) return cb(err);
    var affectedRows = self.getCountForAffectedRows(model, info);
    var rowCount = typeof (affectedRows) === 'number' ?
      affectedRows : info.affectedRows;
    if (rowCount === 0) {
      return cb(errorIdNotFoundForReplace(where.id));
    } else {
      return cb(null, info);
    }
  });
};

function errorIdNotFoundForReplace(idValue) {
  var msg = g.f('Could not replace. Object with id %s does not exist!', idValue);
  var error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

SQLConnector.prototype._executeAlteringQuery = function(model, sql, params, options, cb) {
  var self = this;
  this.execute(sql, params, options, function(err, info) {
    var affectedRows = self.getCountForAffectedRows(model, info);
    cb(err, {count: affectedRows});
  });
};

// Alias to `update` and `replace`. Juggler checks `update` and `replace` only.
Connector.defineAliases(SQLConnector.prototype, 'update', ['updateAll']);
Connector.defineAliases(SQLConnector.prototype, 'replace', ['replaceAll']);

/**
 * Build the SQL WHERE clause for the where object
 * @param {string} model Model name
 * @param {object} where An object for the where conditions
 * @returns {ParameterizedSQL} The SQL WHERE clause
 */
SQLConnector.prototype.buildWhere = function(model, where) {
  var whereClause = this._buildWhere(model, where);
  if (whereClause.sql) {
    whereClause.sql = 'WHERE ' + whereClause.sql;
  }
  return whereClause;
};

/**
 * Build SQL expression
 * @param {String} columnName Escaped column name
 * @param {String} operator SQL operator
 * @param {*} columnValue Column value
 * @param {*} propertyValue Property value
 * @returns {ParameterizedSQL} The SQL expression
 */
SQLConnector.prototype.buildExpression =
function(columnName, operator, columnValue, propertyValue) {
  function buildClause(columnValue, separator, grouping) {
    var values = [];
    for (var i = 0, n = columnValue.length; i < n; i++) {
      if (columnValue[i] instanceof ParameterizedSQL) {
        values.push(columnValue[i]);
      } else {
        values.push(new ParameterizedSQL(PLACEHOLDER, [columnValue[i]]));
      }
    }
    separator = separator || ',';
    var clause = ParameterizedSQL.join(values, separator);
    if (grouping) {
      clause.sql = '(' + clause.sql + ')';
    }
    return clause;
  }

  var sqlExp = columnName;
  var clause;
  if (columnValue instanceof ParameterizedSQL) {
    clause = columnValue;
  } else {
    clause = new ParameterizedSQL(PLACEHOLDER, [columnValue]);
  }
  switch (operator) {
    case 'gt':
      sqlExp += '>';
      break;
    case 'gte':
      sqlExp += '>=';
      break;
    case 'lt':
      sqlExp += '<';
      break;
    case 'lte':
      sqlExp += '<=';
      break;
    case 'between':
      sqlExp += ' BETWEEN ';
      clause = buildClause(columnValue, ' AND ', false);
      break;
    case 'inq':
      sqlExp += ' IN ';
      clause = buildClause(columnValue, ',', true);
      break;
    case 'nin':
      sqlExp += ' NOT IN ';
      clause = buildClause(columnValue, ',', true);
      break;
    case 'neq':
      if (columnValue == null) {
        return new ParameterizedSQL(sqlExp + ' IS NOT NULL');
      }
      sqlExp += '!=';
      break;
    case 'like':
      sqlExp += ' LIKE ';
      break;
    case 'nlike':
      sqlExp += ' NOT LIKE ';
      break;
    // this case not needed since each database has its own regex syntax, but
    // we leave the MySQL syntax here as a placeholder
    case 'regexp':
      sqlExp += ' REGEXP ';
      break;
  }
  var stmt = ParameterizedSQL.join([sqlExp, clause], '');
  return stmt;
};

/*!
 * @param model
 * @param where
 * @returns {ParameterizedSQL}
 * @private
 */
SQLConnector.prototype._buildWhere = function(model, where) {
  if (!where) {
    return new ParameterizedSQL('');
  }
  if (typeof where !== 'object' || Array.isArray(where)) {
    debug('Invalid value for where: %j', where);
    return new ParameterizedSQL('');
  }
  var self = this;
  var props = self.getModelDefinition(model).properties;

  var whereStmts = [];
  for (var key in where) {
    var stmt = new ParameterizedSQL('', []);
    // Handle and/or operators
    if (key === 'and' || key === 'or') {
      var branches = [];
      var branchParams = [];
      var clauses = where[key];
      if (Array.isArray(clauses)) {
        for (var i = 0, n = clauses.length; i < n; i++) {
          var stmtForClause = self._buildWhere(model, clauses[i]);
          if (stmtForClause.sql) {
            stmtForClause.sql = '(' + stmtForClause.sql + ')';
            branchParams = branchParams.concat(stmtForClause.params);
            branches.push(stmtForClause.sql);
          }
        }
        stmt.merge({
          sql: branches.join(' ' + key.toUpperCase() + ' '),
          params: branchParams,
        });
        whereStmts.push(stmt);
        continue;
      }
      // The value is not an array, fall back to regular fields
    }
    var p = props[key];
    if (p == null) {
      // Unknown property, ignore it
      debug('Unknown property %s is skipped for model %s', key, model);
      continue;
    }
    /* eslint-disable one-var */
    var columnName = self.columnEscaped(model, key);
    var expression = where[key];
    var columnValue;
    var sqlExp;
    /* eslint-enable one-var */
    if (expression === null || expression === undefined) {
      stmt.merge(columnName + ' IS NULL');
    } else if (expression && expression.constructor === Object) {
      var operator = Object.keys(expression)[0];
      // Get the expression without the operator
      expression = expression[operator];
      if (operator === 'inq' || operator === 'nin' || operator === 'between') {
        columnValue = [];
        if (Array.isArray(expression)) {
          // Column value is a list
          for (var j = 0, m = expression.length; j < m; j++) {
            columnValue.push(this.toColumnValue(p, expression[j]));
          }
        } else {
          columnValue.push(this.toColumnValue(p, expression));
        }
        if (operator === 'between') {
          // BETWEEN v1 AND v2
          var v1 = columnValue[0] === undefined ? null : columnValue[0];
          var v2 = columnValue[1] === undefined ? null : columnValue[1];
          columnValue = [v1, v2];
        } else {
          // IN (v1,v2,v3) or NOT IN (v1,v2,v3)
          if (columnValue.length === 0) {
            if (operator === 'inq') {
              columnValue = [null];
            } else {
              // nin () is true
              continue;
            }
          }
        }
      } else if (operator === 'regexp' && expression instanceof RegExp) {
        // do not coerce RegExp based on property definitions
        columnValue = expression;
      } else {
        columnValue = this.toColumnValue(p, expression);
      }
      sqlExp = self.buildExpression(
        columnName, operator, columnValue, p);
      stmt.merge(sqlExp);
    } else {
      // The expression is the field value, not a condition
      columnValue = self.toColumnValue(p, expression);
      if (columnValue === null) {
        stmt.merge(columnName + ' IS NULL');
      } else {
        if (columnValue instanceof ParameterizedSQL) {
          stmt.merge(columnName + '=').merge(columnValue);
        } else {
          stmt.merge({
            sql: columnName + '=?',
            params: [columnValue],
          });
        }
      }
    }
    whereStmts.push(stmt);
  }
  var params = [];
  var sqls = [];
  for (var k = 0, s = whereStmts.length; k < s; k++) {
    sqls.push(whereStmts[k].sql);
    params = params.concat(whereStmts[k].params);
  }
  var whereStmt = new ParameterizedSQL({
    sql: sqls.join(' AND '),
    params: params,
  });
  return whereStmt;
};

/**
 * Build the ORDER BY clause
 * @param {string} model Model name
 * @param {string[]} order An array of sorting criteria
 * @returns {string} The ORDER BY clause
 */
SQLConnector.prototype.buildOrderBy = function(model, order) {
  if (!order) {
    return '';
  }
  var self = this;
  if (typeof order === 'string') {
    order = [order];
  }
  var clauses = [];
  for (var i = 0, n = order.length; i < n; i++) {
    var t = order[i].split(/[\s,]+/);
    if (t.length === 1) {
      clauses.push(self.columnEscaped(model, order[i]));
    } else {
      clauses.push(self.columnEscaped(model, t[0]) + ' ' + t[1]);
    }
  }
  return 'ORDER BY ' + clauses.join(',');
};

/**
 * Build an array of fields for the database operation
 * @param {String} model Model name
 * @param {Object} data Model data object
 * @param {Boolean} excludeIds Exclude id properties or not, default to false
 * @returns {{names: Array, values: Array, properties: Array}}
 */
SQLConnector.prototype.buildFields = function(model, data, excludeIds) {
  var keys = Object.keys(data);
  return this._buildFieldsForKeys(model, data, keys, excludeIds);
};

/**
 * Build an array of fields for the replace database operation
 * @param {String} model Model name
 * @param {Object} data Model data object
 * @param {Boolean} excludeIds Exclude id properties or not, default to false
 * @returns {{names: Array, values: Array, properties: Array}}
 */
SQLConnector.prototype.buildReplaceFields = function(model, data, excludeIds) {
  var props = this.getModelDefinition(model).properties;
  var keys = Object.keys(props);
  return this._buildFieldsForKeys(model, data, keys, excludeIds);
};

/*
 * @param {String} model The model name.
 * @returns {Object} data The model data object.
 * @returns {Array} keys The key fields for which need to be built.
 * @param {Boolean} excludeIds Exclude id properties or not, default to false
 * @private
 */
SQLConnector.prototype._buildFieldsForKeys = function(model, data, keys, excludeIds) {
  var props = this.getModelDefinition(model).properties;
  var fields = {
    names: [], // field names
    columnValues: [], // an array of ParameterizedSQL
    properties: [], // model properties
  };
  for (var i = 0, n = keys.length; i < n; i++) {
    var key = keys[i];
    var p = props[key];
    if (p == null) {
      // Unknown property, ignore it
      debug('Unknown property %s is skipped for model %s', key, model);
      continue;
    }

    if (excludeIds && p.id) {
      continue;
    }
    var k = this.columnEscaped(model, key);
    var v = this.toColumnValue(p, data[key]);
    if (v !== undefined) {
      fields.names.push(k);
      if (v instanceof ParameterizedSQL) {
        fields.columnValues.push(v);
      } else {
        fields.columnValues.push(new ParameterizedSQL(PLACEHOLDER, [v]));
      }
      fields.properties.push(p);
    }
  }
  return fields;
};

/**
 * Build the SET clause for database update.
 * @param {String} model Model name.
 * @param {Object} data The model data object.
 * @param {Boolean} excludeIds Exclude id properties or not, default to true.
 * @returns {string} The list of fields for update query.
 */
SQLConnector.prototype.buildFieldsForUpdate = function(model, data, excludeIds) {
  if (excludeIds === undefined) {
    excludeIds = true;
  }
  var fields = this.buildFields(model, data, excludeIds);
  return this._constructUpdateParameterizedSQL(fields);
};

/**
 * Build the SET clause for database replace through update query.
 * @param {String} model Model name.
 * @param {Object} data The model data object.
 * @param {Boolean} excludeIds Exclude id properties or not, default to true.
 * @returns {string} The list of fields for update query.
 */
SQLConnector.prototype.buildFieldsForReplace = function(model, data, excludeIds) {
  if (excludeIds === undefined) {
    excludeIds = true;
  }
  var fields = this.buildReplaceFields(model, data, excludeIds);
  return this._constructUpdateParameterizedSQL(fields);
};

/*
 * @param {Object} field The fileds.
 * @returns {Object} parameterizedSQL.
 * @private
 */
SQLConnector.prototype._constructUpdateParameterizedSQL = function(fields) {
  var columns = new ParameterizedSQL('');
  for (var i = 0, n = fields.names.length; i < n; i++) {
    var clause = ParameterizedSQL.append(fields.names[i],
      fields.columnValues[i], '=');
    columns.merge(clause, ',');
  }
  columns.sql = 'SET ' + columns.sql;
  return columns;
};

/**
 * Build a list of escaped column names for the given model and fields filter
 * @param {string} model Model name
 * @param {object} filter The filter object
 * @returns {string} Comma separated string of escaped column names
 */
SQLConnector.prototype.buildColumnNames = function(model, filter) {
  var fieldsFilter = filter && filter.fields;
  var cols = this.getModelDefinition(model).properties;
  if (!cols) {
    return '*';
  }
  var self = this;
  var keys = Object.keys(cols);
  if (Array.isArray(fieldsFilter) && fieldsFilter.length > 0) {
    // Not empty array, including all the fields that are valid properties
    keys = fieldsFilter.filter(function(f) {
      return cols[f];
    });
  } else if ('object' === typeof fieldsFilter &&
    Object.keys(fieldsFilter).length > 0) {
    // { field1: boolean, field2: boolean ... }
    var included = [];
    var excluded = [];
    keys.forEach(function(k) {
      if (fieldsFilter[k]) {
        included.push(k);
      } else if ((k in fieldsFilter) && !fieldsFilter[k]) {
        excluded.push(k);
      }
    });
    if (included.length > 0) {
      keys = included;
    } else if (excluded.length > 0) {
      excluded.forEach(function(e) {
        var index = keys.indexOf(e);
        keys.splice(index, 1);
      });
    }
  }
  var names = keys.map(function(c) {
    return self.columnEscaped(model, c);
  });
  return names.join(',');
};

/**
 * Build a SQL SELECT statement
 * @param {String} model Model name
 * @param {Object} filter Filter object
 * @param {Object} options Options object
 * @returns {ParameterizedSQL} Statement object {sql: ..., params: [...]}
 */
SQLConnector.prototype.buildSelect = function(model, filter, options) {
  if (!filter.order) {
    var idNames = this.idNames(model);
    if (idNames && idNames.length) {
      filter.order = idNames;
    }
  }

  var selectStmt = new ParameterizedSQL('SELECT ' +
    this.buildColumnNames(model, filter) +
    ' FROM ' + this.tableEscaped(model)
  );

  if (filter) {
    if (filter.where) {
      var whereStmt = this.buildWhere(model, filter.where);
      selectStmt.merge(whereStmt);
    }

    if (filter.order) {
      selectStmt.merge(this.buildOrderBy(model, filter.order));
    }

    if (filter.limit || filter.skip || filter.offset) {
      selectStmt = this.applyPagination(
        model, selectStmt, filter);
    }
  }
  return this.parameterize(selectStmt);
};

/**
 * Transform the row data into a model data object
 * @param {string} model Model name
 * @param {object} rowData An object representing the row data from DB
 * @returns {object} Model data object
 */
SQLConnector.prototype.fromRow = SQLConnector.prototype.fromDatabase =
function(model, rowData) {
  if (rowData == null) {
    return rowData;
  }
  var props = this.getModelDefinition(model).properties;
  var data = {};
  for (var p in props) {
    var columnName = this.column(model, p);
    // Load properties from the row
    var columnValue = this.fromColumnValue(props[p], rowData[columnName]);
    if (columnValue !== undefined) {
      data[p] = columnValue;
    }
  }
  return data;
};

/**
 * Find matching model instances by the filter
 *
 * Please also note the name `all` is confusing. `Model.find` is to find all
 * matching instances while `Model.findById` is to find an instance by id. On
 * the other hand, `Connector.prototype.all` implements `Model.find` while
 * `Connector.prototype.find` implements `Model.findById` due to the `bad`
 * naming convention we inherited from juggling-db.
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [cb] The cb function
 */
SQLConnector.prototype.all = function find(model, filter, options, cb) {
  var self = this;
  // Order by id if no order is specified
  filter = filter || {};
  var stmt = this.buildSelect(model, filter, options);
  this.execute(stmt.sql, stmt.params, options, function(err, data) {
    if (err) {
      return cb(err, []);
    }

    var objs = data.map(function(obj) {
      return self.fromRow(model, obj);
    });
    if (filter && filter.include) {
      self.getModelDefinition(model).model.include(
        objs, filter.include, options, cb);
    } else {
      cb(null, objs);
    }
  });
};

// Alias to `all`. Juggler checks `all` only.
Connector.defineAliases(SQLConnector.prototype, 'all', ['findAll']);

/**
 * ATM, this method is not used by loopback-datasource-juggler dao, which
 * maps `findById` to `find` with a `where` filter that includes the `id`
 * instead.
 *
 * Please also note the name `find` is confusing. `Model.find` is to find all
 * matching instances while `Model.findById` is to find an instance by id. On
 * the other hand, `Connector.prototype.find` is for `findById` and
 * `Connector.prototype.all` is for `find` due the `bad` convention used by
 * juggling-db.
 *
 * Find by id
 * @param {String} model The Model name
 * @param {*} id The id value
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 * @private
 */
SQLConnector.prototype.find = function(model, id, options, cb) {
  if (id == null) {
    process.nextTick(function() {
      var err = new Error(g.f('id value is required'));
      if (cb) {
        cb(err);
      }
    });
    return;
  }
  var where = {};
  var idName = this.idName(model);
  where[idName] = id;

  var filter = {limit: 1, offset: 0, order: idName, where: where};
  return this.all(model, filter, options, function(err, results) {
    cb(err, (results && results[0]) || null);
  });
};
// Alias to `find`. Juggler checks `findById` only.
Connector.defineAliases(SQLConnector.prototype, 'find', ['findById']);

/**
 * Count all model instances by the where filter
 *
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
SQLConnector.prototype.count = function(model, where, options, cb) {
  if (typeof where === 'function') {
    // Backward compatibility for 1.x style signature:
    // count(model, cb, where)
    var tmp = options;
    cb = where;
    where = tmp;
  }

  var stmt = new ParameterizedSQL('SELECT count(*) as "cnt" FROM ' +
    this.tableEscaped(model));
  stmt = stmt.merge(this.buildWhere(model, where));
  stmt = this.parameterize(stmt);
  this.execute(stmt.sql, stmt.params,
    function(err, res) {
      if (err) {
        return cb(err);
      }
      var c = (res && res[0] && res[0].cnt) || 0;
      // Some drivers return count as a string to contain bigint
      // See https://github.com/brianc/node-postgres/pull/427
      cb(err, Number(c));
    });
};

/**
 * Drop the table for the given model from the database
 * @param {String} model The model name
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.dropTable = function(model, cb) {
  this.execute('DROP TABLE IF EXISTS ' + this.tableEscaped(model), cb);
};

/**
 * Create the table for the given model
 * @param {String} model The model name
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.createTable = function(model, cb) {
  var sql = 'CREATE TABLE ' + this.tableEscaped(model) +
    ' (\n  ' + this.buildColumnDefinitions(model) + '\n)';
  this.execute(sql, cb);
};

/**
 * Recreate the tables for the given models
 * @param {[String]|String} [models] A model name or an array of model names,
 * if not present, apply to all models defined in the connector
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.automigrate = function(models, cb) {
  var self = this;

  if ((!cb) && ('function' === typeof models)) {
    cb = models;
    models = undefined;
  }
  // First argument is a model name
  if ('string' === typeof models) {
    models = [models];
  }

  models = models || Object.keys(self._models);
  if (models.length === 0) {
    return process.nextTick(cb);
  }

  var invalidModels = models.filter(function(m) {
    return !(m in self._models);
  });
  if (invalidModels.length) {
    return process.nextTick(function() {
      cb(new Error(g.f('Cannot migrate models not attached to this datasource: %s',
        invalidModels.join(' '))));
    });
  }

  async.each(models, function(model, done) {
    self.dropTable(model, function(err) {
      if (err) {
        // TODO(bajtos) should we abort here and call cb(err)?
        // The original code in juggler ignored the error completely
        console.error(err);
      }
      self.createTable(model, function(err, result) {
        if (err) {
          console.error(err);
        }
        done(err, result);
      });
    });
  }, cb);
};

/**
 * Serialize an object into JSON string or other primitive types so that it
 * can be saved into a RDB column
 * @param {Object} obj The object value
 * @returns {*}
 */
SQLConnector.prototype.serializeObject = function(obj) {
  var val;
  if (obj && typeof obj.toJSON === 'function') {
    obj = obj.toJSON();
  }
  if (typeof obj !== 'string') {
    val = JSON.stringify(obj);
  } else {
    val = obj;
  }
  return val;
};

/*!
 * @param obj
 */
SQLConnector.prototype.escapeObject = function(obj) {
  var val = this.serializeObject(obj);
  return this.escapeValue(val);
};

/**
 * The following _abstract_ methods have to be implemented by connectors that
 * extend from SQLConnector to reuse the base implementations of CRUD methods
 * from SQLConnector
 */

/**
 * Converts a model property value into the form required by the
 * database column. The result should be one of following forms:
 *
 * - {sql: "point(?,?)", params:[10,20]}
 * - {sql: "'John'", params: []}
 * - "John"
 *
 * @param {Object} propertyDef Model property definition
 * @param {*} value Model property value
 * @returns {ParameterizedSQL|*} Database column value.
 *
 */
SQLConnector.prototype.toColumnValue = function(propertyDef, value) {
  throw new Error(g.f('{{toColumnValue()}} must be implemented by the connector'));
};

/**
 * Convert the data from database column to model property
 * @param {object} propertyDef Model property definition
 * @param {*) value Column value
 * @returns {*} Model property value
 */
SQLConnector.prototype.fromColumnValue = function(propertyDef, value) {
  throw new Error(g.f('{{fromColumnValue()}} must be implemented by the connector'));
};

/**
 * Escape the name for the underlying database
 * @param {String} name The name
 * @returns {String} An escaped name for SQL
 */
SQLConnector.prototype.escapeName = function(name) {
  throw new Error(g.f('{{escapeName()}} must be implemented by the connector'));
};

/**
 * Escape the name for the underlying database
 * @param {String} value The value to be escaped
 * @returns {*} An escaped value for SQL
 */
SQLConnector.prototype.escapeValue = function(value) {
  throw new Error(g.f('{{escapeValue()}} must be implemented by the connector'));
};

/**
 * Get the place holder in SQL for identifiers, such as ??
 * @param {String} key Optional key, such as 1 or id
 * @returns {String} The place holder
 */
SQLConnector.prototype.getPlaceholderForIdentifier = function(key) {
  throw new Error(g.f('{{getPlaceholderForIdentifier()}} must be implemented by ' +
    'the connector'));
};

/**
 * Get the place holder in SQL for values, such as :1 or ?
 * @param {String} key Optional key, such as 1 or id
 * @returns {String} The place holder
 */
SQLConnector.prototype.getPlaceholderForValue = function(key) {
  throw new Error(g.f('{{getPlaceholderForValue()}} must be implemented by ' +
    'the connector'));
};

/**
 * Build a new SQL statement with pagination support by wrapping the given sql
 * @param {String} model The model name
 * @param {ParameterizedSQL} stmt The sql statement
 * @param {Object} filter The filter object from the query
 */
SQLConnector.prototype.applyPagination = function(model, stmt, filter) {
  throw new Error(g.f('{{applyPagination()}} must be implemented by the connector'));
};

/**
 * Parse the result for SQL UPDATE/DELETE/INSERT for the number of rows
 * affected
 * @param {String} model Model name
 * @param {Object} info Status object
 * @returns {Number} Number of rows affected
 */
SQLConnector.prototype.getCountForAffectedRows = function(model, info) {
  throw new Error(g.f('{{getCountForAffectedRows()}} must be implemented by ' +
    'the connector'));
};

/**
 * Parse the result for SQL INSERT for newly inserted id
 * @param {String} model Model name
 * @param {Object} info The status object from driver
 * @returns {*} The inserted id value
 */
SQLConnector.prototype.getInsertedId = function(model, info) {
  throw new Error(g.f('{{getInsertedId()}} must be implemented by the connector'));
};

/**
 * Execute a SQL statement with given parameters
 * @param {String} sql The SQL statement
 * @param {*[]} [params] An array of parameter values
 * @param {Object} [options] Options object
 * @param {Function} [callback] The callback function
 */
SQLConnector.prototype.executeSQL = function(sql, params, options, callback) {
  throw new Error(g.f('{{executeSQL()}} must be implemented by the connector'));
};

// Refactored Discovery methods

/**
 * Build sql for listing schemas
 * @param {Object} options Options for discoverDatabaseSchemas
 */
SQLConnector.prototype.buildQuerySchemas = function(options) {
  var sql = 'SELECT catalog_name as "catalog",' +
   ' schema_name as "schema"' +
   ' FROM information_schema.schemata';
  return this.paginateSQL(sql, 'schema_name', options);
};

/**
 * Paginate the results returned from database
 * @param {String} sql The sql to execute
 * @param {Object} orderBy The property name by which results are ordered
 * @param {Object} options Options for discoverDatabaseSchemas
 */
SQLConnector.prototype.paginateSQL = function(sql, orderBy, options) {
  throw new Error(g.f('{{paginateSQL}} must be implemented by the connector'));
};
/**
 * Discover database schemas
 *
 // * @param {Object} options Options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverDatabaseSchemas = function(options, cb) {
  if (!cb && typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};
  var self = this;
  this.execute(self.buildQuerySchemas(options), cb);
};

/*!
 * Build sql for listing tables
 * @param options {all: for all owners, owner: for a given owner}
 * @returns {string} The sql statement
 */
 // Due to the different implementation structure of information_schema across
 // connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryTables = function(options) {
  throw new Error(g.f('{{buildQueryTables}} must be implemented by the connector'));
};

/*!
 * Build sql for listing views
 * @param options {all: for all owners, owner: for a given owner}
 * @returns {string} The sql statement
 */
 // Due to the different implementation structure of information_schema across
 // connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryViews = function(options) {
  throw new Error(g.f('{{buildQueryViews}} must be implemented by the connector'));
};

/**
 * Discover model definitions
 *
 * @param {Object} options Options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverModelDefinitions = function(options, cb) {
  if (!cb && typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};

  var self = this;
  var calls = [function(callback) {
    self.execute(self.buildQueryTables(options), callback);
  }];

  if (options.views) {
    calls.push(function(callback) {
      self.execute(self.buildQueryViews(options), callback);
    });
  }
  async.parallel(calls, function(err, data) {
    if (err) {
      cb(err, data);
    } else {
      var merged = [];
      merged = merged.concat(data.shift());
      if (data.length) {
        merged = merged.concat(data.shift());
      }
      cb(err, merged);
    }
  });
};

/**
 * Build sql for listing columns
 * @param {String} schema The schema name
 * @param {String} table The table name
 */
// Due to the different implementation structure of information_schema across
// connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryColumns = function(schema, table) {
  throw new Error(g.f('{{buildQueryColumns}} must be implemented by the connector'));
};

/**
 * Map the property type from database to loopback
 * @param {Object} columnDefinition The columnDefinition of the table/schema
 * @param {Object} options The options for the connector
 */
SQLConnector.prototype.buildPropertyType = function(columnDefinition, options) {
  throw new Error(g.f('{{buildPropertyType}} must be implemented by the connector'));
};

/*!
 * Normalize the arguments
 * @param table string, required
 * @param options object, optional
 * @param cb function, optional
 */
SQLConnector.prototype.getArgs = function(table, options, cb) {
  throw new Error(g.f('{{getArgs}} must be implemented by the connector'));
};

/**
 * Discover model properties from a table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverModelProperties = function(table, options, cb) {
  var self = this;
  var args = self.getArgs(table, options, cb);
  var schema = args.schema;

  table = args.table;
  options = args.options;

  if (!schema) {
    schema = self.getDefaultSchema();
  }

  self.setDefaultOptions(options);
  cb = args.cb;

  var sql = self.buildQueryColumns(schema, table);
  var callback = function(err, results) {
    if (err) {
      cb(err, results);
    } else {
      results.map(function(r) {
        r.type = self.buildPropertyType(r, options);
        self.setNullableProperty(r);
      });
      cb(err, results);
    }
  };
  this.execute(sql, callback);
};

/*!
 * Build the sql statement for querying primary keys of a given table
 * @param schema
 * @param table
 * @returns {string}
 */
// http://docs.oracle.com/javase/6/docs/api/java/sql/DatabaseMetaData.html
// #getPrimaryKeys(java.lang.String, java.lang.String, java.lang.String)
// Due to the different implementation structure of information_schema across
// connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryPrimaryKeys = function(schema, table) {
  throw new Error(g.f('{{buildQueryPrimaryKeys}} must be implemented by the connector'));
};

/**
 * Discover primary keys for a given table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverPrimaryKeys = function(table, options, cb) {
  var self = this;
  var args = self.getArgs(table, options, cb);
  var schema = args.schema;

  if (typeof(self.getDefaultSchema) === 'function' && !schema) {
    schema = self.getDefaultSchema();
  }
  table = args.table;
  options = args.options;
  cb = args.cb;

  var sql = self.buildQueryPrimaryKeys(schema, table);
  this.execute(sql, cb);
};

/*!
 * Build the sql statement for querying foreign keys of a given table
 * @param schema
 * @param table
 * @returns {string}
 */
 // Due to the different implementation structure of information_schema across
 // connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryForeignKeys = function(schema, table) {
  throw new Error(g.f('{{buildQueryForeignKeys}} must be implemented by the connector'));
};

/**
 * Discover foreign keys for a given table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverForeignKeys = function(table, options, cb) {
  var self = this;
  var args = self.getArgs(table, options, cb);
  var schema = args.schema;

  if (typeof(self.getDefaultSchema) === 'function' && !schema) {
    schema = self.getDefaultSchema();
  }
  table = args.table;
  options = args.options;
  cb = args.cb;

  var sql = self.buildQueryForeignKeys(schema, table);
  this.execute(sql, cb);
};

/*!
 * Retrieves a description of the foreign key columns that reference the
 * given table's primary key columns (the foreign keys exported by a table).
 * They are ordered by fkTableOwner, fkTableName, and keySeq.
 * @param schema
 * @param table
 * @returns {string}
 */
 // Due to the different implementation structure of information_schema across
 // connectors, each connector will have to generate its own query
SQLConnector.prototype.buildQueryExportedForeignKeys = function(schema, table) {
  throw new Error(g.f('{{buildQueryExportedForeignKeys}} must be implemented by' +
  'the connector'));
};

/**
 * Discover foreign keys that reference to the primary key of this table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
SQLConnector.prototype.discoverExportedForeignKeys = function(table, options, cb) {
  var self = this;
  var args = self.getArgs(table, options, cb);
  var schema = args.schema;

  if (typeof(self.getDefaultSchema) === 'function' && !schema) {
    schema = self.getDefaultSchema();
  }
  table = args.table;
  options = args.options;
  cb = args.cb;

  var sql = self.buildQueryExportedForeignKeys(schema, table);
  this.execute(sql, cb);
};

/**
 * Discover default schema of a database
 * @param {Object} options The options for discovery
 */
SQLConnector.prototype.getDefaultSchema = function(options) {
  throw new Error(g.f('{{getDefaultSchema}} must be implemented by' +
  'the connector'));
};

/**
 * Set default options for the connector
 * @param {Object} options The options for discovery
 */
SQLConnector.prototype.setDefaultOptions = function(options) {
  throw new Error(g.f('{{setDefaultOptions}} must be implemented by' +
  'the connector'));
};

/**
 * Set the nullable value for the property
 * @param {Object} property The property to set nullable
 */
SQLConnector.prototype.setNullableProperty = function(property) {
  throw new Error(g.f('{{setNullableProperty}} must be implemented by' +
  'the connector'));
};
