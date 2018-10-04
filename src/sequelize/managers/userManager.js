const BaseManager = require('./baseManager');
const models = require('./../models');
const User = models.User;
const AccessToken = models.AccessToken;

class UserManager extends BaseManager {
  findByAccessToken(token) {
    return User.find({
      include: [{
        model: AccessToken,
        as: 'accessToken',
        where: {
          token: token
        }
      }]
    });
  }
}

const instance = new UserManager();
module.exports =  instance;