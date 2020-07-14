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

const nconf = require('nconf')
const path = require('path')
const constants = require('./constants')

class Config {
  constructor () {
    nconf.env({ separator: '_' })
    const environment = nconf.get('NODE:ENV') || 'production'
    this.load(environment)
  }

  get (key, defaultValue) {
    let value = nconf.get(key)

    if (value === undefined || value === null) {
      value = constants[key]
    }

    if (value === undefined || value === null) {
      value = defaultValue
    }

    return value
  }

  set (key, value) {
    const environment = nconf.get('NODE:ENV') || 'production'

    nconf.stores[environment].set(key, value)
    nconf.stores[environment].saveSync()
  }

  load (environment) {
    nconf.file(environment, path.join(__dirname, environment.toLowerCase() + '.json'))
    nconf.file('default', path.join(__dirname, 'default.json'))
  }
}

module.exports = new Config()
