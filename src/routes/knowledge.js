const constants = require('../helpers/constants')
const KnowledgeController = require('../controllers/knowledge-controller')
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
    path: '/api/v3/knowledge',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.listKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [unauthorized])
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/knowledge/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.getKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound
        ])
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/knowledge/:name',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.updateKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest
        ])
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/knowledge/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.deleteKnowledgeEndpoint, constants.HTTP_CODE_ACCEPTED, [
          unauthorized,
          notFound,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/knowledge',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.createKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/knowledge/yaml',
    fileInput: 'knowledge',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.createKnowledgeYamlEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'put',
    path: '/api/v3/knowledge/yaml/:name',
    fileInput: 'knowledge',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.upsertKnowledgeYamlEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest,
          conflict
        ])
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/knowledge/:name/link',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.getKnowledgeLinkEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest
        ])
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/knowledge/:name/link',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.linkKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest
        ])
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/knowledge/:name/link',
    middleware: async (req, res) => {
      logger.apiReq(req)
      await rbacMiddleware.protect()(req, res, async () => {
        await sendHandled(req, res, KnowledgeController.unlinkKnowledgeEndpoint, constants.HTTP_CODE_SUCCESS, [
          unauthorized,
          notFound,
          badRequest,
          conflict
        ])
      })
    }
  }
]
