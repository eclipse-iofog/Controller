/**
 * @file ioElementFabricTypeManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the ioElementFabricType Model.
 */

import ElementFabricType from './../models/elementFabricType';
import BaseManager from './baseManager';

class ElementFabricTypeManager extends BaseManager {
  getEntity() {
    return ElementFabricType;
  }

  createElementFabricType(elementFabricType) {
    return ElementFabricType.create(elementFabricType);
  }

  deleteElementFabricTypes(elementId) {
    return ElementFabricType.destroy({
      where: {
        element_id: elementId
      }
    });
  }
}

const instance = new ElementFabricTypeManager();
export default instance;