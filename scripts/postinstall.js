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
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const execSync = require('child_process').execSync;
const fs = require('fs');
const semver = require('semver');
const currentVersion = require('../package').version;

const rootDir = `${__dirname}/..`;
let installationVariablesFileName = 'iofogcontroller_install_variables';
let tempDir = getTempDirLocation();
const installationVariablesFile = tempDir + '/' + installationVariablesFileName;

//restore all files
const devDbBackup = `${tempDir}/dev_database.sqlite`;
const devDb = `${rootDir}/src/sequelize/dev_database.sqlite`;
moveFileIfExists(devDbBackup, devDb);

const prodDbBackup = `${tempDir}/prod_database.sqlite`;
const prodDb = `${rootDir}/src/sequelize/prod_database.sqlite`;
moveFileIfExists(prodDbBackup, prodDb);

const defConfigBackup = `${tempDir}/default_iofog_backup.json`;
const defConfig = `${rootDir}/src/config/default.json`;
moveFileIfExists(defConfigBackup, defConfig);

const prodConfigBackup = `${tempDir}/production_iofog_backup.json`;
const prodConfig = `${rootDir}/src/config/production.json`;
moveFileIfExists(prodConfigBackup, prodConfig);

const devConfigBackup = `${tempDir}/development_iofog_backup.json`;
const devConfig = `${rootDir}/src/config/development.json`;
moveFileIfExists(devConfigBackup, devConfig);

//process migrations
try {
  const installationVarsStr = fs.readFileSync(installationVariablesFile);
  const installationVars = JSON.parse(installationVarsStr);
  const prevVersion = installationVars.prevVer;

  console.log(`previous version - ${prevVersion}`);
  console.log(`new version - ${currentVersion}`);

  if (semver.satisfies(prevVersion, '<=1.0.0')) {
    console.log('upgrading from version <= 1.0.0 :');
    insertSeeds();
  }

  if (semver.satisfies(prevVersion, '<=1.0.30')) {
    console.log('upgrading from version <= 1.0.30 :');
    updateEncryptionMethod();
  }

  fs.unlinkSync(installationVariablesFile);
} catch (e) {
  console.log(e);
}

//init db
const options = {
  env: {
    'NODE_ENV': 'production',
    "PATH": process.env.PATH
  },
  stdio: [process.stdin, process.stdout, process.stderr]
};

execSync('node ./src/main.js init', options);

//other functions definitions

function getTempDirLocation() {
  let tempDir;
  if (os.type() === 'Linux') {
    tempDir = '/tmp';
  } else if (os.type() === 'Darwin') {
    tempDir = '/tmp';
  } else if (os.type() === 'Windows_NT') {
    tempDir = `${process.env.APPDATA}`;
  } else {
    throw new Error("Unsupported OS found: " + os.type());
  }
  return tempDir;
}

function moveFileIfExists(from, to) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
  }
}

function insertSeeds() {
  console.log('    inserting seeds meta info in db');
  const sqlite3ProdDb = new sqlite3.Database(prodDb);
  const seeds = [
    '20180928110125-insert-registry.js',
    '20180928111532-insert-catalog-item.js',
    '20180928112152-insert-iofog-type.js',
    '20180928121334-insert-catalog-item-image.js'
  ];
  sqlite3ProdDb.serialize(function() {
    const stmt = sqlite3ProdDb.prepare("INSERT INTO SequelizeMeta (name) VALUES (?)");
    seeds.map(s => stmt.run(s));
    stmt.finalize();
  });
  sqlite3ProdDb.close();
}

function updateEncryptionMethodForUsersPassword(decryptionFunc) {
  console.log('    updating passwords in db');
  const sqlite3ProdDb = new sqlite3.Database(prodDb);
  sqlite3ProdDb.all('select id, email, password from Users', function(err, rows) {
    const stmt = sqlite3ProdDb.prepare('update Users set password=? where id=?');

    rows.map(user => {
      try {
        const id = user.id;
        const email = user.email;
        const oldEncryptedPassword = user.password;

        const decryptedPassword = decryptionFunc(oldEncryptedPassword, email);
        const AppHelper = require('../src/helpers/app-helper');
        const newEncryptedPassword = AppHelper.encryptText(decryptedPassword, email);

        stmt.run(newEncryptedPassword, id);
      } catch (e) {
        console.log('db problem');
        console.log(e);
      }
    });
    stmt.finalize();
  });
  sqlite3ProdDb.close();
}

function updateEncryptionMethodForEmailService(configFile, decryptionFunc) {
  console.log(configFile);
  if (!configFile) {
    return
  }
  const configObj = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  console.log(configObj);
  if (!configObj || !configObj.Email || !configObj.Email.Address || !configObj.Email.Password) {
    return
  }

  const email = configObj.Email.Address;
  const oldEncryptedPassword = configObj.Email.Password;

  const decryptedPassword = decryptionFunc(oldEncryptedPassword, email);

  const AppHelper = require('../src/helpers/app-helper');
  configObj.Email.Password = AppHelper.encryptText(decryptedPassword, email);

  console.log(configObj);
  try {
    fs.writeFileSync(configFile, JSON.stringify(configObj, null, 2));
  } catch (e) {
    console.log(e)
  }
}

function updateEncryptionMethod() {
  console.log('    updating encryption method for old users');

  function decryptTextVer30(text, salt) {
    const crypto = require('crypto');
    const ALGORITHM = 'aes-256-ctr';

    const decipher = crypto.createDecipher(ALGORITHM, salt);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec
  }

  updateEncryptionMethodForUsersPassword(decryptTextVer30);
  console.log('    updating encryption  for email services in configs');
  updateEncryptionMethodForEmailService(defConfig, decryptTextVer30);
  updateEncryptionMethodForEmailService(devConfig, decryptTextVer30);
  updateEncryptionMethodForEmailService(prodConfig, decryptTextVer30);
}