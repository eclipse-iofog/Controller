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

const os = require('os');
const execSync = require('child_process').execSync;
const fs = require('fs');
const version = require('../package').version;

const rootDir = `${__dirname}/../`;
let installation_variables_file_name = 'iofogcontroller_install_variables';
let installation_variables_file;
let tempDir;

if (os.type() === 'Linux') {
  tempDir = '/tmp/';
} else if (os.type() === 'Darwin') {
  tempDir = '/tmp/';
} else if (os.type() === 'Windows_NT') {
  tempDir = process.env.APPDATA;
} else {
  throw new Error("Unsupported OS found: " + os.type());
}

installation_variables_file = tempDir + installation_variables_file_name;

fs.writeFileSync(installation_variables_file, `prev_ver: ${version}`);

const devDb = `${rootDir}/src/sequelize/dev_database.sqlite`;
if (fs.existsSync(devDb)) {
  fs.renameSync(devDb, `${tempDir}dev_database.sqlite`)
}

const prodDb = `${rootDir}/src/sequelize/prod_database.sqlite`;
if (fs.existsSync(prodDb)) {
  fs.renameSync(prodDb, `${tempDir}prod_database.sqlite`)
}

