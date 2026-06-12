const logger = require('../logger')
const config = require('../config')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'head',
    path: '/api/v3/capabilities/applicationTemplates',
    middleware: async (req, res) => {
      logger.apiReq(req)

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        res.sendStatus(204)
      })
    }
  },
  {
    method: 'head',
    path: '/api/v3/capabilities/nats',
    middleware: async (req, res) => {
      logger.apiReq(req)

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        if (config.get('nats.enabled')) {
          res.sendStatus(204)
          return
        }
        res.sendStatus(404)
      })
    }
  }
]
