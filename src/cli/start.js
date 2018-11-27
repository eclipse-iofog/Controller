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

const BaseCLIHandler = require('./base-cli-handler');
const config = require('../config');
const logger = require('../logger');
const db = require('../sequelize/models');

class Start extends BaseCLIHandler {
  async run(args) {
    const daemon = args.daemon;
    const configuration = {
      devMode: config.get('Server:DevMode'),
      port: config.get('Server:Port'),
      sslKey: config.get('Server:SslKey'),
      sslCert: config.get('Server:SslCert'),
      intermedKey: config.get('Server:IntermediateCert'),
    };
    const pid = daemon.status();

    if (pid === 0) {
      this.initDB();
      daemon.start();
      checkDaemon(daemon, configuration)
    } else {
      logger.silly(`iofog-controller already running. PID: ${pid}`)
    }
  }

  async initDB() {
    try {
      await db.migrate();
      await db.seed();
    } catch (err) {
      logger.silly('Unable to initialize the database.', err);
      process.exit(1)
    }
  }
}

function checkDaemon(daemon, configuration) {
  let iterationsCount = 0;
  const check = () => {
    iterationsCount++;
    let pid = daemon.status();
    if (pid === 0) {
      return logger.error('Error: port is probably allocated, or ssl_key or ssl_cert or intermediate_cert is either missing or invalid.')
    }

    if (iterationsCount === 5) {
      checkServerProtocol(configuration);
      return logger.silly(`ioFog-Controller has started at pid: ${pid}`)
    }

    setTimeout(check, 1000)
  };

  setTimeout(check, 1000)
}

function checkServerProtocol(configuration) {
  const { devMode, port, sslKey, sslCert, intermedKey } = configuration;
  if (!devMode && sslKey && sslCert && intermedKey) {
    logger.silly(`==> 🌎 HTTPS server listening on port ${port}. Open up https://localhost:${port}/ in your browser.`)
  } else {
    logger.silly(`==> 🌎 Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
}

module.exports = new Start();