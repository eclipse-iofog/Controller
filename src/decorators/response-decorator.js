const logger = require('../logger')
const { isTest } = require('../helpers/app-helper')

function handleErrors (f, successCode, errorsCodes) {
  return async function (...args) {
    if (isTest()) {
      return f.apply(this, args)
    }

    let responseObject = {}
    try {
      const responseBody = await f.apply(this, args)
      responseObject = { code: successCode, body: responseBody }
    } catch (err) {
      logger.error('error: ' + err)

      // checking is err just string or Error object and wrapping it by new obj
      let errorObj = {}
      if (!err.message) {
        errorObj.message = err
      } else {
        errorObj = err
      }

      let code
      if (errorsCodes) {
        errorsCodes.some((errCodeDescr) => {
          const isCurrentCode = errCodeDescr.errors.some((err) => {
            return errorObj instanceof err
          })
          if (isCurrentCode) {
            code = errCodeDescr.code
            return true
          }
          return false
        })
      }
      code = code || 500

      responseObject = {
        code,
        body: {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack
        }
      }
      if (code !== 500) {
        delete responseObject.body.stack
      }
    }

    return responseObject
  }
}

module.exports = {
  handleErrors
}
