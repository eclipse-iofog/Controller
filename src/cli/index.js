const { Version } = require('./Version');
const { Config } = require('./Config');
const { Status } = require('./Status');
const { Start } = require('./Start');
const { User } = require('./User');
const { Comsat } = require('./Comsat');

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
        let comsat = new Comsat(args.slice(1));
        return comsat.run();
      case 'help':
      default:
        displayHelp();
        break;
    }
  }
}

exports.CLI = CLI;