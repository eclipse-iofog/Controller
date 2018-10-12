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
const validator = require('../schemas/index');

const createCatalogItemEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.body));
	await validator.validate(req, validator.schemas.catalogItemCreate);
	return await CatalogService.createCatalogItem(req.body, user);
};

const listCatalogItemsEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.query));
	return await CatalogService.listCatalogItems(user);
};

const listCatalogItemEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.query));
	return await CatalogService.listCatalogItem(req.params.id, user);
};

const deleteCatalogItemEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.query));
	await CatalogService.deleteCatalogItem(req.params.id, user);
};

const updateCatalogItemEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.body));
	await validator.validate(req, validator.schemas.catalogItemUpdate);
	await CatalogService.updateCatalogItem(req.params.id, req.body, user);
};

module.exports = {
	createCatalogItemEndPoint: AuthDecorator.checkAuthToken(createCatalogItemEndPoint),
	listCatalogItemsEndPoint: AuthDecorator.checkAuthToken(listCatalogItemsEndPoint),
	listCatalogItemEndPoint: AuthDecorator.checkAuthToken(listCatalogItemEndPoint),
	deleteCatalogItemEndPoint: AuthDecorator.checkAuthToken(deleteCatalogItemEndPoint),
	updateCatalogItemEndPoint: AuthDecorator.checkAuthToken(updateCatalogItemEndPoint)
};