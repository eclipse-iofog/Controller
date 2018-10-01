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
const SatelliteManager = require('../server/managers/satelliteManager');

class Comsat {
  constructor(args) {
    this.args = args;
  }

  run() {
    if (!this.args.length) {
      Help.displayComsatCommandHelp();
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
      Help.displayComsatCommandHelp();
  }
}

function runListCommand(args) {
  if (args.length > 1) return Help.displayExtraArgumentHelp(args[1]);

  try {
    SatelliteManager.list();
  } catch(e) {
    console.log(e);
  }
}

function runAddCommand(args) {
  if (args.length < 4) return Help.displayComsatAddHelp();
  if (args.length > 6) return Help.displayExtraArgumentHelp(args[6]);

  try {
    SatelliteManager.createSatellite(args[1], args[2], args[3], args[4], args[5]);
  } catch(e) {
    console.log(e);
  }
}

function runRemoveCommand(args) {
  if (args.length > 2) return Help.displayExtraArgumentHelp(args[2]);

  try {
    SatelliteManager.removeSatellite(args[1]);
  } catch(e) {
    console.log(e);
  }
}

exports.Comsat = Comsat;