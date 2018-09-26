const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

class CLIHandler {
  constructor() {
    this.commandDefinitions = []
  }

  run(args) {
    throw new Error('Not Implemented')
  }

  parseCommandLineArgs(commandDefinitions, options = {}) {
    return commandLineArgs(commandDefinitions, Object.assign({ camelCase: true, partial: true, }, options))
  }

  help(sections) {
    const usage = [
      {
        header: 'FogController',
        content: 'Fog Controller project for Eclipse IoFog @ iofog.org \\nCopyright (c) 2018 Edgeworx, Inc.',
      }
    ].concat(sections)
    console.log(commandLineUsage(usage))
  }
}

module.exports = CLIHandler