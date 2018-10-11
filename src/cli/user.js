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
        try {
          const user = userCommand[constants.CMD_ADD];
          user.password = AppHelper.encryptText(user.password, user.email);

          logger.info(JSON.stringify(user));

          await UserService.signUp(user);
          logger.info('User created successfully.');
        } catch (error) {
          logger.error(error.message);
        }
        break;
      case constants.CMD_UPDATE:
        try {
          const userDetails = userCommand[constants.CMD_UPDATE];
          userDetails.password = AppHelper.encryptText(userDetails.password, userDetails.email);

          logger.info(JSON.stringify(userDetails));

          const user = await UserManager.findByEmail(userDetails.email);

          await UserService.updateUserDetails(user, userDetails);
          logger.info('User updated successfully.');
        } catch (error) {
          logger.error(error.message);
        }
        break;
      case constants.CMD_REMOVE:
        try {
          const emailObj = userCommand[constants.CMD_REMOVE];
          logger.info(JSON.stringify(emailObj));

          const user = await UserManager.findByEmail(emailObj.email);

          await UserService.deleteUser(user);
          logger.info('User removed successfully.');
        } catch (error) {
          logger.error(error.message);
        }
        break;
      case constants.CMD_LIST:
        try {
          const users = await UserService.list();
          logger.info(JSON.stringify(users));
        } catch (error) {
          logger.error(error.message);
        }
        break;
      case constants.CMD_GENERATE_TOKEN:
        try {
          const emailObj = userCommand[constants.CMD_GENERATE_TOKEN];
          logger.info(JSON.stringify(emailObj));

          const user = await UserManager.findByEmail(emailObj.email);

          await UserService.login(user);
          logger.info('Access token created successfully.');
        } catch (error) {
          logger.error(error.message);
        }
        break;
      case constants.CMD_ACTIVATE:
        try {
          const emailObj = userCommand[constants.CMD_ACTIVATE];
          logger.info(JSON.stringify(emailObj));

          const user = await UserManager.findByEmail(emailObj.email);

          const activationCode = {
            activationCode: EmailActivationCodeService.findActivationCodeByUserId(user.id)
          }

          await UserService.activateUser(activationCode);
          logger.info('User activated successfully.');
        } catch (error) {
          logger.error(error.message)
        }
        break;
      case constants.CMD_SUSPEND:
        try {
          const emailObj = userCommand[constants.CMD_SUSPEND];
          logger.info(JSON.stringify(emailObj));

          const user = await UserManager.findByEmail(emailObj.email);

          await UserService.deleteUser(user);
          logger.info('User suspended successfully.');
        } catch (error) {
          logger.error(error.message)
        }
        break;
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }
}

module.exports = new User()
