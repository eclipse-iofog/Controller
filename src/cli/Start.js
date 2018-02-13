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
      console.log('Error: ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.');
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