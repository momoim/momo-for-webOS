#!/bin/sh

# Packagefile for momo.im.app
# Helps to set up a custom packaging process
# Run from this directory, may require to create a bin

# Here the only thing different from the usual palm-package process is
# to add the script files afterwards.

APPID=momo.im.app

# create bin directory if not yet existing
/bin/mkdir bin

# package everything
palm-package --outdir=bin application package service

# add script files to package
/usr/bin/ar q bin/${APPID}*.ipk pmPostInstall.script
/usr/bin/ar q bin/${APPID}*.ipk pmPreRemove.script
