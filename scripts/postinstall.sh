#!/bin/bash

PREV_IOFOG_CONTROLLER_VER=$(grep prev_ver scripts/temp/variables | awk '{print $2}')

echo ${PREV_IOFOG_CONTROLLER_VER}
if [[ "$PREV_IOFOG_CONTROLLER_VER" = "1.0.0" ]]; then
    echo "Upgrading from ver 1.0.0"
    sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928110125-insert-registry.js');"
    sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928111532-insert-catalog-item.js');"
    sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928112152-insert-iofog-type.js');"
    sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928121334-insert-catalog-item-image.js');"
fi

rm -rf scripts/temp