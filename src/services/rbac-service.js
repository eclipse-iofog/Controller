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

const RbacRoleManager = require('../data/managers/rbac-role-manager')
const RbacRoleBindingManager = require('../data/managers/rbac-role-binding-manager')
const RbacServiceAccountManager = require('../data/managers/rbac-service-account-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ApplicationManager = require('../data/managers/application-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Errors = require('../helpers/errors')
const Validator = require('../schemas/index')
const ChangeTrackingService = require('./change-tracking-service')
const logger = require('../logger')

/**
 * Validate that role name does not match a system role
 * @param {string} roleName - Role name to validate
 * @throws {Errors.ValidationError} If role name matches a system role
 */
function validateNotSystemRole (roleName) {
  if (RbacRoleManager.isSystemRole(roleName)) {
    throw new Errors.ValidationError(`Cannot use role name '${roleName}'. '${roleName}' is a system role and cannot be created or used.`)
  }
}

/**
 * Notify microservice when a service account linked to a microservice is updated
 * @param {Object} serviceAccount - Service account object (must have microserviceUuid if linked to a microservice)
 * @param {object} transaction - Database transaction
 */
async function _notifyMicroservicesForServiceAccountUpdate (serviceAccount, transaction) {
  const microserviceUuid = serviceAccount.microserviceUuid || (serviceAccount.get && serviceAccount.get('microserviceUuid'))
  if (!microserviceUuid) {
    return
  }
  try {
    const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
    if (microservice && microservice.iofogUuid) {
      await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
    }
  } catch (error) {
    logger.error(`Failed to notify microservice for service account update (microserviceUuid: ${microserviceUuid}):`, error.message)
  }
}

// Role Management
async function listRolesEndpoint (transaction) {
  const roles = await RbacRoleManager.listRoles(transaction)
  return {
    roles: roles
  }
}

async function getRoleEndpoint (name, transaction) {
  const role = await RbacRoleManager.getRoleWithRules(name, transaction)
  if (!role) {
    throw new Errors.NotFoundError(`Role '${name}' not found`)
  }
  return {
    role: role
  }
}

async function createRoleEndpoint (roleData, transaction) {
  // Validate schema
  await Validator.validate(roleData, Validator.schemas.roleCreate)

  // Validate role name does not match system role
  validateNotSystemRole(roleData.name)

  const role = await RbacRoleManager.createRole(roleData, transaction)
  return {
    role: role
  }
}

async function updateRoleEndpoint (name, roleData, transaction) {
  // Validate schema
  await Validator.validate(roleData, Validator.schemas.roleUpdate)

  // Prevent updating system roles
  if (RbacRoleManager.isSystemRole(name)) {
    throw new Errors.ValidationError(`Cannot update role '${name}'. '${name}' is a system role and cannot be modified.`)
  }

  // Prevent renaming to system role names
  if (roleData.name) {
    validateNotSystemRole(roleData.name)
  }

  // Get the role before update to get its ID - use findOne to get actual database model
  const oldRole = await RbacRoleManager.findOne({ name }, transaction)
  if (!oldRole) {
    throw new Errors.NotFoundError(`Role '${name}' not found`)
  }

  const role = await RbacRoleManager.updateRole(name, roleData, transaction)
  // Get the updated role to get its ID (in case name changed) - use findOne to get actual database model
  const updatedRoleName = roleData.name || name
  const updatedRole = await RbacRoleManager.findOne({ name: updatedRoleName }, transaction)
  if (!updatedRole) {
    throw new Errors.NotFoundError(`Role '${updatedRoleName}' not found after update`)
  }

  const roleId = updatedRole.id

  // Only query for bindings/service accounts if we have a valid roleId
  // System roles don't have database IDs, but we already prevent updating system roles above
  if (roleId != null) {
    // Find all role bindings that reference this role using roleId for efficient querying
    const bindings = await RbacRoleBindingManager.findAll({ roleId: roleId }, transaction)
    for (const binding of bindings) {
      // Trigger update to refresh cache and ensure roleId is set
      await RbacRoleBindingManager.updateRoleBinding(binding.name, {
        roleRef: binding.roleRef
      }, transaction)
    }

    // Find all service accounts that reference this role using roleId for efficient querying
    const serviceAccounts = await RbacServiceAccountManager.findAll({ roleId: roleId }, transaction)
    for (const sa of serviceAccounts) {
      const application = sa.applicationId ? await ApplicationManager.findOne({ id: sa.applicationId }, transaction) : null
      const appName = application ? application.name : null
      if (appName) {
        await RbacServiceAccountManager.updateServiceAccount(appName, sa.name, {
          roleRef: sa.roleRef
        }, transaction)
      }
      await _notifyMicroservicesForServiceAccountUpdate(sa, transaction)
    }
  }

  return {
    role: role
  }
}

async function deleteRoleEndpoint (name, transaction) {
  await RbacRoleManager.deleteRole(name, transaction)
  return {
    message: `Role '${name}' deleted successfully`
  }
}

// RoleBinding Management
async function listRoleBindingsEndpoint (transaction) {
  const bindings = await RbacRoleBindingManager.listRoleBindings(transaction)
  return {
    bindings: bindings
  }
}

async function getRoleBindingEndpoint (name, transaction) {
  const binding = await RbacRoleBindingManager.getRoleBinding(name, transaction)
  if (!binding) {
    throw new Errors.NotFoundError(`RoleBinding '${name}' not found`)
  }
  return {
    binding: binding
  }
}

async function createRoleBindingEndpoint (bindingData, transaction) {
  // Validate schema
  await Validator.validate(bindingData, Validator.schemas.roleBindingCreate)

  const binding = await RbacRoleBindingManager.createRoleBinding(bindingData, transaction)
  return {
    binding: binding
  }
}

async function updateRoleBindingEndpoint (name, bindingData, transaction) {
  // Validate schema
  await Validator.validate(bindingData, Validator.schemas.roleBindingUpdate)

  const binding = await RbacRoleBindingManager.updateRoleBinding(name, bindingData, transaction)
  return {
    binding: binding
  }
}

async function deleteRoleBindingEndpoint (name, transaction) {
  await RbacRoleBindingManager.deleteRoleBinding(name, transaction)
  return {
    message: `RoleBinding '${name}' deleted successfully`
  }
}

// ServiceAccount Management
async function listServiceAccountsEndpoint (applicationName, transaction) {
  const serviceAccounts = await RbacServiceAccountManager.listServiceAccounts(transaction, { applicationName })
  return {
    serviceAccounts: serviceAccounts
  }
}

async function getServiceAccountEndpoint (appName, name, transaction) {
  const sa = await RbacServiceAccountManager.getServiceAccount(appName, name, transaction)
  if (!sa) {
    throw new Errors.NotFoundError(`ServiceAccount '${name}' not found in application '${appName}'`)
  }
  return {
    serviceAccount: sa
  }
}

async function createServiceAccountEndpoint (saData, transaction) {
  await Validator.validate(saData, Validator.schemas.serviceAccountCreate)

  const sa = await RbacServiceAccountManager.createServiceAccount(saData, transaction)
  return {
    serviceAccount: sa
  }
}

async function updateServiceAccountEndpoint (appName, name, saData, transaction) {
  await Validator.validate(saData, Validator.schemas.serviceAccountUpdate)

  const sa = await RbacServiceAccountManager.updateServiceAccount(appName, name, saData, transaction)

  await _notifyMicroservicesForServiceAccountUpdate(sa, transaction)

  return {
    serviceAccount: sa
  }
}

async function deleteServiceAccountEndpoint (appName, name, transaction) {
  const sa = await RbacServiceAccountManager.getServiceAccount(appName, name, transaction)
  if (!sa) {
    throw new Errors.NotFoundError(`ServiceAccount '${name}' not found in application '${appName}'`)
  }

  if (sa.microserviceUuid) {
    const microservice = await MicroserviceManager.findOne({ uuid: sa.microserviceUuid }, transaction)
    throw new Errors.ConflictError(
      `Cannot delete ServiceAccount '${name}' because it is referenced by microservice '${microservice ? microservice.name : 'unknown'}' (uuid: ${sa.microserviceUuid}). Please delete or update the microservice first.`
    )
  }

  await RbacServiceAccountManager.deleteServiceAccount(appName, name, transaction)
  return {
    message: `ServiceAccount '${name}' deleted successfully`
  }
}

module.exports = {
  // Role endpoints
  listRolesEndpoint: TransactionDecorator.generateTransaction(listRolesEndpoint),
  getRoleEndpoint: TransactionDecorator.generateTransaction(getRoleEndpoint),
  createRoleEndpoint: TransactionDecorator.generateTransaction(createRoleEndpoint),
  updateRoleEndpoint: TransactionDecorator.generateTransaction(updateRoleEndpoint),
  deleteRoleEndpoint: TransactionDecorator.generateTransaction(deleteRoleEndpoint),
  // RoleBinding endpoints
  listRoleBindingsEndpoint: TransactionDecorator.generateTransaction(listRoleBindingsEndpoint),
  getRoleBindingEndpoint: TransactionDecorator.generateTransaction(getRoleBindingEndpoint),
  createRoleBindingEndpoint: TransactionDecorator.generateTransaction(createRoleBindingEndpoint),
  updateRoleBindingEndpoint: TransactionDecorator.generateTransaction(updateRoleBindingEndpoint),
  deleteRoleBindingEndpoint,
  // ServiceAccount endpoints
  listServiceAccountsEndpoint: TransactionDecorator.generateTransaction(listServiceAccountsEndpoint),
  getServiceAccountEndpoint: TransactionDecorator.generateTransaction(getServiceAccountEndpoint),
  createServiceAccountEndpoint: TransactionDecorator.generateTransaction(createServiceAccountEndpoint),
  updateServiceAccountEndpoint: TransactionDecorator.generateTransaction(updateServiceAccountEndpoint),
  deleteServiceAccountEndpoint: TransactionDecorator.generateTransaction(deleteServiceAccountEndpoint)
}
