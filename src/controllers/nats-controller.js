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

const NatsApiService = require('../services/nats-api-service')
const YamlParserService = require('../services/yaml-parser-service')

const getOperatorEndPoint = async function () {
  return NatsApiService.getOperator()
}

const rotateOperatorEndPoint = async function () {
  return NatsApiService.rotateOperator()
}

const getBootstrapEndPoint = async function () {
  return NatsApiService.getBootstrap()
}

const getHubEndPoint = async function () {
  return NatsApiService.getHub()
}

const upsertHubEndPoint = async function (req) {
  return NatsApiService.upsertHub(req.body || {})
}

const listAccountsEndPoint = async function () {
  return NatsApiService.listAccounts()
}

const getAccountEndPoint = async function (req) {
  return NatsApiService.getAccount(req.params.appName)
}

const ensureAccountEndPoint = async function (req) {
  return NatsApiService.ensureAccount(req.params.appName, req.body || {})
}

const listAllUsersEndPoint = async function () {
  return NatsApiService.listAllUsers()
}

const listUsersEndPoint = async function (req) {
  return NatsApiService.listUsers(req.params.appName)
}

const createUserEndPoint = async function (req) {
  return NatsApiService.createUser(req.params.appName, req.body || {})
}

const getUserCredsEndPoint = async function (req) {
  return NatsApiService.getUserCreds(req.params.appName, req.params.userName)
}

const deleteUserEndPoint = async function (req) {
  await NatsApiService.deleteUser(req.params.appName, req.params.userName)
}

const createMqttBearerEndPoint = async function (req) {
  return NatsApiService.createMqttBearer(req.params.appName, req.body || {})
}

const deleteMqttBearerEndPoint = async function (req) {
  await NatsApiService.deleteMqttBearer(req.params.appName, req.params.userName)
}

const listAccountRulesEndPoint = async function () {
  return NatsApiService.listAccountRules()
}

const createAccountRuleEndPoint = async function (req) {
  return NatsApiService.createAccountRule(req.body || {})
}

const updateAccountRuleEndPoint = async function (req) {
  return NatsApiService.updateAccountRule(req.params.ruleName, req.body || {})
}

const deleteAccountRuleEndPoint = async function (req) {
  await NatsApiService.deleteAccountRule(req.params.ruleName)
}

const listUserRulesEndPoint = async function () {
  return NatsApiService.listUserRules()
}

const createUserRuleEndPoint = async function (req) {
  return NatsApiService.createUserRule(req.body || {})
}

const updateUserRuleEndPoint = async function (req) {
  return NatsApiService.updateUserRule(req.params.ruleName, req.body || {})
}

const deleteUserRuleEndPoint = async function (req) {
  await NatsApiService.deleteUserRule(req.params.ruleName)
}

const createAccountRuleFromYamlEndPoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const ruleData = await YamlParserService.parseNatsAccountRuleFile(fileContent)
  return NatsApiService.createAccountRule(ruleData)
}

const updateAccountRuleFromYamlEndPoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const ruleData = await YamlParserService.parseNatsAccountRuleFile(fileContent, {
    isUpdate: true,
    ruleName: req.params.ruleName
  })
  return NatsApiService.updateAccountRule(req.params.ruleName, ruleData)
}

const createUserRuleFromYamlEndPoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const ruleData = await YamlParserService.parseNatsUserRuleFile(fileContent)
  return NatsApiService.createUserRule(ruleData)
}

const updateUserRuleFromYamlEndPoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const ruleData = await YamlParserService.parseNatsUserRuleFile(fileContent, {
    isUpdate: true,
    ruleName: req.params.ruleName
  })
  return NatsApiService.updateUserRule(req.params.ruleName, ruleData)
}

module.exports = {
  getOperatorEndPoint,
  rotateOperatorEndPoint,
  getBootstrapEndPoint,
  getHubEndPoint,
  upsertHubEndPoint,
  listAccountsEndPoint,
  getAccountEndPoint,
  ensureAccountEndPoint,
  listAllUsersEndPoint,
  listUsersEndPoint,
  createUserEndPoint,
  getUserCredsEndPoint,
  deleteUserEndPoint,
  createMqttBearerEndPoint,
  deleteMqttBearerEndPoint,
  listAccountRulesEndPoint,
  createAccountRuleEndPoint,
  updateAccountRuleEndPoint,
  deleteAccountRuleEndPoint,
  createAccountRuleFromYamlEndPoint,
  updateAccountRuleFromYamlEndPoint,
  listUserRulesEndPoint,
  createUserRuleEndPoint,
  updateUserRuleEndPoint,
  deleteUserRuleEndPoint,
  createUserRuleFromYamlEndPoint,
  updateUserRuleFromYamlEndPoint
}
