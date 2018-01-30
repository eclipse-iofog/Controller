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

const displayHelp = function () {
    var helpString = "\tUsage 1: fog-controller [OPTION]\n" +
        "\tUsage 2: fog-controller [COMMAND] <Argument>\n" +
        "\tUsage 3: fog-controller [COMMAND] <key> <value>\n" +
        "\n\n" +

        "\tCommand          Arguments                                         Meaning\n" +
        "\t=======          =========                                         =======\n" +
        "\tconfig           -list                                             Displays Configuration information in CLI (config table content)\n" +
        "\t                 -add <key> <value>                                Set Configurations of fog-controller\n" +
        "\t                                                                   (You can set one of these configurations: port, ssl_key, intermediate_cert, ssl_cert,\n" +
        "\t                                                                     email_address, email_password, email_service, ioauthoring_port, ioauthoring_ip_address,\n" +
        "\t                                                                     ioauthoring_protocal)\n" +
        "\t                 -remove <key>                                     Deletes a Configuration with corresponding Key\n" +
        "\n\tcomsat           -list                                             List down all ComSat(s)\n" +
        "\t                 -add <name> <domain> <publicIP>                   Creates a new ComSat\n" +
        "\t                 -remove <ID>                                      Deletes a ComSat with corresponding ID\n" +
        "\n\thelp                                                               Shows this message\n" +
        "\n\tstart                                                              Starts fog-controller\n" +
        "\n\tstatus                                                             Shows status of fog-controller\n" +
        "\n\tstop                                                               Stops fog-controller\n" +
        "\n\tuser             -list                                             List down all users\n" +
        "\t                 -add <email> <firstName> <lastName> <password>    Creates a new user\n" +
        "\t                 -remove <email>                                   Deletes a user with corresponding email\n" +
        "\t                 -generateToken <email>                            Resets User Access Token of corresponding email\n" +
        "\n\tversion                                                            Displays Version and License\n" +
        "\n\n" +
        "\tReport bugs to: bugs@iotracks.com\n" +
        "\tioFog home page: http://iofog.com\n" +
        "\tFor users with Eclipse accounts, report bugs to: https://bugs.eclipse.org/bugs/enter_bug.cgi?product=iofog";
    console.log(helpString);
}

main();