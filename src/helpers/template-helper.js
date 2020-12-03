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
const UserManager = require('../data/managers/user-manager')
const MicroservicesService = require('../services/microservices-service')
const FogService = require('../services/iofog-service')
const qs = require('qs')
const EdgeResourceService = require('../services/edge-resource-service')
const logger = require('../logger')

// ninja2 like template engine
const { Liquid } = require('liquidjs')
const templateEngine = new Liquid()

/**
 * Add filter findAgent to tempalte engine.
 * Syntaxe  {{ microservice findAgent: iofogs }}
 */
templateEngine.registerFilter('findAgent', (microservice, agents) => {
  const targetAgent = agents ? agents.find(agent => agent.uuid === microservice.iofogUuid) : undefined
  return targetAgent
})

function findEdgeResourcehandler (name, version) {
  const result = this.context.environments._user ? EdgeResourceService.getEdgeResource({ name, version }, this.context.environments._user) : Promise.resolve(undefined)
  return result
}

/**
 * Add filter findEdgeRessource to template engine.
 * user is in liquid context _user
 * Syntaxe  {{ name findEdgeRessource: version }}
 */
templateEngine.registerFilter('findEdgeResource', findEdgeResourcehandler)

/**
  * Object in depth traversal and right value templateEngine rendering
  * @param {*} subjects
  * @param {*} templateContext
  */
const rvaluesVarSubstition = async (subjects, templateContext) => {
  for (let key in subjects) {
    if (typeof subjects[key] === 'object') {
      await rvaluesVarSubstition(subjects[key], templateContext)
    } else if (typeof subjects[key] === 'string') {
      subjects[key] = await templateEngine.parseAndRender(subjects[key], templateContext)
    }
  }
  return subjects
}

const rvaluesVarSubstitionMiddleware = async (req, res, next) => {
  if (['POST', 'PUT'].indexOf(req.method) > -1) {
    const token = req.headers.authorization
    let msvcEndpoint
    let iofogListEndPoint
    let user
    if (token) {
      try {
        user = await UserManager.checkAuthentication(token)
        const flowId = req.query.flowId // API retro compatibility
        const applicationName = req.query.application
        msvcEndpoint = await MicroservicesService.listMicroservicesEndPoint({ applicationName, flowId }, user, false)
        msvcEndpoint = msvcEndpoint.microservices
        const isSystem = req.query && req.query.system ? req.query.system === 'true' : false
        const query = qs.parse(req.query)
        iofogListEndPoint = await FogService.getFogListEndPoint(query.filters, user, false, isSystem)
        iofogListEndPoint = iofogListEndPoint.fogs
      } catch (e) {
        // Nothing to do, suppose the token has no permission to access. The is the case of agent
      }
    }
    let tmplContext = {
      self: req.body,
      microservices: msvcEndpoint,
      iofogs: iofogListEndPoint,
      // Private context
      _user: user // need by edge resource and every on demand request
    }
    await rvaluesVarSubstition(req.body, tmplContext)
  }
  next()
}

module.exports = {
  rvaluesVarSubstition,
  rvaluesVarSubstitionMiddleware
}
