const constants = require('../helpers/constants')
const Controller = require('../controllers/controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/status',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = []
      const statusControllerEndPoint = ResponseDecorator.handleErrors(Controller.statusControllerEndPoint, successCode, errorCodes)
      const responseObject = await statusControllerEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req, res, responseObject })
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
