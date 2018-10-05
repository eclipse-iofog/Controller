const BaseManager = require('./baseManager');
const models = require('./../models');
const User = models.User;
const AccessToken = models.AccessToken;
const Errors = require('./../../utils/errors');

class UserManager extends BaseManager {

  getEntity() {
    return User;
  }

  findByAccessToken(token, transaction) {
    return User.find({
      include: [{
        model: AccessToken,
        as: 'accessToken',
        where: {
          token: token
        }
      }],
      transaction: transaction
    });
  }


  create(obj, transaction) {
    if (!transaction) {
      throw new Errors.TransactionError()
    }

    return User.create(obj, {
        transaction: transaction
      })
  }
}

const instance = new UserManager();
module.exports = instance;