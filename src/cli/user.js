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
const UserService = require('../services/user-service');
const UserManager = require('../sequelize/managers/user-manager');
const logger = require('../logger');
const AppHelper = require('../helpers/app-helper');
const EmailActivationCodeService = require('../services/email-activation-code-service');
const AuthDecorator = require('../decorators/cli-decorator');
const Validator = require('../schemas');


class User extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_USER
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true, description: 'add, remove, update, list, generate-token',
        group: constants.CMD,
      },
      {
        name: 'first-name', alias: 'f', type: String, description: 'User\'s first name',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
      {
        name: 'last-name', alias: 'l', type: String, description: 'User\'s last name',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
      {
        name: 'email', alias: 'e', type: String, description: 'User\'s email address',
        group: [constants.CMD_ADD, constants.CMD_GENERATE_TOKEN, constants.CMD_REMOVE, constants.CMD_UPDATE, constants.CMD_ACTIVATE, constants.CMD_SUSPEND],
      },
      {
        name: 'password', alias: 'p', type: String, description: 'User\'s password',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new user.',
      [constants.CMD_UPDATE]: 'Update existing user.',
      [constants.CMD_REMOVE]: 'Delete a user.',
      [constants.CMD_LIST]: 'List all users.',
      [constants.CMD_GENERATE_TOKEN]: 'Generate token for a user.',
      [constants.CMD_ACTIVATE]: 'Activate a user.',
      [constants.CMD_SUSPEND]: 'Suspend a user.',
    }
  }

  async run(args) {
    const userCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv,})

    switch (userCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(userCommand, constants.CMD_ADD, _createUser, false);
        break;
      case constants.CMD_UPDATE:
        await _executeCase(userCommand, constants.CMD_UPDATE, _updateUserDetails, true);
        break;
      case constants.CMD_REMOVE:
        await _executeCase(userCommand, constants.CMD_REMOVE, _deleteUser, true);
        break;
      case constants.CMD_LIST:
        await _executeCase(userCommand, constants.CMD_LIST, _getAllUsers, false);
        break;
      case constants.CMD_GENERATE_TOKEN:
        await _executeCase(userCommand, constants.CMD_GENERATE_TOKEN, _generateToken, true);
        break;
      case constants.CMD_ACTIVATE:
        await _executeCase(userCommand, constants.CMD_ACTIVATE, _activateUser, true);
        break;
      case constants.CMD_SUSPEND:
        await _executeCase(userCommand, constants.CMD_SUSPEND, _suspendUser, true);
        break;
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }

}

const _executeCase = async function (userCommand, commandName, f, isUserRequired) {
  try {
    const item = userCommand[commandName];

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserByEmail(f);
      await decoratedFunction(item);
    } else {
      await f(item);
    }
  } catch (error) {
    logger.error(error.message);
  }
};

const _createUser = async function (user) {
  await Validator.validate(user, Validator.schemas.signUp);

  user.password = AppHelper.encryptText(user.password, user.email);

  logger.info(JSON.stringify(user));

  await UserService.signUp(user, true);
  logger.info('User created successfully.');
};

const _updateUserDetails = async function (userDetails, user) {
  await UserService.updateUserDetails(user, userDetails, true);
  logger.info('User updated successfully.');
};

const _deleteUser = async function (emailObj, user) {
  logger.info(JSON.stringify(emailObj));

  await UserService.deleteUser(user, true);
  logger.info('User removed successfully.');
};

const _getAllUsers = async function (emptyObj) {
  const users = await UserService.list(true);
  logger.info(JSON.stringify(users));
};

const _generateToken = async function (emailObj, user) {
  logger.info(JSON.stringify(emailObj));

  const response = await UserService.login(user, true);
  logger.info('Access token ' + response.accessToken + ' created successfully.');
};

const _activateUser = async function (emailObj, user) {
  logger.info(JSON.stringify(emailObj));

  const codeData = {
    userId: user.id
  };

  await UserService.activateUser(codeData, true);
  logger.info('User activated successfully.');
};

const _suspendUser = async function (emailObj, user) {
  logger.info(JSON.stringify(emailObj));

  await UserService.suspendUser(user, true);
  logger.info('User suspended successfully.');
};


module.exports = new User()
