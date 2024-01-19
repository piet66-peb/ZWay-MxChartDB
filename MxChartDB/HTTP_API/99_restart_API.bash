#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         restart_API.bash
#h Type:         Linux shell script
#h Purpose:      restarts MxChartDB_API
#h Project:      
#h Usage:        ./restart_API.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V1.0.0 2023-11-09/peb
#v History:      V1.0.0 2022-11-20/peb first version
#h Copyright:    (C) piet66 2022
#h License:      MIT
#h
#h-------------------------------------------------------------------------------

MODULE='restart_API.bash';
VERSION='V1.0.0'
WRITTEN='2023-11-09/peb'

sudo systemctl stop  MxChartDB_API

sudo systemctl enable MxChartDB_API
sudo systemctl start MxChartDB_API
sudo systemctl status MxChartDB_API | cat
