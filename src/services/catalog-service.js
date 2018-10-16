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

const TransactionDecorator = require('../decorators/transaction-decorator');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const CatalogItemManager = require('../sequelize/managers/catalog-item-manager');
const CatalogItemImageManager = require('../sequelize/managers/catalog-item-image-manager');
const CatalogItemInputTypeManager = require('../sequelize/managers/catalog-item-input-type-manager');
const CatalogItemOutputTypeManager = require('../sequelize/managers/catalog-item-output-type-manager');
const Op = require('sequelize').Op;
const validator = require('../schemas/index');

const createCatalogItem = async function (data, user, transaction) {
  await validator.validate(data, validator.schemas.catalogItemCreate);
  await _checkForDuplicateName(data.name, {userId: user.id}, transaction);
  const catalogItem = await _createCatalogItem(data, user, transaction);
  await _createCatalogImages(data, catalogItem, transaction);
  await _createCatalogItemInputType(data, catalogItem, transaction);
  await _createCatalogItemOutputType(data, catalogItem, transaction);

  return {
    id: catalogItem.id
  }
};

const updateCatalogItem = async function (data, user, isCLI, transaction) {
  await validator.validate(data, validator.schemas.catalogItemUpdate);

  const where = isCLI
    ? {id: data.id}
    : {id: data.id, userId: user.id};

  await _updateCatalogItem(data, where, transaction);
  await _updateCatalogItemImages(data, transaction);
  await _updateCatalogItemIOTypes(data, where, transaction);
};

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
  };

  catalogItem = AppHelper.deleteUndefinedFields(catalogItem);

  const item = await _checkIfItemExists(where, transaction);
  await _checkForDuplicateName(data.name, item, transaction);
  await CatalogItemManager.update(where, catalogItem, transaction);
};

const _updateCatalogItemImages = async function (data, transaction) {
  if (data.images) {
    for (let image of data.images) {
      switch (image.fogTypeId) {
        case 1:
          await CatalogItemImageManager.update({
            catalogItemId: data.id,
            fogTypeId: 1
          }, image, transaction);
          break;
        case 2:
          await CatalogItemImageManager.update({
            catalogItemId: data.id,
            fogTypeId: 2
          }, image, transaction);
          break;
      }
    }
  }
};

const _updateCatalogItemIOTypes = async function (data, id, where, transaction) {
  if (data.inputType && data.inputType.length != 0) {
    let inputType = {
      infoType: data.inputType.infoType,
      infoFormat: data.inputType.infoFormat
    };
    inputType = AppHelper.deleteUndefinedFields(inputType);
    await CatalogItemInputTypeManager.update({catalogItemId: data.id}, inputType, transaction);
  }
  if (data.outputType && data.outputType.length !=0) {
    let outputType = {
      infoType: data.outputType.infoType,
      infoFormat: data.outputType.infoFormat
    };
    outputType = AppHelper.deleteUndefinedFields(outputType);
    await CatalogItemOutputTypeManager.update({catalogItemId: data.id}, outputType, transaction);
  }
};

const listCatalogItems = async function (user, isCLI, transaction) {
  const where = isCLI
    ? {}
    : {[Op.or]: [{userId: user.id}, {userId: null}]};

  const attributes = isCLI
    ? {}
    : {exclude: ["userId"]};

  return await CatalogItemManager.findAllWithDependencies(where, attributes, transaction);
};

const listCatalogItem = async function (id, user, isCLI, transaction) {
  const where = isCLI
    ? {id: id}
    : {[Op.or]: [{userId: user.id}, {userId: null}], id: id};

  const attributes = isCLI
    ? {}
    : {exclude: ["userId"]};

  const item = CatalogItemManager.findOneWithDependencies(where, attributes, transaction)
  if (!item) {
    throw new Errors.NotFoundError("Invalid catalog item id");
  }
  return item;
};

const deleteCatalogItem = async function (id, user, isCLI, transaction) {
  const where = isCLI
    ? {id: id}
    : {userId: user.id, id: id};
  const affectedRows = await CatalogItemManager.delete(where, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid catalog item id");
  }
  return affectedRows;
};

const _checkForDuplicateName = async function (name, item, transaction) {
  if (name) {
    const where = item.id
      ? {[Op.or]: [{userId: item.userId}, {userId: null}], name: name, id: {[Op.ne]: item.id}}
      : {[Op.or]: [{userId: item.userId}, {userId: null}], name: name};

    const result = await CatalogItemManager.findOne(where, transaction);
    if (result) {
      throw new Errors.DuplicatePropertyError("Duplicate Name");
    }
  }
};

const _checkIfItemExists = async function (where, transaction) {
  const item = await CatalogItemManager.findOne(where, transaction)
  if (!item) {
    throw new Errors.NotFoundError('Invalid catalog item id')

  }
  return item;
};

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
  };

  catalogItem = AppHelper.deleteUndefinedFields(catalogItem);

  return await CatalogItemManager.create(catalogItem, transaction);
};

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
  ];
  if (data.images) {
    for (let image of data.images) {
      switch (image.fogTypeId) {
        case 1:
          catalogItemImages[0].containerImage = image.containerImage;
          break;
        case 2:
          catalogItemImages[1].containerImage = image.containerImage;
          break;
      }
    }
  }

  return await CatalogItemImageManager.bulkCreate(catalogItemImages, transaction);
};

const _createCatalogItemInputType = async function (data, catalogItem, transaction) {
  let catalogItemInputType = {
    catalogItemId: catalogItem.id
  };

  if (data.inputType) {
    catalogItemInputType.infoType = data.inputType.infoType;
    catalogItemInputType.infoFormat = data.inputType.infoFormat;
  }

  catalogItemInputType = AppHelper.deleteUndefinedFields(catalogItemInputType);

  return await CatalogItemInputTypeManager.create(catalogItemInputType, transaction);
};

const _createCatalogItemOutputType = async function (data, catalogItem, transaction) {
  let catalogItemOutputType = {
    catalogItemId: catalogItem.id
  };

  if (data.outputType) {
    catalogItemOutputType.infoType = data.outputType.infoType;
    catalogItemOutputType.infoFormat = data.outputType.infoFormat;
  }

  catalogItemOutputType = AppHelper.deleteUndefinedFields(catalogItemOutputType);

  return await CatalogItemOutputTypeManager.create(catalogItemOutputType, transaction);
};

module.exports = {
  createCatalogItem: TransactionDecorator.generateTransaction(createCatalogItem),
  listCatalogItems: TransactionDecorator.generateTransaction(listCatalogItems),
  listCatalogItem: TransactionDecorator.generateTransaction(listCatalogItem),
  deleteCatalogItem: TransactionDecorator.generateTransaction(deleteCatalogItem),
  updateCatalogItem: TransactionDecorator.generateTransaction(updateCatalogItem)
};