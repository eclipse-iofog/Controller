/**
 * @file ioElementFogTypeManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the ioElementFogType Model.
 */

import ElementFogType from './../models/elementFogType';
import BaseManager from './baseManager';

class ElementFogTypeManager extends BaseManager {
  getEntity() {
    return ElementFogType;
  }
  createElementFogType(FogTypeObj) {
    return ElementFogType.create(FogTypeObj);
  }

  deleteElementFogTypes(elementId) {
    return ElementFogType.destroy({
      where: {
        element_id: elementId
      }
    });
  }
}

const instance = new ElementFogTypeManager();
export default instance;