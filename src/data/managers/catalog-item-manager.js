/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItem = models.CatalogItem
const CatalogItemImage = models.CatalogItemImage
const CatalogItemInputType = models.CatalogItemInputType
const CatalogItemOutputType = models.CatalogItemOutputType

class CatalogItemManager extends BaseManager {
  getEntity () {
    return CatalogItem
  }

  findAllWithDependencies (where, attributes, transaction) {
    return CatalogItem.findAll({
      include: [
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'fogTypeId']
        },
        {
          model: CatalogItemInputType,
          as: 'inputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        },
        {
          model: CatalogItemOutputType,
          as: 'outputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        }],
      where: where,
      attributes: attributes
    }, { transaction: transaction })
  }

  findOneWithDependencies (where, attribures, transaction) {
    return CatalogItem.findOne({
      include: [
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'fogTypeId']
        },
        {
          model: CatalogItemInputType,
          as: 'inputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        },
        {
          model: CatalogItemOutputType,
          as: 'outputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        }],
      where: where,
      attributes: attribures
    }, { transaction: transaction })
  }
}

const instance = new CatalogItemManager()
module.exports = instance
