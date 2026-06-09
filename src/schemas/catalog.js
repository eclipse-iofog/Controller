/*
 *  *******************************************************************************
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

const catalogItemCreate = {
  'id': '/catalogItemCreate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'description': { 'type': 'string' },
    'category': { 'type': 'string' },
    'publisher': { 'type': 'string' },
    'diskRequired': { 'type': 'integer' },
    'ramRequired': { 'type': 'integer' },
    'picture': { 'type': 'string' },
    'isPublic': { 'type': 'boolean' },
    'registryId': { 'type': 'integer' },
    'configExample': { 'type': 'string' },
    'images': {
      'type': 'array',
      'minItems': 1,
      'maxItems': 2,
      'items': { '$ref': '/image' }
    },
    'inputType': { '$ref': '/type' },
    'outputType': { '$ref': '/type' }
  },
  'required': ['name', 'registryId', 'images'],
  'additionalProperties': true
}

const catalogItemUpdate = {
  'id': '/catalogItemUpdate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'description': { 'type': 'string' },
    'category': { 'type': 'string' },
    'publisher': { 'type': 'string' },
    'diskRequired': { 'type': 'integer' },
    'ramRequired': { 'type': 'integer' },
    'picture': { 'type': 'string' },
    'isPublic': { 'type': 'boolean' },
    'registryId': { 'type': 'integer' },
    'configExample': { 'type': 'string' },
    'images': {
      'type': 'array',
      'maxItems': 2,
      'items': { '$ref': '/image' }
    },
    'inputType': { '$ref': '/type' },
    'outputType': { '$ref': '/type' }
  },
  'additionalProperties': true
}

const image = {
  'id': '/image',
  'type': 'object',
  'properties': {
    'containerImage': { 'type': 'string' },
    'fogTypeId':
      {
        'type': 'integer',
        'minimum': 1,
        'maximum': 2
      }
  },
  'required': ['containerImage', 'fogTypeId'],
  'additionalProperties': true
}

const type = {
  'id': '/type',
  'type': 'object',
  'properties': {
    'infoType': { 'type': 'string' },
    'infoFormat': { 'type': 'string' }
  },
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [catalogItemCreate, catalogItemUpdate],
  innerSchemas: [image, type]
}
