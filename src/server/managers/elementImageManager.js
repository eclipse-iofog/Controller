/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file ioElementImageManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the ioElementImage Model.
 */

const ElementImage = require('../models/elementImage');
const BaseManager = require('./baseManager');
const Element = require('../models/element');

class ElementImageManager extends BaseManager {
  getEntity() {
    return ElementImage;
  }

  createElementImage(FogTypeObj) {
    return ElementImage.create(FogTypeObj);
  }

  getElementImagesByElementId(elementId) {
      return ElementImage.findAll({
          where: {
              element_id: elementId
          }
      });
  }

  updateElementImageByIdAndFogType(data) {
      return ElementImage.update(data, {
          where: {
              element_id: data.element_id,
              iofog_type_id: data.iofog_type_id
          }
      });
  }

    updateOrCreateElementImageByIdAndFogType(data) {
        return ElementImage
            .findOne({
                where: {
                    element_id: data.element_id,
                    iofog_type_id: data.iofog_type_id
                }
            })
            .then(function(obj) {
                if(obj) { // update
                    return ElementImage.update(data, {
                        where: {
                            element_id: data.element_id,
                            iofog_type_id: data.iofog_type_id
                        }
                    })
                }
                else { // insert
                    return ElementImage.create(data);
                }
            })
    }

  deleteElementImage(elementId) {
    return ElementImage.destroy({
      where: {
        element_id: elementId
      }
    });
  }
}

const instance = new ElementImageManager();
module.exports =  instance;