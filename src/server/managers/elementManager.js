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
		const query = 'select e.*, ft.name as fogTypeName, ft.image as fogTypeImage, ft.description as fogTypeDescription' +
			' from element e left join element_fog_types eft on e.id = eft.element_id left join iofog_type ft on ft.id = eft.iofog_type_id' +
			' where (e.is_public == 1 AND e.publisher != "SYSTEM")';
		return sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new ElementManager();
export default instance;