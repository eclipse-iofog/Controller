/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

class CLIHandler {
  constructor() {
    this.commandDefinitions = []
    this.commands = {}
    this.name = ''
  }

  run(args) {
    throw new Error('Not Implemented')
  }

  parseCommandLineArgs(commandDefinitions, options = {}) {
    return commandLineArgs(commandDefinitions, Object.assign({ camelCase: true, partial: true, }, options))
  }

  help(hide = [], showOptions = true, hasCommands = true, additionalSection = []) {
    const options = Object.keys(this.commands)
      .filter((key) => hide.indexOf(key) === -1)
      .map((key) => ({
        header: key,
        optionList: this.commandDefinitions,
        group: [key],
      }))
    const commandsList = {
      header: 'Command List',
      content: Object.keys(this.commands).map((key) => ({
        name: key,
        summary: this.commands[key],
      })),
    }

    const sections = [
      {
        header: 'Usage',
        content: `$ fog-controller ${this.name}${hasCommands ? ' <command>' : ''} <options>`,
      },
    ].concat(hasCommands ? commandsList : [])
      .concat(showOptions ? options : [])
      .concat(additionalSection)

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