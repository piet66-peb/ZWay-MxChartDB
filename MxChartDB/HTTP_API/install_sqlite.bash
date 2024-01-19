#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         install_sqlite.bash
#h Type:         Linux shell script
#h Purpose:      install sqlit, python/flask and MxChartDB HTTP API
#h Project:      
#h Usage:        ./install_sqlite.bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Raspberry Pi OS, Ubuntu
#h Authors:      peb piet66
#h Version:      V2.0.0 2023-11-16/peb
#v History:      V1.0.0 2022-03-14/peb first version
#v
#h Copyright:    (C) piet66 2022
#h License:      http://opensource.org/licenses/MIT
#h
#h-------------------------------------------------------------------------------

MODULE='install_sqlite.bash';
VERSION='V2.0.0'
WRITTEN='2023-11-16/peb'

set -e  # exit when any command fails
#set -x  # debug mode

echo -e "\nparams.bash"
. `dirname $0`/params.bash

echo -e "\nsetting ownership and rights of $SQLITE_FOLDER to $USER..."
cd $M
sudo chown -R $USER $SQLITE_FOLDER
sudo chgrp -R `id -gn` $SQLITE_FOLDER
sudo chmod -R g+rw,o+rw $M $SQLITE_FOLDER
umask g+rw,o+rw

echo -e "\ncreating remaining target folders..."
cd $M
mkdir -p $PYTHON_FOLDER
mkdir -p $LOG_FOLDER
sudo chown -R root $LOG_FOLDER
sudo chgrp -R root $LOG_FOLDER
ls -l

echo -e "\ninstalling sqlite3..."
sudo apt install -y sqlite3

echo -e "\nchecking python3 version..."
python3 -V

echo -e "\ninstalling python packets..."
sudo apt install -y python3-pip
sudo apt install -y python3-venv

cd $M/$SQLITE_FOLDER
if [ -e requirements.txt ]
then
    echo -e "\nrequirements.txt is existing"
else
    echo -e "\ninstalling pipreqs..."
    pip3 install pipreqs
    export PATH=$PATH:~/.local/bin
fi

echo -e "\nsetting up local python environment..."
cd $M/$PYTHON_FOLDER
python3 -m venv rest_api
source rest_api/bin/activate

cd $M/$SQLITE_FOLDER
if [ -e requirements.txt ]
then
    echo -e "\nrequirements.txt is existing"
else    
    echo -e "\ncreatng new requirements.txt file from application..."
    pipreqs . --print | tee requirements.txt
fi

echo -e "\ninstalling local python modules from requirements.txt"
pip3 install -r requirements.txt

echo -e "\ndisplaying all installed python packages..."
pip3 freeze | tee requirements_freeze.txt

echo -e "\ncreating systemd servic file..."
cat <<EOF >MxChartDB_API.service
[Unit]
Description=HTTP API for MxChartDB_API + SQLite as a service
#Before=z-way-server.server

[Service]
User=root
Restart=always
WorkingDirectory=$M/$SQLITE_FOLDER
ExecStart=$M/$SQLITE_FOLDER/MxChartDB_API.bash

[Install]
WantedBy=multi-user.target z-way-server.service
EOF
sudo mv MxChartDB_API.service /etc/systemd/system/MxChartDB_API.service
sudo systemctl daemon-reload
sudo systemctl enable MxChartDB_API

echo -e "\ncreating logrotate definition file..."
cat <<EOF >MxChartDB_API.logrotate
$M/$LOG_FOLDER/MxChartDB_API.log {
        su root root
        size=3M
        rotate 10
        compress
        missingok
        notifempty
        copytruncate
}
EOF
sudo mv MxChartDB_API.logrotate /etc/logrotate.d/MxChartDB_API

if [ ! -e constants.py ]
then
    echo -e "\ncreating MxChartDB_API parameter file constants.py..."
    cp constants_template.py constants.py
fi

echo -e "\ninstallation succesfully completed."

echo -e "\nPlease insert your API parameterization in the constants.py file!"

