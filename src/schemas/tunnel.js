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

const tunnelCreate = {
  'id': '/tunnelCreate',
  'type': 'object',
  'properties': {
    'iofogUuid': { 'type': 'string' },
    'username': { 'type': 'string', 'minLength': 1 },
    'password': { 'type': 'string' },
    'rsakey': { 'type': 'string' },
    'lport': { 'type': 'integer', 'minimum': 0, 'maximum': 65535 },
    'rport': { 'type': 'integer', 'minimum': 0, 'maximum': 65535 }
  },
  'required': ['iofogUuid', 'username', 'password', 'lport', 'rport']
}

module.exports = {
  mainSchemas: [tunnelCreate]
}
