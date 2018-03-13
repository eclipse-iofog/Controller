/**
 * @file elementManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

import Element from './../models/element';
import BaseManager from './baseManager';
import Registry from './../models/registry';
import sequelize from './../utils/sequelize';

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
	getElementCatalog() {
		const query = 'select e.*, ' +
			'max(CASE when eimg.iofog_type_id = 1 then eimg.container_image end) as x86ContainerImage, ' +
			'max(CASE when eimg.iofog_type_id = 2 then eimg.container_image end) as armContainerImage, ' +
			'eit.info_type as inputType, eit.info_format as inputFormat, ' +
			'eot.info_type as outputType, eot.info_format as outputFormat ' +
			'from element e ' +
			'left join element_images eimg on e.id = eimg.element_id ' +
			'left join element_input_type eit on e.id = eit.element_key ' +
			'left join element_output_type eot on e.id = eot.element_key ' +
			'where (e.publisher != "SYSTEM") ' +
			'GROUP BY e.id';
		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}

	getElementForPublish(){
		const query = 'select e.*, ' +
			'max(CASE when eimg.iofog_type_id = 1 then eimg.container_image end) as x86ContainerImage, ' +
			'max(CASE when eimg.iofog_type_id = 2 then eimg.container_image end) as armContainerImage ' +
			'from element e ' +
			'left join element_images eimg on e.id = eimg.element_id ' +
			'where (e.publisher != "SYSTEM" AND e.publisher != "iotracks") ' +
			'GROUP BY e.id';
		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
	
	getElementDetails(elementId){
	const query = 'select e.*, ' +
			'max(CASE when eimg.iofog_type_id = 1 then eimg.container_image end) as x86ContainerImage, ' +
			'max(CASE when eimg.iofog_type_id = 2 then eimg.container_image end) as armContainerImage, ' +
			'it.info_type as inputInfoType, it.info_format as inputInfoFormat, ' +
			'ot.info_type as outputInfoType, ot.info_format as outputInfoFormat ' +
			'from element e ' +
			'join element_images eimg on e.id = eimg.element_id ' +
			'left join element_input_type it on e.id = it.element_key ' +
			'left join element_output_type ot on e.id = ot.element_key where e.id = ' + elementId + ' ' +
			'group by e.id';

		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new ElementManager();
export default instance;