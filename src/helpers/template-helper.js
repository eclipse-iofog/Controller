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

const substitutionMiddleware = async (req, res, next) => {
  await rvaluesVarSubstition(req.body, { self: req.body })
  next()
}

module.exports = {
  rvaluesVarSubstition,
  substitutionMiddleware
}
