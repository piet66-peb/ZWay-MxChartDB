#!/bin/bash
#h-------------------------------------------------------------------------------
#h
#h Name:         download_MxChartDB.bash
#h Type:         Linux shell script
#h Purpose:      download the MxChartDB package from Github and copy it to the 
#h               Z-Way folder userModules
#h Project:      
#h Usage:        <path>/download_MxChartDB.bash
#h               or with wget:
#h               url=https://github.com/piet66-peb/ZWay-MxChartDB/raw/refs/heads/main/download_MxChartDB.bash
#h               cd /tmp; wget -q -O - $url | bash
#h Result:       
#h Examples:     
#h Outline:      
#h Resources:    
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V1.0.1 2025-10-09/peb
#v History:      V1.0.0 2024-10-02/peb first version
#h Copyright:    (C) piet66 2024
#h
#h-------------------------------------------------------------------------------

#b Constants
#-----------
MODULE='download_MxChartDB.bash'
VERSION='V1.0.1'
WRITTEN='2025-10-09/peb'

#b Variables
#-----------
pack=MxChartDB

gitpack=ZWay-$pack
url=https://github.com/piet66-peb/$gitpack/archive/refs/heads/main.zip
gitzip=$gitpack.zip
module=${gitpack}-main/${pack}
tardir=/opt/z-way-server/automation/userModules/
tmp=/tmp

#b Commands
#----------
set -e  # exit if any command fails

echo cd $tmp...
pushd $tmp >/dev/null

echo downloading $gitzip...
[ -e "$gitzip" ] && rm $gitzip
wget -nv -O $gitzip $url

echo extracting $gitzip...
[ -e "$module" ] && rm -R $module
unzip -q -o $gitzip

d=${tardir}${pack}/htdocs/HTML/libs
echo clearing $d...
rm -f $d/*.*

echo copying $pack to $tardir...
cp -dpR $module $tardir

echo done.
popd >/dev/null

