/*
 *  *******************************************************************************
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

const BaseCLIHandler = require('./base-cli-handler')
const constants = require('../helpers/constants')
const logger = require('../logger')
const CatalogItemService = require('../services/catalog-service')
const fs = require('fs')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const CliDataTypes = require('./cli-data-types')

const JSON_SCHEMA = AppHelper.stringifyCliJsonSchema({
  name: 'string',
  description: 'string',
  category: 'string',
  images: [
    {
      containerImage: 'string',
      fogTypeId: 1
    }
  ],
  publisher: 'string',
  diskRequired: 0,
  ramRequired: 0,
  picture: 'string',
  isPublic: true,
  registryId: 0,
  inputType: {
    infoType: 'string',
    infoFormat: 'string'
  },
  outputType: {
    infoType: 'string',
    infoFormat: 'string'
  },
  configExample: 'string'
})

class Catalog extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_CATALOG
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        group: [constants.CMD]
      },
      {
        name: 'file',
        alias: 'f',
        type: String,
        description: 'Path to catalog item settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'item-id',
        alias: 'i',
        type: CliDataTypes.Integer,
        description: 'Catalog item ID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO]
      },
      {
        name: 'name',
        alias: 'n',
        type: String,
        description: 'Catalog item name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'description',
        alias: 'd',
        type: String,
        description: 'Catalog item description',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'category',
        alias: 'c',
        type: String,
        description: 'Catalog item category',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'x86-image',
        alias: 'x',
        type: String,
        description: 'x86 docker image name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'arm-image',
        alias: 'a',
        type: String,
        description: 'ARM docker image name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'publisher',
        alias: 'p',
        type: String,
        description: 'Catalog item publisher name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'disk-required',
        alias: 's',
        type: CliDataTypes.Integer,
        description: 'Amount of disk required to run the microservice (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'ram-required',
        alias: 'r',
        type: CliDataTypes.Integer,
        description: 'Amount of RAM required to run the microservice (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'picture',
        alias: 't',
        type: String,
        description: 'Catalog item picture',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'public',
        alias: 'P',
        type: Boolean,
        description: 'Public catalog item',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'private',
        alias: 'V',
        type: Boolean,
        description: 'Private catalog item',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'registry-id',
        alias: 'g',
        type: CliDataTypes.Integer,
        description: 'Catalog item docker registry ID',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'input-type',
        alias: 'I',
        type: String,
        description: 'Catalog item input type',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'input-format',
        alias: 'F',
        type: String,
        description: 'Catalog item input format',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'output-type',
        alias: 'O',
        type: String,
        description: 'Catalog item output type',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'output-format',
        alias: 'T',
        type: String,
        description: 'Catalog item output format',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'config-example',
        alias: 'X',
        type: String,
        description: 'Catalog item config example',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new catalog item.',
      [constants.CMD_UPDATE]: 'Update existing catalog item.',
      [constants.CMD_REMOVE]: 'Delete a catalog item.',
      [constants.CMD_LIST]: 'List all catalog items.',
      [constants.CMD_INFO]: 'Get catalog item settings.'
    }
  }

  async run (args) {
    try {
      const catalogCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = catalogCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(catalogCommand, constants.CMD_ADD, _createCatalogItem)
          break
        case constants.CMD_UPDATE:
          await _executeCase(catalogCommand, constants.CMD_UPDATE, _updateCatalogItem)
          break
        case constants.CMD_REMOVE:
          await _executeCase(catalogCommand, constants.CMD_REMOVE, _deleteCatalogItem)
          break
        case constants.CMD_LIST:
          await _executeCase(catalogCommand, constants.CMD_LIST, _listCatalogItems)
          break
        case constants.CMD_INFO:
          await _executeCase(catalogCommand, constants.CMD_INFO, _getCatalogItem)
          break
        case constants.CMD_HELP:
        default:
          return this.help()
      }
    } catch (error) {
      this.handleCLIError(error, args.argv)
    }
  }

  help () {
    super.help([], true, true, [
      {
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA
        ],
        raw: true
      }
    ])
  }
}

const _executeCase = async function (catalogCommand, commandName, f) {
  try {
    const item = catalogCommand[commandName]
    await f(item)
  } catch (error) {
    logger.error(error.message)
  }
}

const _createCatalogItem = async function (obj) {
  const item = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createCatalogItemObject(obj)

  logger.cliReq('catalog add', { args: item })
  const catalogItemIdObject = await CatalogItemService.createCatalogItemEndPoint(item)
  logger.cliRes(JSON.stringify({
    id: catalogItemIdObject.id
  }, null, 2))
}

const _updateCatalogItem = async function (obj) {
  const item = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createCatalogItemObject(obj)

  if (obj.itemId === undefined) {
    throw new Errors.NotFoundError(ErrorMessages.CATALOG_UPDATE_REQUIRES_ID)
  }

  logger.cliReq('catalog update', { args: item })
  await CatalogItemService.updateCatalogItemEndPoint(obj.itemId, item, {}, true)
  logger.cliRes('Catalog item has been updated successfully.')
}

const _deleteCatalogItem = async function (obj) {
  logger.cliReq('catalog remove', { args: { itemId: obj.itemId } })
  await CatalogItemService.deleteCatalogItemEndPoint(obj.itemId, {}, true)
  logger.cliRes('Catalog item has been removed successfully')
}

const _listCatalogItems = async function () {
  logger.cliReq('catalog list')
  const result = await CatalogItemService.listCatalogItemsEndPoint({}, true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _getCatalogItem = async function (obj) {
  logger.cliReq('catalog info', { args: { itemId: obj.itemId } })
  const result = await CatalogItemService.getCatalogItemEndPoint(obj.itemId, {}, true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _createCatalogItemObject = function (catalogItem) {
  const catalogItemObj = {
    name: catalogItem.name,
    description: catalogItem.description,
    category: catalogItem.category,
    configExample: catalogItem.configExample,
    publisher: catalogItem.publisher,
    diskRequired: catalogItem.diskRequired,
    ramRequired: catalogItem.ramRequired,
    picture: catalogItem.picture,
    isPublic: AppHelper.validateBooleanCliOptions(catalogItem.public, catalogItem.private),
    registryId: catalogItem.registryId,
    images: []
  }

  if (catalogItem.x86Image) {
    catalogItemObj.images.push(
      {
        containerImage: catalogItem.x86Image,
        fogTypeId: 1
      }
    )
  }
  if (catalogItem.armImage) {
    catalogItemObj.images.push(
      {
        containerImage: catalogItem.armImage,
        fogTypeId: 2
      }
    )
  }

  if (catalogItem.inputType) {
    catalogItemObj.inputType = {
      infoType: catalogItem.inputType,
      infoFormat: catalogItem.inputFormat
    }
  }

  if (catalogItem.outputType) {
    catalogItemObj.outputType = {
      infoType: catalogItem.outputType,
      infoFormat: catalogItem.outputFormat
    }
  }

  return AppHelper.deleteUndefinedFields(catalogItemObj)
}

module.exports = new Catalog()
