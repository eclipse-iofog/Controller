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

const VolumeMountService = require('../services/volume-mount-service')
const YAMLParserService = require('../services/yaml-parser-service')

const listVolumeMountsEndpoint = async (req) => {
  return VolumeMountService.listVolumeMountsEndpoint()
}

const getVolumeMountEndpoint = async (req) => {
  return VolumeMountService.getVolumeMountEndpoint(req.params.name)
}

const createVolumeMountEndpoint = async (req) => {
  return VolumeMountService.createVolumeMountEndpoint(req.body)
}

const updateVolumeMountEndpoint = async (req) => {
  return VolumeMountService.updateVolumeMountEndpoint(req.params.name, req.body)
}

const deleteVolumeMountEndpoint = async (req) => {
  return VolumeMountService.deleteVolumeMountEndpoint(req.params.name)
}

const createVolumeMountYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const volumeMountData = await YAMLParserService.parseVolumeMountFile(fileContent)
  return VolumeMountService.createVolumeMountEndpoint(volumeMountData)
}

const updateVolumeMountYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const name = req.params.name
  const volumeMountData = await YAMLParserService.parseVolumeMountFile(fileContent, {
    isUpdate: true,
    volumeMountName: name
  })
  return VolumeMountService.updateVolumeMountEndpoint(name, volumeMountData)
}

const getVolumeMountLinkEndpoint = async (req) => {
  return VolumeMountService.getVolumeMountLinkEndpoint(req.params.name)
}

const linkVolumeMountEndpoint = async (req) => {
  return VolumeMountService.linkVolumeMountEndpoint(req.params.name, req.body.fogUuids)
}

const unlinkVolumeMountEndpoint = async (req) => {
  return VolumeMountService.unlinkVolumeMountEndpoint(req.params.name, req.body.fogUuids)
}

module.exports = {
  listVolumeMountsEndpoint,
  getVolumeMountEndpoint,
  createVolumeMountEndpoint,
  updateVolumeMountEndpoint,
  deleteVolumeMountEndpoint,
  createVolumeMountYamlEndpoint,
  updateVolumeMountYamlEndpoint,
  getVolumeMountLinkEndpoint,
  linkVolumeMountEndpoint,
  unlinkVolumeMountEndpoint
}
