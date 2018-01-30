const { Help } = require('./Help');

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
      SatelliteManager.list();
      break;
    case '-add':
      SatelliteManager.createSatellite(args[2], args[3], args[4]);
      break;
    case '-remove':
      SatelliteManager.removeSatellite(args[2]);
      break;
    default:
      console.log('Invalid flag "' + args[1] + '"');
  }
}

exports.Comsat = Comsat;