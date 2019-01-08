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
 
 const newman = require('newman');
 
// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('../test/postman_collection.json'),
    reporters: 'cli',
    abortOnError: true,
    abortOnFailure: true
}).on('start', function (err, args) { // on start of run, log to console
    console.log('running a collection...');
}).on('done', function (err, summary) {
    if (err || summary.error) {
        console.error('collection run encountered an error.');
        console.log(summary);
        process.exit(1);
    }
    else {
        console.log('collection run completed.');
    }
});
