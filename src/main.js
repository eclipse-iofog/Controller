const { CLI } = require('./cli');

import FogControllerConfigService from './server/services/fogControllerConfigService';
import ComsatService from './server/services/comsatService';
import FogControllerConfigManager from './server/managers/fogControllerConfigManager';
import SatelliteManager from './server/managers/satelliteManager';
import UserManager from './server/managers/userManager';

import Server from './server';
import ConfigUtil from './server/utils/configUtil';
import constants from './server/constants.js';
import logger from './server/utils/winstonLogs';
import fs from 'fs';
const path = require('path');

function main() {
    let key,
        value,
        args = process.argv.slice(2),
        argsString = args.toString(),
        commandInserted = argsString.replace(/,/g, ' ');

    let cli = new CLI(args);

    var daemon = require("daemonize2").setup({
        main: "daemonServer.js",
        name: "fog-controller",
        pidfile: "fog-controller.pid",
        silent: true
    });

    daemon
        .on("starting", function () {
            console.log("Starting fog-controller...");
        })
        .on("stopping", function () {
            console.log("Stopping fog-controller...");
        })
        .on("stopped", function (pid) {
            console.log("fog-controller stopped.");
        })
        .on("running", function (pid) {
            console.log("fog-controller already running. PID: " + pid);
        })
        .on("notrunning", function () {
            console.log("fog-controller is not running");
        })
        .on("error", function (err) {
            console.log("fog-controller failed to start:  " + err.message);
        });

    logger.info('Command inserted: fog-controller ' + commandInserted);

    cli.run(daemon);
}

main();