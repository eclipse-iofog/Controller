const DecoratorService = require('./base/decoratorService');


const checkUserWrapper = DecoratorService.checkUser;
const transactionWrapper = DecoratorService.transactionWrapper;

const doSmth = checkUserWrapper(/*transactionWrapper(*/function(x, transaction) {
    return x + 1;
})/*)*/;
/*async function _doSmth() {
    return 1;
}
const doSmth = DecoratorService.checkUser(_doSmth);*/

module.exports = {
    doSmth: doSmth/*,
    _doSmth: _doSmth*/
};
