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
const ConnectorService = require('../services/connector-service')
const AppHelper = require('../helpers/app-helper')

class Connector extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_CONNECTOR
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'name', alias: 'n', type: String, description: 'Connector name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'domain', alias: 'd', type: String, description: 'Connector domain name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'public-ip', alias: 'i', type: String, description: 'Connector public IP address', group: [constants.CMD_ADD, constants.CMD_UPDATE, constants.CMD_REMOVE] },
      { name: 'cert', alias: 'c', type: String, description: 'Certificate', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'self-signed-on', alias: 'S', type: Boolean, description: 'Switch on self-signed enabled', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'self-signed-off', alias: 's', type: Boolean, description: 'Switch off self-signed disabled', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'dev-mode-on', alias: 'H', type: Boolean, description: 'Switch on dev mode', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'dev-mode-off', alias: 'h', type: Boolean, description: 'Switch off dev mode', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new Connector.',
      [constants.CMD_UPDATE]: 'Update existing Connector.',
      [constants.CMD_REMOVE]: 'Delete a Connector.',
      [constants.CMD_LIST]: 'List all Connectors.',
    }
  }

  async run(args) {
    const connectorCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (connectorCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(connectorCommand, constants.CMD_ADD, _createConnector, false)
        break
      case constants.CMD_UPDATE:
        await _executeCase(connectorCommand, constants.CMD_UPDATE, _updateConnector, false)
        break
      case constants.CMD_REMOVE:
        await _executeCase(connectorCommand, constants.CMD_REMOVE, _deleteConnector, false)
        break
      case constants.CMD_LIST:
        await _executeCase(connectorCommand, constants.CMD_LIST, _getConnectorList, false)
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

async function _createConnector(obj) {
  const connector = _createConnectorObject(obj)
  logger.info(JSON.stringify(connector));
  try {
    const result = await ConnectorService.createConnectorWithTransaction(connector)
    logger.info(JSON.stringify(result));
    logger.info('Connector has been created successfully.');
  } catch (e) {
    logger.info(e.message)
  }
}

async function _updateConnector(obj) {
  const connector = _createConnectorObject(obj)
  logger.info(JSON.stringify(connector));
  try {
    await ConnectorService.updateConnectorWithTransaction(connector)
    logger.info('Connector has been updated successfully.');
  } catch (e) {
    logger.info(e.message)
  }
}

async function _deleteConnector(obj) {
  const connector = _createConnectorObject(obj)
  logger.info(JSON.stringify(connector));
  try {
    await ConnectorService.deleteConnectorWithTransaction(connector)
    logger.info('Connector has been removed successfully.');
  } catch (e) {
    logger.info(e.message)
  }
}

async function _getConnectorList(obj) {
  const list = await ConnectorService.getConnectorListWithTransaction()
  logger.info('Connector list has been gotten successfully');
  logger.info(JSON.stringify(list));
}

function _createConnectorObject(cliData) {
  const connectorObj = {
    name: cliData.name,
    domain: cliData.domain,
    publicIp: cliData.publicIp,
    certDir: cliData.certDir,
    isSelfSignedCert: AppHelper.validateBooleanCliOptions(cliData.selfSignedEnable, cliData.selfSignedDisable),
    devMode: AppHelper.validateBooleanCliOptions(cliData.devModeOn, cliData.devModeOff)
  }

  return AppHelper.deleteUndefinedFields(connectorObj);
}

module.exports = new Connector()