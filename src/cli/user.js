const BaseCLIHandler = require('./base-cli-handler')

class User extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, description: 'add, remove, update, list, generate-token', group: 'command', },
      { name: 'first-name', alias: 'f', type: String, description: 'User\'s first name', group: ['add', 'update'], },
      { name: 'last-name', alias: 'l', type: String, description: 'User\'s last name', group: ['add', 'update'], },
      { name: 'email', alias: 'e', type: String, description: 'User\'s email address', group: ['add', 'generate-token', 'remove', 'update'], },
      { name: 'password', alias: 'p', type: String, description: 'User\'s password', group: ['add', 'update'], },
    ]
  }

  run(args) {
    const userCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, })

    switch (userCommand.command.command) {
      case 'help':
        return this.help(
          [
            {
              header: 'Usage',
              content: '$ fog-controller user <command> <options>'
            },
            {
              header: 'Command List',
              content: [
                { name: 'add', summary: 'Display help information about Git.' },
                { name: 'update', summary: 'Record changes to the repository.' },
                { name: 'remove', summary: 'Print the version.' },
                { name: 'list', summary: 'Etc.' },
                { name: 'generate-token', summary: 'Etc.' },
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
            {
              header: 'generate-token',
              optionList: this.commandDefinitions,
              group: ['generate-token'],
            },
          ]
        )
    }
  }

}

module.exports = new User()
