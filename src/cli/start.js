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

const BaseCLIHandler = require('./base-cli-handler')
const config = require('../config')
const logger = require('../logger')

class Start extends BaseCLIHandler {
  run(args) {
    const daemon = args.daemon
    const configuration = {
      port: config.get('Server:Port'),
      sslKey: config.get('Server:SslKey'),
      sslCert: config.get('Server:SslCert'),
      intermedKey: config.get('Server:IntermediateCert'),
    }
    const pid = daemon.status()

    if (pid == 0) {
      daemon.start()
      checkDaemon(daemon, configuration)
    } else {
      logger.silly(`fog-controller already running. PID: ${pid}`)
    }
  }
}

function checkDaemon(daemon, configuration) {
  let iterationsCount = 0
  const check = () => {
    iterationsCount++
    let pid = daemon.status()
    if (pid === 0) {
      return logger.error('Error: port is probably allocated, or ssl_key or ssl_cert or intermediate_cert is either missing or invalid.')
    }

    if (iterationsCount === 5) {
      checkServerProptocol(configuration)
      return logger.silly(`Fog-Controller has started at pid: ${pid}`)
    }

    setTimeout(check, 1000)
  }

  setTimeout(check, 1000)
}

function checkServerProptocol(configuration) {
  const { port, sslKey, sslCert, intermedKey } = configuration
  if (sslKey && sslCert && intermedKey) {
    logger.silly(`==> 🌎 HTTPS server listening on port ${port}. Open up https://localhost:${port}/ in your browser.`)
  } else {
    logger.silly(`==> 🌎 Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
}

module.exports = new Start()