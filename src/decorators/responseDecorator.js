/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
const logger = require('../logger');

function handleErrors(f, successCode, errorsCodes) {
  return async function() {

    let responseObject = {};
    try {
      const responseBody = await f.apply(this, arguments);
      responseObject = {code: successCode, body: responseBody}
    } catch (err) {
      logger.error('error: ' + err);

      //checking is err just string or Error object and wrapping it by new obj
      let errorObj = {};
      if (!err.message) {
        errorObj.message = err;
      } else {
        errorObj = err;
      }

      let code;
      if (errorsCodes) {
        errorsCodes.some((errCodeDescr) => {
          const isCurrentCode = errCodeDescr.errors.some((err) => {
            if (errorObj instanceof err) {
              return true;
            }
          });
          if (isCurrentCode) {
            code = errCodeDescr.code;
            return true;
          }
        });
      }
      code = code ? code : 500;

      responseObject = {
        code: code,
        body: {
          name: errorObj.name,
          message: errorObj.message,
          stack: code === 500 ? errorObj.stack : null
        }
      }
    }

    return responseObject;
  }
}

module.exports = {
  handleErrors: handleErrors
};