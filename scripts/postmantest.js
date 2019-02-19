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

const newman = require('newman')
const {init} = require('./init')
const {restoreDBs, backupDBs} = require('./util')
const {start} = require('./start')
const {stop} = require('./stop')

function postmanTest() {
  stop()
  backupDBs()
  // create new DBs
  init()
  start()
  // call newman.run to pass `options` object and wait for callback
  newman.run({
    collection: require('../test/postman_collection.json'),
    reporters: 'cli',
    // abortOnError: true,
    // abortOnFailure: true
  }).on('start', function(err, args) { // on start of run, log to console
    console.log('running a collection...')
  }).on('done', function(err, summary) {
    if (err || summary.error || summary.run.failures.length != 0) {
      restoreDBs()
      stop()
      console.error('collection run encountered an error. tests did not pass.')
      process.exitCode = 1
    } else {
      restoreDBs()
      stop()
      console.log('collection run completed.')
    }
  })
}

module.exports = {
  postmanTest: postmanTest,
}
