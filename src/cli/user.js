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
      case 'add':
        return console.log(JSON.stringify(userCommand.add, null, 2))
      case 'update':
        return console.log(JSON.stringify(userCommand.update, null, 2))
      case 'remove':
        return console.log(JSON.stringify(userCommand.remove, null, 2))
      case 'generate-token':
        return console.log(JSON.stringify(userCommand['generate-token'], null, 2))
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
          content: '$ fog-controller user <command> <options>'
        },
        {
          header: 'Command List',
          content: [
            { name: 'add', summary: 'Add a new user.' },
            { name: 'update', summary: 'Update existing user.' },
            { name: 'remove', summary: 'Delete a user.' },
            { name: 'list', summary: 'List all users.' },
            { name: 'generate-token', summary: 'Generate token for a user.' },
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

module.exports = new User()
