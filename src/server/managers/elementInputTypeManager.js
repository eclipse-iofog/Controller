/**
 * @file fogManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element_input_type Model.
 */

import ElementInputType from './../models/elementInputType';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class ElementInputTypeManager extends BaseManager {
  getEntity() {
      return ElementInputType;
    }

  findByElementKey(elementKey) {
      return ElementInputType.find({
        where: {
          elementKey: elementKey
        }
      });
    }

  updateElementInputType(elementKey, info) {
      return ElementInputType.update(info, {
        where: {
          elementKey: elementKey
        }
      });
    }

  createElementInputType(data) {
      return ElementInputType.create(data);
    }


  deleteByElementKey(elementKey) {
    return ElementInputType.destroy({
      where: {
        elementKey: elementKey
      }
    });
  }
}

const instance = new ElementInputTypeManager();
export default instance;