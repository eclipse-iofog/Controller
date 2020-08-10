/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseCLIHandler = require('./base-cli-handler')
const constants = require('../helpers/constants')
const config = require('../config')
const logger = require('../logger')
const db = require('../data/models')

class Start extends BaseCLIHandler {
  constructor () {
    super()

    this.commandDefinitions = [
      {
        name: 'start',
        defaultOption: true,
        group: [constants.CMD_START]
      },
      {
        name: 'verbose',
        alias: 'v',
        type: Boolean,
        description: 'Display output on stdout',
        group: [constants.CMD_START]
      }
    ]
  }
  async run (args) {
    const startCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })
    const daemon = args.daemon
    if (startCommand.start.verbose) {
      daemon._options.silent = false
    }
    const configuration = {
      devMode: config.get('Server:DevMode'),
      port: config.get('Server:Port'),
      sslKey: config.get('Server:SslKey'),
      sslCert: config.get('Server:SslCert'),
      intermedKey: config.get('Server:IntermediateCert')
    }
    const pid = daemon.status()

    if (pid === 0) {
      daemon.start()
      await checkDaemon(daemon, configuration)
    } else {
      logger.cliRes(`iofog-controller already running. PID: ${pid}`)
    }
  }

  async initDB (isStart) {
    try {
      await db.initDB(isStart)
    } catch (err) {
      logger.error('Unable to initialize the database. Error: ' + err)
      process.exit(1)
    }
  }
}

function checkDaemon (daemon, configuration) {
  return new Promise((resolve, reject) => {
    let iterationsCount = 0
    const check = () => {
      iterationsCount++
      const pid = daemon.status()
      if (pid === 0) {
        logger.error('Error: port is probably allocated, or ssl_key or ssl_cert or intermediate_cert ' +
            'is either missing or invalid.')
        return reject(new Error('Error starting ioFog-Controller'))
      }

      if (iterationsCount === 5) {
        checkServerProtocol(configuration)
        logger.cliRes(`ioFog-Controller has started at pid: ${pid}`)
        return resolve()
      }

      setTimeout(check, 1000)
    }

    setTimeout(check, 1000)
  })
}

function checkServerProtocol (configuration) {
  const { devMode, port, sslKey, sslCert, intermedKey } = configuration
  if (!devMode && sslKey && sslCert && intermedKey) {
    logger.cliRes(`==> 🌎 HTTPS server listening on port ${port}. Open up https://localhost:${port}/ in your browser.`)
  } else {
    logger.cliRes(`==> 🌎 Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
}

module.exports = new Start()
