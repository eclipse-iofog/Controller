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

const execSync = require('child_process').execSync

function start () {
  const options = {
    env: {
      'NODE_ENV': 'production',
      'PATH': process.env.PATH,
      'DB_USERNAME': 'admin',
      'DB_PASSWORD': 'gg3m53vw5a',
      'DB_PROVIDER': 'postgres',
      'DB_HOST': '34.94.12.14',
      'DB_PORT': 30000
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  execSync('node ./src/main.js start', options)
}

module.exports = {
  start: start
}
