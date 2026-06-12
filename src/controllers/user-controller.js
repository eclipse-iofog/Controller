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

const interactionStatusEndPoint = async function (req) {
  return UserService.interactionStatus(req.params.uid, false)
}

const interactionLoginEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.interactionLogin)
  return UserService.interactionLogin(req.params.uid, {
    email: payload.email,
    password: payload.password
  }, false)
}

const interactionMfaEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.interactionMfa)
  return UserService.interactionMfa(req.params.uid, payload.code, false)
}

const interactionEnrollEndPoint = async function (req) {
  return UserService.interactionEnroll(req.params.uid, false)
}

const interactionConfirmEnrollEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.interactionMfa)
  return UserService.interactionConfirmEnroll(req.params.uid, payload.code, false)
}

const interactionChangePasswordEndPoint = async function (req) {
  const payload = req.body
  await Validator.validate(payload, Validator.schemas.changePassword)
  return UserService.interactionChangePassword(req.params.uid, payload, false)
}

const interactionCompleteEndPoint = async function (req, res) {
  return UserService.interactionComplete(req.params.uid, req, res, false)
}

module.exports = {
  userLoginEndPoint,
  refreshTokenEndPoint,
  getUserProfileEndPoint,
  userLogoutEndPoint,
  enrollMfaEndPoint,
  confirmMfaEndPoint,
  disableMfaEndPoint,
  changePasswordEndPoint,
  oauthAuthorizeEndPoint,
  oauthCallbackEndPoint,
  interactionStatusEndPoint,
  interactionLoginEndPoint,
  interactionMfaEndPoint,
  interactionEnrollEndPoint,
  interactionConfirmEnrollEndPoint,
  interactionChangePasswordEndPoint,
  interactionCompleteEndPoint
}
