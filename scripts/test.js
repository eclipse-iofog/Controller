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
const path = require('path')

const { setDbEnvVars } = require('./util')

function test (useReporter, extraArgs) {
  const options = {
    env: {
      'NODE_ENV': 'test',
      'VIEWER_PORT': '8008',
      'PATH': process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  const mochaBin = path.join(__dirname, '..', 'node_modules', 'mocha', 'bin', 'mocha')
  const mochaReporterOptions = '--reporter mocha-junit-reporter --reporter-options mochaFile=./unit-results.xml'
  let mochaCmd = useReporter ? [mochaBin, mochaReporterOptions].join(' ') : mochaBin
  if (extraArgs && extraArgs.length) {
    mochaCmd += ' ' + extraArgs.map(a => (a.includes(' ') ? `"${a}"` : a)).join(' ')
    execSync(`node "${mochaBin}" ${mochaCmd.slice(mochaBin.length).trim()}`, options)
  } else {
    execSync(mochaCmd, options)
  }
}

module.exports = {
  test: test
}
