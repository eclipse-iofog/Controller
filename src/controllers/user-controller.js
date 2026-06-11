/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const UserService = require('../services/user-service')
const Validator = require('../schemas')

const userLoginEndPoint = async function (req) {
  const user = req.body

  await Validator.validate(user, Validator.schemas.login)

  const credentials = {
    email: user.email,
    password: user.password,
    totp: user.totp
  }

  return UserService.login(credentials, false)
}

const refreshTokenEndPoint = async function (req) {
  const token = req.body

  await Validator.validate(token, Validator.schemas.refresh)

  const credentials = {
    refreshToken: token.refreshToken

  }
  return UserService.refresh(credentials, false)
}

const getUserProfileEndPoint = async function (req) {
  return UserService.profile(req, false)
}

const userLogoutEndPoint = async function (req) {
  return UserService.logout(req, false)
}

const enrollMfaEndPoint = async function (req) {
  return UserService.enrollMfa(req, false)
}

const confirmMfaEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.mfaConfirm)
  return UserService.confirmMfa(req, false)
}

const disableMfaEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.mfaDisable)
  return UserService.disableMfa(req, false)
}

const changePasswordEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.changePassword)
  return UserService.changePassword(req, payload, false)
}

const oauthAuthorizeEndPoint = async function (req) {
  return UserService.oauthAuthorize(req, false)
}

const oauthCallbackEndPoint = async function (req) {
  return UserService.oauthCallback(req, false)
}

module.exports = {
  userLoginEndPoint: userLoginEndPoint,
  refreshTokenEndPoint: refreshTokenEndPoint,
  getUserProfileEndPoint: getUserProfileEndPoint,
  userLogoutEndPoint: userLogoutEndPoint,
  enrollMfaEndPoint: enrollMfaEndPoint,
  confirmMfaEndPoint: confirmMfaEndPoint,
  disableMfaEndPoint: disableMfaEndPoint,
  changePasswordEndPoint: changePasswordEndPoint,
  oauthAuthorizeEndPoint: oauthAuthorizeEndPoint,
  oauthCallbackEndPoint: oauthCallbackEndPoint
}
