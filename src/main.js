#!/usr/bin/env node

/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const Cli = require('./cli')
const daemon = require('./daemon')
const config = require('./config')
const isElevated = require('is-elevated')
const request = require('request-promise')

const isHTTPS = () => {
  const sslKey = config.get('Server:SslKey', '')
  const devMode = config.get('Server:DevMode', false)
  const sslCert = config.get('Server:SslCert', '')
  const intermedKey = config.get('Server:IntermediateCert', '')
  return !devMode && sslKey && sslCert && intermedKey
}

const getJSONFromURL = async (uri) => request({
  uri,
  json: true
})

const apiPort = +(config.get('Server:Port', 51121))
const viewerPort = +(process.env.VIEWER_PORT || config.get('Viewer:Port', 80))

const isDaemonElevated = async () => {
  // If it is running and you can see it, you have enough permission to move forward
  if (daemon.status() !== 0) {
    return false
  }
  const protocol = isHTTPS() ? 'https' : 'http'
  return getJSONFromURL(`${protocol}://localhost:${apiPort}/api/v3/status`)
    .then(result => {
      // The server is running but you couldn't see it, requires administrative privileges
      if (result.status === 'online') {
        return true
      }
      // The server is not running
      return false
    })
    .catch((err) => {
      // If error is connection refused, server is not running
      if (err.error && err.error.code === 'ECONNREFUSED') { return false }
      // If error, defaults to requiring administrative privileges
      return true
    })
}
const elevatedCommands = ['start', 'stop', 'controller status']
const requiresElevated = async (command, runningAsRoot) => {
  // Does ECN Viewer need port 80 ?
  if (process.argv[2] === 'start' && (viewerPort < 1024 || apiPort < 1024)) {
    if (!runningAsRoot) {
      let message = 'Due to'
      if (viewerPort < 1024) {
        message += ` ECN Viewer requiring TCP port ${viewerPort},`
      }
      if (apiPort < 1024) {
        message += ` iofog-controller REST API requiring TCP port ${apiPort},`
      }
      message += ' please run iofog-controller start with administrative privileges.'
      console.error(message)
    }
    return true
  }
  if (await isDaemonElevated() && elevatedCommands.includes(command)) {
    if (!runningAsRoot) { console.error(`Due to iofog-controller deamon running with administrative privileges, please run iofog-controller ${command} with administrative privileges.`) }
    return true
  }
  return false
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

async function main () {
  const runningAsRoot = await isElevated()
  const command = process.argv.slice(2).join(' ')
  if (await requiresElevated(command, runningAsRoot) && !runningAsRoot) {
    process.exit(1)
  }
  const cli = new Cli()

  await cli.run(daemon)
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
