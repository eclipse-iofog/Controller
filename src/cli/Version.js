const package = require('../../package.json');

class Version {
    static display = (args) => {
        if (args[1]) {
            console.log(`Unrecognized commend: ${args[1]}`);
        } else {
            console.log(`Version: ${packageJson.version}`);
            console.log(`License: ${packageJson.license}`);
        }
    }
}

exports.Version = version;