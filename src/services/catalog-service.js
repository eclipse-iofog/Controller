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
const ObjBuilder = require('../helpers/object-builder')
const CatalogItemManager = require('../sequelize/managers/catalog-item-manager');
const CatalogItemImageManager = require('../sequelize/managers/catalog-item-image-manager');
const CatalogItemInputTypeManager = require('../sequelize/managers/catalog-item-input-type-manager');
const CatalogItemOutputTypeManager = require('../sequelize/managers/catalog-item-output-type-manager');

const createCatalogItem = async function (data, user, transaction) {
	_validateCatalogItemFields(data);

	const catalogItem = await _createCatalogItem(data, user, transaction);
	await _createX86CatalogImage(data, catalogItem, transaction);
	await _createArmCatalogImage(data, catalogItem, transaction);
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
		name: data.name,
		description: data.description,
		category: data.category,
		config: data.configExample,
		publisher: data.publisher,
		diskRequired: data.diskRequired,
		ramRequired: data.ramRequired,
		picture: data.picture,
		isPublic: data.isPublic,
		registryId: data.registryId,
		userId: user.id
	};

	return await CatalogItemManager.create(catalogItem, transaction);
};

const _createX86CatalogImage = async function (data, catalogItem, transaction) {
	const x86CatalogImage = {
		containerImage: data.containerImages.x86ContainerImage,
		catalogItemId: catalogItem.id,
		iofogTypeId: 1
	};

	return await CatalogItemImageManager.create(x86CatalogImage, transaction);
};

const _createArmCatalogImage = async function (data, catalogItem, transaction) {
	const x86CatalogImage = {
		containerImage: data.containerImages.armContainerImage,
		catalogItemId: catalogItem.id,
		iofogTypeId: 2
	};

	return await CatalogItemImageManager.create(x86CatalogImage, transaction);
};

const _createCatalogItemInputType = async function (data, catalogItem, transaction) {
	const catalogItemInputType = {
		infoType: data.inputType,
		infoFormat: data.inputFormat,
		catalogItemId: catalogItem.id
	};

	return await CatalogItemInputTypeManager.create(catalogItemInputType, transaction);
};

const _createCatalogItemOutputType = async function (data, catalogItem, transaction) {
	const catalogItemOutputType = {
		infoType: data.outputType,
		infoFormat: data.outputFormat,
		catalogItemId: catalogItem.id
	};

	return await CatalogItemOutputTypeManager.create(catalogItemOutputType, transaction);
};

const _validateCatalogItemFields = function (data) {
	AppHelper.validateFields(data,
		["name", "description", "category", "images", "publisher", "diskRequired", "ramRequired", "picture",
			"isPublic", "registryId", "inputType", "outputType", "configExample"]);
	for (let image of data.images) {
		AppHelper.validateFields(image, "containerImage", "fogTypeId");
	}
	AppHelper.validateFields(data.inputType, "infoType", "infoFormat");
	AppHelper.validateFields(data.outputType, "infoType", "infoFormat");
	_validateCatalogItemInfo(data);
};

const _validateCatalogItemInfo = function (data) {
	if (!AppHelper.isValidName(data.name)) {
		throw new Errors.ValidationError('Invalid catalog item name.');
	} else if (!AppHelper.isValidNumber(data.diskRequired)) {
		throw new Errors.ValidationError('Property diskRequired should be of type Number.');
	} else if (!AppHelper.isValidNumber(data.ramRequired)) {
		throw new Errors.ValidationError('Property ramRequired should be of type Number.');
	} else if (!AppHelper.isValidBoolean(data.isPublic)) {
		throw new Errors.ValidationError('Property isPublic should be of type Boolean.');
	} else if (!AppHelper.isValidName(data.registryId)) {
		throw new Errors.ValidationError('Property registryId should be of type Number.');
	} else {
		for (let image in data.images) {
			_validateFogTypeId(image.fogTypeId);
		}
	}
};

const _validateFogTypeId = function (fogTypeId) {
	if (!AppHelper.isValidNumber(fogTypeId)) {
		throw new Errors.ValidationError('Property fogTypeId is of invalid typel')
	}else if (fogTypeId < 0 || fogTypeId > 2) {
		throw new Errors.ValidationError('Property fogTypeId is invalid.')
	}
};

module.exports = {
	createCatalogItem: TransactionDecorator.generateTransaction(createCatalogItem),
	listCatalogItems: TransactionDecorator.generateTransaction(listCatalogItems),
	listCatalogItem: TransactionDecorator.generateTransaction(listCatalogItem),
	deleteCatalogItem: TransactionDecorator.generateTransaction(deleteCatalogItem)
};