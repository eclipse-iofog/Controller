/*
 *  *******************************************************************************
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
// ninja2 like template engine
var { Liquid } = require('liquidjs')
let templateEngine = new Liquid()

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



module.exports = {
  rvaluesVarSubstition
}
