/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseVaultProvider = require('./base-vault-provider')
const logger = require('../logger')

class AWSSecretsManagerProvider extends BaseVaultProvider {
  constructor () {
    super()
    this.client = null
  }

  getName () {
    return 'aws-secrets-manager'
  }

  async initialize (config) {
    // Call parent initialize to set this.config
    await super.initialize(config)

    // AWS SDK v3 uses dynamic imports
    try {
      const { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, DeleteSecretCommand, ListSecretsCommand, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager')

      // Build credentials object if accessKeyId is provided
      let credentials
      if (config.accessKeyId && config.accessKey) {
        credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.accessKey
        }
      }

      this.client = new SecretsManagerClient({
        region: config.region,
        credentials: credentials
      })

      this.GetSecretValueCommand = GetSecretValueCommand
      this.CreateSecretCommand = CreateSecretCommand
      this.DeleteSecretCommand = DeleteSecretCommand
      this.ListSecretsCommand = ListSecretsCommand
      this.PutSecretValueCommand = PutSecretValueCommand

      // Store reference for use in store method
      this.PutSecretValueCommandClass = PutSecretValueCommand

      // Test connection
      await this.testConnection()
    } catch (error) {
      // Provide more specific error messages
      if (error.code === 'MODULE_NOT_FOUND' || error.message.includes('Cannot find module')) {
        throw new Error(`Failed to initialize AWS Secrets Manager: @aws-sdk/client-secrets-manager package is not installed. Please run: npm install @aws-sdk/client-secrets-manager`)
      }
      if (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo ENOTFOUND')) {
        throw new Error(`Failed to connect to AWS Secrets Manager: Invalid region "${config.region}" or network connectivity issue. Please verify the AWS region is correct (e.g., us-east-1, eu-west-1).`)
      }
      if (error.name === 'CredentialsProviderError' || error.message.includes('credentials')) {
        throw new Error(`Failed to initialize AWS Secrets Manager: Invalid credentials. Please verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct.`)
      }
      throw new Error(`Failed to initialize AWS Secrets Manager: ${error.message}`)
    }
  }

  async store (path, data) {
    const secretName = this.buildPath(path)
    const command = new this.CreateSecretCommand({
      Name: secretName,
      SecretString: JSON.stringify(data),
      Description: `Eclipse ioFog controller secret: ${path}`
    })

    try {
      const response = await this.client.send(command)
      logger.debug(`AWS Secrets Manager store response: ${JSON.stringify(response)}`)
      return secretName
    } catch (error) {
      // If secret already exists, use PutSecretValueCommand to update
      if (error.name === 'ResourceExistsException') {
        const updateCommand = new this.PutSecretValueCommandClass({
          SecretId: secretName,
          SecretString: JSON.stringify(data)
        })
        const response = await this.client.send(updateCommand)
        logger.debug(`AWS Secrets Manager update response: ${JSON.stringify(response)}`)
        return secretName
      }
      throw error
    }
  }

  async retrieve (path) {
    const secretName = this.buildPath(path)
    const command = new this.GetSecretValueCommand({
      SecretId: secretName
    })

    try {
      const response = await this.client.send(command)
      if (response.SecretString) {
        return JSON.parse(response.SecretString)
      }
      if (response.SecretBinary) {
        return JSON.parse(Buffer.from(response.SecretBinary, 'base64').toString())
      }
      throw new Error('Secret has no string or binary value')
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        throw new Error(`Secret not found: ${secretName}`)
      }
      throw error
    }
  }

  async delete (path) {
    const secretName = this.buildPath(path)
    const command = new this.DeleteSecretCommand({
      SecretId: secretName,
      ForceDeleteWithoutRecovery: true
    })

    try {
      const response = await this.client.send(command)
      logger.debug(`AWS Secrets Manager delete response: ${JSON.stringify(response)}`)
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error
      }
    }
  }

  async exists (path) {
    try {
      await this.retrieve(path)
      return true
    } catch (error) {
      if (error.message.includes('not found') || error.name === 'ResourceNotFoundException') {
        return false
      }
      throw error
    }
  }

  async list (path) {
    const prefix = this.buildPath(path)
    const command = new this.ListSecretsCommand({
      Filters: [
        {
          Key: 'name',
          Values: [prefix]
        }
      ]
    })

    try {
      const response = await this.client.send(command)
      return (response.SecretList || []).map(secret => secret.Name)
    } catch (error) {
      return []
    }
  }

  async testConnection () {
    try {
      const command = new this.ListSecretsCommand({ MaxResults: 1 })
      await this.client.send(command)
      return true
    } catch (error) {
      throw new Error(`Failed to connect to AWS Secrets Manager: ${error.message}`)
    }
  }

  getBasePath () {
    if (this.config && this.config.basePath && typeof this.config.basePath === 'string') {
      return this.config.basePath
    }
    return 'iofog-controller/secrets'
  }
}

module.exports = AWSSecretsManagerProvider
