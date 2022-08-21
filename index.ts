// Copyright IBM Corp. 2014,2022. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import SG from 'strong-globalize';
import {Connector} from './lib/connector';
import SQLConnector from './lib/sql';
import { Transaction } from './lib/transaction';

export {
    Connector,
    SQLConnector,
    SQLConnector.ParameterizedSQL,
    Transaction,
}

SG.SetRootDir(__dirname);

exports.Connector = require('./lib/connector');
// Set up SqlConnector as an alias to SQLConnector
exports.SQLConnector = exports.SqlConnector = require('./lib/sql');
exports.ParameterizedSQL = exports.SQLConnector.ParameterizedSQL;
exports.Transaction = require('./lib/transaction');

exports.createPromiseCallback = require('./lib/utils').createPromiseCallback;

// KeyValue helpers
exports.ModelKeyComposer = require('./lib/model-key-composer');
exports.BinaryPacker = require('./lib/binary-packer');
exports.JSONStringPacker = require('./lib/json-string-packer');
