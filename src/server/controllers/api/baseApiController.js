/**
* @file baseApiController.js
* @author Zishan Iqbal
* @description This file includes the Middle-ware functions.
*/

import errorUtils from './../../utils/errorUtils';
import FabricAccessTokenManager from '../../managers/fabricAccessTokenManager';
import FabricUserManager from '../../managers/fabricUserManager';
import Constants from '../../constants.js';

const get = (req, res, manager) => {
  const id = req.params.id;
  let promise = null;
  let resultCount = 0;
  const offset = parseInt(req.query.offset || 0);
  const limit = parseInt(req.query.limit || 15);

  if(null == id){
    promise = manager.count()
    .then((count) => {
      resultCount = count;
      return manager.find({offset: offset, limit: limit});
    });
  }
  else
    promise = manager.findById(id);

  promise
  .then((result) => {
    const response = null == id ? {offset: offset, count: limit, totalCount: resultCount, list: result} : result;
    res.send(response);
  })
  .catch((error) => {
    return errorUtils.caughtError(res, error);
  });
};

const checkUserExistance = (req, res, next) => {
  var instanceId = req.params.ID,
    token = req.params.Token;

  FabricAccessTokenManager.getByToken(token)
  .then((userTokenData) => {
    if(userTokenData) {
      FabricUserManager.isUserExist(userTokenData.userId, instanceId)
      .then((fabricUserData) =>{
        if(fabricUserData) {
          next();
        } else {
          res.send({
            'status': 'failure',
            'timestamp': new Date().getTime(),
            'errormessage': Constants.MSG.ERROR_ACCESS_DENIED
          })
        }
      });
    } else {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': Constants.MSG.ERROR_ACCESS_TOKEN
      })
    }
  });
}

export default {
  get: get,
  checkUserExistance: checkUserExistance
}