const BaseCLIHandler = require('./base-cli-handler')

class Comsat extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: ['command'] },
      { name: 'name', alias: 'n', type: String, description: 'ComSat name', group: ['add', 'update'] },
      { name: 'domain', alias: 'd', type: String, description: 'ComSat domain name', group: ['add', 'update'] },
      { name: 'public-ip', alias: 'i', type: String, description: 'ComSat public IP address', group: ['add', 'update', 'remove'] },
      { name: 'cert', alias: 'c', type: String, description: 'Path to certificate', group: ['add', 'update'] },
      { name: 'self-signed', alias: 's', type: Boolean, description: 'Is self-signed', group: ['add', 'update'] },
    ]
  }

  run(args) {
    const comsatCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (comsatCommand.command.command) {
      case 'add':
        return
      case 'update':
        return
      case 'remove':
        return
      case 'list':
        return
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
          content: '$ fog-controller comsat <command> <options>'
        },
        {
          header: 'Command List',
          content: [
            { name: 'add', summary: 'Add a new ComSat.' },
            { name: 'update', summary: 'Update existing ComSat.' },
            { name: 'remove', summary: 'Delete a ComSat.' },
            { name: 'list', summary: 'List all ComSats.' },
          ],
        },
        {
          header: 'add',
          optionList: this.commandDefinitions,
          group: ['add'],
        },
        {
          header: 'remove',
          optionList: this.commandDefinitions,
          group: ['remove'],
        },
        {
          header: 'update',
          optionList: this.commandDefinitions,
          group: ['update'],
        },
      ]
    )
  }
}

module.exports = new Comsat()