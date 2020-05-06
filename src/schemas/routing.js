/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const routingCreate = {
  'id': '/routingCreate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'sourceMicroserviceUuid': { 'type': 'string', 'minLength': 1 },
    'destMicroserviceUuid': { 'type': 'string', 'minLength': 1 }
  },
  'required': ['name', 'sourceMicroserviceUuid', 'destMicroserviceUuid'],
  'additionalProperties': true
}

const routingUpdate = {
  'id': '/routingUpdate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'sourceMicroserviceUuid': { 'type': 'string', 'minLength': 1 },
    'destMicroserviceUuid': { 'type': 'string', 'minLength': 1 }
  },
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [routingUpdate, routingCreate]
}
