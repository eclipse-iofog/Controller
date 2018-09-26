const BaseCLIHandler = require('./base-cli-handler')

class Config extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: 'command' },
      { name: 'list', alias: 'l', type: Boolean, description: 'Display current config', group: 'config' },
      { name: 'port', alias: 'p', type: Number, description: 'Port', defaultValue: 54421, group: 'config' },
      { name: 'ssl-cert', alias: 'c', type: String, description: 'Path to SSL certificate file', group: 'config' },
      { name: 'ssl-key', alias: 'k', type: String, description: 'Path to SSL key file', group: 'config' },
      { name: 'intermediate-cert', alias: 'i', type: String, description: 'Path to SSL intermediate certificate file', group: 'config' },
      { name: 'email-activation', alias: 'm', type: Boolean, description: 'Email activation required or not', group: 'config' },
      { name: 'email-address', alias: 'a', type: String, description: 'Email address to send activations from', group: 'config' },
      { name: 'email-password', alias: 'w', type: String, description: 'Email password to send activations from', group: 'config' },
      { name: 'email-service', alias: 's', type: String, description: 'Email service to send activations', group: 'config' },
    ]
  }

  run(args) {
    const configCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    if (configCommand.command.command === 'help') {
      return this.help(
        [
          {
            header: 'Usage',
            content: '$ fog-controller config <options>'
          },
          {
            header: ['Options'],
            optionList: this.commandDefinitions,
            group: ['config'],
          },
        ]
      )
    }

    return console.log(JSON.stringify(configCommand.config, null, 2))
  }
}

module.exports = new Config()