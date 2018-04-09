import AppUtils from "./appUtils";
let fs = require('fs');


const createFile = function (props, params, callback) {

    let fileName = AppUtils.getProperty(params, props.fileName);
    let filePath = AppUtils.getProperty(params, props.distDir) + '/' + fileName;

    let data = AppUtils.getProperty(params, props.data);

    fs.writeFile(filePath, data, (err) => {
        if (err) {
            callback('error', 'Can\'t write strace data to file')
        }
        params[props.setProperty] = filePath;
        callback(null, params)
    });
};

const createDirIfNotExists = function (props, params, callback) {
    let dir = AppUtils.getProperty(params, props.distDir);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    callback(null, params);
};

const fileToBase64 = function (props, params, callback) {
    let file = AppUtils.getProperty(params, props.file);
    let bitmap = fs.readFileSync(file);
    params[props.setProperty] = new Buffer(bitmap).toString('base64');
    callback(null, params);
};

export default {
    createFile: createFile,
    createDirIfNotExists: createDirIfNotExists,
    fileToBase64: fileToBase64
}