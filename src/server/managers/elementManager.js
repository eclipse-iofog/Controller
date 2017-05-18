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
	findElementAndRegistryById(id) {
		return Element.findOne({
			where: {
				'ID': id
			},
			include: [{
				model: Registry,  as: 'registry',
				attributes: ['url']
			}]
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
		const query = 'select e.*, ft.name as fogTypeName, ft.image as fogTypeImage, ft.description as fogTypeDescription,' +
			' eit.info_type as inputType, eit.info_format as inputFormat, eot.info_type as outputType, eot.info_format as outputFormat'+
			' from element e left join element_fog_types eft on e.id = eft.element_id left join element_input_type eit on' +
			' e.id = eit.element_key left join element_output_type eot on e.id = eot.element_key left join iofog_type ft on ft.id = eft.iofog_type_id' +
			' where (e.publisher != "SYSTEM")';

		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}

	getElementForPublish(){
		const query = 'select e.*, ft.name as fogTypeName, ft.image as fogTypeImage, ft.description as fogTypeDescription' +
			' from element e left join element_fog_types eft on e.id = eft.element_id left join iofog_type ft on ft.id = eft.iofog_type_id' +
			' where (e.publisher != "SYSTEM" AND e.publisher != "iotracks")';
		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
	
	getElementDetails(elementId){
	const query = 'select e.*, it.info_type as inputInfoType, it.info_format as inputInfoFormat, ot.info_type as' + 
				  ' outputInfoType, ot.info_format as outputInfoFormat, ft.Name as fogTypeName, ft.Image as fogTypeImage,' +
		 		  ' ft.Description as fogTypeDescription, ft.StreamViewerElementKey as' +
		 		  ' fogTypeStreamViewerElementKey, ft.consoleElementKey as fogTypeConsoleElementKey,'+
		 		  ' ft.NetworkElementKey as fogTypeNetworkElementKey from element e join element_fog_types eft' +
		 		  ' on e.id = eft.element_id join iofog_type ft on ft.id = eft.iofog_type_id left join element_input_type it' +
				  ' on e.id = it.element_key left join element_output_type ot on e.id = ot.element_key' +
				  ' where e.id =' + elementId;

		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new ElementManager();
export default instance;