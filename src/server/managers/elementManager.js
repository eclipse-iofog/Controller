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
		/**
		 * @desc - finds the element and its coresponding registry
		 * @param Integer - key
		 * @return JSON - returns a JSON object of Element with its corespoinding registry
		 */
	findByElementKey(key, include) {
		return Element.findOne({
			where: {
				'ID': key
			},
			include: include
		});
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