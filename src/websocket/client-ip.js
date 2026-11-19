'use strict'

const proxyaddr = require('proxy-addr')
const { getTrustProxySetting } = require('../config/trust-proxy')

function normalizeIp (ip) {
  if (ip && ip.startsWith('::ffff:')) return ip.slice(7)
  return ip || 'unknown'
}

function hopCount (trust) {
  if (!trust) return 0
  if (trust === true) return 1
  const hops = Number(trust)
  if (!Number.isInteger(hops) || hops < 1) return 0
  return hops
}

function websocketClientIp (req) {
  const socketIp = req && req.socket && req.socket.remoteAddress
  const hops = hopCount(getTrustProxySetting())
  if (!hops) return normalizeIp(socketIp)
  return normalizeIp(proxyaddr(req, function (address, index) {
    return index < hops
  }))
}

module.exports = {
  websocketClientIp
}
