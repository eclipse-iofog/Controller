const config = require('./config')
const logger = require('./logger')

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const express = require('express')
const fs = require('fs')
const helmet = require('helmet')
const path = require('path')
const { renderFile } = require('ejs')
const xss = require('xss-clean')

const app = express()

app.use(helmet())
app.use(xss())

app.use(bodyParser.urlencoded({
  extended: true,
}))
app.use(bodyParser.json())

app.engine('ejs', renderFile)
app.set('view engine', 'ejs')
app.use(cookieParser())

app.set('views', path.join(__dirname, 'views'))

app.on('uncaughtException', (req, res, route, err) => {
  // TODO
})

app.use((req, res, next) => {
  res.append('X-Timestamp', Date.now())
  next()
})

const registerRoute = (route) => {
  app[route.method.toLowerCase()](route.path, route.middleware)
}

const setupMiddleware = function (routeName) {
  const routes = [].concat(require(path.join(__dirname, 'routes', routeName)) || [])
  routes.forEach(registerRoute)
}

fs.readdirSync(path.join(__dirname, 'routes'))
  .forEach(setupMiddleware)

function startHttpServer(app, port) {
  logger.warn("| SSL not configured, starting HTTP server.|")

  console.log("------------------------------------------")
  console.log("| SSL not configured, starting HTTP server.|")
  console.log("------------------------------------------")

  app.listen(port, function onStart(err) {
    if (err) {
      console.log(err)
    }
    logger.info('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', port, port)
    console.log('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', port, port)
  })
}

function startHttpsServer(app, port, sslKey, sslCert, intermedKey) {
  try {
    let sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: fs.readFileSync(intermedKey),
      requestCert: true,
      rejectUnauthorized: false // currently for some reason iofog agent doesn't work without this option
    }

    https.createServer(sslOptions, app).listen(port, function onStart(err) {
      if (err) {
        logger.error(err)
        console.log(err)
      }
      logger.info('==> 🌎 HTTPS server listening on port %s. Open up https://localhost:%s/ in your browser.', port, port)
      console.log('==> 🌎 HTTPS server listening on port %s. Open up https://localhost:%s/ in your browser.', port, port)
    })
  } catch (e) {
    logger.error('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.')
    console.log('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.')
  }
}

const 
  port = config.get('Server:Port'),
  sslKey = config.get('Server:SslKey'),
  sslCert = config.get('Server:SslCert'),
  intermedKey = config.get('Server:IntermediateCert')

if (sslKey && sslCert && intermedKey) {
  startHttpsServer(app, port, sslKey, sslCert, intermedKey)
} else {
  startHttpServer(app, port)
}
