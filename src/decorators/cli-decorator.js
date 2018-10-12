const logger = require('../logger');
const config = require('../config');
const UserManager = require('../sequelize/managers/user-manager');
const Errors = require('../helpers/errors');

function prepareUserById(f) {
  return async function () {

    const fArgs = Array.prototype.slice.call(arguments);
    const obj = fArgs[0];
    const userId = obj.user_id;

    logger.info('getting user by id: ' + userId)

    const user = await UserManager.findById(userId)

    if (!user) {
      logger.error('userId ' + userId + ' incorrect')
      throw new Errors.AuthenticationError('user id not exists')
    }

    delete  obj.userId
    fArgs.push(user)

    return await f.apply(this, fArgs)
  }
}

module.exports = {
  prepareUser: prepareUserById,

}