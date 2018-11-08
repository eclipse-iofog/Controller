#!/bin/bash

export PREV_IOFOG_CONTROLLER_VER=$(npm list --depth=0 -g --silent | grep iofogcontroller | awk -F "@" '{print $2}')
printf 'prev_ver: '$PREV_IOFOG_CONTROLLER_VER > /tmp/iofogcontroller_install_variables