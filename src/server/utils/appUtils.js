/**
 * @file appUtils.js
 * @author Zishan Iqbal
 * @description This file includes the utility functions relevant to IOFog;
 */

import fs from 'fs';
import path from 'path';
import logger from './winstonLogs';
var portscanner = require('portscanner')

// Checks the status of a single port
// returns 'closed' if port is available
// returns 'open' if port is not available
const checkPortAvailability = function (port) {
  return portscanner.checkPortStatus(port).then(function (status) {
    return status;
  });
}


const isArray = (object) => {
  return Object.prototype.toString.call(object) === '[object Array]';
}
/**
 * @desc generates a random String of 64 size
 * @param - none
 * @return String - returns random string
 */
const generateAccessToken = function () {
  var token = '',
    i;
  for (i = 0; i < 8; i++) {
    token += ((0 + (Math.floor(Math.random() * (Math.pow(2, 31))) + 1).toString(16)).slice(-8)).substr(-8);
  }
  return token;
}
/**
 * @desc generates a random String of the size specified by the input param
 * @param Integer - size
 * @return String - returns random string
 */
const generateRandomString = function (size) {

  var randString = "";
  var possible = "2346789bcdfghjkmnpqrtvwxyzBCDFGHJKLMNPQRTVWXYZ";

  for (var i = 0; i < size; i++)
    randString += possible.charAt(Math.floor(Math.random() * possible.length));

  return randString;
}

const isFileExists = function (filePath) {
  if (path.extname(filePath).indexOf(".") >= 0) {
    if (fs.existsSync(filePath)) {
      return true;
    } else {
      return false;
    }

  } else {
    return false;
  }
}

const isValidPort = function (port) {
  port = Number(port);
  if (Number.isInteger(port)) {
    if (port >= 0 && port < 65535)
      return true;
  }
  return false;
}

const isValidEmail = function (email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

const isValidName = function (name) {
  var re = /^([a-zA-Z0-9]+)$/;
  return re.test(name);
}

const isValidDomain = function (domain) {
  var re = /^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/;
  return re.test(domain);
}

const isValidPublicIP = function (publicIP) {
  var re = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
  return re.test(publicIP);
}
const isValidProtocol = function (protocol) {
  if (protocol == 'http' || protocol == 'https') {
    return true;
  } else {
    return false;
  }
}

const convertRelativePathToAbsolute = function (filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  } else {
    return path.resolve(filePath);
  }
}

/**
 * @desc generates a random String of the size specified by the input param
 * @param Integer - size
 * @return String - returns random string
 */
const generateInstanceId = function (size) {

  var randString = "";
  var possible = "2346789bcdfghjkmnpqrtvwxyzBCDFGHJKLMNPQRTVWXYZ";

  for (var i = 0; i < size; i++)
    randString += possible.charAt(Math.floor(Math.random() * possible.length));

  return randString;
}

const getProperty = function (theObject, path, separator) {
  if (path) {
    try {
      separator = separator || '.';

      return path.
        replace('[', separator).replace(']', '').
        split(separator).
        reduce(
        function (obj, property) {
          return obj[property];
        }, theObject
        );

    } catch (err) {
      return undefined;
    }
  } else {
    return null;
  }
}

const onCreate = function (params, paramName, errorMsg, callback, modelObject) {
  if (modelObject) {
    if (paramName) {
      params[paramName] = modelObject;
    }
    callback(null, params);

  } else {
    callback('error', errorMsg);
  }
}

const onFind = function (params, paramName, errorMsg, callback, modelObject) {
  if (modelObject) {
    if (paramName) {
      params[paramName] = modelObject;
    }
    callback(null, params);

  } else {
    callback('error', errorMsg);
  }
}

const onFindOptional = function (params, paramName, callback, modelObject) {
  if (modelObject && paramName) {
    params[paramName] = modelObject;
  }

  callback(null, params);
}

const onUpdate = function (params, errorMsg, callback, updatedModels) {
  if (updatedModels.length > 0) {
    callback(null, params);

  } else {
    callback('error', errorMsg);
  }
}

const onUpdateOptional = function (params, callback, deletedModels) {
  callback(null, params);
}

const onDelete = function (params, errorMsg, callback, deletedModels) {
  if (deletedModels <= 0) {
    callback('error', errorMsg);
  } else {
    callback(null, params);
  }
}

const onDeleteOptional = function (params, callback, deletedModels) {
  callback(null, params);
}

const sendResponse = function (response, err, successLabel, successValue, errorMessage) {
  var res = {
    'timestamp': new Date().getTime()
  };

  response.status(200);
  if (err) {
    logger.error(errorMessage);
    res['status'] = 'failure';
    res['errormessage'] = errorMessage;
  } else {
    logger.info("Endpoint served successfully");
    res['status'] = 'ok';
    if (successLabel || successValue) {
      res[successLabel] = successValue;
    }
  }
  response.send(res);
}

const sendMultipleResponse = function (response, err, successLabelArr, successValueArr, errorMessage) {
  var res = {
    'timestamp': new Date().getTime()
  };

  response.status(200);
  if (err) {
    logger.error(errorMessage);
    res['status'] = 'failure';
    res['errormessage'] = errorMessage;
  } else {
    logger.info("Endpoint served successfully");
    res['status'] = 'ok';
    for (var i = 0; i < successValueArr.length; i++) {
      res[successLabelArr[i]] = successValueArr[i];
    }
  }
  response.send(res);
}

export default {
  isArray: isArray,
  isFileExists: isFileExists,
  isValidPort: isValidPort,
  isValidEmail: isValidEmail,
  isValidName: isValidName,
  isValidDomain: isValidDomain,
  isValidPublicIP: isValidPublicIP,
  isValidProtocol: isValidProtocol,
  generateAccessToken: generateAccessToken,
  generateRandomString: generateRandomString,
  convertRelativePathToAbsolute: convertRelativePathToAbsolute,
  checkPortAvailability: checkPortAvailability,
  generateInstanceId: generateInstanceId,
  getProperty: getProperty,
  onCreate: onCreate,
  onUpdate: onUpdate,
  onUpdateOptional: onUpdateOptional,
  onFind: onFind,
  onFindOptional: onFindOptional,
  onDelete: onDelete,
  onDeleteOptional: onDeleteOptional,
  sendResponse: sendResponse,
  sendMultipleResponse: sendMultipleResponse
};