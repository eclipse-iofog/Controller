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
const fs = require('fs')
const version = require('../package').version
const { backupDBs, backupConfigs, INSTALLATION_VARIABLES_FILE } = require('./util')

function preuninstall () {
  const instalationVars = {
    prevVer: version
  }

  fs.writeFileSync(INSTALLATION_VARIABLES_FILE, JSON.stringify(instalationVars))

  backupDBs()
  backupConfigs()

  const options = {
    stdio: [process.stdin, process.stdout, process.stderr]
  }
  execSync('iofog-controller stop', options)
}

module.exports = {
  preuninstall: preuninstall
}
