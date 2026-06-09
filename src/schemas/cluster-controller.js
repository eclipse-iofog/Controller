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

const clusterControllerUpdate = {
  'id': '/clusterControllerUpdate',
  'type': 'object',
  'properties': {
    'host': {
      'type': 'string'
    }
  },
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [clusterControllerUpdate],
  innerSchemas: []
}
