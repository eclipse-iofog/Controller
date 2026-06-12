const execSync = require('child_process').execSync

const { setDbEnvVars } = require('./util')

function coverage () {
  const options = {
    env: {
      NODE_ENV: 'test',
      PATH: process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  execSync('nyc mocha "test/src/**/*.js"', options)
}

module.exports = {
  coverage
}
