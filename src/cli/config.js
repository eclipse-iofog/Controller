const BaseCLIHandler = require('./base-cli-handler')
const config = require('../config')
const helpers = require('../helpers')
const logger = require('../logger')

class Config extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: 'command' },
      { name: 'list', alias: 'l', type: Boolean, description: 'Display current config', group: 'config' },
      { name: 'port', alias: 'p', type: Number, description: 'Port', group: 'config' },
      { name: 'ssl-cert', alias: 'c', type: String, description: 'Path to SSL certificate file', group: 'config' },
      { name: 'ssl-key', alias: 'k', type: String, description: 'Path to SSL key file', group: 'config' },
      { name: 'intermediate-cert', alias: 'i', type: String, description: 'Path to SSL intermediate certificate file', group: 'config' },
      { name: 'email-activation', alias: 'm', type: Boolean, description: 'Email activation required or not', group: 'config' },
      { name: 'email-address', alias: 'a', type: String, description: 'Email address to send activations from', group: 'config' },
      { name: 'email-password', alias: 'w', type: String, description: 'Email password to send activations from', group: 'config' },
      { name: 'email-service', alias: 's', type: String, description: 'Email service to send activations', group: 'config' },
      { name: 'log-dir', alias: 'd', type: String, description: 'Log files directory', group: 'config' },
      { name: 'log-size', alias: 'z', type: Number, description: 'Log files size (MB)', group: 'config' },
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

    if (configCommand.config.port != null) {
      config.set('Server:Port', configCommand.config.port)
    }

    if (configCommand.config.sslCert != null) {
      config.set('Server:SslCert', configCommand.config.sslCert)
    }

    if (configCommand.config.sslKey != null) {
      config.set('Server:SslKey', configCommand.config.sslKey)
    }

    if (configCommand.config.intermediateCert != null) {
      config.set('Server:IntermediateCert', configCommand.config.intermediateCert)
    }

    config.set('Email:ActivationEnabled', configCommand.config.emailActivation === true)

    if (configCommand.config.emailAddress != null && config.get('Email:Address') !== configCommand.config.emailAddress) {
      if (configCommand.config.emailPassword == null) {
        return console.log('When changing email address, password must be provided.')
      }
      config.set('Email:Address', configCommand.config.emailAddress)
    }

    if (configCommand.config.emailPassword != null) {
      config.set('Email:Password', helpers.encryptText(configCommand.config.emailPassword, config.get('Email:Address')))
    }

    if (configCommand.config.emailService != null) {
      config.set('Email:Service', configCommand.config.emailService)
    }

    if (configCommand.config.logDir != null) {
      config.set('Service:LogsDirectory', configCommand.config.logDir)
    }

    if (configCommand.config.logSize != null) {
      config.set('Service:LogsFileSize', configCommand.config.logSize * 1024)
    }
  }
}

module.exports = new Config()