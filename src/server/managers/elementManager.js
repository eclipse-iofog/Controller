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

/**
 * @file elementManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

const Element = require('./../models/element');
const BaseManager = require('./baseManager');
const sequelize = require('./../utils/sequelize');

class ElementManager extends BaseManager {
	getEntity() {
		return Element;
	}
	deleteElementById(id) {
		return Element.destroy({
			where: {
				'ID': id
			}
		});
	}
	findElementById(id) {
		return Element.findOne({
			where: {
				'ID': id
			}
		});
	}
	findElementByIds(ids) {
		return Element.findAll({
			where: {
				'ID': {
					$in: ids
				}
			}
		});
	}
	findElementImageAndRegistryByIdForFogInstance(id, fogId) {
		let query = 'SELECT r.url as registryUrl, ' +
		'eimg.container_image as containerImage ' +
		'FROM element e ' +
		'LEFT JOIN registry r ' +
		'ON e.registry_id = r.ID ' +
		'LEFT JOIN element_images eimg ' +
		'ON e.ID = eimg.element_id ' +
		'AND eimg.iofog_type_id = ' +
		'( ' +
		'SELECT typeKey ' +
		'FROM iofogs ' +
		'WHERE iofogs.UUID = \''+fogId+'\' ' +
		') ' +
		'WHERE e.ID =' + id;

		return sequelize.query(query, {
			plain: true,
			type: sequelize.QueryTypes.SELECT
		});
	}

	updateElementById(id, data) {
		return Element.update(data, {
			where: {
				'ID': id
			}
		});
	}
	getElementCatalog(userId) {
		const query = 'select e.*, ' +
			'eit.info_type as inputType, eit.info_format as inputFormat, ' +
			'eot.info_type as outputType, eot.info_format as outputFormat ' +
			'from element e ' +
			'left join element_input_type eit on e.id = eit.element_key ' +
			'left join element_output_type eot on e.id = eot.element_key ' +
			'where e.category != "SYSTEM" AND (e.user_id == ' + userId + ' OR e.is_public = 1)';

		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}

	getElementForPublish(userId){
		const query = 'select e.* ' +
			'from element e ' +
			'where e.user_id ==' + userId;
		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
	
	getElementDetails(elementId){
	const query = 'select e.*, ' +
			'it.info_type as inputInfoType, it.info_format as inputInfoFormat, ' +
			'ot.info_type as outputInfoType, ot.info_format as outputInfoFormat ' +
			'from element e ' +
			'left join element_input_type it on e.id = it.element_key ' +
			'left join element_output_type ot on e.id = ot.element_key where e.id = ' + elementId;

		return sequelize.query(query, {
			plain: true, type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new ElementManager();
module.exports =  instance;