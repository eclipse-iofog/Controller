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

const daemonize = require('daemonize2');
const logger = require('./logger');

const daemon = daemonize.setup({
  main: 'server.js',
  name: 'iofog-controller',
  pidfile: 'iofog-controller.pid',
  silent: true,
});

daemon
  .on('starting', async () => {
    logger.silly('Starting iofog-controller...');
  })
  .on('stopping', () => {
    logger.silly('Stopping iofog-controller...')
  })
  .on('stopped', (pid) => {
    logger.silly('iofog-controller stopped.')
  })
  .on('running', (pid) => {
    logger.silly('iofog-controller already running. PID: ' + pid)
  })
  .on('notrunning', () => {
    logger.silly('iofog-controller is not running')
  })
  .on('error', (err) => {
    logger.silly('iofog-controller failed to start:  ' + err.message)
  });


module.exports = daemon;