/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport')
const UserManager = require('../data/managers/user-manager')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Config = require('../config')
const ioFogManager = require('../data/managers/iofog-manager')
const FogStates = require('../enums/fog-state')
const emailActivationTemplate = require('../views/email-activation-temp')
const emailRecoveryTemplate = require('../views/email-temp')
const emailResetTemplate = require('../views/reset-password-temp')
const EmailActivationCodeService = require('./email-activation-code-service')
const AccessTokenService = require('./access-token-service')
const TrackingDecorator = require('../decorators/tracking-decorator')
const TrackingEventType = require('../enums/tracking-event-type')

const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

const signUp = async function (user, isCLI, transaction) {
  const isEmailActivationEnabled = Config.get('Email:ActivationEnabled')

  if (isEmailActivationEnabled) {
    const newUser = await _handleCreateUser(user, isEmailActivationEnabled, transaction)

    const activationCodeData = await EmailActivationCodeService.generateActivationCode(transaction)
    await EmailActivationCodeService.saveActivationCode(newUser.id, activationCodeData, transaction)

    const emailData = await _getEmailData()
    const transporter = await _userEmailSender(emailData)
    await _notifyUserAboutActivationCode(user.email, Config.get('Email:HomeUrl'), emailData, activationCodeData, transporter)
    return newUser
  } else {
    return _handleCreateUser(user, isEmailActivationEnabled, transaction)
  }
}

const login = async function (credentials, isCLI, transaction) {
  const user = await UserManager.findOne({
    email: credentials.email
  }, transaction)
  if (!user) {
    throw new Errors.InvalidCredentialsError()
  }

  const pass = AppHelper.decryptText(user.password, user.email)
  if (isCLI) {
    credentials.password = AppHelper.decryptText(credentials.password, credentials.email)
  }

  const validPassword = credentials.password === pass || credentials.password === user.tempPassword
  if (!validPassword) {
    throw new Errors.InvalidCredentialsError()
  }

  _verifyEmailActivation(user.emailActivated)

  const accessToken = await _generateAccessToken(transaction)
  accessToken.userId = user.id

  await AccessTokenService.createAccessToken(accessToken, transaction)

  return {
    accessToken: accessToken.token
  }
}

const resendActivation = async function (emailObj, isCLI, transaction) {
  await Validator.validate(emailObj, Validator.schemas.resendActivation)

  const user = await UserManager.findOne({
    email: emailObj.email
  }, transaction)
  if (!user) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_USER_EMAIL)
  }

  const activationCodeData = await EmailActivationCodeService.generateActivationCode(transaction)
  await EmailActivationCodeService.saveActivationCode(user.id, activationCodeData, transaction)

  const emailData = await _getEmailData()
  const transporter = await _userEmailSender(emailData)
  await _notifyUserAboutActivationCode(user.email, Config.get('Email:HomeUrl'), emailData, activationCodeData, transporter)
}

const activateUser = async function (codeData, isCLI, transaction) {
  const updatedObj = {
    emailActivated: true
  }

  if (isCLI) {
    const user = await UserManager.findOne({
      id: codeData.userId
    }, transaction)

    if (user.emailActivated === true) {
      throw new Error(ErrorMessages.USER_ALREADY_ACTIVATED)
    }

    await _updateUser(codeData.userId, updatedObj, transaction)
  } else {
    await Validator.validate(codeData, Validator.schemas.activateUser)

    const activationCode = await EmailActivationCodeService.verifyActivationCode(codeData.activationCode, transaction)
    if (!activationCode) {
      throw new Errors.NotFoundError(ErrorMessages.ACTIVATION_CODE_NOT_FOUND)
    }

    await _updateUser(activationCode.userId, updatedObj, transaction)

    await EmailActivationCodeService.deleteActivationCode(codeData.activationCode, transaction)
  }
}

const logout = async function (user, isCLI, transaction) {
  return AccessTokenService.removeAccessTokenByUserId(user.id, transaction)
}

const updateUserDetails = async function (user, profileData, isCLI, transaction) {
  if (isCLI) {
    await Validator.validate(profileData, Validator.schemas.updateUserProfileCLI)
  } else {
    await Validator.validate(profileData, Validator.schemas.updateUserProfile)
  }

  const password = (profileData.password) ? AppHelper.encryptText(profileData.password, user.email) : undefined

  let updateObject = isCLI
    ? {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      password: password
    }
    : {
      firstName: profileData.firstName,
      lastName: profileData.lastName
    }

  updateObject = AppHelper.deleteUndefinedFields(updateObject)

  await UserManager.updateDetails(user, updateObject, transaction)

  return {
    firstName: updateObject.firstName,
    lastName: updateObject.lastName,
    email: user.email
  }
}

const deleteUser = async function (force, user, isCLI, transaction) {
  if (!force) {
    const ioFogArray = await ioFogManager.findAll({
      userId: user.id
    }, transaction)

    if (ioFogArray) {
      for (const ioFog of ioFogArray) {
        if (ioFog.daemonStatus === FogStates.RUNNING) {
          throw new Errors.ValidationError(ErrorMessages.NEEDED_FORCE_DELETE_USER)
        }
      }
    }
  }

  await UserManager.delete({
    id: user.id
  }, transaction)
}

const updateUserPassword = async function (passwordUpdates, user, isCLI, transaction) {
  const pass = AppHelper.decryptText(user.password, user.email)

  if (pass !== passwordUpdates.oldPassword && user.tempPassword !== passwordUpdates.oldPassword) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_OLD_PASSWORD)
  }
  const newPass = AppHelper.encryptText(passwordUpdates.newPassword, user.email)

  await UserManager.updatePassword(user.id, newPass, transaction)

  try {
    const emailData = await _getEmailData()
    const transporter = await _userEmailSender(emailData)

    await _notifyUserAboutPasswordChange(user, emailData, transporter)
  } catch (e) {
    console.error(e)
  }
}

const resetUserPassword = async function (emailObj, isCLI, transaction) {
  await Validator.validate(emailObj, Validator.schemas.resetUserPassword)

  const user = await UserManager.findOne({
    email: emailObj.email
  }, transaction)
  if (!user) {
    throw new Errors.NotFoundError(ErrorMessages.ACCOUNT_NOT_FOUND)
  }

  const tempPass = AppHelper.generateRandomString(2) + 'uL7'
  const tempDbPass = AppHelper.encryptText(tempPass, user.email)
  await UserManager.updateTempPassword(user.id, tempDbPass, transaction)

  const emailData = await _getEmailData()
  const transporter = await _userEmailSender(emailData)
  await _notifyUserAboutPasswordReset(user, Config.get('Email:HomeUrl'), emailData, tempPass, transporter)
}

const list = async function (isCLI, transaction) {
  return UserManager.findAllWithAttributes({}, { exclude: ['password'] }, transaction)
}

const suspendUser = async function (user, isCLI, transaction) {
  if (user.emailActivated === false) {
    throw new Error(ErrorMessages.USER_NOT_ACTIVATED_YET)
  }

  const updatedObj = {
    emailActivated: false
  }

  await AccessTokenService.removeAccessTokenByUserId(user.id, transaction)

  return _updateUser(user.id, updatedObj, transaction)
}

async function _updateUser (userId, updatedUser, transaction) {
  try {
    return UserManager.update({
      id: userId
    }, updatedUser, transaction)
  } catch (errMsg) {
    throw new Error(ErrorMessages.USER_NOT_UPDATED)
  }
}

async function _generateAccessToken (transaction) {
  while (true) {
    const newAccessToken = AppHelper.generateAccessToken()
    const exists = await UserManager.findByAccessToken(newAccessToken, transaction)
    if (!exists) {
      const tokenExpiryTime = new Date().getTime() + (Config.get('Settings:UserTokenExpirationIntervalSeconds') * 1000)

      return {
        token: newAccessToken,
        expirationTime: tokenExpiryTime
      }
    }
  }
}

function _verifyEmailActivation (emailActivated) {
  const isEmailActivationEnabled = Config.get('Email:ActivationEnabled')
  if (isEmailActivationEnabled && !emailActivated) {
    throw new Error(ErrorMessages.EMAIL_NOT_ACTIVATED)
  }
}

async function _userEmailSender (emailData) {
  let transporter
  if (emailData.service) {
    transporter = nodemailer.createTransport(smtpTransport({
      service: emailData.service,
      auth: {
        user: emailData.email,
        pass: emailData.password
      }
    }))
  } else {
    transporter = nodemailer.createTransport(smtpTransport({
      host: emailData.host,
      port: emailData.port,
      auth: {
        user: emailData.email,
        pass: emailData.password
      }
    }))
  }

  return transporter
}

async function _handleCreateUser (user, isEmailActivationEnabled, transaction) {
  const existingUser = await UserManager.findOne({
    email: user.email
  }, transaction)

  if (existingUser) {
    throw new Errors.ValidationError('Registration failed: There is already an account associated with your email address. ' +
        'Please try logging in instead.')
  }

  const newUser = await _createNewUser(user, isEmailActivationEnabled, transaction)
  return {
    userId: newUser.id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    email: newUser.email,
    emailActivated: user.emailActivated
  }
}

async function _createNewUser (user, isEmailActivationEnabled, transaction) {
  user.emailActivated = !isEmailActivationEnabled
  return UserManager.create(user, transaction)
}

async function _notifyUserAboutActivationCode (email, url, emailSenderData, activationCodeData, transporter) {
  const mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: email,
    subject: 'Activate Your Account',
    html: emailActivationTemplate.p1 + url + emailActivationTemplate.p2 + activationCodeData.activationCode +
    emailActivationTemplate.p3 + url + emailActivationTemplate.p4 + activationCodeData.activationCode +
    emailActivationTemplate.p5 + url + emailActivationTemplate.p6 + activationCodeData.activationCode + emailActivationTemplate.p7
  }

  await _sendEmail(transporter, mailOptions)
}

async function _notifyUserAboutPasswordChange (user, emailSenderData, transporter) {
  const mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: user.email,
    subject: 'Password Change Notification',
    html: emailRecoveryTemplate.p1 + user.firstName + ' ' + user.lastName + emailRecoveryTemplate.p2
  }

  await _sendEmail(transporter, mailOptions)
}

async function _notifyUserAboutPasswordReset (user, url, emailSenderData, tempPass, transporter) {
  const mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: user.email,
    subject: 'Password Reset Request',
    html: emailResetTemplate.p1 + user.firstName + ' ' + user.lastName + emailResetTemplate.p2 + tempPass + emailResetTemplate.p3 +
    url + emailResetTemplate.p4
  }

  await _sendEmail(transporter, mailOptions)
}

async function _sendEmail (transporter, mailOptions) {
  try {
    await transporter.sendMail(mailOptions)
  } catch (errMsg) {
    throw new Error(ErrorMessages.EMAIL_SENDER_NOT_CONFIGURED)
  }
}

async function _getEmailData () {
  try {
    const email = Config.get('Email:Address')
    const password = AppHelper.decryptText(Config.get('Email:Password'), Config.get('Email:Address'))
    const service = Config.get('Email:Service')

    return {
      email: email,
      password: password,
      service: service
    }
  } catch (errMsg) {
    throw new Errors.EmailActivationSetupError()
  }
}

// decorated functions
const signUpWithTracking = TrackingDecorator.trackEvent(signUp, TrackingEventType.USER_CREATED)

module.exports = {
  signUp: TransactionDecorator.generateTransaction(signUpWithTracking),
  login: TransactionDecorator.generateTransaction(login),
  resendActivation: TransactionDecorator.generateTransaction(resendActivation),
  activateUser: TransactionDecorator.generateTransaction(activateUser),
  logout: TransactionDecorator.generateTransaction(logout),
  updateUserDetails: TransactionDecorator.generateTransaction(updateUserDetails),
  deleteUser: TransactionDecorator.generateTransaction(deleteUser),
  updateUserPassword: TransactionDecorator.generateTransaction(updateUserPassword),
  resetUserPassword: TransactionDecorator.generateTransaction(resetUserPassword),
  list: TransactionDecorator.generateTransaction(list),
  suspendUser: TransactionDecorator.generateTransaction(suspendUser)
}
