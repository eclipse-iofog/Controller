const execSync = require('child_process').execSync

const { setDbEnvVars } = require('./util')

function init () {
  const options = {
    env: {
      NODE_ENV: 'production',
      CONSOLE_PORT: '8008',
      PATH: process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  execSync('node ./src/main.js init', options)
}

module.exports = {
  init
}
