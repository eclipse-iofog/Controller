/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const CatalogItemManager = require('../data/managers/catalog-item-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const CatalogItemInputTypeManager = require('../data/managers/catalog-item-input-type-manager')
const CatalogItemOutputTypeManager = require('../data/managers/catalog-item-output-type-manager')
const DBConstants = require('../data/constants')
const Op = require('sequelize').Op
const Validator = require('../schemas/index')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroseriveStates = require('../enums/microservice-state')

const createCatalogItemEndPoint = async function (data, user, transaction) {
  await Validator.validate(data, Validator.schemas.catalogItemCreate)
  await _checkForDuplicateName(data.name, { userId: user.id }, transaction)
  await _checkForRestrictedPublisher(data.publisher)
  const catalogItem = await _createCatalogItem(data, user, transaction)
  await _createCatalogImages(data, catalogItem, transaction)
  await _createCatalogItemInputType(data, catalogItem, transaction)
  await _createCatalogItemOutputType(data, catalogItem, transaction)

  return {
    id: catalogItem.id
  }
}

const updateCatalogItemEndPoint = async function (id, data, user, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.catalogItemUpdate)

  const where = isCLI
    ? {
      id: id
    }
    : {
      id: id,
      userId: user.id
    }

  data.id = id
  await _updateCatalogItem(data, where, transaction)
  await _updateCatalogItemImages(data, transaction)
  await _updateCatalogItemIOTypes(data, where, transaction)
}

const listCatalogItemsEndPoint = async function (user, isCLI, transaction) {
  const where = isCLI
    ? {}
    : {
      [Op.or]: [{ userId: user.id }, { userId: null }],
      [Op.or]: [{ category: { [Op.ne]: 'SYSTEM' } }, { category: null }]
    }

  const attributes = isCLI
    ? {}
    : { exclude: ['userId'] }

  const catalogItems = await CatalogItemManager.findAllWithDependencies(where, attributes, transaction)
  return {
    catalogItems: catalogItems
  }
}

async function getCatalogItem (id, user, isCLI, transaction) {
  const where = isCLI
    ? { id: id }
    : {
      id: id,
      [Op.or]: [{ userId: user.id }, { userId: null }],
      [Op.or]: [{ category: { [Op.ne]: 'SYSTEM' } }, { category: null }]
    }

  const attributes = isCLI
    ? {}
    : { exclude: ['userId'] }

  const item = await CatalogItemManager.findOneWithDependencies(where, attributes, transaction)
  if (!item) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CATALOG_ITEM_ID, id))
  }
  return item
}

const getCatalogItemEndPoint = async function (id, user, isCLI, transaction) {
  return getCatalogItem(id, user, isCLI, transaction)
}

const deleteCatalogItemEndPoint = async function (id, user, isCLI, transaction) {
  const where = isCLI
    ? {
      id: id
    }
    : {
      userId: user.id,
      id: id
    }

  const item = await _checkIfItemExists(where, transaction)

  if (item.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_CATALOG_ITEM_DELETE, id))
  }

  const affectedRows = await CatalogItemManager.delete(where, transaction)
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CATALOG_ITEM_ID, id))
  }
  return affectedRows
}

async function getNetworkCatalogItem (transaction) {
  return CatalogItemManager.findOne({
    name: 'Networking Tool',
    category: 'SYSTEM',
    publisher: 'Eclipse ioFog',
    registry_id: 1,
    user_id: null
  }, transaction)
}

async function getRouterCatalogItem (transaction) {
  return CatalogItemManager.findOne({
    name: DBConstants.ROUTER_CATALOG_NAME,
    category: 'SYSTEM',
    publisher: 'Eclipse ioFog',
    registry_id: 1,
    user_id: null
  }, transaction)
}

async function getProxyCatalogItem (transaction) {
  return CatalogItemManager.findOne({
    name: DBConstants.PROXY_CATALOG_NAME,
    category: 'SYSTEM',
    publisher: 'Eclipse ioFog',
    registry_id: 1,
    user_id: null
  }, transaction)
}

async function getBluetoothCatalogItem (transaction) {
  return CatalogItemManager.findOne({
    name: 'RESTBlue',
    category: 'SYSTEM',
    publisher: 'Eclipse ioFog',
    registry_id: 1,
    user_id: null
  }, transaction)
}

async function getHalCatalogItem (transaction) {
  return CatalogItemManager.findOne({
    name: 'HAL',
    category: 'SYSTEM',
    publisher: 'Eclipse ioFog',
    registry_id: 1,
    user_id: null
  }, transaction)
}

const _checkForDuplicateName = async function (name, item, transaction) {
  if (name) {
    const where = item.id
      ? { [Op.or]: [{ userId: item.userId }, { userId: null }], name: name, id: { [Op.ne]: item.id } }
      : { [Op.or]: [{ userId: item.userId }, { userId: null }], name: name }

    const result = await CatalogItemManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

const _checkForRestrictedPublisher = async function (publisher) {
  if (publisher === 'Eclipse ioFog') {
    throw new Errors.ValidationError(ErrorMessages.RESTRICTED_PUBLISHER)
  }
}

const _checkIfItemExists = async function (where, transaction) {
  const item = await CatalogItemManager.findOne(where, transaction)
  if (!item) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CATALOG_ITEM_ID, where.id))
  }
  return item
}

const _createCatalogItem = async function (data, user, transaction) {
  let catalogItem = {
    name: data.name,
    description: data.description,
    category: data.category,
    configExample: data.configExample,
    publisher: data.publisher,
    diskRequired: data.diskRequired,
    ramRequired: data.ramRequired,
    picture: data.picture,
    isPublic: data.isPublic,
    registryId: data.registryId,
    userId: user.id
  }

  catalogItem = AppHelper.deleteUndefinedFields(catalogItem)

  if (catalogItem.registryId) {
    const registry = await RegistryManager.findOne({ id: catalogItem.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, data.registryId))
    }
  }

  return CatalogItemManager.create(catalogItem, transaction)
}

const _createCatalogImages = async function (data, catalogItem, transaction) {
  const catalogItemImages = [
    {
      fogTypeId: 1,
      catalogItemId: catalogItem.id
    },
    {
      fogTypeId: 2,
      catalogItemId: catalogItem.id
    }
  ]
  if (data.images) {
    for (const image of data.images) {
      switch (image.fogTypeId) {
        case 1:
          catalogItemImages[0].containerImage = image.containerImage
          break
        case 2:
          catalogItemImages[1].containerImage = image.containerImage
          break
      }
    }
  }

  return CatalogItemImageManager.bulkCreate(catalogItemImages, transaction)
}

const _createCatalogItemInputType = async function (data, catalogItem, transaction) {
  let catalogItemInputType = {
    catalogItemId: catalogItem.id
  }

  if (data.inputType) {
    catalogItemInputType.infoType = data.inputType.infoType
    catalogItemInputType.infoFormat = data.inputType.infoFormat
  }

  catalogItemInputType = AppHelper.deleteUndefinedFields(catalogItemInputType)

  return CatalogItemInputTypeManager.create(catalogItemInputType, transaction)
}

const _createCatalogItemOutputType = async function (data, catalogItem, transaction) {
  let catalogItemOutputType = {
    catalogItemId: catalogItem.id
  }

  if (data.outputType) {
    catalogItemOutputType.infoType = data.outputType.infoType
    catalogItemOutputType.infoFormat = data.outputType.infoFormat
  }

  catalogItemOutputType = AppHelper.deleteUndefinedFields(catalogItemOutputType)

  return CatalogItemOutputTypeManager.create(catalogItemOutputType, transaction)
}

const _updateCatalogItem = async function (data, where, transaction) {
  let catalogItem = {
    name: data.name,
    description: data.description,
    category: data.category,
    configExample: data.configExample,
    publisher: data.publisher,
    diskRequired: data.diskRequired,
    ramRequired: data.ramRequired,
    picture: data.picture,
    isPublic: data.isPublic,
    registryId: data.registryId
  }

  catalogItem = AppHelper.deleteUndefinedFields(catalogItem)
  if (!catalogItem || AppHelper.isEmpty(catalogItem)) {
    return
  }
  if (data.registryId) {
    const registry = await RegistryManager.findOne({ id: data.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, data.registryId))
    }
  }

  const item = await _checkIfItemExists(where, transaction)

  if (item.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_CATALOG_ITEM_UPDATE, data.id))
  }

  await _checkForDuplicateName(data.name, item, transaction)
  await CatalogItemManager.update(where, catalogItem, transaction)
}

const _updateCatalogItemImages = async function (data, transaction) {
  if (data.images) {
    const microservices = await MicroserviceManager.findAllWithStatuses({ catalogItemId: data.id }, transaction)
    for (const ms of microservices) {
      if (ms.microserviceStatus.status === MicroseriveStates.RUNNING) {
        throw new Errors.ValidationError(ErrorMessages.CATALOG_ITEM_IMAGES_IS_FROZEN)
      }
    }

    for (const image of data.images) {
      await CatalogItemImageManager.updateOrCreate({
        catalogItemId: data.id,
        fogTypeId: image.fogTypeId
      }, {
        catalogItemId: data.id,
        fogTypeId: image.fogTypeId,
        containerImage: image.containerImage
      }, transaction)
    }
  }
}

const _updateCatalogItemIOTypes = async function (data, where, transaction) {
  if (data.inputType && data.inputType.length !== 0) {
    let inputType = {
      catalogItemId: data.id,
      infoType: data.inputType.infoType,
      infoFormat: data.inputType.infoFormat
    }
    inputType = AppHelper.deleteUndefinedFields(inputType)
    await CatalogItemInputTypeManager.updateOrCreate({ catalogItemId: data.id }, inputType, transaction)
  }
  if (data.outputType && data.outputType.length !== 0) {
    let outputType = {
      catalogItemId: data.id,
      infoType: data.outputType.infoType,
      infoFormat: data.outputType.infoFormat
    }
    outputType = AppHelper.deleteUndefinedFields(outputType)
    await CatalogItemOutputTypeManager.updateOrCreate({ catalogItemId: data.id }, outputType, transaction)
  }
}

module.exports = {
  createCatalogItemEndPoint: TransactionDecorator.generateTransaction(createCatalogItemEndPoint),
  listCatalogItemsEndPoint: TransactionDecorator.generateTransaction(listCatalogItemsEndPoint),
  getCatalogItemEndPoint: TransactionDecorator.generateTransaction(getCatalogItemEndPoint),
  deleteCatalogItemEndPoint: TransactionDecorator.generateTransaction(deleteCatalogItemEndPoint),
  updateCatalogItemEndPoint: TransactionDecorator.generateTransaction(updateCatalogItemEndPoint),
  getCatalogItem: getCatalogItem,
  getNetworkCatalogItem: getNetworkCatalogItem,
  getBluetoothCatalogItem: getBluetoothCatalogItem,
  getHalCatalogItem: getHalCatalogItem,
  getRouterCatalogItem: getRouterCatalogItem,
  getProxyCatalogItem: getProxyCatalogItem
}
