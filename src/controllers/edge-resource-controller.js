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

const EdgeResourceService = require('../services/edge-resource-service')

const createEdgeResourceEndpoint = async function (req) {
  const edgeResourceData = req.body
  return EdgeResourceService.createEdgeResource(edgeResourceData)
}

const updateEdgeResourceEndpoint = async function (req) {
  const edgeResourceData = req.body
  const { version, name } = req.params
  return EdgeResourceService.updateEdgeResourceEndpoint(edgeResourceData, { name, version })
}

const listEdgeResourcesEndpoint = async function () {
  return { edgeResources: await EdgeResourceService.listEdgeResources() }
}

const getEdgeResourceEndpoint = async function (req) {
  const { version, name } = req.params
  const result = await EdgeResourceService.getEdgeResource({ name, version })
  if (version) {
    return result
  } else {
    return { edgeResources: result }
  }
}

const getEdgeResourceAllVersionsEndpoint = async function (req) {
  const { name } = req.params
  const result = await EdgeResourceService.getEdgeResource({ name })
  return { edgeResources: result }
}

const deleteEdgeResourceEndpoint = async function (req) {
  const { version, name } = req.params
  return EdgeResourceService.deleteEdgeResource({ name, version })
}

const linkEdgeResourceEndpoint = async function (req) {
  const { name, version } = req.params
  const { uuid } = req.body
  return EdgeResourceService.linkEdgeResource({ name, version }, uuid)
}

const unlinkEdgeResourceEndpoint = async function (req) {
  const { name, version } = req.params
  const { uuid } = req.body
  return EdgeResourceService.unlinkEdgeResource({ name, version }, uuid)
}

module.exports = {
  createEdgeResourceEndpoint: (createEdgeResourceEndpoint),
  updateEdgeResourceEndpoint: (updateEdgeResourceEndpoint),
  listEdgeResourcesEndpoint: (listEdgeResourcesEndpoint),
  getEdgeResourceEndpoint: (getEdgeResourceEndpoint),
  deleteEdgeResourceEndpoint: (deleteEdgeResourceEndpoint),
  linkEdgeResourceEndpoint: (linkEdgeResourceEndpoint),
  unlinkEdgeResourceEndpoint: (unlinkEdgeResourceEndpoint),
  getEdgeResourceAllVersionsEndpoint: (getEdgeResourceAllVersionsEndpoint)
}
