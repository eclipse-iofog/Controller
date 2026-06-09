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
const fs = require('fs')
const { setDbEnvVars } = require('./util')

function startDev () {
  // Load .env file if it exists
  const envPath = path.resolve(process.cwd(), '.env')
  let envVars = {}

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=').map(str => str.trim())
        if (key && value) {
          envVars[key] = value
        }
      }
    })
  } else {
  }

  // Create a new environment object with all variables
  const newEnv = {
    ...process.env, // Include existing environment variables
    ...envVars, // Override with .env variables
    'NODE_ENV': 'development',
    'PATH': process.env.PATH
  }

  // Apply database environment variables
  const options = {
    env: setDbEnvVars(newEnv),
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  execSync('node ./src/main.js start', options)
}

module.exports = {
  startDev: startDev
}
