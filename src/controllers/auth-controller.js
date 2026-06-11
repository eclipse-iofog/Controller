'use strict'

const AuthMigrationService = require('../services/auth-migration-service')
const AuthJwksService = require('../services/auth-jwks-service')

const migrationExportEndPoint = async function () {
  return AuthMigrationService.exportMigrationData()
}

const jwksRotateEndPoint = async function () {
  return AuthJwksService.rotateSigningKey()
}

module.exports = {
  migrationExportEndPoint,
  jwksRotateEndPoint
}
