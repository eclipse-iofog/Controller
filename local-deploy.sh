#!/usr/bin/env bash

# Running this script will take you current dev environment, and deploy it to
# your local machine for easy testing without needing to push it to travisci or make a PR

npm pack
VERSION=`npm view iofogcontroller version`

# If this doesn't work, you may need to run it with sudo depending
# on how you've set up your privileges, or if on Windows, with Admin Privilege

iofog-controller stop; npm i --unsafe-perm -g ./iofogcontroller-${VERSION}.tgz; iofog-controller start