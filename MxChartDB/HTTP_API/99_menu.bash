#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         menu.bash
#h Type:         Linux shell script
#h Purpose:      menu for status, start, stop
#h Project:      
#h Usage:        ./menu.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V1.0.0 2024-05-23/peb
#v History:      V1.0.0 2023-06-12/peb first version
#h Copyright:    (C) piet66 2023
#h License:      MIT
#h
#h-------------------------------------------------------------------------------

#b constants
#-----------
MODULE='menu.bash';
VERSION='V1.0.0'
WRITTEN='2024-05-23/peb'

SERVICE=MxChartDB_API

#b variables
#-----------
_self="${0##*/}"

#b functions
#-----------
print_status () {
    systemctl is-active --quiet "$SERVICE" >/dev/null 2>&1
    if [ $? -ne 0 ]
    then
        user=`systemctl show -pUser $SERVICE`
        echo ''
        echo process $SERVICE, $user is not started
    else
        echo ''
        systemctl status $SERVICE --no-pager -l
        systemctl show -pUser $SERVICE
        echo ''
        procid=`pgrep -f $SERVICE.bash`
        pstree -lpts $procid
    fi
    echo ''
}

do_start () {
    echo -e "\n"sudo systemctl enable $SERVICE.service
    sudo systemctl enable $SERVICE.service >/dev/null 2>&1
    echo -e "\n"sudo systemctl start $SERVICE.service
    sudo systemctl start $SERVICE.service
    sleep 1
    print_status
}

do_stop () {
    echo -e "\n"sudo systemctl stop $SERVICE.service
    sudo systemctl stop $SERVICE.service
    echo -e "\n"sudo systemctl disable $SERVICE.service
    sudo systemctl disable $SERVICE.service >/dev/null 2>&1
    sleep 1
    print_status
}

pushd `dirname $0` >/dev/null 2>&1
while true ; do
    #b display menu
    #--------------
    systemctl is-active --quiet "$SERVICE" >/dev/null 2>&1
    if [ $? -ne 0 ]
    then
        option=`./bashmenu.bash $BASH_NAME $SERVICE status start logrotate`
    else
        option=`./bashmenu.bash $BASH_NAME $SERVICE status stop logrotate`
    fi
    
    #b execute
    #---------
    case $option in
        "status") 
            print_status
            read -p "press any key..."
            ;;
        "start") 
            do_start
            read -p "press any key..."
            ;;
        "stop")
            do_stop
            read -p "press any key..."
            ;;
        "logrotate")
            echo force logrotate $SERVICE.log
            sudo logrotate -f /etc/logrotate.d/$SERVICE
            read -p "press any key..."
            ;;
        "break")
            break
            ;;
    esac
done
popd >/dev/null 2>&1

