/*
 *  *******************************************************************************
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

const BaseCLIHandler = require('./base-cli-handler');
const constants = require('../helpers/constants');
const logger = require('../logger');
const CatalogItemService = require('../services/catalog-service');
const fs = require('fs');
const AppHelper = require('../helpers/app-helper');
const AuthDecorator = require('../decorators/cli-decorator');

const JSON_SCHEMA =
  `  name: string
  description: string
  category: string
  publisher: string
  diskRequired: number
  ramRequired: number
  picture: string
  isPublic: boolean
  registryId: number
  configExample: string
  images: array of objects
    containerImage: string
    fogTypeId: number
  inputType: object
    infoType: string
    infoFormat: string
  outputType: object
    infoType: string
    infoFormat: string`

class Catalog extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_CATALOG
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'file', alias: 'f', type: String, description: 'Catalog item settings JSON file', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'item-id', alias: 'i', type: String, description: 'Catalog item ID', group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO] },
      { name: 'name', alias: 'n', type: String, description: 'Catalog item name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'description', alias: 'd', type: String, description: 'Catalog item description', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'category', alias: 'c', type: String, description: 'Catalog item category', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'x86-image', alias: 'x', type: String, description: 'x86 docker image name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'arm-image', alias: 'a', type: String, description: 'ARM docker image name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'publisher', alias: 'p', type: String, description: 'Catalog item publisher name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'disk-required', alias: 's', type: Number, description: 'Amount of disk required to run the microservice (MB)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'ram-required', alias: 'r', type: Number, description: 'Amount of RAM required to run the microservice (MB)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'picture', alias: 't', type: String, description: 'Catalog item picture', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'public', alias: 'P', type: Boolean, description: 'Public catalog item', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'private', alias: 'V', type: Boolean, description: 'Private catalog item', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'registry-id', alias: 'g', type: Number, description: 'Catalog item docker registry ID', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'input-type', alias: 'I', type: String, description: 'Catalog item input type', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'input-format', alias: 'F', type: String, description: 'Catalog item input format', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'output-type', alias: 'O', type: String, description: 'Catalog item output type', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'output-format', alias: 'T', type: String, description: 'Catalog item output format', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'config-example', alias: 'X', type: String, description: 'Catalog item config example', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'user-id', alias: 'u', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new catalog item.',
      [constants.CMD_UPDATE]: 'Update existing catalog item.',
      [constants.CMD_REMOVE]: 'Delete a catalog item.',
      [constants.CMD_LIST]: 'List all catalog items.',
      [constants.CMD_INFO]: 'Get catalog item settings.',
    }
  }

  async run(args) {
    const catalogCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv})

    switch (catalogCommand.command.command) {
      case constants.CMD_ADD:
        try {
          const catalogItem = catalogCommand[constants.CMD_ADD];

          const createCatalogItemWrapped = AuthDecorator.prepareUser(createCatalogItem);
          createCatalogItemWrapped(catalogItem);

        } catch (error) {
          logger.error(error.message);
        }
        return
      case constants.CMD_UPDATE:
        return
      case constants.CMD_REMOVE:
        return
      case constants.CMD_LIST:
        return
      case constants.CMD_INFO:
        return
      case constants.CMD_HELP:
      default:
        return this.help()
    }
  }

  help() {
    super.help([constants.CMD_LIST], true, true, [
      {
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA,
        ],
        raw: true
      },
    ])
  }
}

const createCatalogItem = async function (obj, user) {
  const item = obj.file
    ? JSON.parse(fs.readFileSync('file', 'utf8'))
    : _createCatalogItemObject(obj);

  logger.info(JSON.stringify(item));

  await CatalogItemService.createCatalogItem(item, user);
  logger.info('Catalog item created successfully.');
}

const _createCatalogItemObject = function (catalogItem) {
  return {
    name: catalogItem.name,
    description: catalogItem.description,
    category: catalogItem.category,
    configExample: catalogItem.config - example,
    publisher: catalogItem.publisher,
    diskRequired: catalogItem.disk - required,
    ramRequired: catalogItem.ram - required,
    picture: catalogItem.picture,
    isPublic: AppHelper.validateBooleanCliOptions(catalogItem.public, catalogItem.private),
    registryId: catalogItem.registry - id,
    images: [
      {
        containerImage: catalogItem.x86 - image,
        fogTypeId: 1
      },
      {
        containerImage: catalogItem.arm - image,
        fogTypeId: 2
      }
    ],
    inputType: {
      infoType: catalogItem.input - type,
      infoFormat: catalogItem.input - format
    },

    inputType: catalogItem.input - type,
    inputFormat: catalogItem.input - format,
    outputType: catalogItem.output - type,
    outputFormat: catalogItem.outputFormat
  };
};


module.exports = new Catalog()