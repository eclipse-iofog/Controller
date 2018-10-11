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
const Validator = require('jsonschema').Validator;
const v = new Validator();

const createCatalogItemEndPoint = async function (req, user) {
	logger.info("Parameters:" + JSON.stringify(req.body));

	const catalogItem = {
		"id": "/catalogItem",
		"type": "object",
		"properties": {
			"name": {"type": "string"},
			"description": {"type": "string"},
			"category": {"type": "string"},
			"publisher": {"type": "string"},
			"diskRequired": {"type": "integer"},
			"ramRequired": {"type": "integer"},
			"picture": {"type": "string"},
			"isPublic": {"type": "boolean"},
			"registryId": {"type": "integer"},
			"configExample": {"type": "string"},
			"images": {
				"type": "array",
				"minItems": 1,
				"maxItems": 2,
				"items": {"$ref": "/image"}},
			"inputType": {"$ref": "/type"},
			"outputType": {"$ref": "/type"}
		},
		"required": ["name", ]
	};

	const image = {
		"id": "/image",
		"type": "object",
		"properties": {
			"containerImage": {"type": "string"},
			"fogTypeId":
				{"type": "integer",
					"minimum": 0,
					"maximum": 2
				}
		}
	};

	const type = {
		"id": "/type",
		"type": "object",
		"properties": {
			"infoType": {"type": "string"},
			"infoFormat": {"type": "string"}
		}
	};


	v.addSchema(image, "/image");
	v.addSchema(type, "/type");
	return v.validate(req.body, catalogItem);
	// return await CatalogService.createCatalogItem(req.body, user);
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
	await CatalogService.updateCatalogItem(req.params.id, req.body, user);
};

module.exports = {
	createCatalogItemEndPoint: AuthDecorator.checkAuthToken(createCatalogItemEndPoint),
	listCatalogItemsEndPoint: AuthDecorator.checkAuthToken(listCatalogItemsEndPoint),
	listCatalogItemEndPoint: AuthDecorator.checkAuthToken(listCatalogItemEndPoint),
	deleteCatalogItemEndPoint: AuthDecorator.checkAuthToken(deleteCatalogItemEndPoint)
};