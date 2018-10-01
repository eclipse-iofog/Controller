#!/usr/bin/env node

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

const path = require('path');
const fs = require('fs');

const { CLI } = require('./cli');

const logger = require('./server/utils/winstonLogs');

function main() {
    let key,
        value,
        args = process.argv.slice(2),
        commandInserted = args.join(' ');

    const cli = new CLI(args);

    let daemon = require("daemonize2").setup({
        main: "daemonServer.js",
        name: "fog-controller",
        pidfile: "fog-controller.pid",
        silent: true
    });

    daemon
        .on("starting", () => {
            console.log("Starting fog-controller...");
        })
        .on("stopping", () => {
            console.log("Stopping fog-controller...");
        })
        .on("stopped", (pid) => {
            console.log("fog-controller stopped.");
        })
        .on("running", (pid) => {
            console.log("fog-controller already running. PID: " + pid);
        })
        .on("notrunning", () => {
            console.log("fog-controller is not running");
        })
        .on("error", (err) => {
            console.log("fog-controller failed to start:  " + err.message);
        });

    logger.info('Command inserted: fog-controller ' + commandInserted);

    cli.run(daemon);
}

main();
