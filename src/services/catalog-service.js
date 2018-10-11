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

const TransactionDecorator = require('../decorators/transaction-decorator');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ObjBuilder = require('../helpers/object-builder');
const CatalogItemManager = require('../sequelize/managers/catalog-item-manager');
const CatalogItemImageManager = require('../sequelize/managers/catalog-item-image-manager');
const CatalogItemInputTypeManager = require('../sequelize/managers/catalog-item-input-type-manager');
const CatalogItemOutputTypeManager = require('../sequelize/managers/catalog-item-output-type-manager');
const Validator = require('jsonschema').Validator;
const v = new Validator();

const createCatalogItem = async function (data, user, transaction) {
	v.addSchema(image, "/image");
	v.addSchema(type, "/type");
	const validated = v.validate(data, catalogItemSchema);
	if (!validated.valid) {
		throw new Errors.ValidationError(validated.errors[0].stack)
	}

	const catalogItem = await _createCatalogItem(data, user, transaction);
	await _createCatalogImages(data, catalogItem, transaction);
	await _createCatalogItemInputType(data, catalogItem, transaction);
	await _createCatalogItemOutputType(data, catalogItem, transaction);

	return {
		id: catalogItem.id
	}
};

const updateCatalogItem = async function (catalogItemId, data, user) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	_validateCatalogItemFields(data);

	const ob = new ObjBuilder();
	const catalogItemData = ob
		.pushFieldIfValExists('name', data.name)
		.pushFieldIfValExists('description', data.description)
		.pushFieldIfValExists('category', data.category)
		.pushFieldIfValExists('publisher', data.publisher)
		.pushFieldIfValExists('diskRequired', data.diskRequired)
		.pushFieldIfValExists('ramRequired', data.ramRequired)
		.pushFieldIfValExists('picture', data.picture)
		.pushFieldIfValExists('isPublic', data.isPublic)
		.pushFieldIfValExists('registryId', data.registryId)
		.pushFieldIfValExists('configExample', data.configExample)
		.popObj();

	const catalogItemImages = ob
		.pushFieldIfValExists('images', data.images)
		.popObj();

	const catalogItemInputType = ob
		.pushFieldIfValExists('inputType', data.inputType)
		.popObj();

	const catalogItemOutputType = ob
		.pushFieldIfValExists('outputType', data.outputType)
		.popObj();

};

const listCatalogItems = async function (user) {
	return await CatalogItemManager.findAll(user.id);
};

const listCatalogItem = async function (catalogItemId, user) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	return await CatalogItemManager.findOne(id, user.id);
};

const deleteCatalogItem = async function (catalogItemId, user, transaction) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	return await CatalogItemManager.deleteCatalogItemById(id, user.id, transaction);
};

const _createCatalogItem = async function (data, user, transaction) {
	const catalogItem = {
		name: data.name || 'New Catalog Item',
		description: data.description || '',
		category: data.category || '',
		configExample: data.configExample || '',
		publisher: data.publisher || '',
		diskRequired: data.diskRequired || 0,
		ramRequired: data.ramRequired || 0,
		picture: data.picture || 'images/shared/default.png',
		isPublic: data.isPublic || false,
		registryId: data.registryId || 1,
		userId: user.id
	};

	return await CatalogItemManager.create(catalogItem, transaction);
};

const _createCatalogImages = async function (data, catalogItem, transaction) {
	const catalogItemImages = [
		{
			containerImage: '',
			fogTypeId: 1,
			catalogItemId: catalogItem.id
		},
		{
			containerImage: '',
			fogTypeId: 2,
			catalogItemId: catalogItem.id
		}
	];
	if (data.images) {
		for (let image of data.images) {
			switch (image.fogTypeId) {
				case 1:
					catalogItemImages[0].containerImage = image.containerImage;
					break;
				case 2:
					catalogItemImages[1].containerImage = image.containerImage;
					break;
			}
		}
	}

	return await CatalogItemImageManager.bulkCreate(catalogItemImages, transaction);
};

const _createCatalogItemInputType = async function (data, catalogItem, transaction) {
	const catalogItemInputType = {
		infoType: '',
		infoFormat: '',
		catalogItemId: catalogItem.id
	};

	if (data.inputType) {
		catalogItemInputType.infoType = data.inputType.infoType;
		catalogItemInputType.infoFormat = data.inputType.infoFormat;
	}

	return await CatalogItemInputTypeManager.create(catalogItemInputType, transaction);
};

const _createCatalogItemOutputType = async function (data, catalogItem, transaction) {
	const catalogItemOutputType = {
		infoType: '',
		infoFormat: '',
		catalogItemId: catalogItem.id
	};

	if (data.outputType) {
		catalogItemOutputType.infoType = data.outputType.infoType;
		catalogItemOutputType.infoFormat = data.outputType.infoFormat;
	}

	return await CatalogItemOutputTypeManager.create(catalogItemOutputType, transaction);
};

const catalogItemSchema = {
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
			"maxItems": 2,
			"items": {"$ref": "/image"}},
		"inputType": {"$ref": "/type"},
		"outputType": {"$ref": "/type"}
	}
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
	},
	"required": ["containerImage", "fogTypeId"]
};

const type = {
	"id": "/type",
	"type": "object",
	"properties": {
		"infoType": {"type": "string"},
		"infoFormat": {"type": "string"}
	},
	"required": ["infoType", "infoFormat"]
};

module.exports = {
	createCatalogItem: TransactionDecorator.generateTransaction(createCatalogItem),
	listCatalogItems: TransactionDecorator.generateTransaction(listCatalogItems),
	listCatalogItem: TransactionDecorator.generateTransaction(listCatalogItem),
	deleteCatalogItem: TransactionDecorator.generateTransaction(deleteCatalogItem)
};