const { Version } = require('./Version');
const { Config } = require('./Config');
const { Status } = require('./Status');
const { Start } = require('./Start');
const { User } = require('./User');

class CLI {
  constructor(args) {
    this.args = args;
  }

  run = (daemon) => {
    switch (this.args[0]) {
      case 'version':
        return Version.display(this.args);
      case 'config':
        let config = new Config(args.slice(1));
        return config.run();
      case 'status':
        return Status.display(daemon);
      case 'start':
        return Start.run(daemon);
      case 'stop':
        return daemon.stop();
      case 'user':
        let user = new User(args.slice(1));
        return user.run();
      case 'comsat':
        if (args[1]) {
          switch (args[1]) {
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
        } else {
          SatelliteManager.list();
        }
        break;
      case 'help':
      default:
        displayHelp();
        break;
    }
  }
}

exports.CLI = CLI;