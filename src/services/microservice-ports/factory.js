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

const config = require('../../config')

function createMicroservicePortProvider () {
  let provider = process.env.MSVC_PORT_PROVIDER || config.get('PublicPorts:Provider', 'default')

  return require(`./${provider}`)
}

module.exports = createMicroservicePortProvider()
