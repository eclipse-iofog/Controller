/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseManager = require('./base-manager')
const models = require('../models')
const Application = models.Application
const Microservice = models.Microservice
const Routing = models.Routing
const flatMap = require('lodash/flatMap')

class ApplicationManager extends BaseManager {
  getEntity () {
    return Application
  }

  async findApplicationMicroservices (where, transaction) {
    const application = await Application.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where: where,
      attributes: ['id']
    }, { transaction: transaction })
    if (!application) {
      return undefined
    }
    return application.microservices || []
  }

  async findApplicationRoutes (where, transaction) {
    const application = await Application.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false,
          include: [
            {
              model: Routing,
              as: 'routes',
              required: false,
              attributes: ['name']
            }
          ]
        }
      ],
      where: where,
      attributes: ['id']
    }, { transaction: transaction })
    if (!application) {
      return undefined
    }
    return flatMap(application.microservices || [], m => m.routes).map(r => r.get({ plain: true }))
  }

  async findAllWithAttributes (where, attributes, transaction) {
    return Application.findAll({
      where: where,
      attributes: attributes },
    { transaction: transaction })
  }

  async findOneWithAttributes (where, attributes, transaction) {
    return Application.findOne({
      where: where,
      attributes: attributes
    },
    { transaction: transaction })
  }

  async findOnePopulated (where, attributes, transaction) {
    const application = await Application.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false,
          include: [
            {
              model: Routing,
              as: 'routes',
              required: false,
              attributes: ['name']
            }
          ]
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    const msvcs = application.microservices || []
    const routes = flatMap(msvcs, m => m.routes).map(r => r.get({ plain: true }))
    return {
      ...application.get({ plain: true }),
      microservices: msvcs.map(m => {
        delete m.routes
        return m
      }),
      routes
    }
  }

  async findAllPopulated (where, attributes, transaction) {
    const applications = await Application.findAll({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false,
          include: [
            {
              model: Routing,
              as: 'routes',
              required: false,
              attributes: ['name']
            }
          ]
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    return applications.map(application => {
      const msvcs = application.microservices || []
      const routes = flatMap(msvcs, m => m.routes).map(r => r.get({ plain: true }))
      return {
        ...application.get({ plain: true }),
        microservices: msvcs.map(m => {
          const msvc = m.get({ plain: true })
          delete msvc.routes
          return msvc
        }),
        routes
      }
    })
  }
}

const instance = new ApplicationManager()
module.exports = instance
