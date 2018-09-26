const BaseCLIHandler = require('./base-cli-handler')
const Start = require('./start')
const User = require('./user')
const Comsat = require('./comsat')
const Config = require('./config')
const Proxy = require('./proxy')

class Cli extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true },
    ]
  }

  run(daemon) {
    const mainCommand = this.parseCommandLineArgs(this.commandDefinitions)
    const argv = mainCommand._unknown || []

    switch (mainCommand.command) {
      case 'start':
        return Start.run({ daemon })
      case 'stop':
        return daemon.stop()
      case 'status':
        break
      case 'user':
        return User.run({ argv })
      case 'config':
        return Config.run({ argv })
      case 'comsat':
        return Comsat.run({ argv })
      case 'proxy':
        return Proxy.run({ argv })
      case 'help':
      default:
        return this.help()
    }
  }

  help() {
    super.help(
      [
        {
          header: 'Usage',
          content: '$ fog-controller <command> <options>'
        },
        {
          header: 'Command List',
          content: [
            { name: 'start', summary: 'Start fog-controller service.' },
            { name: 'stop', summary: 'Stop fog-controller service.' },
            { name: 'status', summary: 'Display fog-controller service status.' },
            { name: 'help', summary: 'Display usage information.' },
            { name: 'version', summary: 'Display fog-controller service version.' },
            { name: 'user', summary: 'User operations.' },
            { name: 'config', summary: 'Set/Display fog-controller service config.' },
            { name: 'comsat', summary: 'ComSat operations.' },
            { name: 'proxy', summary: 'Proxy operations.' },
          ]
        }
      ]
    )
  }
}

module.exports = Cli