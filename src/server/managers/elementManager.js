/**
 * @file elementManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

import Element from './../models/element';
import BaseManager from './baseManager';
import Registry from './../models/registry';


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
}

const instance = new ElementManager();
export default instance;