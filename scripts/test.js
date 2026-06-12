const execSync = require('child_process').execSync

const { setDbEnvVars } = require('./util')

function test (useReporter, extraArgs) {
  const options = {
    env: {
      NODE_ENV: 'test',
      CONSOLE_PORT: '8008',
      PATH: process.env.PATH
    },
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  options.env = setDbEnvVars(options.env)

  const mochaBin = require.resolve('mocha/bin/mocha.js')
  const mochaReporterOptions = '--reporter mocha-junit-reporter --reporter-options mochaFile=./unit-results.xml'
  if (useReporter) {
    execSync(`node "${mochaBin}" ${mochaReporterOptions} "test/src/**/*.js"`, options)
  } else if (extraArgs && extraArgs.length) {
    const args = extraArgs.map(a => (a.includes(' ') ? `"${a}"` : a)).join(' ')
    execSync(`node "${mochaBin}" ${args}`, options)
  } else {
    execSync(`node "${mochaBin}" "test/src/**/*.js"`, options)
  }
}

module.exports = {
  test
}
