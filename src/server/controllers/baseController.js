/*
 * *******************************************************************************
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

const logger = require('../utils/winstonLogs');

const mainPageEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  res.render("controller-status")
};

module.exports =  {
  mainPageEndPoint: mainPageEndPoint
};