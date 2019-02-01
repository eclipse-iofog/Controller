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

const execSync = require('child_process').execSync;

function startDev() {
  const options = {
    env: {
      'NODE_ENV': 'development',
      "PATH": process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  };

  execSync('node ./src/main.js start', options);
}

module.exports = {
  startDev: startDev
};