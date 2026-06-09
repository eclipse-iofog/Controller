/*
 * *******************************************************************************
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

const ServiceService = require('../services/services-service')
const YamlParserService = require('../services/yaml-parser-service')

const createServiceEndpoint = async function (req) {
  const serviceData = req.body
  return ServiceService.createServiceEndpoint(serviceData)
}

const updateServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  const serviceData = req.body
  return ServiceService.updateServiceEndpoint(serviceName, serviceData)
}

const deleteServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  return ServiceService.deleteServiceEndpoint(serviceName)
}

const getServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  return ServiceService.getServiceEndpoint(serviceName)
}

const listServicesEndpoint = async function (req) {
  return ServiceService.getServicesListEndpoint()
}

const createServiceYAMLEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const serviceData = await YamlParserService.parseServiceFile(fileContent)
  return ServiceService.createServiceEndpoint(serviceData)
}

const updateServiceYAMLEndpoint = async function (req) {
  const serviceName = req.params.name
  const fileContent = req.file.buffer.toString()
  const serviceData = await YamlParserService.parseServiceFile(fileContent, {
    isUpdate: true,
    serviceName: serviceName
  })
  return ServiceService.updateServiceEndpoint(serviceName, serviceData)
}

module.exports = {
  createServiceEndpoint,
  updateServiceEndpoint,
  deleteServiceEndpoint,
  getServiceEndpoint,
  listServicesEndpoint,
  createServiceYAMLEndpoint,
  updateServiceYAMLEndpoint
}
