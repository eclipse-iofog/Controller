const axios = require('axios')

const controllerConfig = require('../config')

const brokerUrl = process.env.PROXY_BROKER_URL || controllerConfig.get('PublicPorts:ProxyBrokerUrl', '')
const brokerToken = process.env.PROXY_BROKER_TOKEN || controllerConfig.get('PublicPorts:ProxyBrokerToken', '')

function allocatePort (serverToken) {
  var options = {
    method: 'POST',
    url: `${brokerUrl}/port`,
    headers: { 'X-Api-Key': brokerToken },
    data: { token: serverToken }
  }

  return axios(options)
    .then(response => {
      return response.data
    })
    .catch(err => {
      return err
    })
}

function deallocatePort (portUUID) {
  var options = {
    method: 'DELETE',
    url: `${brokerUrl}/port/${portUUID}`,
    headers: { 'X-Api-Key': brokerToken }
  }

  return axios(options)
}

function revokeServerToken (token) {
  var options = {
    method: 'DELETE',
    url: `${brokerUrl}/server-token/${token}`,
    headers: { 'X-Api-Key': brokerToken }
  }

  return axios(options)
}

module.exports = {
  allocatePort: allocatePort,
  deallocatePort: deallocatePort,
  revokeServerToken: revokeServerToken
}
