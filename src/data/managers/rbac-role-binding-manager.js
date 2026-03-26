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
const RbacRoleBinding = models.RbacRoleBinding
const RbacRoleManager = require('./rbac-role-manager')
const Errors = require('../../helpers/errors')
const RbacCacheVersionManager = require('./rbac-cache-version-manager')

class RbacRoleBindingManager extends BaseManager {
  getEntity () {
    return RbacRoleBinding
  }

  /**
   * Create a RoleBinding
   */
  async createRoleBinding (bindingData, transaction) {
    // Check if RoleBinding already exists
    const existingBinding = await this.findOne({ name: bindingData.name }, transaction)
    if (existingBinding) {
      throw new Errors.ConflictError(`RoleBinding '${bindingData.name}' already exists`)
    }

    // Validate role reference exists and get role ID
    let roleId = null
    if (bindingData.roleRef && bindingData.roleRef.name) {
      // Use findOne to get the actual model with id
      const role = await RbacRoleManager.findOne({ name: bindingData.roleRef.name }, transaction)
      if (!role) {
        // Check if it's a system role
        const roleWithRules = await RbacRoleManager.getRoleWithRules(bindingData.roleRef.name, transaction)
        if (!roleWithRules) {
          throw new Errors.ValidationError(`Referenced role '${bindingData.roleRef.name}' does not exist`)
        }
        // System role - roleId will be null (system roles don't have DB ids)
      } else {
        roleId = role.id
      }
    }

    let binding
    try {
      binding = await this.create({
        name: bindingData.name,
        // apiVersion removed
        kind: bindingData.kind || 'RoleBinding',
        // namespace removed (controller manages single namespace)
        roleRef: bindingData.roleRef,
        roleId: roleId,
        subjects: bindingData.subjects || []
      }, transaction)
    } catch (error) {
      // Handle SequelizeUniqueConstraintError as a safety net
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Errors.ConflictError(`RoleBinding '${bindingData.name}' already exists`)
      }
      throw error
    }

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return binding
  }

  /**
   * Update a RoleBinding
   */
  async updateRoleBinding (name, bindingData, transaction) {
    const binding = await this.findOne({ name }, transaction)
    if (!binding) {
      throw new Errors.NotFoundError(`RoleBinding '${name}' not found`)
    }

    // Validate role reference if provided and get role ID
    let roleId = null
    if (bindingData.roleRef && bindingData.roleRef.name) {
      // Use findOne to get the actual model with id
      const role = await RbacRoleManager.findOne({ name: bindingData.roleRef.name }, transaction)
      if (!role) {
        // Check if it's a system role
        const roleWithRules = await RbacRoleManager.getRoleWithRules(bindingData.roleRef.name, transaction)
        if (!roleWithRules) {
          throw new Errors.ValidationError(`Referenced role '${bindingData.roleRef.name}' does not exist`)
        }
        // System role - roleId will be null (system roles don't have DB ids)
      } else {
        roleId = role.id
      }
    } else if (bindingData.roleRef === undefined) {
      // If roleRef is not provided, keep existing roleId
      const existingRoleRef = binding.roleRef
      if (existingRoleRef && existingRoleRef.name) {
        const role = await RbacRoleManager.findOne({ name: existingRoleRef.name }, transaction)
        if (role) {
          roleId = role.id
        }
        // If not found in DB, it might be a system role - keep roleId as null
      }
    }

    const updateData = {}
    if (bindingData.name) updateData.name = bindingData.name
    // apiVersion and namespace removed (not stored in database)
    if (bindingData.roleRef) updateData.roleRef = bindingData.roleRef
    if (roleId !== null) updateData.roleId = roleId
    if (bindingData.subjects) updateData.subjects = bindingData.subjects

    await this.update({ name }, updateData, transaction)

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return this.findOne({ name: bindingData.name || name }, transaction)
  }

  /**
   * Delete a RoleBinding
   */
  async deleteRoleBinding (name, transaction) {
    const binding = await this.findOne({ name }, transaction)
    if (!binding) {
      throw new Errors.NotFoundError(`RoleBinding '${name}' not found`)
    }

    await this.delete({ name }, transaction)

    // Increment cache version to invalidate caches on all instances
    await RbacCacheVersionManager.incrementVersion(transaction)

    return { message: `RoleBinding '${name}' deleted successfully` }
  }

  /**
   * Get a RoleBinding by name
   */
  async getRoleBinding (name, transaction) {
    return this.findOne({ name }, transaction)
  }

  /**
   * List all RoleBindings
   */
  async listRoleBindings (transaction) {
    return this.findAll({}, transaction)
  }

  /**
   * Find RoleBindings by subject
   */
  async findRoleBindingsBySubject (subject, transaction) {
    const bindings = await this.findAll({}, transaction)
    const matchingBindings = []

    for (const binding of bindings) {
      const subjects = binding.subjects || []
      for (const subj of subjects) {
        if (subj.kind === subject.kind && subj.name === subject.name) {
          matchingBindings.push(binding)
          break
        }
      }
    }

    return matchingBindings
  }
}

module.exports = new RbacRoleBindingManager()
