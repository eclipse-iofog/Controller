/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const RbacServiceAccount = models.RbacServiceAccount
const Application = models.Application
const RbacRoleManager = require('./rbac-role-manager')
const ApplicationManager = require('./application-manager')
const Errors = require('../../helpers/errors')
const RbacCacheVersionManager = require('./rbac-cache-version-manager')
const AppHelper = require('../../helpers/app-helper')

const serviceAccountIncludeApplication = [
  {
    model: Application,
    as: 'application',
    required: false,
    attributes: ['name']
  }
]

function mapToResponse (sa) {
  if (!sa) return null
  const plain = sa.get ? sa.get({ plain: true }) : sa
  const applicationName = (plain.application && plain.application.name) ||
    (sa.application && sa.application.get ? sa.application.get({ plain: true }).name : null)
  return Object.assign({}, plain, { applicationName })
}

class RbacServiceAccountManager extends BaseManager {
  getEntity () {
    return RbacServiceAccount
  }

  /**
   * Find a ServiceAccount by microservice UUID (for microservice flow)
   */
  async findOneByMicroserviceUuid (microserviceUuid, transaction) {
    return this.findOne({ microserviceUuid }, transaction)
  }

  /**
   * Find a ServiceAccount by application ID and name
   */
  async findOneByApplicationAndName (applicationId, name, transaction) {
    return this.findOne({ applicationId, name }, transaction)
  }

  /**
   * Get a ServiceAccount by application name and service account name (for API).
   * Returns SA with applicationName in response shape.
   */
  async getServiceAccount (appName, name, transaction) {
    AppHelper.checkTransaction(transaction)
    const application = await ApplicationManager.findOne({ name: appName }, transaction)
    if (!application) {
      throw new Errors.NotFoundError(`Application '${appName}' not found`)
    }
    const options = transaction.fakeTransaction
      ? { where: { applicationId: application.id, name }, include: serviceAccountIncludeApplication }
      : { where: { applicationId: application.id, name }, include: serviceAccountIncludeApplication, transaction }
    const sa = await RbacServiceAccount.findOne(options)
    return sa ? mapToResponse(sa) : null
  }

  /**
   * Create a ServiceAccount
   * - If saData.microserviceUuid is set (microservice flow): find or create by microserviceUuid; set applicationId from microservice.
   * - Otherwise (API flow): require saData.applicationName; create with applicationId, name, roleRef; microservice_uuid null.
   */
  async createServiceAccount (saData, transaction) {
    if (!saData.roleRef || !saData.roleRef.name) {
      throw new Errors.ValidationError('ServiceAccount must have a roleRef with a name.')
    }

    const role = await RbacRoleManager.findOne({ name: saData.roleRef.name }, transaction)
    if (!role) {
      const roleWithRules = await RbacRoleManager.getRoleWithRules(saData.roleRef.name, transaction)
      if (!roleWithRules) {
        throw new Errors.ValidationError(`Referenced role '${saData.roleRef.name}' does not exist`)
      }
    }

    if (saData.microserviceUuid) {
      const existing = await this.findOneByMicroserviceUuid(saData.microserviceUuid, transaction)
      if (existing) {
        const updateData = { roleRef: saData.roleRef, name: saData.name || existing.name }
        if (role) updateData.roleId = role.id
        await this.update({ id: existing.id }, updateData, transaction)
        await RbacCacheVersionManager.incrementVersion(transaction)
        return this.findOne({ id: existing.id }, transaction)
      }
      const createData = {
        microserviceUuid: saData.microserviceUuid,
        applicationId: saData.applicationId,
        name: saData.name,
        roleRef: saData.roleRef,
        roleId: role ? role.id : null
      }
      const created = await this.create(createData, transaction)
      await RbacCacheVersionManager.incrementVersion(transaction)
      return created
    }

    if (!saData.applicationName) {
      throw new Errors.ValidationError('ServiceAccount must have applicationName when creating via API.')
    }
    const application = await ApplicationManager.findOne({ name: saData.applicationName }, transaction)
    if (!application) {
      throw new Errors.NotFoundError(`Application '${saData.applicationName}' not found`)
    }
    const existingByAppAndName = await this.findOneByApplicationAndName(application.id, saData.name, transaction)
    if (existingByAppAndName) {
      throw new Errors.ConflictError(`ServiceAccount '${saData.name}' already exists in application '${saData.applicationName}'`)
    }

    const createData = {
      applicationId: application.id,
      name: saData.name,
      roleRef: saData.roleRef,
      roleId: role ? role.id : null
    }
    const created = await this.create(createData, transaction)
    await RbacCacheVersionManager.incrementVersion(transaction)
    return created
  }

  /**
   * Update a ServiceAccount by appName and name (API)
   */
  async updateServiceAccount (appName, name, saData, transaction) {
    const application = await ApplicationManager.findOne({ name: appName }, transaction)
    if (!application) {
      throw new Errors.NotFoundError(`Application '${appName}' not found`)
    }
    const sa = await this.findOneByApplicationAndName(application.id, name, transaction)
    if (!sa) {
      throw new Errors.NotFoundError(`ServiceAccount '${name}' not found in application '${appName}'`)
    }

    let roleId = null
    if (saData.roleRef !== undefined) {
      if (!saData.roleRef || !saData.roleRef.name) {
        throw new Errors.ValidationError('ServiceAccount roleRef must have a name.')
      }
      const role = await RbacRoleManager.findOne({ name: saData.roleRef.name }, transaction)
      if (!role) {
        const roleWithRules = await RbacRoleManager.getRoleWithRules(saData.roleRef.name, transaction)
        if (!roleWithRules) {
          throw new Errors.ValidationError(`Referenced role '${saData.roleRef.name}' does not exist`)
        }
      } else {
        roleId = role.id
      }
    } else {
      const existingRoleRef = sa.roleRef
      if (existingRoleRef && existingRoleRef.name) {
        const role = await RbacRoleManager.findOne({ name: existingRoleRef.name }, transaction)
        if (role) roleId = role.id
      }
    }

    const updateData = {}
    if (saData.name !== undefined) updateData.name = saData.name
    if (saData.roleRef !== undefined) updateData.roleRef = saData.roleRef
    if (roleId !== null) updateData.roleId = roleId

    await this.update({ id: sa.id }, updateData, transaction)
    await RbacCacheVersionManager.incrementVersion(transaction)

    const updated = await RbacServiceAccount.findByPk(sa.id, {
      include: serviceAccountIncludeApplication,
      transaction: transaction.fakeTransaction ? undefined : transaction
    })
    return mapToResponse(updated)
  }

  /**
   * Delete a ServiceAccount by appName and name (API)
   */
  async deleteServiceAccount (appName, name, transaction) {
    const application = await ApplicationManager.findOne({ name: appName }, transaction)
    if (!application) {
      throw new Errors.NotFoundError(`Application '${appName}' not found`)
    }
    const sa = await this.findOneByApplicationAndName(application.id, name, transaction)
    if (!sa) {
      throw new Errors.NotFoundError(`ServiceAccount '${name}' not found in application '${appName}'`)
    }
    await this.delete({ id: sa.id }, transaction)
    await RbacCacheVersionManager.incrementVersion(transaction)
    return { message: `ServiceAccount '${name}' deleted successfully` }
  }

  /**
   * Delete ServiceAccount by microservice UUID (microservice flow)
   */
  async deleteByMicroserviceUuid (microserviceUuid, transaction) {
    const sa = await this.findOneByMicroserviceUuid(microserviceUuid, transaction)
    if (!sa) {
      return { message: 'ServiceAccount not found for microservice, skipping' }
    }
    await this.delete({ id: sa.id }, transaction)
    await RbacCacheVersionManager.incrementVersion(transaction)
    return { message: 'ServiceAccount deleted successfully' }
  }

  /**
   * List ServiceAccounts, optionally filtered by applicationName. Each item includes applicationName.
   */
  async listServiceAccounts (transaction, options = {}) {
    AppHelper.checkTransaction(transaction)
    let where = {}
    if (options.applicationName) {
      const application = await ApplicationManager.findOne({ name: options.applicationName }, transaction)
      if (!application) {
        return []
      }
      where.applicationId = application.id
    }
    const findOptions = transaction.fakeTransaction
      ? { where, include: serviceAccountIncludeApplication }
      : { where, include: serviceAccountIncludeApplication, transaction }
    const list = await RbacServiceAccount.findAll(findOptions)
    return list.map(sa => mapToResponse(sa))
  }
}

module.exports = new RbacServiceAccountManager()
