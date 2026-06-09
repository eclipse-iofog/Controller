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

const straceStateUpdate = {
  'id': '/straceStateUpdate',
  'type': 'object',
  'properties': {
    'enable': { 'type': 'boolean' }
  },
  'required': ['enable']
}

const straceGetData = {
  'id': '/straceGetData',
  'type': 'object',
  'properties': {
    'format': { 'enum': ['string', 'file'] }
  },
  'required': ['format']
}

const stracePostToFtp = {
  'id': '/stracePostToFtp',
  'type': 'object',
  'properties': {
    'ftpHost': { 'type': 'string' },
    'ftpPort': { 'type': 'integer', 'minimum': 0 },
    'ftpUser': { 'type': 'string' },
    'ftpPass': { 'type': 'string' },
    'ftpDestDir': { 'type': 'string' }
  },
  'required': ['ftpHost', 'ftpPort', 'ftpUser', 'ftpPass', 'ftpDestDir']
}

module.exports = {
  mainSchemas: [straceStateUpdate, straceGetData, stracePostToFtp],
  innerSchemas: []
}
