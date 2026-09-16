const constants = require('../helpers/constants')
const MicroserviceTemplateController = require('../controllers/microservice-template-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const rbacMiddleware = require('../lib/rbac/middleware')

const unauthorized = {
  code: constants.HTTP_CODE_UNAUTHORIZED,
  errors: [Errors.AuthenticationError]
}

const notFound = {
  code: constants.HTTP_CODE_NOT_FOUND,
  errors: [Errors.NotFoundError]
}

const badRequest = {
  code: constants.HTTP_CODE_BAD_REQUEST,
  errors: [Errors.ValidationError]
}

const conflict = {
  code: constants.HTTP_CODE_CONFLICT,
  errors: [Errors.ConflictError]
}

function preferredUsername (req) {
  return req.kauth && req.kauth.grant && req.kauth.grant.access_token
    ? req.kauth.grant.access_token.content.preferred_username
    : 'system'
}

async function sendHandled (req, res, handler, successCode, errorCodes) {
  const endpoint = ResponseDecorator.handleErrors(handler, successCode, errorCodes)
  const responseObject = await endpoint(req)
  const user = preferredUsername(req)
  res
    .status(responseObject.code)
    .send(responseObject.body)
  logger.apiRes({ req, user, res, responseObject })
}

module.exports = [
  {
    method: 'get',
    path: '/api/v3/microserviceTemplates',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.listMicroserviceTemplatesEndpoint, constants.HTTP_CODE_SUCCESS, [unauthorized])
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/microserviceTemplates/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.getMicroserviceTemplateEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound
        ])
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/microserviceTemplates/:name',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.updateMicroserviceTemplateEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest
        ])
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/microserviceTemplates/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.deleteMicroserviceTemplateEndpoint, constants.HTTP_CODE_ACCEPTED, [
          unauthorized,
          notFound
        ])
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/microserviceTemplates',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.createMicroserviceTemplateEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/microserviceTemplates/yaml',
    fileInput: 'template',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.createMicroserviceTemplateYamlEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'put',
    path: '/api/v3/microserviceTemplates/yaml/:name',
    fileInput: 'template',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, MicroserviceTemplateController.upsertMicroserviceTemplateYamlEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest,
          conflict
        ])
      })
    }
  }
]
