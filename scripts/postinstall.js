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

// const sqlite3 = require('sqlite3') // .verbose() //use verbose in dev to get stack traces
const execSync = require('child_process').execSync
const fs = require('fs')
const compareVersions = require('compare-versions')

const config = require('../src/config')
const currentVersion = require('../package').version
const { restoreDBs, restoreConfigs, INSTALLATION_VARIABLES_FILE, setDbEnvVars } = require('./util')

function postinstall () {
// restore all files
  restoreDBs()
  restoreConfigs()

  // process migrations
  try {
    const installationVarsStr = fs.readFileSync(INSTALLATION_VARIABLES_FILE) // Always throws currently
    const installationVars = JSON.parse(installationVarsStr)
    const prevVersion = installationVars.prevVer

    console.log(`previous version - ${prevVersion}`)
    console.log(`new version - ${currentVersion}`)

    if (compareVersions(prevVersion, '<=1.0.0')) {
      console.log('upgrading from version <= 1.0.0 :')
      insertSeeds()
    }

    if (compareVersions(prevVersion, '<=1.0.30')) {
      console.log('upgrading from version <= 1.0.30 :')
      updateEncryptionMethod()
    }
    if (compareVersions(prevVersion, '<=1.0.37')) {
      console.log('upgrading from version <= 1.0.37 :')
      updateLogName()
    }

    fs.unlinkSync(INSTALLATION_VARIABLES_FILE)
  } catch (e) {
    console.log('no previous version')
  }

  // init db
  const options = {
    env: {
      NODE_ENV: 'production',
      PATH: process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  execSync('node ./src/main.js init', options)
}
// other functions definitions

function insertSeeds () {
  // Never called
  // console.log('    inserting seeds meta info in db')
  // const sqlite3ProdDb = new sqlite3.Database(prodDb)
  // const seeds = [
  //   '20180928110125-insert-registry.js',
  //   '20180928111532-insert-catalog-item.js',
  //   '20180928112152-insert-iofog-type.js',
  //   '20180928121334-insert-catalog-item-image.js'
  // ]
  // sqlite3ProdDb.serialize(function () {
  //   const stmt = sqlite3ProdDb.prepare('INSERT INTO SequelizeMeta (name) VALUES (?)')
  //   seeds.map((s) => stmt.run(s))
  //   stmt.finalize()
  // })
  // sqlite3ProdDb.close()
}

// Never called - prodDB undefined
// function updateEncryptionMethodForUsersPassword (decryptionFunc) {
// console.log('    updating encryption in DB')
// const sqlite3ProdDb = new sqlite3.Database(prodDb)
// sqlite3ProdDb.all('select id, email, password from Users', function (err, rows) {
//   if (err) {
//     return
//   }
//   const stmt = sqlite3ProdDb.prepare('update Users set password=? where id=?')

//   rows.map((user) => {
//     try {
//       const id = user.id
//       const email = user.email
//       const oldEncryptedPassword = user.password

//       const decryptedPassword = decryptionFunc(oldEncryptedPassword, email)
//       const AppHelper = require('../src/helpers/app-helper')
//       const newEncryptedPassword = AppHelper.encryptText(decryptedPassword, email)

//       stmt.run(newEncryptedPassword, id)
//     } catch (e) {
//       console.log('db problem')
//       console.log(e)
//     }
//   })
//   stmt.finalize()
// })
// sqlite3ProdDb.close()
// }

// Never called
// function updateEncryptionMethodForEmailService (configFile, decryptionFunc) {
//   console.log(configFile)
//   if (!configFile) {
//     return
//   }
//   const configObj = JSON.parse(fs.readFileSync(configFile, 'utf8'))
//   console.log(configObj)
//   if (!configObj || !configObj.Email || !configObj.Email.Address || !configObj.Email.Password) {
//     return
//   }

//   const email = configObj.Email.Address
//   const oldEncryptedPassword = configObj.Email.Password

//   const decryptedPassword = decryptionFunc(oldEncryptedPassword, email)

//   const AppHelper = require('../src/helpers/app-helper')
//   configObj.Email.Password = AppHelper.encryptText(decryptedPassword, email)

//   console.log(configObj)
//   try {
//     fs.writeFileSync(configFile, JSON.stringify(configObj, null, 2))
//   } catch (e) {
//     console.log(e)
//   }
// }

function updateEncryptionMethod () {
  // Never called - defConfig, devConfig, prodConfig undefined
  // console.log('    updating encryption method for old users')

  // function decryptTextVer30 (text, salt) {
  //   const crypto = require('crypto')
  //   const ALGORITHM = 'aes-256-ctr'

  //   const decipher = crypto.createDecipheriv(ALGORITHM, salt, null)
  //   let dec = decipher.update(text, 'hex', 'utf8')
  //   dec += decipher.final('utf8')
  //   return dec
  // }

  // updateEncryptionMethodForUsersPassword(decryptTextVer30)
  // console.log('    updating encryption  for email services in configs')
  // updateEncryptionMethodForEmailService(defConfig, decryptTextVer30)
  // updateEncryptionMethodForEmailService(devConfig, decryptTextVer30)
  // updateEncryptionMethodForEmailService(prodConfig, decryptTextVer30)
}

function updateLogName () {
  console.log('    updating log name in ')
  const dirname = config.get('log.directory')

  if (fs.existsSync(dirname)) {
    fs.readdirSync(dirname).forEach((file) => {
      const path = dirname + '/' + file
      if (fs.existsSync(path)) {
        fs.unlinkSync(path, function (err) {
          if (err) return console.log(err)
          console.log('log deleted successfully')
        })
      }
    })
  }
}

module.exports = {
  postinstall
}
