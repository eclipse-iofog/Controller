const { Help } = require('./Help');
import SatelliteManager from '../server/managers/satelliteManager';

class Comsat {
  constructor(args) {
    this.args = args;
  }

  run = () => {
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
  if (args.length < 4) return Help.displayUserCommandHelp();
  if (args.length > 4) return Help.displayExtraArgumentHelp(args[4]);

  try {
    SatelliteManager.createSatellite(args[1], args[2], args[3]);
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