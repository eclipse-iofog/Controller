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

const { start } = require('./start')
const { startDev } = require('./start-dev')
const { init } = require('./init')
const { preuninstall } = require('./preuninstall')
const { postinstall } = require('./postinstall')

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
  default:
    console.log('no script for this command')
    break
}
