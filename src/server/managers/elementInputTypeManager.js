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
 * @description This file includes the CURD operations for the element_input_type Model.
 */

const ElementInputType = require('./../models/elementInputType');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');

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
module.exports =  instance;