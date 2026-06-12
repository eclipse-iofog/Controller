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
  preuninstall
}
