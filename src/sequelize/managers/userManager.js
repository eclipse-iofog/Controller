const BaseManager = require('./baseManager');
const models = require('./../models');
const User = models.User;

class UserManager extends BaseManager {
  findByToken(token) {
    return User.find({
      where: {
        userAccessToken: token
      }
    });
  }
}

const instance = new UserManager();
module.exports =  instance;