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
const ApplicationTemplate = models.ApplicationTemplate

class ApplicationTemplateManager extends BaseManager {
  getEntity () {
    return ApplicationTemplate
  }

  async findOnePopulated (where, attributes, transaction) {
    const applicationTemplate = await ApplicationTemplate.findOne({
      include: [
        {
          model: models.ApplicationTemplateVariable,
          as: 'variables',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    return applicationTemplate
  }

  async findAllPopulated (where, attributes, transaction) {
    const applicationTemplates = await ApplicationTemplate.findAll({
      include: [
        {
          model: models.ApplicationTemplateVariable,
          as: 'variables',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction: transaction })
    return applicationTemplates
  }
}

const instance = new ApplicationTemplateManager()
module.exports = instance
