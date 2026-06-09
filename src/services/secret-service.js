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

const crypto = require('crypto')
const TransactionDecorator = require('../decorators/transaction-decorator')
const SecretManager = require('../data/managers/secret-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const ChangeTrackingService = require('./change-tracking-service')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas/index')
const VolumeMountService = require('./volume-mount-service')
const VolumeMountingManager = require('../data/managers/volume-mounting-manager')
const CertificateManager = require('../data/managers/certificate-manager')
const SecretHelper = require('../helpers/secret-helper')
const vaultManager = require('../vault/vault-manager')

function validateBase64 (value) {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    const reencoded = Buffer.from(decoded).toString('base64')
    return reencoded === value
  } catch (error) {
    return false
  }
}

function validateSecretData (type, data) {
  if (type === 'tls') {
    const invalidKeys = Object.entries(data)
      .filter(([_, value]) => !validateBase64(value))
      .map(([key]) => key)

    if (invalidKeys.length > 0) {
      throw new Errors.ValidationError(
        `Invalid base64 encoding for keys: ${invalidKeys.join(', ')}`
      )
    }
  }
}

/**
 * Deterministic hash of secret data object (key-order independent).
 * Used to skip secret update when content is unchanged.
 */
function _secretDataHash (data) {
  if (data == null || typeof data !== 'object') {
    return crypto.createHash('sha256').update(String(data)).digest('hex')
  }
  const sortedKeys = Object.keys(data).sort()
  const canonical = JSON.stringify(sortedKeys.map(k => ({ k, v: data[k] })))
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

async function createSecretEndpoint (secretData, transaction) {
  const validation = await Validator.validate(secretData, Validator.schemas.secretCreate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  validateSecretData(secretData.type, secretData.data)

  const existingSecret = await SecretManager.findOne({ name: secretData.name }, transaction)
  if (existingSecret) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.SECRET_ALREADY_EXISTS, secretData.name))
  }

  const secret = await SecretManager.createSecret(secretData.name, secretData.type, secretData.data, transaction)
  return {
    id: secret.id,
    name: secret.name,
    type: secret.type,
    created_at: secret.created_at,
    updated_at: secret.updated_at
  }
}

async function updateSecretEndpoint (secretName, secretData, transaction) {
  const validation = await Validator.validate(secretData, Validator.schemas.secretUpdate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  const existingSecret = await SecretManager.findOne({ name: secretName }, transaction)
  if (!existingSecret) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
  }

  if (existingSecret.type !== secretData.type) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_TYPE_MISMATCH, secretName, existingSecret.type, secretData.type))
  }

  validateSecretData(existingSecret.type, secretData.data)

  const secret = await SecretManager.updateSecret(secretName, secretData.type, secretData.data, transaction)
  await _updateChangeTrackingForFogs(secretName, transaction)
  await _updateMicroservicesUsingSecret(secretName, transaction)
  return {
    id: secret.id,
    name: secret.name,
    type: secret.type,
    created_at: secret.created_at,
    updated_at: secret.updated_at
  }
}

/**
 * Update secret only if data has changed. Skips update and change-tracking when content is identical.
 * Use for NATS creds/seeds to avoid unnecessary volume mount version bumps and agent churn.
 */
async function updateSecretEndpointIfChanged (secretName, secretData, transaction) {
  const validation = await Validator.validate(secretData, Validator.schemas.secretUpdate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  const existingSecret = await SecretManager.findOne({ name: secretName }, transaction)
  if (!existingSecret) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
  }

  if (existingSecret.type !== secretData.type) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_TYPE_MISMATCH, secretName, existingSecret.type, secretData.type))
  }

  validateSecretData(existingSecret.type, secretData.data)

  const existingData = existingSecret.data || {}
  const existingHash = _secretDataHash(existingData)
  const newHash = _secretDataHash(secretData.data)
  if (existingHash === newHash) {
    return {
      id: existingSecret.id,
      name: existingSecret.name,
      type: existingSecret.type,
      created_at: existingSecret.created_at,
      updated_at: existingSecret.updated_at
    }
  }

  return updateSecretEndpoint(secretName, secretData, transaction)
}

async function getSecretEndpoint (secretName, transaction) {
  const secret = await SecretManager.getSecret(secretName, transaction)
  if (!secret) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
  }

  return {
    id: secret.id,
    name: secret.name,
    type: secret.type,
    data: secret.data,
    created_at: secret.created_at,
    updated_at: secret.updated_at
  }
}

async function listSecretsEndpoint (transaction) {
  const secrets = await SecretManager.listSecrets(transaction)
  return {
    secrets: secrets.map(secret => ({
      id: secret.id,
      name: secret.name,
      type: secret.type,
      created_at: secret.created_at,
      updated_at: secret.updated_at
    }))
  }
}

async function deleteSecretEndpoint (secretName, transaction) {
  const existingSecret = await SecretManager.findOne({ name: secretName }, transaction)
  if (!existingSecret) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
  }

  if (existingSecret.type === 'tls') {
    const certificate = await CertificateManager.findCertificateByName(secretName, transaction)
    if (certificate) {
      if (certificate.isCA) {
        // Check if this CA has signed certificates
        const signedCerts = await CertificateManager.findCertificatesByCA(certificate.id, transaction)
        if (signedCerts.length > 0) {
          throw new Errors.ValidationError(`Cannot delete CA that has signed certificates. Please delete the following certificates first: ${signedCerts.map(cert => cert.name).join(', ')}`)
        }
        await CertificateManager.deleteCertificate(certificate.name, transaction)
        await SecretManager.deleteSecret(secretName, transaction)
        // Remove secret from external vault if configured
        if (vaultManager.isEnabled()) {
          await SecretHelper.deleteSecret(secretName, existingSecret.type)
        }
        await _deleteVolumeMountsUsingSecret(secretName, transaction)
      } else {
        await CertificateManager.deleteCertificate(certificate.name, transaction)
        await _deleteVolumeMountsUsingSecret(secretName, transaction)
        await SecretManager.deleteSecret(secretName, transaction)
        // Remove secret from external vault if configured
        if (vaultManager.isEnabled()) {
          await SecretHelper.deleteSecret(secretName, existingSecret.type)
        }
      }
    } else {
      // Delete secret from database and external vault
      await SecretManager.deleteSecret(secretName, transaction)
      await _deleteVolumeMountsUsingSecret(secretName, transaction)
      // Remove secret from external vault if configured
      if (vaultManager.isEnabled()) {
        await SecretHelper.deleteSecret(secretName, existingSecret.type)
      }
    }
  } else {
    await SecretManager.deleteSecret(secretName, transaction)
    await _deleteVolumeMountsUsingSecret(secretName, transaction)
    // Remove secret from external vault if configured
    if (vaultManager.isEnabled()) {
      await SecretHelper.deleteSecret(secretName, existingSecret.type)
    }
  }
  return {}
}

async function _deleteVolumeMountsUsingSecret (secretName, transaction) {
  const volumeMounts = await VolumeMountingManager.findAll({ secretName: secretName }, transaction)
  if (volumeMounts.length > 0) {
    for (const volumeMount of volumeMounts) {
      await VolumeMountService.deleteVolumeMountEndpoint(volumeMount.name, transaction)
    }
  }
}

async function _updateChangeTrackingForFogs (secretName, transaction) {
  const secretVolumeMounts = await VolumeMountingManager.findAll({ secretName: secretName }, transaction)
  if (secretVolumeMounts.length > 0) {
    for (const secretVolumeMount of secretVolumeMounts) {
      const volumeMountObj = {
        name: secretVolumeMount.name,
        secretName: secretName
      }
      await VolumeMountService.updateVolumeMountEndpoint(secretVolumeMount.name, volumeMountObj, transaction)
    }
  }
}

async function _updateMicroservicesUsingSecret (secretName, transaction) {
  // Find all microservice environment variables that use this secret
  const envVars = await MicroserviceEnvManager.findAll({
    valueFromSecret: { [require('sequelize').Op.like]: `${secretName}/%` }
  }, transaction)

  if (envVars.length === 0) {
    return
  }

  // Get the updated secret data
  const secret = await SecretManager.getSecret(secretName, transaction)
  if (!secret) {
    return
  }

  // Group environment variables by microservice UUID
  const microserviceEnvMap = new Map()
  for (const envVar of envVars) {
    if (!microserviceEnvMap.has(envVar.microserviceUuid)) {
      microserviceEnvMap.set(envVar.microserviceUuid, [])
    }
    microserviceEnvMap.get(envVar.microserviceUuid).push(envVar)
  }

  // Update each microservice's environment variables and change tracking
  for (const [microserviceUuid, envVars] of microserviceEnvMap) {
    // Get the microservice to access its iofogUuid
    const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
    if (!microservice) {
      continue
    }

    // Update each environment variable with the new secret data
    for (const envVar of envVars) {
      const [secretNameFromRef, dataKey] = envVar.valueFromSecret.split('/')
      if (secretNameFromRef === secretName && secret.data[dataKey]) {
        let newValue = secret.data[dataKey]

        // If it's a TLS secret, decode the base64 value
        if (secret.type === 'tls') {
          try {
            newValue = Buffer.from(secret.data[dataKey], 'base64').toString('utf-8')
          } catch (error) {
            // Skip this environment variable if base64 decoding fails
            continue
          }
        }

        // Update the environment variable value with the new secret data
        await MicroserviceEnvManager.update(
          { id: envVar.id },
          { value: newValue },
          transaction
        )
      }
    }

    // Update change tracking for the microservice's fog node
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

module.exports = {
  createSecretEndpoint: TransactionDecorator.generateTransaction(createSecretEndpoint),
  updateSecretEndpoint: TransactionDecorator.generateTransaction(updateSecretEndpoint),
  updateSecretEndpointIfChanged: TransactionDecorator.generateTransaction(updateSecretEndpointIfChanged),
  getSecretEndpoint: TransactionDecorator.generateTransaction(getSecretEndpoint),
  listSecretsEndpoint: TransactionDecorator.generateTransaction(listSecretsEndpoint),
  deleteSecretEndpoint: TransactionDecorator.generateTransaction(deleteSecretEndpoint)
}
