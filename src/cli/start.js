const BaseCLIHandler = require('./base-cli-handler')
const config = require('../config')

class Start extends BaseCLIHandler {
  run(daemon) {
    const configuration = {
      port: config.get('Server:Port'),
      sslKey: config.get('Server:SslKey'),
      sslCert: config.get('Server:SslCert'),
      intermedKey: config.get('Server:IntermediateCert'),
    }
    const pid = daemon.status()

    if (pid == 0) {
      daemon.start()
      checkDaemon(daemon, configuration)
    } else {
      console.log(`fog-controller already running. PID: ${pid}`)
    }
  }
}

function checkDaemon(daemon, configuration) {
  let iterationsCount = 0
  const check = () => {
    iterationsCount++
    let pid = daemon.status()
    if (pid === 0) {
      return console.log('Error: port is probably allocated, or ssl_key or ssl_cert or intermediate_cert is either missing or invalid.')
    }

    if (iterationsCount === 5) {
      checkServerProptocol(configuration)
      return console.log(`Fog-Controller has started at pid: ${pid}`)
    }

    setTimeout(check, 1000)
  }

  setTimeout(check, 1000)
}

function checkServerProptocol(configuration) {
  const { port, sslKey, sslCert, intermedKey } = configuration
  if (sslKey && sslCert && intermedKey) {
    console.log(`==> 🌎 HTTPS server listening on port ${port}. Open up https://localhost:${port}/ in your browser.`)
  } else {
    console.log(`==> 🌎 Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
}

module.exports = new Start()