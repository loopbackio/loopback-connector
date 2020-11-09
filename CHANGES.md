2020-11-09, Version 5.0.1
=========================

 * Group clauses for AND/OR conditions (Raymond Feng)


2020-08-28, Version 5.0.0
=========================

 * chore: update dependencies to latest (Miroslav Bajtoš)

 * chore: update devDependencies to latest (Miroslav Bajtoš)

 * travis: add Node.js 14.x (Miroslav Bajtoš)

 * [SEMVER-MAJOR] Drop support for Node.js 8.x (Miroslav Bajtoš)

 * chore: switch to DCO (Diana Lau)


2020-07-31, Version 4.11.1
==========================

 * Improve assertion in ParameterizedSQL builder (ewrayjohnson)


2020-04-26, Version 4.11.0
==========================

 * chore: update dependencies (Raymond Feng)

 * push column/idcolumn to connector level and renam (Agnes Lin)

 * fix: run migrations in series (Michael DePetrillo)


2020-03-04, Version 4.10.2
==========================

 * fix the way it gets column name for id property (Agnes Lin)

 * chore: update copyright year (Diana Lau)

 * test: add tests for isactive (#165) (Janny)

 * feat: add isactive check for transaction (#164) (Janny)

 * Remove "good first issue" from stalebot (Miroslav Bajtoš)


2019-12-17, Version 4.10.0
==========================

 * chore: disable security issue reporting (Nora)

 * Remove loopback-connector-ibmi from downstream (Miroslav Bajtoš)

 * Remove unstable connectors from downstream list (Miroslav Bajtoš)

 * Introduce issue templates for bugs, features, etc. (Miroslav Bajtoš)

 * Improve PULL_REQUEST_TEMPLATE (Miroslav Bajtoš)

 * Fix eslint violations (Miroslav Bajtoš)

 * Remove Biniam from CODEOWNERS (Miroslav Bajtoš)

 * Fix SqlConnector to ignore empty WHERE statements (Marvin Irwin)


2019-09-19, Version 4.9.0
=========================

 * fix: prevent adding listeners past limit (Dominique Emond)

 * chore: update deps and fix lint violations (Nora)

 * drop support for node.js 6 (Nora)

 * chore: add node 12 (Nora)


2019-06-28, Version 4.8.0
=========================

 * chore: add promise support (Biniam Admikew)


2019-05-03, Version 4.7.0
=========================

 * feat: map property name to table column name (Samarpan Bhattacharya)

 * chore: update copyrights years (Diana Lau)


2019-03-22, Version 4.6.2
=========================



2019-03-22, Version 4.5.2
=========================

 * fix: make prop def getter backward-compatible (biniam)

 * chore: update CODEOWNERS (Diana Lau)

 * Revert "4.6.0" (biniam)

 * feat: retrieve nested property definitions (Piero Maltese)


2018-07-16, Version 4.5.1
=========================

 * allow schema or owner (Raymond Feng)

 * [WebFM] cs/pl/ru translation (candytangnb)


2018-06-14, Version 4.5.0
=========================

 * Update msgpack5 to 4.x (Miroslav Bajtoš)

 * Update strong-globalize to 4.x (Miroslav Bajtoš)

 * Update Mocha and Chai to latest (Miroslav Bajtoš)

 * Update eslint + config to latest (Miroslav Bajtoš)

 * Disable package-lock feature of npm (Miroslav Bajtoš)

 * Travis: add Node.js 8.x + 10.x to the build matrix (Miroslav Bajtoš)

 * Drop support for Node 4.x (Miroslav Bajtoš)

 * chore:update license (Diana Lau)


2017-10-17, Version 4.4.0
=========================

 * update depdencies (Diana Lau)

 * package: use loopback-datasource-juggler@3.12 (Kevin Delisle)


2017-09-01, Version 4.3.0
=========================

 * Transaction: Support moving timeout to connector (Jürg Lehni)

 * Add support for transactions in count() (Jürg Lehni)

 * Add stalebot configuration (Kevin Delisle)

 * Create Issue and PR Templates (#113) (Sakib Hasan)

 * Update translated strings Q3 2017 (Allen Boone)

 * update messages.json (Diana Lau)

 * Add CODEOWNER file (Diana Lau)


2017-07-17, Version 4.2.2
=========================

 * Fix transaction (Diana Lau)

 * Fix comment lines (Quentin Presley)

 * Fix API docs (#80) (Rand McKinney)


2017-06-22, Version 4.2.1
=========================

 * Updated Italian translated strings Q2 2017 (Allen Boone)

 * Update translated strings Q2 2017 (Allen Boone)

 * Fix update bug when id not found (Loay Gewily)


2017-04-10, Version 4.2.0
=========================

 * Add generateUniqueId prototype (Tetsuo Seto)

 * Add travis for CI (#91) (Sakib Hasan)


2017-03-31, Version 4.1.0
=========================

 * Extract getAddModifyColumns into base (#90) (Sakib Hasan)


2017-03-06, Version 4.0.0
=========================



2017-03-06, Version 3.x-latest
==============================

 * Update deps and fix styles (Raymond Feng)

 * Add checkFieldAndIndex (#87) (Janny)

 * Refactor SQL migration methods (ssh24)

 * Fix replaceById for Oracle (Loay Gewily)

 * Refactor SQL discovery methods (Loay)

 * Fix replaceById unfound id bug (Loay Gewily)


2016-12-21, Version 3.0.0
=========================

 * Update paid support URL (Siddhi Pai)

 * Start 3.x + drop support for Node v0.10/v0.12 (siddhipai)

 * Drop support for Node v0.10 and v0.12 (Siddhi Pai)

 * Dev of the next major version (Siddhi Pai)


2016-11-10, Version 2.7.1
=========================

 * Export JSONStringPacker (Masu Lin)


2016-11-08, Version 2.7.0
=========================

 * Add JSONStringPacker (Masu Lin)


2016-10-24, Version 2.6.0
=========================

 * Increase delay in tests to stop intermittent fails (Miroslav Bajtoš)

 * Add BinaryPacker from kv-redis connector (Miroslav Bajtoš)

 * Add ModelKeyComposer from kv-redis connector (Miroslav Bajtoš)


2016-10-12, Version 2.5.0
=========================

 * Update translation files - round#2 (#62) (Candy)

 * Add translated files (Amir Jafarian)

 * Update deps to LB 3.0.0 RC (Miroslav Bajtoš)

 * Run CI with juggler3 (Loay)

 * Add globalization (Candy)

 * Update URLs in CONTRIBUTING.md (#53) (Ryan Graham)


2016-06-29, Version 2.4.0
=========================

 * update copyright notices and license (Ryan Graham)

 * Fix linting errors (Amir Jafarian)

 * Auto-update by eslint --fix (Amir Jafarian)

 * Add eslint infrastructure (Amir Jafarian)

 * fixed build of where statement when filter contains non-existing column (Maor Hayun)

 * change replace to replaceById (Amir Jafarian)

 * Remove underscore from _buildReplaceFields (Amir Jafarian)

 * Change _buildReplace  to buildReplace (Amir Jafarian)

 * Change _buildUpdate to buildUpdate (Amir Jafarian)

 * Apply feedback (Amir Jafarian)

 * call execute directly for _replace (Amir Jafarian)

 * Implement replaceAttributes (Amir Jafarian)

 * Removed filterWhere option (eugene-frb)

 * 1. Error logging. 2. Options argument of model's include function to pass filter.where object. (eugene-frb)

 * Refer to licenses with a link (Sam Roberts)

 * Fixed typo. (Matteo Padovano)

 * Use strongloop conventions for licensing (Sam Roberts)


2015-07-29, Version 2.3.0
=========================

 * Fix RegExp coercion (Simon Ho)

 * Add support for RegExp operator (Simon Ho)

 * Add a test for nesting and/or (Raymond Feng)


2015-06-23, Version 2.2.2
=========================

 * Enable Inversion of Control in connector hooks through modifications of the context object. (Frank Steegmans)


2015-05-27, Version 2.2.1
=========================

 * Fix the callback (Raymond Feng)


2015-05-27, Version 2.2.0
=========================

 * Update deps (Raymond Feng)

 * Add hooks to sql based connectors (Raymond Feng)


2015-05-22, Version 2.1.2
=========================

 * Fix for https://github.com/strongloop/loopback-connector-mssql/issues/45 (Raymond Feng)

 * Fix the jsdoc for applyPagination (Raymond Feng)


2015-05-20, Version 2.1.1
=========================

 * Fix for https://github.com/strongloop/loopback-connector-postgresql/issues/80 (Raymond Feng)


2015-05-18, Version 2.1.0
=========================

 * Update sql-connector.md (Rand McKinney)

 * Add tests for propagating a transaction over relations (Raymond Feng)

 * Add transaction support (Raymond Feng)


2015-05-18, Version 2.0.1
=========================

 * Replace with link to Confluence (Rand McKinney)

 * Update sql-connector.md (Rand McKinney)


2015-05-13, Version 2.0.0
=========================

 * Upgrade deps (Raymond Feng)

 * Make sure invalid fields are filtered out (Raymond Feng)

 * Refactor base and sql connector (Raymond Feng)

 * Update README.md (Paulo McNally)


2015-01-28, Version 1.2.1
=========================

 * package: add jshint to devDependencies (Miroslav Bajtoš)

 * Fix crash in `id(model, property)` (Miroslav Bajtoš)

 * Fix bad CLA URL in CONTRIBUTING.md (Ryan Graham)


2014-10-13, Version 1.2.0
=========================

 * Bump version (Raymond Feng)

 * Make sure callback happens if a model is not attached to the data source (Raymond Feng)

 * Update contribution guidelines (Ryan Graham)


2014-07-20, Version 1.1.1
=========================

 * Bump version (Raymond Feng)

 * Fix updateAttributes impl (Raymond Feng)


2014-06-20, Version 1.1.0
=========================

 * Bump version (Raymond Feng)

 * Fix style to pass jlint (Raymond Feng)

 * Add space (Raymond Feng)

 * Add bulk update support (Raymond Feng)

 * Fix the count() impl to use buildWhere() from the subclass (Raymond Feng)


2014-06-03, Version 1.0.0
=========================

 * First release!
