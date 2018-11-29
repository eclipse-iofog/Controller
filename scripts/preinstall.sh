#!/bin/bash

#store prev ver number
export PREV_IOFOG_CONTROLLER_VER=$(npm list --depth=0 -g --silent | grep iofogcontroller | awk -F "@" '{print $2}')
printf 'prev_ver: '$PREV_IOFOG_CONTROLLER_VER > /tmp/iofogcontroller_install_variables

#backup db
IOFOG_CONTROLLER_NODE_MODULES=$(npm root -g iofog-controller)
IOFOG_CONTROLLER_SEQUELIZE_DIR=$IOFOG_CONTROLLER_NODE_MODULES'/iofogcontroller/src/sequelize'

DEV_DB_FILE=$IOFOG_CONTROLLER_SEQUELIZE_DIR'/dev_database.sqlite'
if [ -f $DEV_DB_FILE ]; then
    mv $DEV_DB_FILE /tmp/
fi
PROD_DB_FILE=$IOFOG_CONTROLLER_SEQUELIZE_DIR'/prod_database.sqlite'
if [ -f $PROD_DB_FILE ]; then
    mv $PROD_DB_FILE /tmp/
fi