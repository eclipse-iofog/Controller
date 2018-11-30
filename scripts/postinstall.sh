#!/bin/bash

##TODO: remove after js scripts finished

vercomp () {
    if [[ $1 == $2 ]]
    then
        echo '='
        return
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            echo '>'
            return
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            echo '<'
            return
        fi
    done
    echo '='
    return
}

#START
#restore db
IOFOG_CONTROLLER_NODE_MODULES=$(npm root -g iofog-controller)
IOFOG_CONTROLLER_SEQUELIZE_DIR=$IOFOG_CONTROLLER_NODE_MODULES'/iofogcontroller/src/sequelize'

DEV_DB_FILE=$IOFOG_CONTROLLER_SEQUELIZE_DIR'/dev_database.sqlite'
DEV_DB_FILE_BACKUP='/tmp/dev_database.sqlite'
if [ -f $DEV_DB_FILE_BACKUP ]; then
    mv $DEV_DB_FILE_BACKUP $DEV_DB_FILE
fi

PROD_DB_FILE=$IOFOG_CONTROLLER_SEQUELIZE_DIR'/prod_database.sqlite'
PROD_DB_FILE_BACKUP='/tmp/prod_database.sqlite'
if [ -f $PROD_DB_FILE_BACKUP ]; then
    mv $PROD_DB_FILE_BACKUP $PROD_DB_FILE
fi

#prev versions migrations
if [ -f /tmp/iofogcontroller_install_variables ]; then
    PREV_IOFOG_CONTROLLER_VER=$(grep prev_ver /tmp/iofogcontroller_install_variables | awk '{print $2}')
fi

if [[ -z "${PREV_IOFOG_CONTROLLER_VER// }" ]]
then
    echo "No previous version"
else
    echo "Previous version: "${PREV_IOFOG_CONTROLLER_VER}
    if [[ $(vercomp $PREV_IOFOG_CONTROLLER_VER 1.0.0) = '<' ]] || [[ $(vercomp $PREV_IOFOG_CONTROLLER_VER 1.0.0) = '=' ]]
    then
        echo "Upgrading from version 1.0.0"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928110125-insert-registry.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928111532-insert-catalog-item.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928112152-insert-iofog-type.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928121334-insert-catalog-item-image.js');"
    fi
fi

rm -rf /tmp/iofogcontroller_install_variables