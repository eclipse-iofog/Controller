#!/usr/bin/env node

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

// Does ECN Viewer need port 80 ?
const requireElevated = process.argv[2] === 'start' && (!process.env.VIEWER_PORT || process.env.VIEWER_PORT === '80')

const isElevated = require('is-elevated')

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

const Cli = require('./cli')
const daemon = require('./daemon')

async function main () {
  const runningAsRoot = await isElevated()
  if (requireElevated && !runningAsRoot) {
    console.error('Run iofog-controller start with administrative privileges.')
    process.exit(1)
  }
  const cli = new Cli()

  await cli.run(daemon)
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
