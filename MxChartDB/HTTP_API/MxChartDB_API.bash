#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         MxChartDB_API.bash
#h Type:         Linux shell script
#h Purpose:      start flask/ rest_api for MxChartDB database
#h Project:      
#h Usage:        ./MxChartDB_API.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V2.0.0 2026-02-10/peb
#v History:      V1.0.0 2022-03-14/peb first version
#h Copyright:    (C) piet66 2022
#h License:      http://opensource.org/licenses/MIT
#h
#h-------------------------------------------------------------------------------

MODULE='MxChartDB_API.bash';
VERSION='V2.0.0'
WRITTEN='2026-02-10/peb'

set -e  # exit when any command fails

### detect folder structure
. `dirname $0`/params.bash

### constants
MxC=MxChartDB_API
LOG=$M/$LOG_FOLDER/${MxC}.log

### affirm python environment
cd $M/$PYTHON_FOLDER
source rest_api/bin/activate

### jump to working directory
cd $M/$SQLITE_FOLDER

### uncomment this line for debug messages (single threaded)
#export FLASK_ENV=development

### define application
export FLASK_APP=$MxC

### for to change the default port 5000
export FLASK_RUN_PORT=8082

### listen for remote packets
export FLASK_RUN_HOST=0.0.0.0   # ipv4
#export FLASK_RUN_HOST=::        # ipv6

### run
flask run >>$LOG 2>&1

