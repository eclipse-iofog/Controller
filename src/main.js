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

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

const Cli = require('./cli')
const daemon = require('./daemon')

async function main () {
  const cli = new Cli()

  await cli.run(daemon)
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
