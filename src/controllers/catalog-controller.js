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

const CatalogService = require('../services/catalog-service')
const AuthDecorator = require('./../decorators/authorization-decorator')

const createCatalogItemEndPoint = async function (req, user) {
  return CatalogService.createCatalogItemEndPoint(req.body, user)
}

const listCatalogItemsEndPoint = async function (req, user) {
  return CatalogService.listCatalogItemsEndPoint(user, false)
}

const listCatalogItemEndPoint = async function (req, user) {
  return CatalogService.getCatalogItemEndPoint(req.params.id, user, false)
}

const deleteCatalogItemEndPoint = async function (req, user) {
  await CatalogService.deleteCatalogItemEndPoint(req.params.id, user, false)
}

const updateCatalogItemEndPoint = async function (req, user) {
  await CatalogService.updateCatalogItemEndPoint(req.params.id, req.body, user, false)
}

module.exports = {
  createCatalogItemEndPoint: AuthDecorator.checkAuthToken(createCatalogItemEndPoint),
  listCatalogItemsEndPoint: AuthDecorator.checkAuthToken(listCatalogItemsEndPoint),
  listCatalogItemEndPoint: AuthDecorator.checkAuthToken(listCatalogItemEndPoint),
  deleteCatalogItemEndPoint: AuthDecorator.checkAuthToken(deleteCatalogItemEndPoint),
  updateCatalogItemEndPoint: AuthDecorator.checkAuthToken(updateCatalogItemEndPoint)
}
