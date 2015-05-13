# Build a connector for relational databases

This tutorial walks you through the MySQL connector implementation to teach you
how to develop a connector for relational databases.

## Understand a connector's responsibilities

In LoopBack, models encapsulate business data and logic as JavaScript properties
and methods. One of the powerful features of LoopBack is that application 
developers don't have to implement all behaviors for their models as a lot of 
them are already provided by the framework out of box with data sources and 
connectors. For example, a model automatically receives the create, retrieve, 
update, and delete (CRUD) functions if it is attached to a data source for a
database. LoopBack abstracts the persistence layer and other backend services, 
such as REST APIs, SOAP web services, and storage services, and so on, as data 
sources, which are configurations of backend connectivity and integration. 
Each data source is backed a connector which implements the interactions between
Node.js and its underlying backend system. Connectors are responsible for 
mapping model method invocations to backend functions, such as database 
operations or call to REST or SOAP APIs. The following diagram illustrates how
connectors fit into the big picture of LoopBack API framework.
 
![connector-architecture](connector-architecture.png)

Please note that you don't always have to develop a connector to allow your 
application to interact with other systems. Ad-hoc integration can be done with 
custom methods on the model. The custom methods can be implemented using other 
Node modules, such as drivers or clients to your backend.

You should consider to develop a connector for common and reusable backend 
integrations, for example:

- Integrate with a backend such as databases
- Reusable logic to interact with another system

There are a few typical types of connectors based on what backends they connect
to and interact with. 

- Databases that support full CRUD operations
  - Oracle, SQL Server, MySQL, Postgresql, MongoDB, In-memory DB
- Other forms of existing APIs
  - REST APIs exposed by your backend
  - SOAP/HTTP web services
- Services
  - E-mail
  - Push notification
  - Storage

The connectors are mostly transparent to models. Their functions are mixed into
model classes through data source attachments.

Most of the connectors need to implement the following logic:

- Lifecycle handlers
  - initialize: receive configuration from the data source settings and 
    initialize the connector instance 
  - connect: create connections to the backend system
  - disconnect: close connections to the backend system
  - ping (optional): check if the connectivity 
  
- Model method delegations
  - Delegating model method invocations to backend calls, for example CRUD
  
- Connector metadata (optional)
  - Model definition for the configuration, such as host/url/user/password
  - What data access interfaces are implemented by the connector (the capability 
    of the connector)
  - Connector-specific model/property mappings

To mixin methods onto model classes, a connector must choose what functions to
offer. Different types of connectors implement different interfaces that group
a set of common methods, for example:

- Database connectors
  - CRUD methods, such as create, find, findById, deleteAll, updateAll, count
  
- E-mail connector
  - send()

- Storage connector
  - Container/File operations, such as createContainer, getContainers, getFiles,
    upload, download, deleteFile, deleteContainer
    
- Push Notification connector
  - notify()

- REST connector
  - Map operations from existing REST APIs
  
- SOAP connector
  - Map WSDL operations

In this tutorial, we'll focus on building a connector for databases that provide
the full CRUD capabilities.

## Understand a database connector with CRUD operations 

![crud-connector](crud-connector.png)

LoopBack unifies all CRUD based database connectors so that a model can choose
to attach to any of the supported database. There are a few classes involved 
here:

1. [PersistedModelClass](http://docs.strongloop.com/display/public/LB/PersistedModel+class) 
defines all the methods mixed into a model for persistence.

2. [The DAO facade](https://github.com/strongloop/loopback-datasource-juggler/blob/master/lib/dao.js) 
maps the PersistedModel methods to connector implementations.

3. CRUD methods need to be implemented by connectors



In the next sections, we will use MySQL connector as an example to walk through
how to implement a SQL based connector.

## Define a module and export the *initialize* function

A LoopBack connector is packaged as a Node.js module that can be installed using
`npm install`. LoopBack runtime loads the module via `require` on behalf of 
data source configuration, for example, `require('loopback-connector-mysql');`. 
The connector module should export an `initialize` function as follows: 

```js
// Require the DB driver
var mysql = require('mysql'); 
// Require the base SqlConnector class
var SqlConnector = require('loopback-connector').SqlConnector;
// Require the debug module with a pattern of loopback:connector:connectorName
var debug = require('debug')('loopback:connector:mysql');

/**
 * Initialize the MySQL connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  ...
};
```

After the initialization, the dataSource object will have the following properties 
added:

- connector: The connector instance
- driver: The module for the underlying database driver (`mysql` for MySQL)

The `initialize` function should calls the `callback` function once the connector
has been initialized. 

## Create a subclass of SqlConnector

Connectors for relational databases have a lot of things in common. They are 
responsible for mapping CRUD operations to SQL statements. LoopBack provides a
base class called `SqlConnector` that encapsulates the common logic for inheritance.
The following code snippet is used to create a subclass of SqlConnector.

```js
/**
 * @constructor
 * Constructor for MySQL connector
 * @param {Object} settings The data source settings
 */
function MySQL(settings) {
  // Call the super constructor with name and settings
  SqlConnector.call(this, 'mysql', settings);
  ...
}
// Set up the prototype inheritence
require('util').inherits(MySQL, SqlConnector);
```

## Implement methods to interact with the database

A connector implements the following methods to communicate with the underlying
database.

### Connect to the database

The `connect` method establishes connections to the database. In most cases, a
connection pool will be created based on the data source settings, including
`host`, `port`, `database`, and other configuration properties.

```js
MySQL.prototype.connect = function (cb) {
  // ...
};
```

### Disconnect from the database

The `disconnect` method close connections to the database. Most database drivers
provide APIs.

```js
/**
 * Disconnect from MySQL
 */
MySQL.prototype.disconnect = function (cb) {
  // ...
};
```   
### Ping the database

The `ping` method tests if the connection to the database is healthy. Most
connectors choose to implement it by executing a simple SQL statement.

```js   
MySQL.prototype.ping = function(cb) {
  // ...
};
```

## Implement CRUD methods

The connector is responsible for implementing the following CRUD methods. The 
good news is that the base SqlConnector now have most of the methods implemented
with the extension point to override certain behaviors that are specific to the
underlying database.

To extend from SqlConnector, the minimum set of methods below must be 
implemented:


### Execute a SQL statement with parameters

The `executeSQL` method is the core function that a connector has to implement. 
Most of other CRUD methods are delegated to the `query` function. It executes 
a SQL statement with an array of parameters. `SELECT` statements will produce 
an array of records representing matching rows from the database while other 
statements such as `INSERT`, `DELETE`, or `UPDATE` will report the number of 
rows changed during the operation.

```js
/**
 * Execute the parameterized sql statement
 *
 * @param {String} sql The SQL statement, possibly with placeholders for parameters
 * @param {*[]} [params] An array of parameter values
 * @param {Objet} [options] Options passed to the CRUD method
 * @param {Function} [callback] The callback after the SQL statement is executed
 */
MySQL.prototype.executeSQL = function (sql, params, options, callback) {
  // ...
};
```

### Map values between a model property and a database column

```js
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
SqlConnector.prototype.toColumnValue = function(propertyDef, value) {
  /*jshint unused:false */
  throw new Error('toColumnValue() must be implemented by the connector');
};

/**
 * Convert the data from database column to model property
 * @param {object} propertyDef Model property definition
 * @param {*) value Column value
 * @returns {*} Model property value
 */
SqlConnector.prototype.fromColumnValue = function(propertyDef, value) {
  /*jshint unused:false */
  throw new Error('fromColumnValue() must be implemented by the connector');
};
```

### Helpers to generate SQL statements and parse responses from DB drivers

```js
/**
 * Build a new SQL statement with pagination support by wrapping the given sql
 * @param {String} model The model name
 * @param {ParameterizedSQL} stmt The sql statement
 * @param {Number} limit The maximum number of records to be fetched
 * @param {Number} offset The offset to start fetching records
 * @param {String[]} order The sorting criteria
 */
SqlConnector.prototype.applyPagination = function(model, stmt, filter) {
  /*jshint unused:false */
  throw new Error('applyPagination() must be implemented by the connector');
};

/**
 * Parse the result for SQL UPDATE/DELETE/INSERT for the number of rows
 * affected
 * @param {String} model Model name
 * @param {Object} info Status object
 * @returns {Number} Number of rows affected
 */
SqlConnector.prototype.getCountForAffectedRows = function(model, info) {
  /*jshint unused:false */
  throw new Error('getCountForAffectedRows() must be implemented by the connector');
};

/**
 * Parse the result for SQL INSERT for newly inserted id
 * @param {String} model Model name
 * @param {Object} info The status object from driver
 * @returns {*} The inserted id value
 */
SqlConnector.prototype.getInsertedId = function(model, info) {
  /*jshint unused:false */
  throw new Error('getInsertedId() must be implemented by the connector');
};

/**
 * Escape the name for the underlying database
 * @param {String} name The name
 * @returns {String} An escaped name for SQL
 */
SqlConnector.prototype.escapeName = function(name) {
  /*jshint unused:false */
  throw new Error('escapeName() must be implemented by the connector');
};

/**
 * Escape the name for the underlying database
 * @param {String} value The value to be escaped
 * @returns {*} An escaped value for SQL
 */
SqlConnector.prototype.escapeValue = function(value) {
  /*jshint unused:false */
  throw new Error('escapeValue() must be implemented by the connector');
};

/**
 * Get the place holder in SQL for identifiers, such as ??
 * @param {String} key Optional key, such as 1 or id
 * @returns {String} The place holder
 */
SqlConnector.prototype.getPlaceholderForIdentifier = function(key) {
  /*jshint unused:false */
  throw new Error('getPlaceholderForIdentifier() must be implemented by the connector');
};

/**
 * Get the place holder in SQL for values, such as :1 or ?
 * @param {String} key Optional key, such as 1 or id
 * @returns {String} The place holder
 */
SqlConnector.prototype.getPlaceholderForValue = function(key) {
  /*jshint unused:false */
  throw new Error('getPlaceholderForValue() must be implemented by the connector');
};
```

### Override other methods

There are a list of methods that serve as default implementations in the SqlConnector.
The connector can choose to override such methods to customize the behaviors. Please
see a complete list at http://apidocs.strongloop.com/loopback-connector/.

## Implement database/model synchronization methods

It's often desirable to apply model definitions to the underlying relational
database to provision or update schema objects so that they stay synchronized
with the model definitions.

### automigrate and autoupdate 

There are two flavors:

- automigrate - Drop existing schema objects if exist and create them based on 
model definitions. Existing data will be lost.
- autoupdate - Detects the difference between schema objects and model 
definitions, alters the database schema objects. Existing data will be kept.

```js
/**
 * Perform autoupdate for the given models
 * @param {String[]} [models] A model name or an array of model names.
 * If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
MySQL.prototype.autoupdate = function (models, cb) {
  // ...
};

MySQL.prototype.automigrate = function (models, cb) {
  // ...
};
```

The `automigrate` and `autoupdate` operations are usually mapped to a sequence of 
DDL statements.

### Build a CREATE TABLE statement

```js
/**
 * Create a DB table for the given model
 * @param {string} model Model name
 * @param cb
 */
MySQL.prototype.createTable = function (model, cb) {
  // ...
};
```

### Check if models have corresponding tables

```js
/**
 * Check if the models exist
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
MySQL.prototype.isActual = function(models, cb) {
  // ...
};
```

### Alter a table 

```js
MySQL.prototype.alterTable = function (model, actualFields, actualIndexes, done, checkOnly) {
  // ...
};
```

### Build column definition clause for a given model

```js
MySQL.prototype.buildColumnDefinitions =
MySQL.prototype.propertiesSQL = function (model) {
  // ...
};
```

### Build index definition clause for a given model property

```js
MySQL.prototype.buildIndex = function(model, property) {
  // ...
};
```

### Build indexes for a given model

```js
MySQL.prototype.buildIndexes = function(model) {
  // ...
};
```

### Build column definition for a given model property

```js
MySQL.prototype.buildColumnDefinition = function(model, prop) {
  // ...
};
```

### Build column type for a given model property

```js
MySQL.prototype.columnDataType = function (model, property) {
  // ...
};
```

## Implement model discovery from database schemas

For relational databases that have schema definitions, the connector can 
implement the discovery capability to reverse engineer database schemas into
model definitions.

### Build a SQL statement to list schemas

```js
/**
 * Build sql for listing schemas (databases in MySQL)
 * @params {Object} [options] Options object
 * @returns {String} The SQL statement
 */
 function querySchemas(options) {
   // ...
 }
```  

### Build a SQL statement to list tables

```js
/**
 * Build sql for listing tables
 * @param options {all: for all owners, owner|schema: for a given owner}
 * @returns {string} The sql statement
 */
 function queryTables(options) {
   // ...
 }
```js
  
### Build a SQL statement to list views  

```js
/**
 * Build sql for listing views
 * @param options {all: for all owners, owner: for a given owner}
 * @returns {string} The sql statement
 */
 function queryViews(options) {
   // ...
 }
```  
  
### Discover schemas  

```js
 MySQL.prototype.discoverDatabaseSchemas = function(options, cb) {
   // ...
 };
```
  
### Discover a list of models  

```js
/**
 * Discover model definitions
 *
 * @param {Object} options Options for discovery
 * @param {Function} [cb] The callback function
 */
 MySQL.prototype.discoverModelDefinitions = function(options, cb) {
   // ...
 };
```
  
### Discover a list of model properties for a given table
   
```js
/**
 * Discover model properties from a table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 *
 */
 MySQL.prototype.discoverModelProperties = function(table, options, cb) {
   // ...
 };
```

### Discover primary keys for a given table

```js
/**
 * Discover primary keys for a given table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
 MySQL.prototype.discoverPrimaryKeys = function(table, options, cb) {
   // ...
 };
``` 

### Discover foreign keys for a given table

```js
/**
 * Discover foreign keys for a given table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
 MySQL.prototype.discoverForeignKeys = function(table, options, cb) {
   // ...
 };
```

### Discover exported foreign keys for a given table

```js
/**
 * Discover foreign keys that reference to the primary key of this table
 * @param {String} table The table name
 * @param {Object} options The options for discovery
 * @param {Function} [cb] The callback function
 */
 MySQL.prototype.discoverExportedForeignKeys = function(table, options, cb) {
   // ...
 };
 ```
 
### Discover indexes for a given table
 
```js
  MySQL.prototype.discoverIndexes = function(table, options, cb) {
    // ...
  };
```  

### Map column definition to model property definition

```js
  MySQL.prototype.buildPropertyType = function(columnDefinition) {
    // ...
  }
``` 

### Build SQL statements to discover database objects

```js
/**
 * Build the sql statement to query columns for a given table
 * @param schema
 * @param table
 * @returns {String} The sql statement
 */
 function queryColumns(schema, table) {
   // ...
 }
 
/**
 * Build the sql statement for querying primary keys of a given table
 * @param schema
 * @param table
 * @returns {string}
 */
 function queryPrimaryKeys(schema, table) {
   // ...
 } 
 
/**
 * Build the sql statement for querying foreign keys of a given table
 * @param schema
 * @param table
 * @returns {string}
 */
 function queryForeignKeys(schema, table) {
   // ...
 }
 
/**
 * Retrieves a description of the foreign key columns that reference the
 * given table's primary key columns (the foreign keys exported by a table).
 * They are ordered by fkTableOwner, fkTableName, and keySeq.
 * @param schema
 * @param table
 * @returns {string}
 */
 function queryExportedForeignKeys(schema, table) {
   // ...
 } 
```    