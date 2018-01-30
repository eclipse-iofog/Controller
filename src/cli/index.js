const { Version } = require('./Version');
const { Config } = require('./Config');
const { Status } = require('./Status');
const { Start } = require('./Start');

class CLI {
  constructor(args) {
    this.args = args;
  }

  run = (daemon) => {
    switch (this.args[0]) {
      case 'version':
        Version.display(this.args);
        break;
      case 'config':
        let config = new Config(args.slice(1));
        config.run();
        break;
      case 'status':
        Status.display(daemon);
        break;
      case 'start':
        Start.run(daemon);
        break;

      case 'stop':
        daemon.stop();
        break;

      case 'user':
        if (args[1]) {
          switch (args[1]) {
            case '-list':
              UserManager.list();
              break;
            case '-add':
              UserManager.createUser(args[2], args[3], args[4], args[5]);
              break;
            case '-remove':
              UserManager.removeUser(args[2]);
              break;
            case '-generateToken':
              UserManager.generateToken(args[2]);
              break;
            default:
              console.log('Invalid flag "' + args[1] + '"');
          }
        } else {
          UserManager.list();
        }
        break;

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