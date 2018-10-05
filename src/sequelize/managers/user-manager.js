const BaseManager = require('./base-manager');
const models = require('./../models');
const User = models.User;
const AccessToken = models.AccessToken;

class UserManager extends BaseManager {
  getEntity() {
    return User;
  }

  async addUser(userData) {
    return User.create(userData);
  }

  async validateUserByEmail(email) {
    return User.find({
      where: {
        email: email
      }
    });
  }

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

  findByEmail(email) {
    return User.find({
      where: {
        email: email
      }
    });
  }

}

const instance = new UserManager();
module.exports = instance;