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

const { Help } = require('./Help');
const UserManager = require('../server/managers/userManager');

class User {
  constructor(args) {
    this.args = args;
  }

  run() {
    if (!this.args.length) {
      Help.displayUserCommandHelp();
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
    case '-generateToken':
      return runGenerateTokenCommand(args);
    default:
      Help.displayUserCommandHelp();
  }
}

function runListCommand(args) {
  if (args.length > 1) return Help.displayExtraArgumentHelp(args[1]);

  try {
    UserManager.list();
  } catch(e) {
    console.log(e);
  }
}

function runAddCommand(args) {
  if (args.length < 5) return Help.displayUserCommandHelp();
  if (args.length > 5) return Help.displayExtraArgumentHelp(args[5]);

  try {
    UserManager.createUser(args[1], args[2], args[3], args[4]);
  } catch(e) {
    console.log(e);
  }
}

function runRemoveCommand(args) {
  if (args.length > 2) return Help.displayExtraArgumentHelp(args[2]);

  try {
    UserManager.removeUser(args[1]);
  } catch(e) {
    console.log(e);
  }
}

function runGenerateTokenCommand(args) {
  if (args.length > 2) return Help.displayExtraArgumentHelp(args[2]);

  try {
      UserManager.generateToken(args[1]);
  } catch(e) {
    console.log(e);
  }
}


exports.User = User;