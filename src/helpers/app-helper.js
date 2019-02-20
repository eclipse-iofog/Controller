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

const crypto = require('crypto')
const Errors = require('./errors')

const logger = require('../logger')
const fs = require('fs')
const Config = require('../config')
const path = require('path')
const portscanner = require('portscanner')
const format = require('string-format')

const ALGORITHM = 'aes-256-ctr'
const IV_LENGTH = 16


const Transaction = require('sequelize/lib/transaction')

function encryptText(text, salt) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const processedSalt = crypto.createHash('md5').update(salt).digest('hex')

  const cipher = crypto.createCipheriv(ALGORITHM, processedSalt, iv)
  let crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex')
  return iv.toString('hex') + ':' + crypted.toString('hex')
}

function decryptText(text, salt) {
  const processedSalt = crypto.createHash('md5').update(salt).digest('hex')

  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift(), 'hex')
  const encryptedText = Buffer.from(textParts.join(':'), 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, processedSalt, iv)
  let dec = decipher.update(encryptedText, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

function generateRandomString(size) {
  let randString = ''
  const possible = '2346789bcdfghjkmnpqrtvwxyzBCDFGHJKLMNPQRTVWXYZ'

  for (let i = 0; i < size; i++) {
    randString += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return randString
}

// Checks the status of a single port
// returns 'closed' if port is available
// returns 'open' if port is not available
async function checkPortAvailability(port) {
  return new Promise((resolve) => {
    return resolve(portscanner.checkPortStatus(port))
  })
}

const findAvailablePort = async function(hostname) {
  let portRange = Config.get('Tunnel:PortRange')
  if (!portRange) {
    logger.warn('Port range was\'n specified in config. Default range (2000-10000) will be used')
    portRange = '2000-10000'
  }
  const portBounds = portRange.split('-').map((i) => parseInt(i))
  return await portscanner.findAPortNotInUse(portBounds[0], portBounds[1], hostname)
}

function isFileExists(filePath) {
  if (path.extname(filePath).indexOf('.') >= 0) {
    return fs.existsSync(filePath)
  } else {
    return false
  }
}

function isValidPort(port) {
  port = Number(port)
  if (Number.isInteger(port)) {
    if (port >= 0 && port < 65535) {
      return true
    }
  }
  return false
}

function isValidDomain(domain) {
  const re = /^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/
  return re.test(domain)
}

const isValidPublicIP = function(publicIP) {
  /* eslint-disable max-len */
  const re = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/
  return re.test(publicIP)
}

function generateAccessToken() {
  let token = ''; let i
  for (i = 0; i < 8; i++) {
    token += ((0 + (Math.floor(Math.random() * (Math.pow(2, 31))) + 1).toString(16)).slice(-8)).substr(-8)
  }
  return token
}

function checkTransaction(transaction) {
  if (isTest()) {
    return
  }
  // TODO [when transactions concurrency issue fixed]: Remove '!transaction.fakeTransaction'
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
      delete obj[fld]
    } else if (obj[fld] instanceof Object) {
      obj[fld] = deleteUndefinedFields(obj[fld])
    }
  })

  return obj
}

function validateBooleanCliOptions(trueOption, falseOption) {
  if (trueOption && falseOption) {
    throw new Errors.ValidationError('Two opposite can not be used simultaneously')
  }
  return trueOption ? true : (falseOption ? false : undefined)
}

function formatMessage() {
  const argsArray = Array.prototype.slice.call(arguments)
  return format.apply(null, argsArray)
}

function stringifyCliJsonSchema(json) {
  return JSON.stringify(json, null, 2)
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
}

function trimCertificate(cert) {
  let result = cert.replace(/(^[\s\S]*-{3,}BEGIN CERTIFICATE-{3,}[\s]*)/, '')
  result = result.replace(/([\s]*-{3,}END CERTIFICATE-{3,}[\s\S]*$)/, '')
  return result
}

function isTest() {
  return process.env.NODE_ENV === 'test'
}

function isEmpty(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false
    }
  }
  return true
}

function isOnline() {
  const daemon = require('../daemon')

  const pid = daemon.status()
  return pid !== 0
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
  isValidPublicIP,
  trimCertificate,
  isTest,
  isEmpty,
  isOnline,
}
