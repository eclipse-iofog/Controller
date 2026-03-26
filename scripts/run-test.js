/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const { test } = require('./test')
const { cliTest } = require('./cli-tests')
const { coverage } = require('./coverage')
const { postmanTest } = require('./postmantest')

switch (process.argv[2]) {
  case 'test': {
    const useReporter = process.argv[3] === 'junit'
    const extraArgs = process.argv.slice(useReporter ? 4 : 3).filter(Boolean)
    test(useReporter, extraArgs)
    cliTest()
    break
  }
  case 'cli-tests':
    cliTest()
    break
  case 'coverage':
    coverage()
    break
  case 'postmantest':
    postmanTest()
    break
  default:
    console.log('no script for this command')
    break
}
