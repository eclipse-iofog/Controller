/**
 * @file elementManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

import Element from './../models/element';
import BaseManager from './baseManager';

class ElementManager extends BaseManager {
	getEntity() {
		return Element;
	}

	findElementById(id) {
		return Element.findOne({
			where: {
				'ID': id
			}
		});
	}
}

const instance = new ElementManager();
export default instance;