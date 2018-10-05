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
const path = require('path');
const portscanner = require('portscanner');

const ALGORITHM = 'aes-256-ctr';

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

function validateFields(obj, fields) {
  fields.forEach(function (field) {
    if (obj[field] === undefined) {
      throw new Errors.ValidationError("Field '" + field + "' is missing.")
    }
  })
}

function isValidEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
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
function checkPortAvailability(port) {
  return portscanner.checkPortStatus(port).then(function (status) {
    return status;
  });
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

function isValidEmailActivation(flag) {
  return flag === 'on' || flag === 'off';
}

function generateAccessToken() {
  let token = '', i;
  for (i = 0; i < 8; i++) {
    token += ((0 + (Math.floor(Math.random() * (Math.pow(2, 31))) + 1).toString(16)).slice(-8)).substr(-8);
  }
  return token;
}

module.exports = {
  encryptText,
  decryptText,
  validateFields,
  isValidEmail,
  generateRandomString,
  isFileExists,
  isValidPort,
  isValidDomain,
  isValidEmailActivation,
  checkPortAvailability,
  generateAccessToken
};