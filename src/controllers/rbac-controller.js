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

const RbacService = require('../services/rbac-service')
const YamlParserService = require('../services/yaml-parser-service')

// Role Endpoints
const listRolesEndpoint = async function (req) {
  return RbacService.listRolesEndpoint()
}

const getRoleEndpoint = async function (req) {
  const name = req.params.name
  return RbacService.getRoleEndpoint(name)
}

const createRoleEndpoint = async function (req) {
  const roleData = req.body
  return RbacService.createRoleEndpoint(roleData)
}

const updateRoleEndpoint = async function (req) {
  const name = req.params.name
  const roleData = req.body
  return RbacService.updateRoleEndpoint(name, roleData)
}

const deleteRoleEndpoint = async function (req) {
  const name = req.params.name
  return RbacService.deleteRoleEndpoint(name)
}

// RoleBinding Endpoints
const listRoleBindingsEndpoint = async function (req) {
  return RbacService.listRoleBindingsEndpoint()
}

const getRoleBindingEndpoint = async function (req) {
  const name = req.params.name
  return RbacService.getRoleBindingEndpoint(name)
}

const createRoleBindingEndpoint = async function (req) {
  const bindingData = req.body
  return RbacService.createRoleBindingEndpoint(bindingData)
}

const updateRoleBindingEndpoint = async function (req) {
  const name = req.params.name
  const bindingData = req.body
  return RbacService.updateRoleBindingEndpoint(name, bindingData)
}

const deleteRoleBindingEndpoint = async function (req) {
  const name = req.params.name
  return RbacService.deleteRoleBindingEndpoint(name)
}

// ServiceAccount Endpoints
const listServiceAccountsEndpoint = async function (req) {
  const applicationName = req.query.applicationName
  return RbacService.listServiceAccountsEndpoint(applicationName)
}

const getServiceAccountEndpoint = async function (req) {
  const appName = req.params.appName
  const name = req.params.name
  return RbacService.getServiceAccountEndpoint(appName, name)
}

const createServiceAccountEndpoint = async function (req) {
  const saData = req.body
  return RbacService.createServiceAccountEndpoint(saData)
}

const updateServiceAccountEndpoint = async function (req) {
  const appName = req.params.appName
  const name = req.params.name
  const saData = req.body
  return RbacService.updateServiceAccountEndpoint(appName, name, saData)
}

const deleteServiceAccountEndpoint = async function (req) {
  const appName = req.params.appName
  const name = req.params.name
  return RbacService.deleteServiceAccountEndpoint(appName, name)
}

// YAML Endpoints
const createRoleFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const roleData = await YamlParserService.parseRoleFile(fileContent)
  return RbacService.createRoleEndpoint(roleData)
}

const updateRoleFromYamlEndpoint = async function (req) {
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const roleData = await YamlParserService.parseRoleFile(fileContent)
  return RbacService.updateRoleEndpoint(name, roleData)
}

const createRoleBindingFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const bindingData = await YamlParserService.parseRoleBindingFile(fileContent)
  return RbacService.createRoleBindingEndpoint(bindingData)
}

const updateRoleBindingFromYamlEndpoint = async function (req) {
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const bindingData = await YamlParserService.parseRoleBindingFile(fileContent)
  return RbacService.updateRoleBindingEndpoint(name, bindingData)
}

const createServiceAccountFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const saData = await YamlParserService.parseServiceAccountFile(fileContent)
  return RbacService.createServiceAccountEndpoint(saData)
}

const updateServiceAccountFromYamlEndpoint = async function (req) {
  const appName = req.params.appName
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const saData = await YamlParserService.parseServiceAccountFile(fileContent)
  return RbacService.updateServiceAccountEndpoint(appName, name, saData)
}

module.exports = {
  // Role endpoints
  listRolesEndpoint: (listRolesEndpoint),
  getRoleEndpoint: (getRoleEndpoint),
  createRoleEndpoint: (createRoleEndpoint),
  updateRoleEndpoint: (updateRoleEndpoint),
  deleteRoleEndpoint: (deleteRoleEndpoint),
  createRoleFromYamlEndpoint: (createRoleFromYamlEndpoint),
  updateRoleFromYamlEndpoint: (updateRoleFromYamlEndpoint),
  // RoleBinding endpoints
  listRoleBindingsEndpoint: (listRoleBindingsEndpoint),
  getRoleBindingEndpoint: (getRoleBindingEndpoint),
  createRoleBindingEndpoint: (createRoleBindingEndpoint),
  updateRoleBindingEndpoint: (updateRoleBindingEndpoint),
  deleteRoleBindingEndpoint: (deleteRoleBindingEndpoint),
  createRoleBindingFromYamlEndpoint: (createRoleBindingFromYamlEndpoint),
  updateRoleBindingFromYamlEndpoint: (updateRoleBindingFromYamlEndpoint),
  // ServiceAccount endpoints
  listServiceAccountsEndpoint: (listServiceAccountsEndpoint),
  getServiceAccountEndpoint: (getServiceAccountEndpoint),
  createServiceAccountEndpoint: (createServiceAccountEndpoint),
  updateServiceAccountEndpoint: (updateServiceAccountEndpoint),
  deleteServiceAccountEndpoint: (deleteServiceAccountEndpoint),
  createServiceAccountFromYamlEndpoint: (createServiceAccountFromYamlEndpoint),
  updateServiceAccountFromYamlEndpoint: (updateServiceAccountFromYamlEndpoint)
}
