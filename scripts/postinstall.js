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
const semver = require('semver');
const currentVersion = require('../package').version;

const rootDir = `${__dirname}/../`;
let installationVariablesFileName = 'iofogcontroller_install_variables';
let installationVariablesFile;
let tempDir;

if (os.type() === 'Linux') {
  tempDir = '/tmp/';
} else if (os.type() === 'Darwin') {
  tempDir = '/tmp/';
} else if (os.type() === 'Windows_NT') {
  tempDir = `${process.env.APPDATA}/`;
} else {
  throw new Error("Unsupported OS found: " + os.type());
}

installationVariablesFile = tempDir + installationVariablesFileName;

const devDbBackup = `${tempDir}dev_database.sqlite`;
const devDb = `${rootDir}/src/sequelize/dev_database.sqlite`;
if (fs.existsSync(devDbBackup)) {
  fs.renameSync(devDbBackup, devDb);
}

const prodDbBackup = `${tempDir}prod_database.sqlite`;
const prodDb = `${rootDir}/src/sequelize/prod_database.sqlite`;
if (fs.existsSync(prodDbBackup)) {
  fs.renameSync(prodDbBackup, prodDb);
}

try {
  const instalationVarsStr = fs.readFileSync(installationVariablesFile);
  const instalationVars = JSON.parse(instalationVarsStr);
  const prevVersion = instalationVars.prevVer;

  console.log(`previous version - ${prevVersion}`);
  console.log(`new version - ${currentVersion}`);

  if (semver.satisfies(prevVersion, '<=1.0.0')) {
    console.log('upgrading from version <=1.0.0 :');
    console.log('    inserting seeds meta info in db');
    const options = {
      env: {
        "PATH": process.env.PATH
      },
      stdio: [process.stdin, process.stdout, process.stderr]
    };

    execSync(`sqlite3 ${prodDb} "insert into SequelizeMeta (name) values ('20180928110125-insert-registry.js');"`, options);
    execSync(`sqlite3 ${prodDb} "insert into SequelizeMeta (name) values ('20180928111532-insert-catalog-item.js');"`, options);
    execSync(`sqlite3 ${prodDb} "insert into SequelizeMeta (name) values ('20180928112152-insert-iofog-type.js');"`, options);
    execSync(`sqlite3 ${prodDb} "insert into SequelizeMeta (name) values ('20180928121334-insert-catalog-item-image.js');"`, options);
  }

  fs.unlinkSync(installationVariablesFile);
} catch (e) {
  console.log('no previous version')
}