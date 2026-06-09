/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
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
            if (errorObj instanceof err) {
              return true
            }
          })
          if (isCurrentCode) {
            code = errCodeDescr.code
            return true
          }
        })
      }
      code = code || 500

      responseObject = {
        code: code,
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
  handleErrors: handleErrors
}
