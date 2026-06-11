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

const AuthUserService = require('../services/auth-user-service')
const Validator = require('../schemas')

const listUsersEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.listUsers()
}

const createUserEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  await Validator.validate(req.body, Validator.schemas.createAuthUser)
  return AuthUserService.createUser(req.body)
}

const getUserEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.getUser(req.params.id)
}

const updateUserEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  await Validator.validate(req.body, Validator.schemas.updateAuthUser)
  return AuthUserService.updateUser(req.params.id, req.body)
}

const deleteUserEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  const actorUserId = req.kauth.grant.access_token.content.sub
  return AuthUserService.deleteUser(req.params.id, actorUserId)
}

const resetPasswordEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.resetPassword(req.params.id)
}

const resetTokenEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.resetToken(req.params.id)
}

const listGroupsEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.listGroups()
}

const createGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  await Validator.validate(req.body, Validator.schemas.createAuthGroup)
  return AuthUserService.createGroup(req.body)
}

const getGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.getGroup(parseInt(req.params.id, 10))
}

const updateGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  await Validator.validate(req.body, Validator.schemas.updateAuthGroup)
  return AuthUserService.updateGroup(parseInt(req.params.id, 10), req.body)
}

const deleteGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.deleteGroup(parseInt(req.params.id, 10))
}

module.exports = {
  listUsersEndPoint,
  createUserEndPoint,
  getUserEndPoint,
  updateUserEndPoint,
  deleteUserEndPoint,
  resetPasswordEndPoint,
  resetTokenEndPoint,
  listGroupsEndPoint,
  createGroupEndPoint,
  getGroupEndPoint,
  updateGroupEndPoint,
  deleteGroupEndPoint
}
