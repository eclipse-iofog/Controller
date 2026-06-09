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

const ConfigMapService = require('../services/config-map-service')
const YamlParserService = require('../services/yaml-parser-service')

const createConfigMapEndpoint = async function (req) {
  const configMap = req.body
  return ConfigMapService.createConfigMapEndpoint(configMap)
}

const updateConfigMapEndpoint = async function (req) {
  const configMap = req.body
  const configMapName = req.params.name
  return ConfigMapService.updateConfigMapEndpoint(configMapName, configMap)
}

const getConfigMapEndpoint = async function (req) {
  const configMapName = req.params.name
  return ConfigMapService.getConfigMapEndpoint(configMapName)
}

const listConfigMapsEndpoint = async function (req) {
  return ConfigMapService.listConfigMapsEndpoint()
}

const deleteConfigMapEndpoint = async function (req) {
  const configMapName = req.params.name
  return ConfigMapService.deleteConfigMapEndpoint(configMapName)
}

const createConfigMapFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const configMapData = await YamlParserService.parseConfigMapFile(fileContent)
  return ConfigMapService.createConfigMapEndpoint(configMapData)
}

const updateConfigMapFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const configMapName = req.params.name
  const configMapData = await YamlParserService.parseConfigMapFile(fileContent, {
    isUpdate: true,
    configMapName: configMapName
  })
  return ConfigMapService.updateConfigMapEndpoint(configMapName, configMapData)
}

module.exports = {
  createConfigMapEndpoint,
  updateConfigMapEndpoint,
  getConfigMapEndpoint,
  listConfigMapsEndpoint,
  deleteConfigMapEndpoint,
  createConfigMapFromYamlEndpoint,
  updateConfigMapFromYamlEndpoint
}
