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
        return this.help(
          [
            {
              header: 'Usage',
              content: '$ fog-controller <command> <options>'
            },
            {
              header: 'Command List',
              content: [
                { name: 'start', summary: 'Display help information about Git.' },
                { name: 'stop', summary: 'Record changes to the repository.' },
                { name: 'status', summary: 'Print the version.' },
                { name: 'help', summary: 'Etc.' },
                { name: 'version', summary: 'Etc.' },
                { name: 'user', summary: 'Etc.' },
                { name: 'config', summary: 'Etc.' },
                { name: 'comsat', summary: 'Etc.' },
                { name: 'proxy', summary: 'Etc.' },
              ]
            }
          ]
        )
    }
  }
}

module.exports = Cli