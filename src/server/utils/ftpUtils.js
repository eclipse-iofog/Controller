import AppUtils from "./appUtils";
let ftpClient = require('ftp');
let fs = require('fs');



const sendToFtp = function (props, params, callback) {

    let host = AppUtils.getProperty(params, props.host);
    let port = AppUtils.getProperty(params, props.port);
    let user = AppUtils.getProperty(params, props.user);
    let pass = AppUtils.getProperty(params, props.pass);
    let destDir = AppUtils.getProperty(params, props.destDir);

    let filePath = AppUtils.getProperty(params, props.file);


    let client = new ftpClient();
    let connectionData = {
        host: host,
        port: port,
        user: user,
        password: pass,
        protocol: 'ftp'
    };

    client.on('ready', function() {
        client.put(filePath, destDir + '/' + filePath.split('/').pop(), function(err) {
            if (err) {
                console.log(err);
                client.end();
                callback('error', 'ftp problem')
            } else {
                client.end();
                callback(null, params);
            }
        });
    });

    client.connect(connectionData);
};

export default {
    sendToFtp: sendToFtp
}