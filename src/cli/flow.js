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
const AuthDecorator = require('../decorators/cli-decorator');
const FlowService = require('../services/flow-service');
const AppHelper = require('../helpers/app-helper');
const logger = require('../logger');
const fs = require('fs');

const JSON_SCHEMA =
  `  name: string
  description: string
  isActivated: boolean`;

class Flow extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_FLOW;
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'file', alias: 'f', type: String, description: 'Application flow settings JSON file', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'flow-id', alias: 'i', type: String, description: 'Application flow ID', group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO] },
      { name: 'name', alias: 'n', type: String, description: 'Application flow name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'description', alias: 'd', type: String, description: 'Application flow description', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'activate', alias: 'a', type: Boolean, description: 'Activate application flow', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'deactivate', alias: 'D', type: Boolean, description: 'Deactivate application flow', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'user-id', alias: 'u', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ];
    this.commands = {
      [constants.CMD_ADD]: 'Add a new flow.',
      [constants.CMD_UPDATE]: 'Update existing flow.',
      [constants.CMD_REMOVE]: 'Delete a flow.',
      [constants.CMD_LIST]: 'List all flows.',
      [constants.CMD_INFO]: 'Get flow settings.',
    }
  }

  async run(args) {
    const flowCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv });

    switch (flowCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(flowCommand, constants.CMD_ADD, _createFlow, true);
        break;
      case constants.CMD_UPDATE:
        await _executeCase(flowCommand, constants.CMD_UPDATE, _updateFlow, false);
        break;
      case constants.CMD_REMOVE:
        await _executeCase(flowCommand, constants.CMD_REMOVE, _deleteFlow, false);
        break;
      case constants.CMD_LIST:
        await _executeCase(flowCommand, constants.CMD_LIST, _getAllFlows, false);
        break;
      case constants.CMD_INFO:
        await _executeCase(flowCommand, constants.CMD_INFO, _getFlow, false);
        break;
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
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

const _executeCase = async function (flowCommand, commandName, f, isUserRequired) {
  try {
    const item = flowCommand[commandName];

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserById(f);
      decoratedFunction(item);
    } else {
      f(item);
    }
  } catch (error) {
    logger.error(error.message);
  }
};

const _createFlow = async function (flowData, user) {
  const flow = flowData.file
    ? JSON.parse(fs.readFileSync(flowData.file, 'utf8'))
    : _createFlowObject(flowData);

  logger.info(JSON.stringify(flow));

  await FlowService.createFlow(flow, user, true);
  logger.info('Flow created successfully.');
};

const _updateFlow = async function (flowData) {
  const flow = flowData.file
    ? JSON.parse(fs.readFileSync(flowData.file, 'utf8'))
    : _createFlowObject(flowData);

  logger.info(JSON.stringify(flow));
  const flowId = flowData.flowId;

  await FlowService.updateFlow(flow, flowId, {}, true);
  logger.info('Flow updated successfully.');
};

const _deleteFlow = async function (flowData) {
  logger.info(JSON.stringify(flowData));

  const flowId = flowData.flowId;

  await FlowService.deleteFlow(flowId, {}, true);
  logger.info('Flow removed successfully.');
};

const _getAllFlows = async function (emptyObj) {
  const flows = await FlowService.getAllFlows(true);
  logger.info(JSON.stringify(flows));
};

const _getFlow = async function (flowData) {
  logger.info(JSON.stringify(flowData));

  const flowId = flowData.flowId;

  const flow = await FlowService.getFlow(flowId, {}, true);
  logger.info(JSON.stringify(flow));
};

function _createFlowObject(data) {
  const flow = {
      id: data.id,
      name: data.name,
      description: data.description,
      isActivated: AppHelper.validateBooleanCliOptions(data.activate, data.deactivate)
    };

    return AppHelper.deleteUndefinedFields(flow);
}

module.exports = new Flow();