/*
 * *******************************************************************************
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

const EmailActivationCodeManager = require('../sequelize/managers/email-activation-code-manager')
const AppHelper = require('../helpers/app-helper')
const ErrorMessages = require('../helpers/error-messages')

const generateActivationCode = async function(transaction) {
  while (true) {
    const newActivationCode = AppHelper.generateRandomString(16)
    const exists = await EmailActivationCodeManager.getByActivationCode(newActivationCode, transaction)
    if (!exists) {
      const activationCodeExpiryTime = new Date().getTime() + ((60 * 60 * 24 * 3) * 1000)
      return {
        activationCode: newActivationCode,
        expirationTime: activationCodeExpiryTime,
      }
    }
  }
}

const saveActivationCode = async function(userId, activationCodeData, transaction) {
  const activationCode = activationCodeData.activationCode
  const expirationTime = activationCodeData.expirationTime

  try {
    return await EmailActivationCodeManager.createActivationCode(userId, activationCode, expirationTime, transaction)
  } catch (errMsg) {
    throw new Error(ErrorMessages.UNABLE_TO_CREATE_ACTIVATION_CODE)
  }
}

const verifyActivationCode = async function(activationCode, transaction) {
  try {
    return await EmailActivationCodeManager.verifyActivationCode(activationCode, transaction)
  } catch (errMsg) {
    throw new Error(ErrorMessages.UNABLE_TO_GET_ACTIVATION_CODE)
  }
}

const deleteActivationCode = async function(activationCode, transaction) {
  return await EmailActivationCodeManager.delete({
    activationCode: activationCode,
  }, transaction)
}

module.exports = {
  generateActivationCode: generateActivationCode,
  saveActivationCode: saveActivationCode,
  verifyActivationCode: verifyActivationCode,
  deleteActivationCode: deleteActivationCode,
}
