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

const {start} = require('./start')
const {startDev} = require('./start-dev')
const {init} = require('./init')
const {preuninstall} = require('./preuninstall')
const {postinstall} = require('./postinstall')
const {test} = require('./test')
const {cliTest} = require('./cli-tests')
const {postmanTest} = require('./postmantest')
const {coverage} = require('./coverage')

switch (process.argv[2]) {
  case 'start':
    start()
    break
  case 'start-dev':
    startDev()
    break
  case 'init':
    init()
    break
  case 'preuninstall':
    preuninstall()
    break
  case 'postinstall':
    postinstall()
    break
  case 'test':
    test()
    cliTest()
    break
  case 'postmantest':
    postmanTest()
    break
  case 'cli-tests':
    cliTest()
    break
  case 'coverage':
    coverage()
    break
  default:
    console.log('no script for this command')
    break
}
