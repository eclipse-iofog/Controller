#!/bin/bash

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

PREV_IOFOG_CONTROLLER_VER=$(grep prev_ver /tmp/iofogcontroller_install_variables | awk '{print $2}')
echo "Prev ver: "${PREV_IOFOG_CONTROLLER_VER}

if [[ -z "${PREV_IOFOG_CONTROLLER_VER// }" ]]
then
    echo "No prev ver"
else
    if [[ $(vercomp $PREV_IOFOG_CONTROLLER_VER 1.0.0) = '<' ]] || [[ $(vercomp $PREV_IOFOG_CONTROLLER_VER 1.0.0) = '=' ]]
    then
        echo "Upgrading from ver 1.0.0"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928110125-insert-registry.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928111532-insert-catalog-item.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928112152-insert-iofog-type.js');"
        sqlite3 src/sequelize/prod_database.sqlite "insert into SequelizeMeta (name) values ('20180928121334-insert-catalog-item-image.js');"
    fi
fi

rm -rf /tmp/iofogcontroller_install_variables