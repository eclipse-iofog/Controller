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

function getGroupNameParam (req) {
  return decodeURIComponent(req.params.name || '')
}

const getGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.getGroup(getGroupNameParam(req))
}

const updateGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  await Validator.validate(req.body, Validator.schemas.updateAuthGroup)
  return AuthUserService.updateGroup(getGroupNameParam(req), req.body)
}

const deleteGroupEndPoint = async function (req) {
  AuthUserService.ensureEmbeddedMode()
  return AuthUserService.deleteGroup(getGroupNameParam(req))
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
