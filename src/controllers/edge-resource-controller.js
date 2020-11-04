/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AuthDecorator = require('./../decorators/authorization-decorator')
const EdgeResourceService = require('../services/edge-resource-service')

const createEdgeResourceEndpoint = async function (req, user) {
  const edgeResourceData = req.body
  return EdgeResourceService.createEdgeResource(edgeResourceData, user)
}

const updateEdgeResourceEndpoint = async function (req, user) {
  const edgeResourceData = req.body
  const { version, name } = req.params
  return EdgeResourceService.updateEdgeResourceEndpoint(edgeResourceData, { name, version }, user)
}

const listEdgeResourcesEndpoint = async function (req, user) {
  return { edgeResources: await EdgeResourceService.listEdgeResources(user) }
}

const getEdgeResourceEndpoint = async function (req, user) {
  const { version, name } = req.params
  const result = await EdgeResourceService.getEdgeResource({ name, version }, user)
  if (version) {
    return result
  } else {
    return { edgeResources: result }
  }
}

const getEdgeResourceAllVersionsEndpoint = async function (req, user) {
  const { name } = req.params
  const result = await EdgeResourceService.getEdgeResource({ name }, user)
  return { edgeResources: result }
}

const deleteEdgeResourceEndpoint = async function (req, user) {
  const { version, name } = req.params
  return EdgeResourceService.deleteEdgeResource({ name, version }, user)
}

const linkEdgeResourceEndpoint = async function (req, user) {
  const { name, version } = req.params
  const { uuid } = req.body
  return EdgeResourceService.linkEdgeResource({ name, version }, uuid, user)
}

const unlinkEdgeResourceEndpoint = async function (req, user) {
  const { name, version } = req.params
  const { uuid } = req.body
  return EdgeResourceService.unlinkEdgeResource({ name, version }, uuid, user)
}

module.exports = {
  createEdgeResourceEndpoint: AuthDecorator.checkAuthToken(createEdgeResourceEndpoint),
  updateEdgeResourceEndpoint: AuthDecorator.checkAuthToken(updateEdgeResourceEndpoint),
  listEdgeResourcesEndpoint: AuthDecorator.checkAuthToken(listEdgeResourcesEndpoint),
  getEdgeResourceEndpoint: AuthDecorator.checkAuthToken(getEdgeResourceEndpoint),
  deleteEdgeResourceEndpoint: AuthDecorator.checkAuthToken(deleteEdgeResourceEndpoint),
  linkEdgeResourceEndpoint: AuthDecorator.checkAuthToken(linkEdgeResourceEndpoint),
  unlinkEdgeResourceEndpoint: AuthDecorator.checkAuthToken(unlinkEdgeResourceEndpoint),
  getEdgeResourceAllVersionsEndpoint: AuthDecorator.checkAuthToken(getEdgeResourceAllVersionsEndpoint)
}
