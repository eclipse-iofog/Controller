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
const CatalogItemManager = require('../sequelize/managers/catalog-item-manager');
const CatalogItemImageManager = require('../sequelize/managers/catalog-item-image-manager');
const CatalogItemInputTypeManager = require('../sequelize/managers/catalog-item-input-type-manager');
const CatalogItemOutputTypeManager = require('../sequelize/managers/catalog-item-output-type-manager');

const createCatalogItem = async function (data, user, transaction) {

	AppHelper.validateFields(data,
		["name", "description", "category", "containerImages", "publisher", "diskRequired", "ramRequired", "picture",
			"isPublic", "registryId", "inputType", "inputFormat", "outputType", "outputFormat", "configExample"]);
	AppHelper.validateFields(data.containerImages, ["x86ContainerImage", "armContainerImage"]);
	_validateCatalogItemInfo(data);

	const catalogItem = await _createCatalogItem(data, user, transaction);
	await _createX86CatalogImage(data, catalogItem, transaction);
	await _createArmCatalogImage(data, catalogItem, transaction);
	await _createCatalogItemInputType(data, catalogItem, transaction);
	await _createCatalogItemOutputType(data, catalogItem, transaction);

	return {
		id: catalogItem.id
	}
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
		registry_id: data.registryId,
		user_id: user.id
	};

	return await CatalogItemManager.create(catalogItem, transaction);
};

const _createX86CatalogImage = async function (data, catalogItem, transaction) {
	const x86CatalogImage = {
		containerImage: data.containerImages.x86ContainerImage,
		catalog_item_id: catalogItem.id,
		iofog_type_id: 1
	};

	return await CatalogItemImageManager.create(x86CatalogImage, transaction);
};

const _createArmCatalogImage = async function (data, catalogItem, transaction) {
	const x86CatalogImage = {
		containerImage: data.containerImages.armContainerImage,
		catalog_item_id: catalogItem.id,
		iofog_type_id: 2
	};

	return await CatalogItemImageManager.create(x86CatalogImage, transaction);
};

const _createCatalogItemInputType = async function (data, catalogItem, transaction) {
	const catalogItemInputType = {
		infoType: data.inputType,
		infoFormat: data.inputFormat,
		catalog_item_id: catalogItem.id
	};

	return await CatalogItemInputTypeManager.create(catalogItemInputType, transaction);
};

const _createCatalogItemOutputType = async function (data, catalogItem, transaction) {
	const catalogItemOutputType = {
		infoType: data.outputType,
		infoFormat: data.outputFormat,
		catalog_item_id: catalogItem.id
	};

	return await CatalogItemOutputTypeManager.create(catalogItemOutputType, transaction);
};



const _validateCatalogItemInfo = function (data) {
	if (!AppHelper.isValidName(data.name)) {
		throw new Errors.ValidationError('Catalog item creation failed: Please enter a valid name.');
	} else if (!AppHelper.isValidNumber(data.diskRequired)) {
		throw new Errors.ValidationError('Catalog item creation failed: property diskRequired is not number.');
	} else if (!AppHelper.isValidNumber(data.ramRequired)) {
		throw new Errors.ValidationError('Catalog item creation failed: property ramRequired is not number.');
	} else if (!AppHelper.isValidBoolean(data.isPublic)) {
		throw new Errors.ValidationError('Catalog item creation failed: property isPublic is not boolean.');
	} else if (!AppHelper.isValidName(data.registryId)) {
		throw new Errors.ValidationError('Catalog item creation failed: property registryId is not number.');
	}
};

module.exports = {
	createCatalogItem: TransactionDecorator.generateTransaction(createCatalogItem)
};