const sequelize = require('./../../utils/sequelize');

function checkUser(f) {
    return async function() {
        console.log('checking User');
        let user = {data: 'non-empty obj that was returned'};

        if (user) {
            return await f.apply(this, arguments);
        } else {
            throw 'user not found'
        }
    }
}

/*function transactionWrapper(f) {
    return async function () {
        return sequelize.transaction(async (t) => {
            arguments[1] = t;

            return await f.apply(this, arguments);
        })
    }
}*/

module.exports = {
    checkUser: checkUser,
    transactionWrapper: transactionWrapper
};