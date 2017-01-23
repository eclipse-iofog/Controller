import Sequelize from 'sequelize';
import appConfig from './../../config.json';
import cls from 'continuation-local-storage';

let namespace = cls.createNamespace('fog-controller-namespace');

Sequelize.cls = namespace;

//  `const` is a signal that the variable won’t be reassigned.
//  `let`, is a signal that the variable may be reassigned, such as a counter in a loop, or a value swap in an algorithm.
//  It also signals that the variable will be used only in the block it’s defined in, which is not always the entire containing function.
//  `var` is now the weakest signal available when you define a variable in JavaScript.
//  The variable may or may not be reassigned, and the variable may or may not be used for an entire function, or just for the purpose of a block or loop.
const sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  storage: __dirname + '/../../../' + appConfig.dbPath, //TODO: needs to improve this line of code
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
});

sequelize
  .sync({
    force: false
  })
  .then(function(err) {

  }, function(err) {
    console.log('Unable to connect to the database:', err);
  });


//  export default is used in the case where a module exports a single value
//  hence import sequelize from 'sequelize' will return sequelize object
export default sequelize;

/*
  FOR EXPORTING MORE THAN ONE VALUE FROM A MODULE
  export const sqrt = Math.sqrt;
  export function square(x) {
      return x * x;
  }
  export function diag(x, y) {
      return sqrt(square(x) + square(y));
  }

  //------ main.js ------
  import { square, diag } from 'lib';
*/