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

function stop () {
  const options = {
    env: {
      'NODE_ENV': 'production',
      'PATH': process.env.PATH,
      'DB_USERNAME': process.env.DB_USERNAME,
      'DB_PASSWORD': process.env.DB_PASSWORD,
      'DB_PROVIDER': process.env.DB_PROVIDER,
      'DB_HOST': process.env.DB_HOST,
      'DB_PORT': process.env.DB_PORT
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  execSync('node ./src/main.js stop', options)
}

module.exports = {
  stop: stop
}
