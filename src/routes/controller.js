const constants = require('../helpers/constants')
const Controller = require('../controllers/controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/live',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = []
      const liveControllerEndPoint = ResponseDecorator.handleErrors(Controller.liveControllerEndPoint, successCode, errorCodes)
      const responseObject = await liveControllerEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req, res, responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/status',
    middleware: async (req, res) => {
      logger.apiReq(req)

      try {
        const responseBody = await Controller.statusControllerEndPoint(req)
        res
          .status(constants.HTTP_CODE_SUCCESS)
          .send(responseBody)
        logger.apiRes({
          req,
          res,
          responseObject: { code: constants.HTTP_CODE_SUCCESS, body: responseBody }
        })
      } catch (error) {
        if (error instanceof Errors.ReadinessNotReadyError) {
          res.set('Retry-After', String(constants.READINESS_RETRY_AFTER_SECONDS))
          const responseBody = error.toResponseBody()
          res
            .status(constants.HTTP_CODE_SERVICE_UNAVAILABLE)
            .send(responseBody)
          logger.apiRes({
            req,
            res,
            responseObject: {
              code: constants.HTTP_CODE_SERVICE_UNAVAILABLE,
              body: responseBody
            }
          })
          return
        }

        logger.error('readiness status failed: ' + error.message)
        res
          .status(constants.HTTP_CODE_INTERNAL_ERROR)
          .send({
            name: 'InternalServerError',
            message: error.message
          })
      }
    }
  },
  {
    method: 'get',
    path: '/api/v3/architectures/',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = []
      const architecturesEndPoint = ResponseDecorator.handleErrors(Controller.architecturesEndPoint, successCode, errorCodes)
      const responseObject = await architecturesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req, res, responseObject })
    }
  }
]
