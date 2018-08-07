const DecoratorService = require('./base/decoratorService');


const checkUserWrapper = DecoratorService.checkUser;
const transactionWrapper = DecoratorService.transactionWrapper;

async function _doSmth(x, transaction) {
    console.log(transaction);
    console.log(x);
    let res = await longFunction(x);
    return res;
}

const doSmth = checkUserWrapper(
    transactionWrapper(
        _doSmth));

async function longFunction(x) {
    return new Promise(resolve => {
        setTimeout(resolve, 10000, x + 1)
    });
}

module.exports = {
    doSmth: doSmth/*,
    _doSmth: _doSmth*/
};
