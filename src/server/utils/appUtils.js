/**
* @file appUtils.js
* @author Zishan Iqbal
* @description This file includes the utility functions relevant to IOFabric;
*/

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
    for(i  = 0; i < 8; i++)
    {
     token += ((0 + (Math.floor(Math.random() * (Math.pow(2, 31))) + 1).toString(16)).slice(-8)).substr(-8) ;
    }
      return token;
}
export default {
  isArray: isArray,
  generateAccessToken : generateAccessToken
};
