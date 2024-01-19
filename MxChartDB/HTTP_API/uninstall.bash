#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         uninstall.bash
#h Type:         Linux shell script
#h Purpose:      uninstalls sqlite, python modules and MxChartDB HTTP API
#h Project:      
#h Usage:        ./uninstall.bash
#h               Per default the installation is done in /media/ZWay_USB/
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Raspberry Pi OS, Ubuntu
#h Authors:      peb piet66
#h Version:      V2.0.0 2023-11-11/peb
#v History:      V1.0.0 2022-03-14/peb first version
#h Copyright:    (C) piet66 2022
#h License:      http://opensource.org/licenses/MIT
#h
#h-------------------------------------------------------------------------------

MODULE='uninstall.bash';
VERSION='V2.0.0'
WRITTEN='2023-11-11/peb'

#set -e     # exit when any command fails
#set -x     # debug mode

set -e
echo -e "\nparams.bash"
. `dirname $0`/params.bash
set +e


echo -e "\njumping to root folder $M..."
cd $M

echo -e "\nstopping API..."
sudo systemctl stop MxChartDB_API
sudo systemctl disable MxChartDB_API

echo -e "\nremoving systemd parameterization..."
sudo rm -f /etc/systemd/system/MxChartDB_API.service
sudo systemctl daemon-reload
sudo systemctl reset-failed

echo -e "\nremoving logrotate parameterization..."
sudo rm -f /etc/logrotate.d/MxChartDB_API

echo -e "\nuninstalling sqlite3..."
sudo apt remove sqlite3

#echo -e "\nuninstalling python3 packages..."
#pip3 uninstall pipreqs
#sudo apt remove python3-pip
#sudo apt remove python3-venv

echo -e "\nremoving application folders..."

echo ''
read -p "remove folder ./${LOG_FOLDER}? [Y,n] " CONT
if [ "$CONT" == "" ] || [ "$CONT" == "Y" ]
then
    sudo rm -Rrfd $M/$LOG_FOLDER
fi

echo ''
read -p "remove folder ./${PYTHON_FOLDER}? [Y,n] " CONT
if [ "$CONT" == "" ] || [ "$CONT" == "Y" ]
then
    sudo rm -Rrfd $M/$PYTHON_FOLDER
fi

echo -e "\nplease remove folder ./$SQLITE_FOLDER manually with command:"
echo -e "sudo rm -R $M/$SQLITE_FOLDER"

