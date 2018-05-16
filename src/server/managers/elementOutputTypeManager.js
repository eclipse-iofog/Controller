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