/**
 * @file fogManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element_output_type Model.
 */

import ElementOutputType from './../models/elementOutputType';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class ElementOutputTypeManager extends BaseManager {
  getEntity() {
      return ElementOutputType;
    }

  findByElementKey(elementKey) {
      return ElementOutputType.find({
        where: {
          elementKey: elementKey
        }
      });
    }

  updateElementOutputType(elementKey, info) {
      return ElementOutputType.update(info, {
        where: {
          elementKey: elementKey
        }
      });
    }

  createElementOutputType(data) {
      return ElementOutputType.create(data);
    }


  deleteByElementKey(elementKey) {
    return ElementOutputType.destroy({
      where: {
        elementKey: elementKey
      }
    });
  }
}

const instance = new ElementOutputTypeManager();
export default instance;