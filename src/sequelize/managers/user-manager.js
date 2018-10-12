const BaseManager = require('./base-manager');
const models = require('./../models');
const User = models.User;
const AccessToken = models.AccessToken;
const AppHelper = require('../../helpers/app-helper');

class UserManager extends BaseManager {
  getEntity() {
    return User;
  }

  findByAccessToken(token, transaction) {
    AppHelper.checkTransaction(transaction);

    return User.find({
      include: [{
        model: AccessToken,
        as: 'accessToken',
        where: {
          token: token
        }
      }],
    }, {
      transaction: transaction
    });
  }

  findByEmail(email) {
    return User.find({
        where: {
          email: email
        }
      });
  }

  // no transaction required here, used by auth decorator
  checkAuthentication(token) {
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

  updateDetails(user, updateObject, transaction) {
    return this.update({
      id: user.id
    }, updateObject, transaction);
  }

  updatePassword(userId, newPassword, transaction) {
    return this.update({
      id: userId
    }, {
      password: newPassword
    }, transaction)
  }

  updateTempPassword(userId, tempPassword, transaction) {
    return this.update({
      id: userId
    }, {
      tempPassword: tempPassword
    }, transaction)
  }
}

const instance = new UserManager();
module.exports = instance;