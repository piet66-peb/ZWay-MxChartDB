
[![](MxChartDB/htdocs/icon.png)](https://github.com/piet66-peb?tab=repositories)

# MxChartDB

The intent of this Z-Way module is to provide a quick and easy way to create
beautiful sensor logging graphs.  The data is stored in a database. The HTTP 
API allows it to be installed locally and on any system on the network. 
No internet service is required.

This package uses [SQLite](https://www.sqlite.org) as database engine and 
[Chart.js](https://www.chartjs.org/) as charting library.

## Preconditions

SQLite with HTTP API. Everything you need for installation is included in this package (Linux only).

## Links

[Example Charts](https://rawcdn.githack.com/piet66-peb/ZWay-MxChartDB/9422259/html/examples_img.html)

[HowTos](https://rawcdn.githack.com/piet66-peb/ZWay-MxChartDB/9422259/html/howtos.html)

## Installation

<del>Download and install the module and the API from the Z-Way App Store.
</del>

Since the Z-Way Management has discontinued its support services, I have made my 
software available on GitHub. The version in the Z-Way App Store is now out 
of date.

- Download the package with wget from this site:
```sh
# run these commands in a terminal on the Z-Way server computer:
url=https://github.com/piet66-peb/ZWay-MxChartDB/raw/refs/heads/main/download_MxChartDB.bash
cd /tmp
wget -q -O - $url | sudo bash

```
- Restart Z-Way after the download to activate the package. 
- Then follow the installation procedure outlined in the HowTos.

## Upgrade

- Download the package with wget from this site:
```sh
# run these commands in a terminal on the Z-Way server computer:
url=https://github.com/piet66-peb/ZWay-MxChartDB/raw/refs/heads/main/download_MxChartDB.bash
cd /tmp
wget -q -O - $url | sudo bash

```
- If you have placed the HTTP_API in a different location, copy its contents there. 
- check the template files **constants_template.js** and **constants_template\.p**y
to see if you need to make any changes.
- Then restart MxChartDB_API\.py and Z-Way.

### Remark

I always try to maintain backward compatibility. However, this is not 
always completely possible. You will recognise this in the graphics output 
or the chart configuration.  Simply correct it in the configuration.

## License: MIT

Copyright © 2022 piet66

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is furnished 
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.

