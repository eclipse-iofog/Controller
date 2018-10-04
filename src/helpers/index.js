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

var crypto = require('crypto')

const ALGORITHM = 'aes-256-ctr'

function encryptText(text, salt) {
  const cipher = crypto.createCipher(ALGORITHM, salt)
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex')
  return crypted
}

function decryptText(text, salt) {
  var decipher = crypto.createDecipher(ALGORITHM, salt)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

module.exports = {
  encryptText,
  decryptText,
}
