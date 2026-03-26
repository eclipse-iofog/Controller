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
const RbacRole = models.RbacRole
const RbacRoleRule = models.RbacRoleRule
const systemRoles = require('../../config/rbac-system-roles')
const Errors = require('../../helpers/errors')
const RbacCacheVersionManager = require('./rbac-cache-version-manager')

class RbacRoleManager extends BaseManager {
  getEntity () {
    return RbacRole
  }

  /**
   * Check if role name is Admin (case-insensitive)
   */
  isAdminRole (name) {
    return name && name.toLowerCase() === 'admin'
  }

  /**
   * Check if role name is a system role (case-insensitive)
   * System roles: Admin, SRE, Developer, Viewer, Agent Admin, Microservice (fully static, defined in config)
   */
  isSystemRole (name) {
    if (!name) return false
    const systemRoles = ['admin', 'sre', 'developer', 'viewer', 'agent-admin', 'microservice']
    return systemRoles.includes(name.toLowerCase())
  }

  /**
   * Get system role definition from config by name
   * @param {string} name - Role name
   * @returns {Object|null} System role definition or null if not found
   */
  getSystemRole (name) {
    if (!name) return null
    const normalizedName = name.toLowerCase()
    switch (normalizedName) {
      case 'admin':
        return systemRoles.ADMIN_ROLE
      case 'sre':
        return systemRoles.SRE_ROLE
      case 'developer':
        return systemRoles.DEVELOPER_ROLE
      case 'viewer':
        return systemRoles.VIEWER_ROLE
      case 'agent-admin':
        return systemRoles.AGENT_ADMIN_ROLE
      case 'microservice':
        return systemRoles.MICROSERVICE_ROLE
      default:
        return null
    }
  }

  /**
   * Check if role name is a protected built-in role (case-insensitive)
   * Protected roles: Admin, SRE, Developer, Viewer
   * @deprecated Use isSystemRole instead
   */
  isProtectedRole (name) {
    return this.isSystemRole(name)
  }

  /**
   * Create a Role with its rules
   */
  async createRole (roleData, transaction) {
    // Prevent creating system role names (Admin, SRE, Developer, Viewer)
    if (this.isSystemRole(roleData.name)) {
      throw new Errors.ValidationError(`Cannot create ${roleData.name} role. ${roleData.name} is a system role and cannot be created.`)
    }

    // Check if role already exists
    const existingRole = await this.findOne({ name: roleData.name }, transaction)
    if (existingRole) {
      throw new Errors.ConflictError(`Role '${roleData.name}' already exists`)
    }

    let role
    try {
      role = await this.create({
        name: roleData.name,
        // apiVersion removed
        kind: roleData.kind || 'Role'
        // namespace removed (controller manages single namespace)
      }, transaction)
    } catch (error) {
      // Handle SequelizeUniqueConstraintError as a safety net
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Errors.ConflictError(`Role '${roleData.name}' already exists`)
      }
      throw error
    }

    // Create rules if provided
    if (roleData.rules && Array.isArray(roleData.rules)) {
      const rules = roleData.rules.map(rule => ({
        roleId: role.id,
        apiGroups: rule.apiGroups || [''],
        resources: rule.resources || [],
        verbs: rule.verbs || [],
        resourceNames: rule.resourceNames || null
      }))

      const bulkCreateOptions = transaction.fakeTransaction ? {} : { transaction }
      await RbacRoleRule.bulkCreate(rules, bulkCreateOptions)
    }

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return this.getRoleWithRules(role.name, transaction)
  }

  /**
   * Update a Role and its rules
   */
  async updateRole (name, roleData, transaction) {
    // Prevent updating system roles (Admin, SRE, Developer, Viewer)
    if (this.isSystemRole(name)) {
      throw new Errors.ValidationError(`Cannot update ${name} role. ${name} is a system role and cannot be modified.`)
    }

    // Prevent renaming to system role names
    if (roleData.name && this.isSystemRole(roleData.name)) {
      throw new Errors.ValidationError(`Cannot rename role to ${roleData.name}. ${roleData.name} is a system role.`)
    }

    const role = await this.findOne({ name }, transaction)
    if (!role) {
      throw new Errors.NotFoundError(`Role '${name}' not found`)
    }

    // Update role metadata
    const updateData = {}
    if (roleData.name) updateData.name = roleData.name
    // apiVersion and namespace removed (not stored in database)

    if (Object.keys(updateData).length > 0) {
      await this.update({ name }, updateData, transaction)
    }

    // Update rules if provided
    if (roleData.rules && Array.isArray(roleData.rules)) {
      // Delete existing rules
      const destroyOptions = transaction.fakeTransaction
        ? { where: { roleId: role.id } }
        : { where: { roleId: role.id }, transaction }
      await RbacRoleRule.destroy(destroyOptions)

      // Create new rules
      const rules = roleData.rules.map(rule => ({
        roleId: role.id,
        apiGroups: rule.apiGroups || [''],
        resources: rule.resources || [],
        verbs: rule.verbs || [],
        resourceNames: rule.resourceNames || null
      }))

      const bulkCreateOptions = transaction.fakeTransaction ? {} : { transaction }
      await RbacRoleRule.bulkCreate(rules, bulkCreateOptions)
    }

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return this.getRoleWithRules(roleData.name || name, transaction)
  }

  /**
   * Delete a Role
   */
  async deleteRole (name, transaction) {
    // Prevent deleting system roles (Admin, SRE, Developer, Viewer)
    if (this.isSystemRole(name)) {
      throw new Errors.ValidationError(`Cannot delete ${name} role. ${name} is a system role and cannot be deleted.`)
    }

    const role = await this.findOne({ name }, transaction)
    if (!role) {
      throw new Errors.NotFoundError(`Role '${name}' not found`)
    }

    // Rules will be deleted via CASCADE
    await this.delete({ name }, transaction)

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return { message: `Role '${name}' deleted successfully` }
  }

  /**
   * Get a Role with its rules
   */
  async getRoleWithRules (name, transaction) {
    // Check if it's a system role (Admin, SRE, Developer, Viewer)
    if (this.isSystemRole(name)) {
      const systemRole = this.getSystemRole(name)
      if (systemRole) {
        return {
          name: systemRole.name,
          // apiVersion removed - not stored in database (system roles config can keep it as metadata)
          kind: systemRole.kind,
          // namespace removed - not stored in database (controller manages single namespace)
          rules: systemRole.rules
        }
      }
    }

    const role = await this.findOne({ name }, transaction)
    if (!role) {
      return null
    }

    const findAllOptions = transaction.fakeTransaction
      ? { where: { roleId: role.id } }
      : { where: { roleId: role.id }, transaction: transaction }
    const rules = await RbacRoleRule.findAll(findAllOptions)

    return {
      id: role.id,
      name: role.name,
      // apiVersion removed - not stored in database
      kind: role.kind,
      // namespace removed - not stored in database (controller manages single namespace)
      rules: rules.map(rule => ({
        apiGroups: rule.apiGroups,
        resources: rule.resources,
        verbs: rule.verbs,
        resourceNames: rule.resourceNames
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * List all Roles with their rules
   */
  async listRoles (transaction) {
    const roles = await this.findAll({}, transaction)
    const rolesWithRules = []

    // Add database roles (excluding system roles that may exist from old migrations)
    for (const role of roles) {
      // Skip database entries for system roles (they're handled statically)
      if (!this.isSystemRole(role.name)) {
        const roleWithRules = await this.getRoleWithRules(role.name, transaction)
        rolesWithRules.push(roleWithRules)
      }
    }

    // Add system roles to the list (Admin, SRE, Developer, Viewer, Agent Admin, Microservice)
    const systemRolesList = [
      systemRoles.ADMIN_ROLE,
      systemRoles.SRE_ROLE,
      systemRoles.DEVELOPER_ROLE,
      systemRoles.VIEWER_ROLE,
      systemRoles.AGENT_ADMIN_ROLE,
      systemRoles.MICROSERVICE_ROLE
    ]

    for (const systemRole of systemRolesList) {
      rolesWithRules.unshift({
        name: systemRole.name,
        // apiVersion removed - not stored in database (system roles config can keep it as metadata)
        kind: systemRole.kind,
        // namespace removed - not stored in database (controller manages single namespace)
        rules: systemRole.rules
      })
    }

    return rolesWithRules
  }
}

module.exports = new RbacRoleManager()
