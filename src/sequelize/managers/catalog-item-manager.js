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

const BaseManager = require('./base-manager');
const Errors = require('../../helpers/errors');
const AppHelper = require('../../helpers/app-helper');
const models = require('./../models');
const CatalogItem = models.CatalogItem;
const CatalogItemImage = models.CatalogItemImage;
const CatalogItemInputType = models.CatalogItemInputType;
const CatalogItemOutputType = models.CatalogItemOutputType;
const Op = require('sequelize').Op;

class CatalogItemManager extends BaseManager {
	getEntity() {
		return CatalogItem;
	}

	findAll(userId) {
		return CatalogItem.findAll({
			include: [
				{
					model: CatalogItemImage,
					as: 'images',
					required: false,
					attributes: ['containerImage', 'fogTypeId']
				},
				{
					model: CatalogItemInputType,
					as: 'inputType',
					required: false,
					attributes: ['infoType', 'infoFormat']
				},
				{
					model: CatalogItemOutputType,
					as: 'outputType',
					required: false,
					attributes: ['infoType', 'infoFormat']
				}],
			where: {
				[Op.or]: [{user_id: userId}, {user_id: null}]
			},
			attributes: { exclude: ["userId"] }
		})
	}

	findOne(catalogItemId, userId) {
		return CatalogItem.findOne({
			include: [
				{
					model: CatalogItemImage,
					as: 'images',
					required: false,
					attributes: ['containerImage', 'fogTypeId']
				},
				{
					model: CatalogItemInputType,
					as: 'inputType',
					required: false,
					attributes: ['infoType', 'infoFormat']
				},
				{
					model: CatalogItemOutputType,
					as: 'outputType',
					required: false,
					attributes: ['infoType', 'infoFormat']
				}],
			where: {
				[Op.or]: [{user_id: userId}, {user_id: null}],
				id: catalogItemId
			},
			attributes: { exclude: ["userId"] }
		}).then(item => {
			if (!item) {
				throw new Errors.NotFoundError("Invalid catalog item id");
			}
			return item;
		})
	}

	deleteCatalogItemById(catalogItemId, userId, transaction) {
		AppHelper.checkTransaction(transaction);
		return CatalogItem.destroy({
			where: {
				user_id: userId,
				id: catalogItemId
			}
		}, transaction).then(affectedRows => {
			if (affectedRows === 0) {
				throw new Errors.NotFoundError("Invalid catalog item id");
			}
			return affectedRows;
		})
	}
}

const instance = new CatalogItemManager();
module.exports = instance;