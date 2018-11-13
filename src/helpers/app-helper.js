/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const crypto = require('crypto');
const Errors = require('./errors');

const fs = require('fs');
const Config = require('../config');
const path = require('path');
const portscanner = require('portscanner');
const format = require('string-format');

const ALGORITHM = 'aes-256-ctr';

const Transaction = require('sequelize/lib/transaction');

function encryptText(text, salt) {
  const cipher = crypto.createCipher(ALGORITHM, salt);
  let crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted
}

function decryptText(text, salt) {
  const decipher = crypto.createDecipher(ALGORITHM, salt);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec
}

function generateRandomString(size) {

  let randString = "";
  const possible = "2346789bcdfghjkmnpqrtvwxyzBCDFGHJKLMNPQRTVWXYZ";

  for (let i = 0; i < size; i++)
    randString += possible.charAt(Math.floor(Math.random() * possible.length));

  return randString;
}

// Checks the status of a single port
// returns 'closed' if port is available
// returns 'open' if port is not available
async function checkPortAvailability(port) {
  return new Promise((resolve) => {
    return resolve(portscanner.checkPortStatus(port));
  });
}

const findAvailablePort = async function (hostname) {
  let portBounds = Config.get("Tunnel:PortRange").split("-").map(i => parseInt(i));
  return await portscanner.findAPortNotInUse(portBounds[0], portBounds[1], hostname);
}
/**
 * @desc generates a random String of the size specified by the input param
 * @param Integer - size
 * @return String - returns random string
 */

function isFileExists(filePath) {
  if (path.extname(filePath).indexOf(".") >= 0) {
    return fs.existsSync(filePath);
  } else {
    return false;
  }
}

function isValidPort(port) {
  port = Number(port);
  if (Number.isInteger(port)) {
    if (port >= 0 && port < 65535)
      return true;
  }
  return false;
}

function isValidDomain(domain) {
  const re = /^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/;
  return re.test(domain);
}

const isValidPublicIP = function (publicIP) {
  let re = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
  return re.test(publicIP);
}

function generateAccessToken() {
  let token = '', i;
  for (i = 0; i < 8; i++) {
    token += ((0 + (Math.floor(Math.random() * (Math.pow(2, 31))) + 1).toString(16)).slice(-8)).substr(-8);
  }
  return token;
}

function checkTransaction(transaction) {
  //TODO [when transactions concurrency issue fixed]: Remove '!transaction.fakeTransaction'
  if (!transaction || (!(transaction instanceof Transaction) && !transaction.fakeTransaction)) {
    throw new Errors.TransactionError()
  }
}

function deleteUndefinedFields(obj) {
  if (!obj) {
    return
  }

  Object.keys(obj).forEach((fld) => {
    if (obj[fld] === undefined) {
      delete  obj[fld]
    } else if (obj[fld] instanceof Object) {
      obj[fld] = deleteUndefinedFields(obj[fld])
    }
  })

  return obj
}

function validateBooleanCliOptions(trueOption, falseOption) {
  if (trueOption && falseOption) {
    throw new Errors.ValidationError("Two opposite can not be used simultaneously");
  }
  return trueOption ? true : (falseOption ? false : undefined)
}

function formatMessage() {
  const argsArray = Array.prototype.slice.call(arguments);
  return format.apply(null, argsArray);
}

function stringifyCliJsonSchema(json) {
  return JSON.stringify(json, null, 2)
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}

module.exports = {
  encryptText,
  decryptText,
  generateRandomString,
  isFileExists,
  isValidPort,
  isValidDomain,
  checkPortAvailability,
  generateAccessToken,
  checkTransaction,
  deleteUndefinedFields,
  validateBooleanCliOptions,
  formatMessage,
  findAvailablePort,
  stringifyCliJsonSchema,
  isValidPublicIP
};
