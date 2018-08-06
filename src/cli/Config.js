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

const {Help} = require('./Help');
const FogControllerConfigService = require('../server/services/fogControllerConfigService');
const FogControllerConfigManager = require('../server/managers/fogControllerConfigManager');
const ConfigUtil = require('../server/utils/configUtil');

class Config {
  constructor(args) {
    this.args = args;
  }

  run = () => {
    if (!this.args.length) {
      Help.displayConfigCommandHelp();
    } else {
      runCommand(this.args);
    }
  }
}

function runCommand(args) {
  switch (args[0]) {
    case '-list':
      return runListCommand(args);
    case '-add':
      return runAddCommand(args);
    case '-remove':
      return runRemoveCommand(args);
    default:
      Help.displayExtraArgumentHelp(args[0])
  }
}

function runListCommand(args) {
  if (args[1]) {
    Help.displayExtraArgumentHelp(args[1]);
  } else {
    FogControllerConfigService.configList();
  }
}

function runAddCommand(args) {
  if (args.length < 3) return Help.displayConfigListHelp();
  if (args.length > 3) return Help.displayExtraArgumentHelp(args[3]);

  try {
    ConfigUtil.setConfigParam(args[1].toLowerCase(), args[2]);
  } catch (e) {
    console.log(e);
  }
}

function runRemoveCommand(args) {
  if (args.length < 2) return Help.displayConfigRemoveHelp();
  if (args.length > 2) return Help.displayExtraArgumentHelp(args[2]);

  try {
    FogControllerConfigManager.deleteConfig(args[1].toLowerCase());
  } catch (e) {
    console.log(e);
  }
}

exports.Config = Config;