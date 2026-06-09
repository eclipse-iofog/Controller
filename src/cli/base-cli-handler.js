/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
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
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const logger = require('../logger')

class CLIHandler {
  constructor () {
    this.commandDefinitions = []
    this.commands = {}
    this.name = ''
  }

  run (args) {
    throw new Error('Not Implemented')
  }

  parseCommandLineArgs (commandDefinitions, options = {}) {
    return commandLineArgs(commandDefinitions, Object.assign({ camelCase: true, partial: true }, options))
  }

  help (show = [], showOptions = true, hasCommands = true, additionalSection = []) {
    if (show.length === 0) {
      // show all
      this.helpAll(show, showOptions, hasCommands, additionalSection)
    } else {
      // show list
      this.helpSome(show, showOptions)
    }
  }

  helpSome (show = [], showOptions = true) {
    const options = Object.keys(this.commands)
      .filter((key) => show.indexOf(key) !== -1)
      .map((key) => ({
        header: key,
        optionList: this.commandDefinitions,
        group: [key]
      }))

    const sections = [
      {
        header: 'Usage',
        content: `$ iofog-controller ${this.name} ${show.length === 1 ? show : '<command>'} <options>`
      }
    ].concat(showOptions ? options : [])

    const usage = [
      {
        header: 'ioFogController',
        content: 'Fog Controller project for Eclipse IoFog @ iofog.org \\nCopyright (c) 2023 Datasance Teknoloji A.S.'
      }
    ].concat(sections)
    logger.cliRes(commandLineUsage(usage))
  }

  helpAll (show = [], showOptions = true, hasCommands = true, additionalSection = []) {
    const options = Object.keys(this.commands)
      .map((key) => ({
        header: key,
        optionList: this.commandDefinitions,
        group: [key]
      }))
    const commandsList = {
      header: 'Command List',
      content: Object.keys(this.commands).map((key) => ({
        name: key,
        summary: this.commands[key]
      }))
    }

    const sections = [
      {
        header: 'Usage',
        content: `$ iofog-controller ${this.name}${hasCommands ? ' <command>' : ''} <options>`
      }
    ].concat(hasCommands ? commandsList : [])
      .concat(showOptions ? options : [])
      .concat(additionalSection)

    const usage = [
      {
        header: 'ioFogController',
        content: 'Fog Controller project for Eclipse IoFog @ iofog.org \\nCopyright (c) 2023 Datasance Teknoloji A.S.'
      }
    ].concat(sections)
    logger.cliRes(commandLineUsage(usage))
  }

  handleCLIError (error, args) {
    switch (error.name) {
      case 'UNKNOWN_OPTION':
        logger.error('Invalid argument \'' + error.optionName.split('-').join('') + '\'')
        break
      case 'UNKNOWN_VALUE':
        if (this.commands[args[0]] && args[1] === 'help') {
          return this.helpSome([args[0]])
        }
        logger.error('Invalid value ' + error.value)
        break
      case 'InvalidArgumentError':
        logger.error(error.message)
        break
      case 'InvalidArgumentTypeError':
        logger.error(error.message)
        break
      case 'ALREADY_SET':
        logger.error('Parameter \'' + error.optionName + '\' is used multiple times')
        break
      case 'CLIArgsNotProvidedError':
        if (this.commands[args[0]]) {
          return this.helpSome([args[0]])
        }
        break
      default:
        logger.error(JSON.stringify(error))
        break
    }
  }

  validateParameters (command, commandDefinitions, pArgs) {
    // 1st argument = command
    const args = pArgs.slice()
    args.shift()

    const possibleAliasesList = _getPossibleAliasesList(command, commandDefinitions)
    const possibleArgsList = _getPossibleArgsList(command, commandDefinitions)
    if (possibleAliasesList.length === 0 && possibleArgsList.length === 0) {
      return
    }

    let expectedValueType
    let currentArgName

    if (args.length === 0) {
      throw new Errors.CLIArgsNotProvidedError()
    }
    const argsMap = argsArrayAsMap(args)

    argsMap.forEach((values, key) => {
      if (key.startsWith('--')) { // argument
        // '--ssl-cert' format -> 'ssl-cert' format
        const argument = key.substr(2)
        _validateArg(argument, possibleArgsList)
        currentArgName = argument
        expectedValueType = _getValType(argument, commandDefinitions)
      } else if (key.startsWith('-')) { // alias
        // '-q' format -> 'q' format
        const alias = key.substr(1)
        _validateArg(alias, possibleAliasesList)
        currentArgName = alias
        expectedValueType = _getValType(alias, commandDefinitions)
      }

      const valType = _getCurrentValType(values)
      // TODO else validate multiply parameters. Add after multiply parameters will be used in cli api

      const isValidType = _validateType(expectedValueType, valType)

      if (!isValidType) {
        throw new Errors.InvalidArgumentTypeError(AppHelper.formatMessage(ErrorMessages.INVALID_CLI_ARGUMENT_TYPE,
          currentArgName, expectedValueType))
      }
    })
  }
}

function argsArrayAsMap (args) {
  const argsVars = args.join(' ').split(/(?= -{1,2}[^-]+)/)
  const argsMap = new Map()
  argsVars
    .map((pair) => pair.trim())
    .map((pair) => {
      const spaceIndex = pair.indexOf(' ')
      let key; let values
      if (spaceIndex !== -1) {
        key = pair.substr(0, pair.indexOf(' '))
        values = pair.substr(pair.indexOf(' ') + 1).split(' ')
        argsMap.set(key, values)
      } else {
        key = pair
        values = []
      }
      argsMap.set(key, values)
    })
  return argsMap
}

function _validateArg (arg, aliasesList) {
  const valid = aliasesList.includes(arg)
  if (!valid) {
    throw new Errors.InvalidArgumentError('Invalid argument \'' + arg + '\'')
  }
}

function _getPossibleAliasesList (command, commandDefinitions) {
  const possibleAliasesList = []

  for (const definition of commandDefinitions) {
    const group = definition.group
    const isGroupArray = group.constructor === Array
    if (isGroupArray) {
      for (const gr of group) {
        if (gr === command) {
          possibleAliasesList.push(definition.alias)
          break
        }
      }
    } else {
      if (group === command) {
        possibleAliasesList.push(definition.alias)
      }
    }
  }

  return possibleAliasesList
}

function _getPossibleArgsList (command, commandDefinitions) {
  const possibleArgsList = []

  for (const definition of commandDefinitions) {
    const group = definition.group
    const isGroupArray = group.constructor === Array
    if (isGroupArray) {
      for (const gr of group) {
        if (gr === command) {
          possibleArgsList.push(definition.name)
          break
        }
      }
    } else {
      if (group === command) {
        possibleArgsList.push(definition.name)
      }
    }
  }

  return possibleArgsList
}

function _getValType (arg, commandDefinitions) {
  const command = commandDefinitions
    .filter((def) => def.name === arg || def.alias === arg)[0]
  return command.type.name.toLowerCase()
}

function _getCurrentValType (values) {
  let valType
  if (values.length === 0) {
    valType = 'boolean'
  } else if (values.length === 1) {
    const firstVal = Number(values[0])
    if (Number.isNaN(firstVal.valueOf())) {
      valType = 'string'
    } else if (Number.isInteger(firstVal.valueOf())) {
      valType = 'integer'
    } else {
      valType = 'float'
    }
  }
  return valType
}

function _validateType (expectedValueType, valType) {
  let isValidType = true
  if ((expectedValueType === 'float' || expectedValueType === 'number') &&
    (valType !== 'float' && valType !== 'number' && valType !== 'integer')) {
    isValidType = false
  } else if (expectedValueType === 'integer' && valType !== 'integer') {
    isValidType = false
  } else if (expectedValueType === 'boolean' && valType !== 'boolean') {
    isValidType = false
  }
  return isValidType
}

module.exports = CLIHandler
