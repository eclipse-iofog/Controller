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

const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const CatalogItemManager = require('../sequelize/managers/catalog-item-manager');
const CatalogItemImageManager = require('../sequelize/managers/catalog-item-image-manager');

const createCatalogItem = async function (data, user) {

	AppHelper.validateFields(data,
		["name", "description", "category", "containersImages", "publisher", "diskRequired", "ramRequired", "picture",
			"isPublic", "registryId", "inputType", "inputFormat", "outputType", "outputFormat", "configExample"]);
	AppHelper.validateFields(data.containerImages, ["x86ContainerImage", "armContainerImage"]);
	_validateCatalogItemInfo(data);

	const catalogItem = await _createCatalogItem(data, user);
	await _createX86CatalogImage(data, catalogItem);
	await _createArmCatalogImage(data, catalogItem);
	await _createCatalogItemInputType(data, catalogItem);
	await _createCatalogItemOutputType(data, catalogItem);

	return catalogItem;
};

const _createCatalogItem = async function (data, user) {
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

	return await CatalogItemManager.create(catalogItem);
};

const _createX86CatalogImage = async function (data, catalogItem) {
	const x86CatalogImage = {
		containerImage: data.containerImages.x86ContainerImage,
		catalogItemId: catalogItem.id,
		fogTypeId: 1
	};

	return await CatalogItemImageManager.create(x86CatalogImage);
};

const _createArmCatalogImage = async function (data, catalogItem) {
	const x86CatalogImage = {
		containerImage: data.containerImages.armContainerImage,
		catalogItemId: catalogItem.id,
		fogTypeId: 2
	};

	return await CatalogItemImageManager.create(x86CatalogImage);
};

const _createCatalogItemInputType = async function (data, catalogItem) {
	const catalogItemInputType = {
		infoType: data.inputType,
		infoFormat: data.inputFormat,
		catalogItemId: catalogItem.id
	};

	return await CatalogItemInputTypeManager.create(catalogItemInputType);
};

const _createCatalogItemOutputType = async function (data, catalogItem) {
	const catalogItemOutputType = {
		infoType: data.outputType,
		infoFormat: data.outputFormat,
		catalogItemId: catalogItem.id
	};

	return await CatalogItemOutputTypeManager.create(catalogItemOutputType);
};



const _validateCatalogItemInfo = function (data) {
	if (!AppHelper.isValidname(data.name)) {
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
	createCatalogItem: createCatalogItem
};