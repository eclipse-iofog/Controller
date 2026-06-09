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

const execSync = require('child_process').execSync

const { setDbEnvVars } = require('./util')

function stop () {
  const options = {
    env: {
      'NODE_ENV': 'production',
      'VIEWER_PORT': '8008',
      'PATH': process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  execSync('node ./src/main.js stop', options)
}

module.exports = {
  stop: stop
}
