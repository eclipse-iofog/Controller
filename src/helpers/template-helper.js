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

const MicroservicesController = require('../controllers/microservices-controller')
const FogController = require('../controllers/iofog-controller')

// ninja2 like template engine
const { Liquid } = require('liquidjs')
const templateEngine = new Liquid()

/**
 * Add filter to tempalte engine.
 * Syntaxe  {{ microservice findAgent: iofogs }}
 */
templateEngine.registerFilter('findAgent', (microservice, agents) => {
  let targetAgent = agents.find(agent => agent.uuid === microservice.iofogUuid)
  return targetAgent
})

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

const rvaluesVarSubstitionMiddleware = async (req, res, next) => {
  if (['POST', 'PUT'].indexOf(req.method) > -1) {
    const token = req.headers.authorization
    let msvcEndpoint
    let iofogListEndPoint
    if (token) {
      try {
        msvcEndpoint = await MicroservicesController.getMicroservicesByApplicationEndPoint(req)
        msvcEndpoint = msvcEndpoint.microservices
        iofogListEndPoint = await FogController.getFogListEndPoint(req)
        iofogListEndPoint = iofogListEndPoint.fogs
      } catch (e) {
        // Nothing to do, suppose the token has no permission to access. The is the case of agent
      }
    }
    let tmplContext = {
      self: req.body,
      microservices: msvcEndpoint,
      iofogs: iofogListEndPoint
    }
    rvaluesVarSubstition(req.body, tmplContext)
  }
  next()
}

module.exports = {
  rvaluesVarSubstition,
  rvaluesVarSubstitionMiddleware
}
