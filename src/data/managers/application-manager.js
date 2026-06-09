/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const Application = models.Application
const Microservice = models.Microservice

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
      return []
    }
    return application.microservices || []
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
          required: false
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    if (!application) {
      return null
    }
    const msvcs = application.microservices || []
    return {
      ...application.get({ plain: true }),
      microservices: msvcs.map(m => m.get({ plain: true }))
    }
  }

  async findAllPopulated (where, attributes, transaction) {
    const applications = await Application.findAll({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    return applications.map(application => ({
      ...application.get({ plain: true }),
      microservices: (application.microservices || []).map(m => m.get({ plain: true }))
    }))
  }
}

const instance = new ApplicationManager()
module.exports = instance
