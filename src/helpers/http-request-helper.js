const fs = require('fs')
const https = require('https')
const http = require('http')

const constants = require('../helpers/constants')

function request (options, data, secure) {
  return new Promise((resolve, reject) => {
    const httpreq = (secure ? https : http).request(options, function (response) {
      let output = ''
      response.setEncoding('utf8')

      response.on('data', function (chunk) {
        output += chunk
      })

      response.on('end', function () {
        try {
          const responseObj = JSON.parse(output)
          if (responseObj.errormessage) {
            throw new Error(new Error(responseObj.errormessage))
          }

          return resolve(responseObj)
        } catch (err) {
          reject(err)
        }
      })
    })

    httpreq.on('error', function (err) {
      if (err instanceof Error) {
        return reject(new Error(err.message))
      } else {
        return reject(new Error(JSON.stringify(err)))
      }
    })

    httpreq.write(data)
    httpreq.end()
  })
}

function connectorApiHelper (connector, data, path, method = 'POST') {
  const port = connector.devMode ? constants.CONNECTOR_HTTP_PORT : constants.CONNECTOR_HTTPS_PORT

  const options = {
    host: connector.domain,
    port,
    path,
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  }

  if (!connector.devMode && connector.cert && connector.isSelfSignedCert === true) {
    const ca = fs.readFileSync(connector.cert)
    /* eslint-disable new-cap */
    options.ca = new Buffer.from(ca)
  }

  return request(options, data, !connector.devMode)
}

module.exports = {
  connectorApiHelper
}
