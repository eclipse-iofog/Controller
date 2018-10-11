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
const Op = require('sequelize').Op;

const createCatalogItem = async function (data, user, transaction) {
	await CatalogItemManager.findOne({
		[Op.or]: [{userId: user.id}, {userId: null}],
		name: data.name
	}, transaction).then(item => {
		if (item) {
			throw new Errors.DuplicatePropertyError("Duplicate Name");
		}
	});

	const catalogItem = await _createCatalogItem(data, user, transaction);
	await _createCatalogImages(data, catalogItem, transaction);
	await _createCatalogItemInputType(data, catalogItem, transaction);
	await _createCatalogItemOutputType(data, catalogItem, transaction);

	return {
		id: catalogItem.id
	}
};

const updateCatalogItem = async function (catalogItemId, data, user, transaction) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	if (data.name) {
		await CatalogItemManager.findOne({
			[Op.or]: [{userId: user.id}, {userId: null}],
			name: data.name,
			id: {
				[Op.ne]: catalogItemId
			}
		}, transaction).then(item => {
			if (item) {
				throw new Errors.DuplicatePropertyError("Duplicate Name");
			}
		});
	}
	const catalogItemWhereClause = {
		id: id,
		userId: user.id
	};

	let catalogItem = {
		name: data.name,
		description: data.description,
		category: data.category,
		configExample: data.configExample,
		publisher: data.publisher,
		diskRequired: data.diskRequired,
		ramRequired: data.ramRequired,
		picture: data.picture,
		isPublic: data.isPublic
	};

	const item = await CatalogItemManager.findOne(catalogItemWhereClause, transaction)
	if (!item) {
		throw new Errors.NotFoundError('Invalid catalog item id')
	}
	catalogItem = AppHelper.deleteUndefinedFields(catalogItem);
	await CatalogItemManager.update(catalogItemWhereClause, catalogItem, transaction);

	if (data.images) {
		for (let image of data.images) {
			switch (image.fogTypeId) {
				case 1:
					await CatalogItemImageManager.update({
						catalogItemId: id,
						fogTypeId: 1
					}, image, transaction);
					break;
				case 2:
					await CatalogItemImageManager.update({
						catalogItemId: id,
						fogTypeId: 2
					}, image, transaction);
					break;
			}
		}
	}
	if (data.inputType) {
		await CatalogItemInputTypeManager.update({catalogItemId: id}, data.inputType, transaction);
	}
	if (data.outputType) {
		await CatalogItemOutputTypeManager.update({catalogItemId: id}, data.outputType, transaction);
	}
};

const listCatalogItems = async function (user, transaction) {
	return await CatalogItemManager.findAllWithDependencies(user.id, transaction);
};

const listCatalogItem = async function (catalogItemId, user, transaction) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	return await CatalogItemManager.findOneWithDependencies(id, user.id, transaction).then(item => {
		if (!item) {
			throw new Errors.NotFoundError("Invalid catalog item id");
		}
		return item;
	});
};

const deleteCatalogItem = async function (catalogItemId, user, transaction) {
	const id = AppHelper.validateParameterId(catalogItemId, "Invalid catalog item id");
	await CatalogItemManager.delete({
		userId: user.id,
		id: catalogItemId
	}, transaction).then(affectedRows => {
		if (affectedRows === 0) {
			throw new Errors.NotFoundError("Invalid catalog item id");
		}
		return affectedRows;
	});
}

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

module.exports = {
	createCatalogItem: TransactionDecorator.generateTransaction(createCatalogItem),
	listCatalogItems: TransactionDecorator.generateTransaction(listCatalogItems),
	listCatalogItem: TransactionDecorator.generateTransaction(listCatalogItem),
	deleteCatalogItem: TransactionDecorator.generateTransaction(deleteCatalogItem),
	updateCatalogItem: TransactionDecorator.generateTransaction(updateCatalogItem)
};