const BaseCLIHandler = require('./base-cli-handler')

class Comsat extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, description: 'add, remove, update, list', group: ['command'] },
      { name: 'name', alias: 'n', type: String, description: 'Comsat name', group: ['add', 'update'] },
      { name: 'domain', alias: 'd', type: String, description: 'Comsat domain name', group: ['add', 'update'] },
      { name: 'public-ip', alias: 'i', type: String, description: 'Comsat public IP address', group: ['add', 'update', 'remove'] },
      { name: 'cert', alias: 'c', type: String, description: 'Path to certificate', group: ['add', 'update'] },
      { name: 'self-signed', alias: 's', type: Boolean, description: 'Is self-signed', group: ['add', 'update'] },
    ]
  }

  run(args) {
    const comsatCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (comsatCommand.command.command) {
      case 'help':
        return this.help(
          [
            {
              header: 'Usage',
              content: '$ fog-controller comsat <command> <options>'
            },
            {
              header: 'Command List',
              content: [
                { name: 'add', summary: 'Display help information about Git.' },
                { name: 'update', summary: 'Record changes to the repository.' },
                { name: 'remove', summary: 'Print the version.' },
                { name: 'list', summary: 'Etc.' },
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
}

module.exports = new Comsat()