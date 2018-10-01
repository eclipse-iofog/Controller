
function checkUserExistance(f) {
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

module.exports = {
  checkUserExistance: checkUserExistance
};