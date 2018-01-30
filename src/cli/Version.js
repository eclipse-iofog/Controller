const packageJson = require('../../package.json');
let {Help} = require('./Help');

class Version {
    static display = (args) => {
        if (args[1]) {
            Help.displayExtraArgumentHelp(args[1]);
        } else {
            console.log(`Version: ${packageJson.version}`);
            console.log(`License: ${packageJson.license}`);
        }
    }
}

exports.Version = Version;