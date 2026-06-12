const execSync = require('child_process').execSync

const { setDbEnvVars } = require('./util')

function start () {
  const options = {
    env: {
      NODE_ENV: 'production',
      CONSOLE_PORT: '8008',
      PATH: process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  if (process.env.CONSOLE_PORT) {
    options.env.CONSOLE_PORT = process.env.CONSOLE_PORT
  }

  execSync('node ./src/main.js start', options)
}

module.exports = {
  start
}
