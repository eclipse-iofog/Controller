/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const logger = require('../logger');
const CatalogService = require('../services/catalog-service');
const AuthDecorator = require('./../decorators/authorization-decorator');

const createCatalogItemEndPoint = async function (req, user) {
  logger.info("Parameters: " + JSON.stringify(req.body));
  return await CatalogService.createCatalogItem(req.body, user);
};

const listCatalogItemsEndPoint = async function (req, user) {
  return await CatalogService.listCatalogItems(user, false);
};

const listCatalogItemEndPoint = async function (req, user) {
  logger.info("Catalog item id: " + req.params.id);
  return await CatalogService.listCatalogItem(req.params.id, user, false);
};

const deleteCatalogItemEndPoint = async function (req, user) {
  logger.info("Catalog item id: " + req.params.id);
  await CatalogService.deleteCatalogItem(req.params.id, user, false);
};

const updateCatalogItemEndPoint = async function (req, user) {
  logger.info("Parameters: " + JSON.stringify(req.body));
  logger.info("Catalog item id: " + req.params.id);
  await CatalogService.updateCatalogItem(req.params.id, req.body, user, false);
};

module.exports = {
  createCatalogItemEndPoint: AuthDecorator.checkAuthToken(createCatalogItemEndPoint),
  listCatalogItemsEndPoint: AuthDecorator.checkAuthToken(listCatalogItemsEndPoint),
  listCatalogItemEndPoint: AuthDecorator.checkAuthToken(listCatalogItemEndPoint),
  deleteCatalogItemEndPoint: AuthDecorator.checkAuthToken(deleteCatalogItemEndPoint),
  updateCatalogItemEndPoint: AuthDecorator.checkAuthToken(updateCatalogItemEndPoint)
};