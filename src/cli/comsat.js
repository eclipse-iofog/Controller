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

const BaseCLIHandler = require('./base-cli-handler')
const constants = require('../helpers/constants')
const logger = require('../logger')
const ComsatService = require('../services/comsat-service')
const AppHelper = require('../helpers/app-helper')

class Comsat extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_COMSAT
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'name', alias: 'n', type: String, description: 'ComSat name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'domain', alias: 'd', type: String, description: 'ComSat domain name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'public-ip', alias: 'i', type: String, description: 'ComSat public IP address', group: [constants.CMD_ADD, constants.CMD_UPDATE, constants.CMD_REMOVE] },
      { name: 'cert-dir', alias: 'c', type: String, description: 'Path to certificate', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'self-signed-enable', alias: 'S', type: Boolean, description: 'Is self-signed enabled', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'self-signed-disable', alias: 's', type: Boolean, description: 'Is self-signed disabled', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new ComSat.',
      [constants.CMD_UPDATE]: 'Update existing ComSat.',
      [constants.CMD_REMOVE]: 'Delete a ComSat.',
      [constants.CMD_LIST]: 'List all ComSats.',
    }
  }

  async run(args) {
    const comsatCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (comsatCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(comsatCommand, constants.CMD_ADD, _createComsat, false)
        break
      case constants.CMD_UPDATE:
        await _executeCase(comsatCommand, constants.CMD_UPDATE, _updateComsat, false)
        break
      case constants.CMD_REMOVE:
        await _executeCase(comsatCommand, constants.CMD_REMOVE, _deleteComsat, false)
        break
      case constants.CMD_LIST:
        await _executeCase(comsatCommand, constants.CMD_LIST, _getComsatList, false)
        break
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }

}

async function _executeCase(commands, commandName, f, isUserRequired) {
  try {
    const obj = commands[commandName];

    if (isUserRequired) {
      const decoratedFunction = CliDecorator.prepareUser(f);
      decoratedFunction(obj);
    } else {
      f(obj);
    }
  } catch (error) {
    logger.error(error.message);
  }
}

async function _createComsat(obj) {
  const comsat = _createComsatObject(obj)
  logger.info(JSON.stringify(comsat));
  const result = await ComsatService.createComsatWithTransaction(comsat)
  logger.info(JSON.stringify(result));
  logger.info('Comsat has been created successfully.');
}

async function _updateComsat(obj) {
  const comsat = _createComsatObject(obj)
  logger.info(JSON.stringify(comsat));
  await ComsatService.updateComsatWithTransaction(comsat)
  logger.info('Comsat has been updagted successfully.');
}

async function _deleteComsat(obj) {
  const comsat = _createComsatObject(obj)
  logger.info(JSON.stringify(comsat));
  await ComsatService.deleteComsatWithTransaction(comsat)
  logger.info('Comsat has been removed successfully.');
}

async function _getComsatList(obj) {
  const list = await ComsatService.getComsatListWithTransaction()
  logger.info('Comsat list has been gotten successfully');
  logger.info(JSON.stringify(list));
}

function _createComsatObject(cliData) {
  const comsatObj = {
    name: cliData.name,
    domain: cliData.domain,
    publicIp: cliData.publicIp,
    certDir: cliData.certDir,
    isSelfSignedCert: AppHelper.validateBooleanCliOptions(cliData.selfSignedEnable, cliData.selfSignedDisable)
  }

  return AppHelper.deleteUndefinedFields(comsatObj);
}

module.exports = new Comsat()