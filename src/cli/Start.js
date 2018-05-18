/*
 * *******************************************************************************
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

const defaultConfig = require('../config.json');
import constants from '../server/constants';

import ConfigUtil from '../server/utils/configUtil';

class Start {
  static run = (daemon) => {
    ConfigUtil.getAllConfigs().then(() => {
      let configuration = {
        dbPort: ConfigUtil.getConfigParam(constants.CONFIG.port) || defaultConfig.port,
        sslKey: ConfigUtil.getConfigParam(constants.CONFIG.ssl_key),
        sslCert: ConfigUtil.getConfigParam(constants.CONFIG.ssl_cert),
        intermedKey: ConfigUtil.getConfigParam(constants.CONFIG.intermediate_cert)
      };

      startDaemon(daemon, configuration);
    });
  }
}

function startDaemon(daemon, configuration) {
  let pid = daemon.status();
  if (pid == 0) {
    daemon.start();
    checkDaemon(daemon, configuration);
  } else {
    console.log(`fog-controller already running. PID: ${pid}`);
  }
}

function checkDaemon(daemon, configuration) {
  let iterationsCount = 0;
  let intervalId = setInterval(() => {
    iterationsCount++;
    let pid = daemon.status();
    if (pid === 0) {
        console.log('Error: port is probably allocated, or ssl_key or ssl_cert or intermediate_cert is either missing or invalid.');
      clearInterval(intervalId);
    } else if (iterationsCount == 5) {
      checkServerProptocol(configuration);
      console.log(`Fog-Controller has started at pid: ${pid}`);
      clearInterval(intervalId);
    }
  }, 1000);
}

function checkServerProptocol(configuration) {
  const {dbPort, sslKey, sslCert, intermedKey} = configuration;
  if (sslKey && sslCert && intermedKey) {
    console.log(`==> 🌎 HTTPS server listening on port ${dbPort}. Open up https://localhost:${dbPort}/ in your browser.`);
  } else {
    console.log(`==> 🌎 Listening on port ${dbPort}. Open up http://localhost:${dbPort}/ in your browser.`);
  }
}

exports.Start = Start;