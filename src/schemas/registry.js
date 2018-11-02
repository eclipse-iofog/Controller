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

const registryCreate = {
  "id": "/registryCreate",
  "type": "object",
  "properties": {
    "url": {"type": "string", "minLength": 1},
    "isPublic": {"type": "boolean"},
    "username": {"type": "string", "minLength": 1},
    "password": {"type": "string"},
    "email": {"type": "string"},
    "requiresCert": {"type": "boolean"},
    "certificate": {"type": "string"}
  },
  "required": ["url", "isPublic", "username", "password", "email"],
  "additionalProperties": false
};

const registryDelete = {
  "id": "/registryDelete",
  "type": "object",
  "properties": {
    "id": {"type": "integer"}
  },
  "required": ["id"],
  "additionalProperties": false
};

module.exports = {
  mainSchemas: [registryCreate, registryDelete]
};