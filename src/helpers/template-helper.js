/*
 * Software Name : eclipse-iofog/Controller
 * Version: 2.0.x
 * SPDX-FileCopyrightText: Copyright (c) 2020-2020 Orange
 * SPDX-License-Identifier: EPL-2.0
 *
 * This software is distributed under the <license-name>,
 * the text of which is available at http://www.eclipse.org/legal/epl-2.0
 * or see the "license.txt" file for more details.
 *
 * Author: Franck Roudet
 */

const ApplicationController = require('../controllers/application-controller')
const logger = require('../logger')

// ninja2 like template engine
const { Liquid } = require('liquidjs')
const templateEngine = new Liquid()

/**
  * Object in depth traversal and right value templateEngine rendering
  * @param {*} subjects
  * @param {*} templateContext
  */
const rvaluesVarSubstition = async (subjects, templateContext) => {
  Object.keys(subjects).forEach((key) => {
    if (typeof subjects[key] === 'object') {
      rvaluesVarSubstition(subjects[key], templateContext)
    } else if (typeof subjects[key] === 'string') {
      subjects[key] = templateEngine.parseAndRenderSync(subjects[key], templateContext)
    }
  })
  return subjects
}

function addLazyProperty (object, name, initializer, enumerable) {
  Object.defineProperty(object, name, {
    get: function () {
      let v = initializer.call(this)
      logger.warn('getter====== %j %s', v, typeof (v))
      Object.defineProperty(this, name, { value: v, enumerable: !!enumerable, writable: true })
      return v
    },
    set: function (v) {
      Object.defineProperty(this, name, { value: v, enumerable: !!enumerable, writable: true })
      return v
    },
    enumerable: !!enumerable,
    configurable: true
  })
}

function createResolvedThenable (value) {
  const ret = {
    then: (resolve) => resolve(value),
    catch: () => ret
  }
  return ret
}

function toValue (val) {
  let ret
  val
    .then((x) => {
      ret = x.applications
      logger.warn('toValue ===== %j', ret)
      return createResolvedThenable(ret)
    })
    .catch((err) => {
      throw err
    })
  return ret
}

const rvaluesVarSubstitionMiddleware = async (req, res, next) => {
  if (['POST', 'PUT'].indexOf(req.method) > -1) {
    const token = req.headers.authorization
    let appEndpoint
    if (token) {
      appEndpoint = await ApplicationController.getApplicationsByUserEndPoint(req)
      appEndpoint = appEndpoint.applications
    }
    let tmplContext = {
      self: req.body,
      applications: appEndpoint
    }
    rvaluesVarSubstition(req.body, tmplContext)
  }
  next()
}

const rvaluesVarSubstitionMiddlewareLazy = async (req, res, next) => {
  if (['POST', 'PUT'].indexOf(req.method) > -1) {
    const token = req.headers.authorization
    let tmplContext = { self: req.body }
    if (token) {
      addLazyProperty(tmplContext, 'applications', () => { // pas async
        logger.warn('application called ============')
        const responseObject = ApplicationController.getApplicationsByUserEndPoint(req)
        let res = toValue(responseObject)
        logger.warn('responseObject ===== %j', responseObject)
        logger.warn('res ===== %j', res)
        return res

        // const responseObject = { applications : [1, true, 'toto']}
        // logger.warn('responseObject ===============> %j', responseObject)
        // return responseObject.applications
        /*
        return (async() => {
          try {
            const responseObject = await ApplicationController.getApplicationsByUserEndPoint(req)
            logger.warn('responseObject ===============> %j', responseObject)
            return responseObject.applications
          } catch (e) {
            logger.error(e)
            return 'KC'
          }
        })(req)
        */
      })
    } else {
      tmplContext.application = {}
    }
    rvaluesVarSubstition(req.body, tmplContext)
  }
  next()
}

module.exports = {
  rvaluesVarSubstition,
  rvaluesVarSubstitionMiddleware
}
