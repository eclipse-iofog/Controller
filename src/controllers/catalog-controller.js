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

const CatalogService = require('../services/catalog-service')

const createCatalogItemEndPoint = async function (req) {
  return CatalogService.createCatalogItemEndPoint(req.body)
}

const listCatalogItemsEndPoint = async function (req) {
  return CatalogService.listCatalogItemsEndPoint(false)
}

const listCatalogItemEndPoint = async function (req) {
  return CatalogService.getCatalogItemEndPoint(req.params.id, false)
}

const deleteCatalogItemEndPoint = async function (req) {
  await CatalogService.deleteCatalogItemEndPoint(req.params.id, false)
}

const updateCatalogItemEndPoint = async function (req) {
  await CatalogService.updateCatalogItemEndPoint(req.params.id, req.body, false)
}

module.exports = {
  createCatalogItemEndPoint: (createCatalogItemEndPoint),
  listCatalogItemsEndPoint: (listCatalogItemsEndPoint),
  listCatalogItemEndPoint: (listCatalogItemEndPoint),
  deleteCatalogItemEndPoint: (deleteCatalogItemEndPoint),
  updateCatalogItemEndPoint: (updateCatalogItemEndPoint)
}
