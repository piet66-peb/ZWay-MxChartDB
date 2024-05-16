#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         get_procid.bash
#h Type:         Linux shell script
#h Purpose:      gets the process, displays start/ stop command
#h Project:      
#h Usage:        ./get_procid.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V1.0.1 2024-05-09/peb
#v History:      V1.0.0 2022-12-11/peb first version
#h Copyright:    (C) piet66 2022
#h License:      MIT
#h
#h-------------------------------------------------------------------------------

MODULE='get_procid.bash';
VERSION='V1.0.1'
WRITTEN='2024-05-09/peb'

PROC=MxChartDB_API
systemctl is-active --quiet "$PROC"

if [ $? -ne 0 ]
then    
    user=`systemctl show -pUser $PROC`
    echo ''
    echo process $PROC, $user is not started
else
    echo ''
    systemctl status $PROC --no-pager -l
    systemctl show -pUser $PROC
    echo ''
    echo stop process with:
    echo "sudo systemctl stop $PROC"
fi

echo ''
echo 'start process with:'
echo "sudo systemctl start $PROC"
echo ''

