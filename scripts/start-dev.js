const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs')
const { setDbEnvVars } = require('./util')

function startDev () {
  // Load .env file if it exists
  const envPath = path.resolve(process.cwd(), '.env')
  const envVars = {}

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=').map(str => str.trim())
        if (key && value) {
          envVars[key] = value
        }
      }
    })
  }

  // Create a new environment object with all variables
  const newEnv = {
    ...process.env, // Include existing environment variables
    ...envVars, // Override with .env variables
    NODE_ENV: 'development',
    PATH: process.env.PATH
  }

  // Apply database environment variables
  const options = {
    env: setDbEnvVars(newEnv),
    stdio: [process.stdin, process.stdout, process.stderr]
  }

  execSync('node ./src/main.js start', options)
}

module.exports = {
  startDev
}
