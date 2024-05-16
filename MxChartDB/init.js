/*** MxChartDB init.js */

//h-------------------------------------------------------------------------------
//h
//h Name:         init.js
//h Type:         init functions for MxChartDB module
//h Project:      Z-Way HA
//h Usage:        
//h Remark:       
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Issues:       
//h Authors:      peb piet66
//h Version:      V2.0.1 2024-05-15/peb
//v History:      V1.0.0 2022-03-23/peb first version
//v               V1.1.0 2022-04-15/peb [+]handle broken connection and locked
//v                                        database
//v                                     [x]correct some response status
//v                                     [+]bulk inserts
//v               V2.0.1 2024-05-12/peb [-]self.config.chartInterval is obsolete
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals zway */
'use strict';

//-----------
//b Constants
//-----------
//var MODULE='init.js';
//var VERSION='V2.0.1';
//var WRITTEN='2024-05-15/peb';

//-----------
//b Functions
//-----------
var init = function (self) {
    var chartHeaderBuild  = null;
    var storeNewValueData = null;
    var globalData        = null;
    var doWhenChanged     = null;

    init0 ();
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         init0
    //h Purpose:      module initialization.
    //h
    //h-------------------------------------------------------------------------------
    function init0 () {
        self.log('*** init0');

        self.intchartIcons = [];
        self.sensors = [];
   
        // for check ip address for validity:
//      // ipv4:
//      var regexExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
        // ipv4 + ipv6 combined:
        var regexExp = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$)/gm;      

        //b reorder constants
        //-------------------
        if (self.constants.hasOwnProperty('zway_app')) {
            if (self.constants.zway_app.ip) {
                self.constants.ip = self.constants.zway_app.ip;
            }
            if (self.constants.zway_app.hostname) {
                self.constants.hostname = self.constants.zway_app.hostname;
            }
            if (self.constants.zway_app.retry_init_min) {
                self.constants.retry_init_min = self.constants.zway_app.retry_init_min;
            }
            if (self.constants.zway_app.buffer_max_rows) {
                self.constants.buffer_max_rows = self.constants.zway_app.buffer_max_rows;
            }
        }
        self.info('self.constants.ip', self.constants.ip, 
                  'self.constants.hostname', self.constants.hostname);

        if (self.constants.hasOwnProperty('browser_client')) {
            if (self.constants.browser_client.ip) {
                self.constants.ip_browser = self.constants.browser_client.ip;
            }
            if (self.constants.browser_client.hostname) {
                self.constants.hostname_browser = self.constants.browser_client.hostname;
            }
        }
         
        //b check configuration
        //---------------------
        self.err = undefined;
        if (self.config.chartTitle === undefined) {
            self.err = 'no chart title defined';
        } else
        if (self.config.chartTitle.trim() === '') {
            self.err = 'no chart title defined';
        } else
        if (!self.constants.ip && !self.constants.hostname) {
            self.err = 'no server ip/ hostname defined';
        } else
        if (self.constants.ip && self.constants.ip === '') {
            self.err = 'server ip is malformed';
        } else
        if (self.constants.ip && !regexExp.test(self.constants.ip)) {
            self.err = 'server ip is invalid';
        } else
        if (!self.constants.ip && self.constants.hostname === '') {
            self.err = 'server hostname is malformed';
        } else
        if (!self.constants.port) {
            self.err = 'no server port defined';
        } else
        if (!self.constants.username) {
            self.err = 'no username defined';
        } else
        if (self.constants.username === '') {
            self.err = 'no username defined';
        } else
        if (!self.constants.password) {
            self.err = 'no password defined';
        } else
        if (self.constants.password === '') {
            self.err = 'no password defined';
        } else
        if (!self.constants.retry_init_min) {
            self.err = 'retry_init_min not defined';
        } else
        if (!Number.isInteger(self.constants.retry_init_min)) {
            self.err = 'retry_init_min is not an integer';
        } else
        if (self.constants.retry_init_min < 1) {
            self.err = 'retry_init_min must be a positive integer';
        } else
        if (self.constants.buffer_max_rows === undefined) {
            self.err = 'buffer_max_rows not defined';
        } else
        if (!Number.isInteger(self.constants.buffer_max_rows)) {
            self.err = 'buffer_max_rows is not an integer';
        } else
        if (self.constants.buffer_max_rows < 0) {
            self.err = 'buffer_max_rows may not be negative';
        } else
        if (self.config.sensors.length === 0) {
            self.err = 'no sensor defined';
        } 
        if (self.err) {
            self.notifyError(self.err);
            return;
        }
        self.api = self.constants.ip || self.constants.hostname;
        self.buffer_max_rows = self.constants.buffer_max_rows;
        self.data_buffer = [];
    
        //b set defaults
        //--------------
        if (!self.config.DBName) {self.config.DBName = self.databaseIndex;}
        var letterNumber = /^[0-9a-zA-Z]+$/;
        if(! self.config.DBName.match(letterNumber)) {
            throw(self.instanceMessage+': invalid database name, break.');
        }
        self.database = self.config.DBName;
        if (!self.config.limitYAxis) {self.config.limitYAxis = 1000;}
        if (!self.config.opacity) {self.config.opacity = 60;}
        if (!self.config.time_label) {self.config.time_label = 'null';}
        if (!self.config.y1Label) {self.config.y1Label = 'null';}
        if (!self.config.y2Label) {self.config.y2Label = 'null';}
        if (!self.config.rectangleDevices) {self.config.rectangleDevices = ',';}
        if (self.config.chartInterval) {self.config.chartInterval = undefined;}
        if (!self.config.initialInterval) {self.config.initialInterval = 'complete';}
        if (!self.config.startFullTimes) {self.config.startFullTimes = false;}
        if (!self.config.nonnumericLabels.y3reduceUnusedTicks) {
            self.config.nonnumericLabels.y3reduceUnusedTicks = false;
        }
        if (!self.config.nonnumericLabels.y3leastTicks) {
            self.config.nonnumericLabels.y3leastTicks = 2;
        }
    
        //b get API version (=>ajax_get)
        //------------------------------
        var url_get = '../version';
        self.ajax_get(url_get, 
                      function(response) {
                          self.log(response.data);
                          if (isVersionOK(response.data.VERSION.substr(1), 
                                           self.LEAST_API_VERSION.substr(1))) {
                              check_create_default_db();
                          } else {
                              self.notifyError(response.data.MODULE+' version too old'+
                                              '<br>current: '+response.data.VERSION+
                                              '<br>required: '+self.LEAST_API_VERSION);
                              check_create_default_db();
                          }
                      }, 
                      function(response) {
                          var url = self.api+':'+self.constants.port;
                          self.notifyError(response.status+' '+response.statusText+
                                           ' requesting MxChartDB_API.py version from '+url);
                      } 
        );
    } //init0

    function isVersionOK (currVersion, requestVersion) {
        self.log('*** isVersionOK');

        var currVersionArr = currVersion.split('.');
        var requestVersionArr = requestVersion.split('.');

        for (var i = 0; i < requestVersionArr.length; i++) {
            if (currVersionArr[i]*1 < requestVersionArr[i]*1) {
                return false;
            }
            if (currVersionArr[i]*1 > requestVersionArr[i]*1) {
                return true;
            }
        }
        return true;
    } //isVersionOK
    
    function check_create_default_db () {
        self.log('*** check_create_default_db');
    
        //b check/ create db server + database (=>ajax_post)
        //--------------------------------------------------
        var url_create = 'create_db';
        self.ajax_post(url_create, undefined,
                       function() {
                           self.log('database '+self.databaseIndex+
                                    ' created/ already existing');
                           check_create_db();}, 
                       'checking/creating database '+self.databaseIndex,
                       self.databaseIndex
        );
    } //check_create_default_db
    
    function check_create_db () {
        self.log('*** check_create_db');
    
        //b check/ create db server + database (=>ajax_post)
        //--------------------------------------------------
        var url_create = 'create_db';
        self.ajax_post(url_create, undefined,
                       function() {
                           self.log('database '+self.database+
                                    ' created/ already existing');
                           init1();}, 
                       'checking/creating database '+self.database
        );
    } //check_create_db
    
    function init1 () {
        self.log('*** init1');
    
        //b check chartId for uniqueness
        //------------------------------
        var chartIdTest = self.config.chartId;
        var chartIdTestFound = false;
        if (chartIdTest) {
            var chartId_instance = chartIdTest.replace(/^.*\D/, '')*1;
            //self.info(chartIdTest, chartId_instance);
            if (chartId_instance !== self.id) {
                Object.keys(self.controller.instances).forEach(function(ix) {
                    var i = self.controller.instances[ix];
                    if (i.moduleId === 'MxChartDB' && i.id !== self.id &&
                        i.params.chartId === chartIdTest) {
                        self.info('chart instance found with same chartId='+chartIdTest);
                        chartIdTestFound = true;
                    }
                });
            }
            if (chartIdTestFound) {
                self.config.chartId = '';
                self.info('chartId='+chartIdTest+' reset');
            }
        }
    
        //b set unique chartId
        //--------------------
        if (!self.config.chartId) {
            chartIdTest = self.moduleName + self.id;
            //self.info('chartIdTest', chartIdTest);
    
            //b check if chartId already used
            //-------------------------------
            var chartIdUsed = '';
            Object.keys(self.controller.instances).forEach(function(ix) {
                var i = self.controller.instances[ix];
                if (i.moduleId === 'MxChartDB') {
                    var chartIdUsedi = i.params.chartId;
                    //self.info(i.id, 'chartIdUsedi', chartIdUsedi);
                    if(chartIdUsedi && chartIdUsedi.indexOf(chartIdTest) >= 0) {
                        if (chartIdUsedi.length > chartIdUsed.length) {
                            chartIdUsed = chartIdUsedi;
                            //self.info('chartIdUsed', chartIdUsed);
                        }
                    }
                }
            });
            chartIdTest = chartIdUsed !== '' ? chartIdUsed+'_'+self.id : chartIdTest;
            self.config.chartId = chartIdTest;
            self.info('chartId set to '+chartIdTest);
        }
        self.log('self.config.chartId', self.config.chartId);
        self.tableNameValues = self.config.chartId;
        self.tableNameHeader = self.config.chartId+'_Header';
        self.tableNameIndex  = 'MxChartDB_Index';
    
        //b check/ create index table (=>create_index_table)
        //--------------------------------------------------
        create_index_table();
    } //ini1
    
    function create_table (tableName, callback, database) {
        self.log('*** create_table', tableName);

        if (!database) {
            database = self.database;
        }

        var url_create = tableName+'/create_table';
        self.ajax_post(url_create, undefined,
                       function() {
                           self.log('table '+tableName+' created');
                           callback();
                       }, 
                       'creating table '+tableName,
                       database
        );
    } //create_table

    function create_index_table () {
        self.log('*** create_index_table', self.tableNameIndex);
    
        var url_check = self.tableNameIndex+'/check_table';
        self.ajax_get(url_check,
                      function() {
                          self.log('table '+self.tableNameIndex+' checked, existing');
                          create_header_table();
                      }, 
                      function() {
                          self.log('table '+self.tableNameIndex+' not existing');
                          create_table(self.tableNameIndex, 
                                       function() {
                                           create_header_table();
                                       },
                                       self.databaseIndex
                          );
                      },
                      self.databaseIndex
        );
    } //create_index_table
   
    function create_header_table () {
        self.log('*** create_header_table', self.tableNameHeader);
    
        var url_check = self.tableNameHeader+'/check_table';
        self.ajax_get(url_check,
                      function() {
                          self.log('table '+self.tableNameHeader+' checked, existing');
                          create_data_table();
                      }, 
                      function() {
                          self.log('table '+self.tableNameHeader+' not existing');
                          create_table(self.tableNameHeader, 
                                            function() {
                                                create_data_table();
                                            }
                          );
                      }
        );
    } //create_header_table
   
    function create_data_table () {
        self.log('*** create_data_table', self.tableNameValues);
    
        var url_check = self.tableNameValues+'/check_table';
        self.ajax_get(url_check,
                      function() {
                          self.log('table '+self.tableNameValues+' checked, existing');
                          initExec();
                      }, 
                      function() {
                          self.log('table '+self.tableNameValues+' not existing');
                          create_table(self.tableNameValues, 
                                            function() {
                                                initExec();
                                            }
                          );
                      }
        );
    } //create_data_table

    //h-------------------------------------------------------------------------------
    //h
    //h Name:         initExec
    //h Purpose:      module kickoff.
    //h
    //h-------------------------------------------------------------------------------
    function initExec () {
        self.log('*** initExec');
    
        //b store data globally
        //---------------------
        globalData = {
            chartTitle: self.config.chartTitle.trim(),
            chartId: self.config.chartId,
            chartInterval: self.config.interval,
            initialInterval: self.config.initialInterval,
            time_label: self.config.time_label,
            y1Label: self.config.y1Label,
            y2Label: self.config.y2Label,
            period: self.config.period,
            chartLanguage: self.config.lang,
            positionYAxis: self.config.positionYAxis,
            limitYAxis: self.config.limitYAxis,
            opacity: self.config.opacity,
            chartUrl: self.chartUrl,
            startFullTimes: self.config.startFullTimes,
            convertOnOff: self.config.nonnumericLabels.convertOnOff,
            y3Labeling: self.config.nonnumericLabels.y3Labeling,
            y3Icons: self.config.nonnumericLabels.y3Icons,
            y3IconsWidth: self.config.nonnumericLabels.y3IconsWidth,
            y3reduceUnusedTicks: self.config.nonnumericLabels.y3reduceUnusedTicks,
            y3leastTicks: self.config.nonnumericLabels.y3leastTicks,
            ZWayVersion: zway.controller.data.softwareRevisionVersion.value,
            nightBackground: self.config.specials.nightBackground,
            nightBackDev: self.config.specials.nightBackDev,
        };
    
        //b compute chart length (seconds)
        //--------------------------------
        switch (self.config.interval) {
            case "day":
                self.chartIntervalMSecs = 1 * 24 * 60 * 60 * 1000;
                break;
            case "2days":
                self.chartIntervalMSecs = 2 * 24 * 60 * 60 * 1000;
                break;
            case "week":
                self.chartIntervalMSecs = 7 * 24 * 60 * 60 * 1000;
                break;
            case "2weeks":
                self.chartIntervalMSecs = 2 * 7 * 24 * 60 * 60 * 1000;
                break;
            case "month":
                self.chartIntervalMSecs = 31 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                self.chartIntervalMSecs = 366 * 24 * 60 * 60 * 1000;
                break;
            default:
                self.chartIntervalMSecs = 0;
        }
    
        //b rectangle devices list
        //------------------------
        var rectArray = self.list2Array(self.config.rectangleDevices);
    
        //b for all devices
        //-----------------
        var sensorsCount = self.config.sensors.length;
        _.each(self.config.sensors, function(sensor, index) {
            var devId, vDev, deviceType, title, scale, formula, devlabel, dev_key;
            if (sensor.disableDevice) {
                devId = null;
                title = 'None';
                formula = 'null';
                devlabel = 'null';
                dev_key = devlabel;
            } else
            if (sensor.device) {
                devId = sensor.device;
                vDev = self.controller.devices.get(devId);
                deviceType = vDev.get("deviceType");
                title = vDev.get("metrics:title");
                scale = vDev.get("metrics:scaleTitle");
                formula = sensor.formula;
                devlabel = sensor.devlabel || 0;
                dev_key = sensor.devlabel || 0;
            } else {
                devId = null;
                title = 'None';
                if (sensor.formula) {
                    formula = sensor.formula;
                } else {
                    formula = 'null';
                }
                if (sensor.devlabel) {
                    devlabel = sensor.devlabel;
                    dev_key = devlabel;
                } else {
                    devlabel = 'null';
                    dev_key = devlabel;
                }
            }
    
            var item = {
                index: index,
                id: devId,
                deviceType: deviceType,
                metric: sensor.metric || 'level',
                tooltip_metric: sensor.tooltip_metric || '',
                formula: formula,
                color: sensor.color,
                graphType: sensor.graphType,
                lineType: sensor.lineType,
                fill: sensor.fill,
                binary: false,
                chartHidden: sensor.chartHidden || false,
                intcharticon: sensor.intcharticon || false,
                polling: globalData.period <= 0 ? true : false,
                title: title,
                scale: scale,
                devlabel: sensor.devlabel || 0,
                dev_key: sensor.devlabel || 0,
                disableDevice: sensor.disableDevice || false
            };
            item.tooltip_metric = item.tooltip_metric.trim();
    
            //b check fill entry
            //------------------
            if (sensor.fill) {
                if (sensor.fill > sensorsCount && sensor.fill < 98) {
                    item.fill = undefined;
                }
            }
    
            //b binary device?
            //----------------
            if (item.deviceType && item.deviceType.indexOf('Binary') >= 0) {
                item.binary = true;
            }
    
            //b make graph label
            //------------------
            if (item.dev_key === 0 && item.title !== undefined) {
                var s_title = item.title;
                //compute scale if not level
                if (item.metric !== 'level') {
                    s_title += ': '+item.metric;
                    item.scale = undefined; //vDev.get("metrics:" + item.metric + "Scale") || item.scale;
                }
                //add scale to label
                if (item.scale === undefined) {
                    item.dev_key = s_title;
                } else {
                    var str = s_title + " (" + item.scale + ")";
                    var p = str.lastIndexOf(' ()');
                    if (p === str.length - 3) {
                        item.dev_key = str.substring(0, p);
                    } else {
                        item.dev_key = str;
                    }
                }
            } //item.dev_key === 0
    
            //b compute graph type
            //--------------------
            if (item.graphType === undefined && item.binary) {
                item.graphType = "rectangle";
            }
            if (item.graphType === undefined) {
                for (var i = 0; i < rectArray.length; i++) {
                    if (item.title.indexOf(rectArray[i]) >= 0 ||
                        item.dev_key.indexOf(rectArray[i]) >= 0) {
                        item.graphType = "rectangle";
                    }
                }
            }

            if (["rectangle", "rectangle_left", "pointseries", "interpolatedpoints", 
                 "straightpoints", "points"].indexOf(item.graphType) >= 0) {
                item.polling = true;
            }
    
            //b add icon to virtual device
            //----------------------------
            if (item.intcharticon) {
                self.intchartIcons.push(devId);
            }
    
            self.sensors.push(item);
            self.log("sensor item", item);
    
        });
        self.log("intchartIcons", self.intchartIcons);

        var db_chartId = self.database+'.'+self.config.chartId;
        if (self.database === self.databaseIndex) {
            db_chartId = self.config.chartId;
        }
        //define intxhartUrl:
        var api_browser = self.constants.ip_browser || 
                            self.constants.hostname_browser ||
                            self.api;
        self.chartUrl = 'http://'+api_browser+':'+self.constants.port+
                        '/HTML_MODAL/MxChartDB/'+db_chartId;
    
        self.log(self.chartUrl);
        setUrlToAllDevices();
    
        //b request current header data from server
        //-----------------------------------------
        var tableName = self.tableNameHeader;
        var url_select = tableName+'/select_next?ts=0';
        self.ajax_get(url_select,
                      function(response) {
                          if (response.status === 204) {
                              self.log('table '+tableName+' no contents');
                              compareHeaderData();
                          } else {
                              self.log('table '+tableName+' data selected');
                              compareHeaderData(response.data[0]);
                          }
                      },
                      function(response) {
                          if (response.status === 404) {
                              self.log('table '+tableName+' no data');
                              compareHeaderData();
                          } else {
                              self.notifyError(url_select+' '+response.status+' '+response.statusText);
                              self.error('selecting in table '+tableName);
                          }
                      }
        );
    } //initExec
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         compareHeaderData
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function compareHeaderData (chartHeaderStored) {
        self.log('*** compareHeaderData');
    
        //b build new chart header data (=>build_chart_header)
        //----------------------------------------------------
        self.now = Date.now();
        chartHeaderBuild = build_chart_header();
        self.log('chartHeaderBuild', chartHeaderBuild);
    
        //b data control
        //--------------
        self.log('------ dataControl', self.config.dataControl.dC_new, 
                                       self.config.dataControl.dC_continue);
        doWhenChanged = 'wait';
        if (self.config.dataControl.dC_new) {
            self.info('building up new chart');
            doWhenChanged = 'remove';
            self.config.dataControl.dC_new = false;
        } else
        if (self.config.dataControl.dC_continue) {
            self.info('continuing current chart with new devices');
            doWhenChanged = 'continue';
            self.config.dataControl.dC_continue = false;
            //miracle: after deactivate/activate boolean item still is true
            //         only after open and save module.json it's false
            //         >> doesn't matter in this case
        }
    
        var DEVICES_REMOVED = 1;
        var DEVICES_CHANGED = 2;
        var DEVICES_ADDED = 3;
        var storeNewHeaderData, removeOldValueData;
    
        var chartHeaderStoredStringified;
        var chartHeaderStringified;
        if (chartHeaderStored)  {
            self.log('chartHeaderBuild.chartDevices', chartHeaderBuild.chartDevices);
            self.log('chartHeaderStored', chartHeaderStored);
            chartHeaderStored.Timestamp = chartHeaderBuild.Timestamp;
            chartHeaderStored.chartDevicesNew = [];
            chartHeaderStored.errText = 0;
            chartHeaderStoredStringified = JSON.stringify(chartHeaderStored);
            chartHeaderStringified     = JSON.stringify(chartHeaderBuild);
            self.log('chartHeaderStored.chartDevices', chartHeaderStored.chartDevices);
        }

        //b if no requested header data received
        //--------------------------------------
        if (!chartHeaderStored)  {
            storeNewHeaderData = true;
            removeOldValueData = false;
            storeNewValueData  = true;
        } else
        //b else if header not changed
        //----------------------------
        if (chartHeaderStoredStringified === chartHeaderStringified)  {
            self.log('headerdata not changed');
            storeNewHeaderData = true;
            removeOldValueData = false;
            storeNewValueData  = true;
        } else
        //b else if header data changed
        //-----------------------------
        {
            storeNewHeaderData = true;
    
            //b if device list not changed
            //----------------------------
            var chartDevicesCurr = JSON.stringify(chartHeaderStored.chartDevices);
            var chartDevicesNew = JSON.stringify(chartHeaderBuild.chartDevices);
            if (chartDevicesCurr === chartDevicesNew) {
                self.log('devices not changed');
                removeOldValueData = false;
                storeNewValueData  = true;
            } else
            //b else if device list changed
            //-----------------------------
            if (chartDevicesCurr !== chartDevicesNew) {
                self.info('device list changed !!!');

                var db_chartId = self.database+'.'+self.config.chartId;

                //b if 'delete old value data if changed'
                //---------------------------------------
                if (doWhenChanged === 'remove') {
                    removeOldValueData = true;
                    storeNewValueData  = true;
                } else
                //b else if 'wait when changed'
                //---------------------------  
                if (doWhenChanged === 'wait') {
                    removeOldValueData = false;
                    storeNewValueData  = false;
    
                    chartHeaderStored.chartDevicesNew = chartHeaderBuild.chartDevices;
                    //b if devices removed
                    //--------------------
                    if (chartHeaderBuild.chartDevices.length < chartHeaderStored.chartDevices.length) {
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_REMOVED;
                    } else
                    //b else if devices added
                    //-----------------------
                    if (chartHeaderBuild.chartDevices.length > chartHeaderStored.chartDevices.length) {
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_ADDED;
                    } else {
                    //b else if devices changed
                    //-------------------------
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_CHANGED;
                    }
                    chartHeaderBuild = chartHeaderStored;
                } else
                //b else if 'continue chart when changed'
                //---------------------------------------
                if (doWhenChanged === 'continue') {
                    //b if devices removed
                    //--------------------
                    if (chartHeaderBuild.chartDevices.length < chartHeaderStored.chartDevices.length) {
                        removeOldValueData = false;
                        storeNewValueData  = false;
    
                        chartHeaderStored.chartDevicesNew = chartHeaderBuild.chartDevices;
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_REMOVED;
                    //b else
                    //------
                    } else {
                        removeOldValueData = false;
                        storeNewValueData  = true;
                    }
                }
            }
        } //header data changed
    
        var ts = self.now;
        var callback = function () {build_chart_index(ts);};
    
        //b if remove all old sensor value data
        //--------------------------------------
        if (removeOldValueData) {
            //b delete all sensor data and exchange header
            //--------------------------------------------
            var url_delete = self.tableNameValues+'/delete_prev?ts='+ts;
            self.ajax_post(url_delete, undefined,
                        function() {
                            self.log('table '+self.tableNameValues+' old data removed');
                            if (storeNewHeaderData) {
                                self.store_table_data(self.tableNameHeader, ts, chartHeaderBuild, callback, ts);
                            } else {
                                callback();
                            }
                        },
                        'table '+self.tableNameValues+' delete_prev?ts='+self.now
            );
        //b else if new header data
        //-------------------------
        } else
        if (storeNewHeaderData) {
            //b exchange header
            //-----------------
            self.store_table_data(self.tableNameHeader, ts, chartHeaderBuild, 
                                    callback, ts);
        //b else
        //------
        } else {
            //b continue
            //----------
            callback();
        }
    } //compareHeaderData
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         build_chart_index
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function build_chart_index (ts) {
        self.log('*** build_chart_index', ts);
   
        function store_index (data) {
            var db_chartId = self.database+'.'+self.config.chartId;
            if (self.database === self.databaseIndex) {
                db_chartId = self.config.chartId;
            }
            if (data) {
                self.log('data in', data);
                if (data.hasOwnProperty(db_chartId) && data[db_chartId] === self.config.chartTitle) {
                    self.log('chart '+db_chartId+' already in index');
                    initExec1();
                    return;
                }
            } else {
                data = {};
            }
            data[db_chartId] = self.config.chartTitle;
            self.log('data out', data);
            self.store_table_data(self.tableNameIndex, 
                                  ts, data, 
                                  function () {initExec1();}, 
                                  ts,
                                  self.databaseIndex);
        }
    
        var url_select = self.tableNameIndex+'/select_next?ts=0';
        self.ajax_get(url_select, 
                      function(response) {
                          if (response.status === 204) {
                              self.log('table '+self.tableNameIndex+' no contents');
                              store_index();
                          } else {
                              self.log('table '+self.tableNameIndex+' data selected');
                              store_index(response.data[0]);
                          }
                      },
                      function(response) {
                          if (response.status === 404) {
                              self.log('table '+self.tableNameIndex+' no data');
                              store_index();
                          } else {
                              self.error('table '+self.tableNameIndex+' select_next');
                          }
                      },
                      self.databaseIndex
        );
    } //build_chart_index
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         initExec1
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function initExec1 () {
        self.log('*** initExec1');
    
        self.log('initExec1', 'storeNewValueData='+storeNewValueData);
        if (!storeNewValueData) {return;}
    
        //b if necessary define callback
        //------------------------------
        if (!self.config.startFullTimes) {
            self.sensors.forEach( function (item) {
                if (item.polling) {
                    self.setDevCallback(item.id, item.metric);
                }
            });
        }
    
        //b set cron task
        //---------------
        if (globalData.period > 0) {
            //calculate time for cron task:
            var p = Math.round(globalData.period);
            var s = self.id;
            var m = (p < 60) ? [s % p, 59, p] : s % 60; //different start times per instance
            if (self.config.startFullTimes) {
                m = (p < 60) ? [0, 59, p] : 0;          //start at full time
            }
            var h = p >= 24 * 60 ? 0 : (p / 60 >= 1 ? [0, 23, Math.round(p / 60)] : null);
            var wd = p / 24 / 60 >= 1 ? [0, 6, Math.round(p / 24 / 60)] : null;
            //create cron task:
            self.setCronTask({
                minute: m,
                hour: h,
                weekDay: wd,
                day: null,
                month: null
            });
        }

        self.error = undefined;
        self.POLL_INIT = undefined;     //meaning: init completed, no repetition any more
        self.log('self.POLL_INIT', self.POLL_INIT);

        //b run first poll (=>onPoll)
        //---------------------------
        if (globalData.period > 0 && !self.error && !self.config.startFullTimes) {
            self.onPoll(self.POLL_FIRST);
        }
    } //initExec1
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         build_chart_header
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function build_chart_header () {
        self.log('*** build_chart_header');
    
        //b collect sensor data
        //---------------------
        var chartLabels = [globalData.time_label];
        var chartDevices = [undefined];
        var chartDevTitles = [undefined];
        var chartArithmetics = [undefined];
        var chartColors = [undefined];
        var chartgraphTypes = [undefined];
        var chartlineTypes = [undefined];
        var chartFill = [undefined];
        var chartHidden = [undefined];
        var disableDevice = [undefined];
    
        self.sensors.forEach(function(sensor) {
            chartLabels.push(sensor.dev_key);
            chartDevices.push(sensor.id);
            if (sensor.dev_key !== sensor.title) {
                chartDevTitles.push(sensor.title);
            } else {
                chartDevTitles.push(undefined);
            }
            if (sensor.formula) {
                chartArithmetics.push(sensor.formula);
            } else {
                chartArithmetics.push(undefined);
            }
            chartColors.push(sensor.color);
            chartgraphTypes.push(sensor.graphType);
            chartlineTypes.push(sensor.lineType);
            chartFill.push(sensor.fill);
            chartHidden.push(sensor.chartHidden);
            disableDevice.push(sensor.disableDevice);
        }); //sensors.forEach
    
        //b build chart header
        //--------------------
        var chartHeader = {
            Timestamp: self.now,
            ZWayVersion: globalData.ZWayVersion,
            ChartDBVersion: self.VERSION,
            chartTitle: globalData.chartTitle,
            chartId: globalData.chartId,
            chartInstance: self.id,
            errText: 0,
            chartDevicesNew: [],
            chartLanguage: globalData.chartLanguage,
            positionYAxis: globalData.positionYAxis,
            limitYAxis: globalData.limitYAxis,
            opacity: globalData.opacity,
            chartUrl: globalData.chartUrl,
            chartInterval: globalData.chartInterval,
            initialInterval: globalData.initialInterval,
            period: globalData.period,
            startFullTimes: globalData.startFullTimes,
            convertOnOff: globalData.convertOnOff,
            y3Labeling: globalData.y3Labeling,
            y3Icons: globalData.y3Icons,
            y3IconsWidth: globalData.y3IconsWidth,
            y3reduceUnusedTicks: globalData.y3reduceUnusedTicks,
            y3leastTicks: globalData.y3leastTicks,
            y1Label: globalData.y1Label,
            y2Label: globalData.y2Label,
            chartLabels: chartLabels,
            chartDevices: chartDevices,
            chartArithmetics: chartArithmetics,
            chartDevTitles: chartDevTitles,
            chartColors: chartColors,
            chartgraphTypes: chartgraphTypes,
            chartlineTypes: chartlineTypes,
            chartFill: chartFill,
            chartHidden: chartHidden,
            disableDevice: disableDevice,
            nightBackground: globalData.nightBackground,
            nightBackDev: globalData.nightBackDev,
        };
        return JSON.parse(JSON.stringify(chartHeader));
    } //build_chart_header
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         setUrlToAllDevices
    //h Purpose:      .
    //h
    //h-------------------------------------------------------------------------------
    function setUrlToAllDevices () {
        self.log('*** setUrlToAllDevices');
    
        self.sensors.forEach(function(sensor) {
            if (sensor.intcharticon) {
                var vDevId = sensor.id;
                if (vDevId) {
                    var vDev = self.controller.devices.get(vDevId);
                    var url_get_curr = vDev.get("metrics:intchartUrl") || '0';
                    if (url_get_curr !== self.chartUrl) {
                        vDev.set("metrics:intchartUrl", self.chartUrl);
                    }
                }
            }
        });
    } //setUrlToAllDevices
}; //init    
