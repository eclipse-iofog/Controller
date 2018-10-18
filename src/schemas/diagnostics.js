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

const straceStateUpdate = {
  "id": "/straceStateUpdate",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "enable": {"type": "boolean"}
  },
  "required": ["id","enable"]
};

const straceGetData = {
  "id": "/straceGetData",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "format": {"enum": ["string","file"]}
  },
  "required": ["id","format"]
};

const stracePostToFtp = {
  "id": "/stracePostToFtp",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "ftpHost": {"type": "string"},
    "ftpPort": {"type": "integer", "minimum": 0},
    "ftpUser": {"type": "string"},
    "ftpPass": {"type": "string"},
    "ftpDestDir": {"type": "string"},
  },
  "required": ["id","ftpHost","ftpPort","ftpUser","ftpPass","ftpDestDir"]
};

module.exports = {
  mainSchemas: [straceStateUpdate, straceGetData, stracePostToFtp],
  innerSchemas: []
};