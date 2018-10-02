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

module.exports = [
  {
    method: 'get',
    path: '/api/v3/status',
    middleware: (req, res) => {
      res
        .status(200)
        .send({
          "status": "ok",
          "timestamp": Date.now(),
        })
    }
  },
  {
    method: 'get',
    path: '/api/v3/email-activation',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/fog-types',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  }
];