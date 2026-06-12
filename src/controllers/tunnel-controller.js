const TunnelService = require('../services/tunnel-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')

const manageTunnelEndPoint = async function (req) {
  const action = req.body.action
  const tunnelData = {
    iofogUuid: req.params.id
  }

  switch (action) {
    case 'open':
      await TunnelService.openTunnel(tunnelData, false)
      break
    case 'close':
      await TunnelService.closeTunnel(tunnelData)
      break
    default:
      throw new Errors.ValidationError(ErrorMessages.INVALID_ACTION_PROPERTY)
  }
}

const getTunnelEndPoint = async function (req) {
  const tunnelData = {
    iofogUuid: req.params.id
  }
  return TunnelService.findTunnel(tunnelData)
}

module.exports = {
  manageTunnelEndPoint,
  getTunnelEndPoint
}
