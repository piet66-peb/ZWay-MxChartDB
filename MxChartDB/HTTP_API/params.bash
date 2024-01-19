#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         params.bash
#h Type:         Linux shell script
#h Purpose:      subprocess for install_sqlite.bash
#h               detects and returns the current directory structure
#h               which can be included into other bash scripts
#h Project:      
#h Usage:        ./params.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Raspberry Pi OS, Ubuntu
#h Authors:      peb piet66
#h Version:      V1.0.0 2023-11-09/peb
#v History:      V1.0.0 2023-11-07/peb first version
#v
#h Copyright:    (C) piet66 2023
#h License:      http://opensource.org/licenses/MIT
#h
#h-------------------------------------------------------------------------------

MODULE='params.bash';
VERSION='V1.0.0'
WRITTEN='2023-11-09/peb'

set -e  # exit when any command fails
#set -x  # debug mode

# detecting current folder name (sqlite folder)...
DIRNAME=`dirname $0`
WORKDIR=`pwd`
if [ "$DIRNAME" != "" ]
then
    pushd "$DIRNAME" >/dev/null 2>&1
        WORKDIR=`pwd`
        #echo WORKDIR=$WORKDIR
    popd >/dev/null 2>&1
fi
export SQLITE_FOLDER=`basename $WORKDIR`
export M=`dirname $WORKDIR`

# setting other folder names...
export PYTHON_FOLDER=python_env
export LOG_FOLDER=log

echo M=$M
echo SQLITE_FOLDER=$SQLITE_FOLDER
echo PYTHON_FOLDER=$PYTHON_FOLDER
echo LOG_FOLDER=$LOG_FOLDER

