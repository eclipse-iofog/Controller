rm -rf dev_database.sqlite
../../node_modules/.bin/sequelize db:migrate
../../node_modules/.bin/sequelize db:seed:all