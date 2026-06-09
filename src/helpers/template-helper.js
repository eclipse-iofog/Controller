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

const ApplicationManager = require('../data/managers/application-manager.js') // Using manager instead of service to avoid dependency loop
const FogService = require('../services/iofog-service')
const MicroservicesService = require('../services/microservices-service')
const EdgeResourceService = require('../services/edge-resource-service')

// ninja2 like template engine
const { Liquid } = require('../lib/liquidjs/liquid.node.cjs')
const templateEngine = new Liquid()

/**
 * Add filter findAgent to template engine.
 * Syntaxe  {{ microservice | findMicroserviceAgent }}
 */

function findMicroserviceAgentHandler (microservice) {
  // const user = this.context.environments._user
  // if (!user) {
  //   return undefined
  // }
  const result = FogService.getFogEndPoint({ uuid: microservice.iofogUuid }, false)
  return result
}

async function findEdgeResourcehandler (name, version) {
  const key = `${name}/${version}`
  // const user = this.context.environments._user
  // if (!user) {
  //   return undefined
  // }
  if (this.context.environments._edgeResourcesByName && this.context.environments._edgeResourcesByName[key]) {
    return this.context.environments._edgeResourcesByName[key]
  }
  const result = await EdgeResourceService.getEdgeResource({ name, version })

  if (result && this.context.environments._edgeResourcesByName) {
    this.context.environments._edgeResourcesByName[key] = result
  }
  return result
}

async function findApplicationHandler (name) {
  // const user = this.context.environments._user
  // if (!user) {
  //   return undefined
  // }
  if (this.context.environments._applicationsByName && this.context.environments._applicationsByName[name]) {
    return this.context.environments._applicationsByName[name]
  }

  const result = await ApplicationManager.findOnePopulated({ exclude: ['created_at', 'updated_at'] }, { fakeTransaction: true }) // TODO: Get a proper DB transaction
  if (result) {
    result.microservices = (await MicroservicesService.listMicroservicesEndPoint({ applicationName: name }, false)).microservices
    if (this.context.environments._applicationsByName) {
      this.context.environments._applicationsByName[name] = result
    }
  }
  return result
}

async function findAgentHandler (name) {
  // const user = this.context.environments._user
  // if (!user) {
  //   return undefined
  // }
  if (name === '') {
    const { fogs: result } = await FogService.getFogListEndPoint([], false, false)
    if (result && this.context.environments._agentsByName) {
      result.forEach(agent => {
        this.context.environments._agentsByName[agent.name] = agent
      })
    }
    return result
  }
  if (this.context.environments._agentsByName && this.context.environments._agentsByName[name]) {
    return this.context.environments._agentsByName[name]
  }
  const result = await FogService.getFogEndPoint({ name }, false)
  if (result && this.context.environments._agentsByName) {
    this.context.environments._agentsByName[result.name] = result
  }
  return result
}

async function JSONParser (variable) {
  try {
    console.log({ variable })
    return JSON.parse(variable)
  } catch (e) {
    return variable
  }
}

function toStringParser (variable) {
  try {
    if (typeof variable === 'string') {
      return variable
    }
    if (variable.toString) {
      return variable.toString()
    }
    return JSON.stringify(variable)
  } catch (e) {
    return variable
  }
}
/**
 * Add filter findEdgeRessource to template engine.
 * user is in liquid context _user
 * Syntaxe  {{ name findEdgeRessource: version }}
 */
templateEngine.registerFilter('findEdgeResource', findEdgeResourcehandler)
templateEngine.registerFilter('findApplication', findApplicationHandler)
templateEngine.registerFilter('findAgent', findAgentHandler)
templateEngine.registerFilter('findMicroserviceAgent', findMicroserviceAgentHandler)
templateEngine.registerFilter('toNumber', JSONParser)
templateEngine.registerFilter('toBoolean', JSONParser)
templateEngine.registerFilter('toString', toStringParser)

/**
  * Object in depth traversal and right value templateEngine rendering
  * @param {*} subjects
  * @param {*} templateContext
  */
const rvaluesVarSubstition = async (subjects, templateContext) => {
  let context = templateContext
  // Due to the recursive nature of this function, user will only be defined on the first iteration
  context = {
    ...templateContext
    // Private context
    // _user: user // need by edge resource and every on demand request
  }

  // Create local cache for filters if they do not exists
  context._agentsByName = context._agentsByName || {}
  context._edgeResourcesByName = context._edgeResourcesByName || {}
  context._applicationsByName = context._applicationsByName || {}

  for (let key in subjects) {
    try {
      if (typeof subjects[key] === 'object') {
        await rvaluesVarSubstition(subjects[key], context, null)
      } else if (typeof subjects[key] === 'string') {
        const result = await templateEngine.parseAndRender(subjects[key], context, { keepOutputType: true })
        subjects[key] = result
      }
    } catch (e) {
      // Trace error in rendering
      console.log({ e })
      subjects[key] = e.toString()
    }
  }
  return subjects
}

const substitutionMiddleware = async (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].indexOf(req.method) > -1) {
    // let user
    let tmplContext = {
      self: req.body
      // Private context
      // _user: user // need by edge resource and every on demand request
    }
    try {
      await rvaluesVarSubstition(req.body, tmplContext)
    } catch (e) {
      next(e)
    }
  }
  next()
}

module.exports = {
  rvaluesVarSubstition,
  substitutionMiddleware
}
