/*** MxChartDB_init.js */

//h-------------------------------------------------------------------------------
//h
//h Name:         MxChartDB_init.js
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
//h Version:      V3.9.0 2026-02-06/peb
//v History:      V1.0.0 2022-03-23/peb first version
//v               V1.1.0 2022-04-15/peb [+]handle broken connection and locked
//v                                        database
//v                                     [x]correct some response status
//v                                     [+]bulk inserts
//v               V2.0.1 2024-05-12/peb [-]self.config.chartInterval is obsolete
//v               V3.3.3 2025-03-26/peb [x]fix bug at retry init
//v               V3.3.4 2025-08-03/peb [+]y3IconsPath_Default
//v                                     [+]spanGaps
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals zway */

//-----------
//b Constants
//-----------
//var MODULE='MxChartDB_init.js';
//var VERSION='V3.9.0';
//var WRITTEN='2026-02-06/peb';

//-----------
//b Functions
//-----------
var init = function (self) {
'use strict';
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

        //for intChartUrl:
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
            throw self.err;
        }
        self.api = self.constants.ip || self.constants.hostname;
        self.buffer_max_rows = self.constants.buffer_max_rows;
        self.data_buffer = [];
    
        //b set defaults
        //--------------
        var letterNumber = /^[0-9a-zA-Z]+$/;
        if(! self.config.DBName.match(letterNumber)) {
            throw(self.instanceMessage+': invalid database name, break.');
        }
        if (!self.config.opacity) {self.config.opacity = 60;}
        if (!self.config.axes.time_label) {self.config.axes.time_label = 'null';}
        if (!self.config.axes.y1Label) {self.config.axes.y1Label = 'null';}
        if (!self.config.axes.y2Label) {self.config.axes.y2Label = 'null';}
        //if (!self.config.rectangleDevices) {self.config.rectangleDevices = ',';}  //obsolete
        if (self.config.chartInterval) {self.config.chartInterval = undefined;}
        if (!self.config.initialInterval) {self.config.initialInterval = 'complete';}
        if (!self.config.store_value_set.startFullTimes) {
            self.config.store_value_set.startFullTimes = false;
        }
        if (!self.config.nonnumericLabels.y3reduceUnusedTicks) {
            self.config.nonnumericLabels.y3reduceUnusedTicks = false;
        }
        if (!self.config.nonnumericLabels.y3leastTicks) {
            self.config.nonnumericLabels.y3leastTicks = 2;
        }
        if (self.config.store_value_set.poll_method === 'poll_never') {
            self.config.store_value_set.startFullTimes = false;
            self.config.store_value_set.run_after_start = false;
        }
        if (!self.config.hasOwnProperty('global_js')) {
            self.config.global_js = {define_global_js: false,
                                     uc_radio: 'code',
                                     lines: 5,
                                     code: ''};
        }
        if (!self.config.global_js.hasOwnProperty('uc_radio')) {
            self.config.global_js.uc_radio = 'code';
        }
        if (!self.config.hasOwnProperty('post_processing')) {
            self.config.post_processing = {define_post_processing: false,
                                           pp_radio: 'code',
                                           lines: 5,
                                           code: ''};
        }
        if (!self.config.post_processing.hasOwnProperty('pp_radio')) {
            self.config.post_processing.pp_radio = 'code';
        }
    
        //b get API version (=>ajax_get)
        //------------------------------
        self.log('*** request api version');
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
        self.log('*** check_create_default_db '+self.IndexDBName);
    
        //b check/ create db server + database (=>ajax_post)
        //--------------------------------------------------
        var url_create = 'create_db';
        self.ajax_post(url_create, 
                       undefined,
                       function() {
                           self.log('database '+self.IndexDBName+
                                    ' created/ already existing');
                           check_create_user_db();}, 
                       'checking/creating database '+self.IndexDBName,
                       self.IndexDBName
        );
    } //check_create_default_db
    
    function check_create_user_db () {
        self.log('*** check_create_user_db');
    
        //b check/ create user database (=>ajax_post)
        //-------------------------------------------
        var url_create = 'create_db';
        self.ajax_post(url_create, undefined,
                       function() {
                           self.log('database '+self.DBName+
                                    ' created/ already existing');
                           init1();}, 
                       'checking/creating database '+self.DBName
        );
    } //check_create_user_db
    
    function is_chartid_used (chartIdTest) {
        self.log('*** is_chartid_used');

        //b check if chart id is already used by other instance
        //-----------------------------------------------------
        var err = 'Chart id '+chartIdTest+' is already used by the active instance ';
        Object.keys(self.controller.instances).forEach(function(ix) {
            var i = self.controller.instances[ix];
            if (i.moduleId === self.moduleName && 
                i.id !== self.id &&
                i.active === true &&
                i.params.chartId === chartIdTest) {
                self.notifyError(err+i.id+'/'+i.title);
                return true;
            }
        });
        return false;
    } // is_chartid_used

    function init1 () {
        self.log('*** init1');

        //b set chart index for new chart definition
        //------------------------------------------
        var chartIdTest = self.moduleName + self.id;
        if (!self.config.chartId) {
            self.config.chartId = chartIdTest;
            self.config.dataControl.dc_method = 'dc_clear';
        }

        //b check if wrong chart id in configuration
        //------------------------------------------
        var err;
        var url = '/ZAutomation/api/v1/load/modulemedia/MxChartDB/help_repair.html';
        var help = '<br>see '+
                   "<a rel='help' href='"+url+"' target='_blank'><u><font color=blue>help</font></u></a>"+
                   ' for repair';
        if (chartIdTest !== self.config.chartId) {
            err = 'wrong Chart id in configuration';
            self.notifyError(err+',<br>'+
                             'should be '+chartIdTest+' instead of '+self.config.chartId+
                             help);
            if (is_chartid_used(chartIdTest)) {
                throw err;
            } else {
                self.notifyError('starting new chart '+chartIdTest+',<br'>+
                                 'chart '+self.config.chartId+' may be orphaned now');
                self.config.chartId = chartIdTest;
            }
        }
    
        self.log('self.config.chartId', self.config.chartId);
        self.tableNameValues = self.config.chartId;
        self.tableNameHeader = self.config.chartId+'_Header';
    
        //b check/ create index table (=>create_index_table)
        //--------------------------------------------------
        create_index_table();
    } //ini1
    
    function create_table (tableName, callback, database) {
        self.log('*** create_table', tableName);

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
                                       self.IndexDBName
                          );
                      },
                      self.IndexDBName
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
                                       },
                                       self.DBName
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
                                       },
                                       self.DBName
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
        var poll_method = self.config.store_value_set.poll_method;
        globalData = {
            chartTitle: self.config.chartTitle.trim(),
            DBName: self.config.DBName,
            chartId: self.config.chartId,
            chartInterval: self.config.interval,
            initialInterval: self.config.initialInterval,
            time_label: self.config.axes.time_label,
            y1Label: self.config.axes.y1Label,
            y2Label: self.config.axes.y2Label,
            poll_method: poll_method,
            run_after_start: self.config.store_value_set.run_after_start,
            //set cron polling in these cases:
            polling_cron: (poll_method === 'poll_interval' ||
                           poll_method === 'poll_interval_rectangle' ||
                           poll_method === 'poll_interval_value_change'),
            period: self.config.store_value_set.period,
            //poll all devices in these cases:
            polling_devs: (poll_method === 'poll_value_change' ||
                           poll_method === 'poll_interval_value_change'),
            //poll device, if rectangle:
            polling_rectangles: poll_method === 'poll_interval_rectangle',
            chartLanguage: self.config.lang,
            positionYAxis: self.config.axes.positionYAxis,
            limitYAxis: self.config.axes.limitYAxis,
            lowerLimitY1: self.config.axes.lowerLimitY1,
            upperLimitY1: self.config.axes.upperLimitY1,
            lowerLimitY2: self.config.axes.lowerLimitY2,
            upperLimitY2: self.config.axes.upperLimitY2,
            opacity: self.config.opacity,
            chartUrl: self.chartUrl,
            startFullTimes: self.config.store_value_set.startFullTimes,
            use_nonnumeric: self.config.nonnumericLabels.use_nonnumeric,
            convertOnOff: self.config.nonnumericLabels.convertOnOff,
            y3Labeling: self.config.nonnumericLabels.y3Labeling,
            y3IconsPath_Default: self.config.nonnumericLabels.y3IconsPath_Default,
            y3Icons: self.config.nonnumericLabels.y3Icons,
            y3IconsWidth: self.config.nonnumericLabels.y3IconsWidth,
            y3reduceUnusedTicks: self.config.nonnumericLabels.y3reduceUnusedTicks,
            y3leastTicks: self.config.nonnumericLabels.y3leastTicks,
            ZWayVersion: zway.controller.data.softwareRevisionVersion.value,
            nightBackground: self.config.specials.nightBackground,
            post_calc: self.config.post_calc,
            global_js: self.config.global_js,
            post_processing: self.config.post_processing,
        }; //globalData
    
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
    
        //------------
        //TODO: rectangleDevices obsolete in new version
        var rectArray = [];
        if (typeof self.config.rectangleDevices !== "undefined") {
            rectArray = self.list2Array(self.config.rectangleDevices);
        }
    
        //b for all devices
        //-----------------
        var sensorsCount = self.config.sensors.length;
        _.each(self.config.sensors, function(sensor, ix) {
            self.log('self.config.sensors', 'ix='+ix, 'sensor.index='+sensor.index);
            var devId, vDev, deviceType, title, scale, formula, chartLabel, intcharticon;
            self.log("sensor.entrytype", sensor.entrytype);
            if (sensor.entrytype === 'disabled') {
                devId = null;
                formula = null;
                chartLabel = null;
                intcharticon = false;
            } else
            if (sensor.entrytype === 'formula') {
                if (!sensor.formula.length || sensor.formula.length === 0) {
                    self.err = 'no formula defined for index '+sensor.index;
                } 
                if (self.err) {
                    self.notifyError(self.err);
                    throw self.err;
                }
                devId = null;
                formula = sensor.formula;
                chartLabel = sensor.devlabel || sensor.formula;
                intcharticon = false;
            } else
            if (sensor.entrytype === 'sensor') {
                if (!sensor.device) {
                    var err = 'entry '+sensor.index+': no virtual device defined';
                    self.warn(err);
                } 
                if (sensor.device) {
                    devId = sensor.device;
                    vDev = self.controller.devices.get(devId);
                    deviceType = vDev.get("deviceType");
                    title = vDev.get("metrics:title");
                    scale = vDev.get("metrics:scaleTitle");
                    formula = sensor.formula;
                    chartLabel =  sensor.devlabel;
                    intcharticon = sensor.intcharticon || false;
                } else {
                    devId = null;
                    deviceType = '';
                    title = null;
                    scale = null;
                    formula = sensor.formula;
                    chartLabel =  sensor.devlabel;
                    intcharticon = null;
                }
            } else {
                sensor.entrytype = 'disabled';
                devId = null;
                formula = null;
                chartLabel = null;
                intcharticon = false;
            }
    
            var item = {
                index: ix,
                entrytype: sensor.entrytype,
                usedYAxe: sensor.usedYAxe,
                id: devId,
                deviceType: deviceType,
                metric: sensor.metric || 'level',
                tooltip_metric: sensor.tooltip_metric || '',
                intcharticon: intcharticon,
                title: title,
                scale: scale,
                formula: formula,
                color: sensor.color,
                graphType: sensor.graphType,
                lineType: sensor.lineType,
                spanGaps: sensor.spanGaps,
                fill: sensor.fill,
                binary: false,
                chartHidden: sensor.chartHidden || false,
                polling: globalData.polling_devs,
                chartLabel: chartLabel,
            };
            if (sensor.spanGaps && sensor.spanGaps_maxlength) {
                //minutes >> milliseconds
                item.spanGaps = sensor.spanGaps_maxlength * 60000;
            }
            item.tooltip_metric = item.tooltip_metric.trim();
    
            //b check fill entry
            //------------------
            if (sensor.fill) {
                if (sensor.fill > sensorsCount && sensor.fill < 98) {
                    item.fill = undefined;
                }
            }
    
            if (item.id && item.entrytype === 'sensor') {
                //b binary device?
                //----------------
                if (item.deviceType.indexOf('Binary') >= 0) {
                    item.binary = true;
                }
        
                //b make graph label
                //------------------
                if (!item.chartLabel && item.title !== undefined) {
                    var s_title = item.title;
                    //compute scale if not level
                    if (item.metric !== 'level') {
                        s_title += ': '+item.metric;
                        item.scale = undefined;
                    }
                    //add scale to label
                    if (item.scale === undefined) {
                        item.chartLabel = s_title;
                    } else {
                        var str = s_title + " (" + item.scale + ")";
                        var p = str.lastIndexOf(' ()');
                        if (p === str.length - 3) {
                            item.chartLabel = str.substring(0, p);
                        } else {
                            item.chartLabel = str;
                        }
                    }
                } //!item.chartLabel
        
                //b compute graph type
                //--------------------
                if (item.graphType === undefined && item.binary) {
                    item.graphType = "rectangle";
                    self.config.sensors[ix].graphType = "rectangle";
                }
                //------------
                //TODO: rectangleDevices obsolete in new version
                if (typeof self.config.rectangleDevices !== "undefined") {
                    if (item.graphType === undefined) {
                        for (var i = 0; i < rectArray.length; i++) {
                            if (item.title.indexOf(rectArray[i]) >= 0 ||
                                item.chartLabel.indexOf(rectArray[i]) >= 0) {
                                item.graphType = "rectangle";
                                self.config.sensors[ix].graphType = "rectangle";
                            }
                        }
                    }
                }
   
                if (globalData.polling_rectangles &&
                    ["rectangle", "rectangle_left", "pointseries", "interpolatedpoints", 
                     "straightpoints", "points"].indexOf(item.graphType) >= 0) {
                    item.polling = true;
                }
        
                //b add icon to virtual device
                //----------------------------
                if (item.intcharticon) {
                    self.intchartIcons.push(devId);
                }
            } //sensor.entrytype === 'sensor'
    
            //b no polling, if no device id
            //-----------------------------
            if (!item.id) {
                item.polling = false;
            }
            self.sensors.push(item);
            self.log("sensor item", item);
    
        }); //_.each(self.config.sensors

        //TODO: rectangleDevices obsolete in new version
        if (typeof self.config.rectangleDevices !== "undefined") {
            self.config.rectangleDevices = undefined; //obsolete
        }
        self.log("intchartIcons", self.intchartIcons);

        var db_chartId = self.DBName+'.'+self.config.chartId;
        if (self.DBName === self.IndexDBName) {
            db_chartId = self.config.chartId;
        }
        //define chartUrl:
        var api_browser = self.constants.ip_browser || 
                            self.constants.hostname_browser ||
                            self.api;
        self.chartUrl = 'http://'+api_browser+':'+self.constants.port+
                        '/HTML_MODAL/'+self.IndexDBName+'/'+db_chartId;
    
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
                              checkDataControl();
                          } else {
                              self.log('table '+tableName+' data selected');
                              checkDataControl(response.data[0]);
                          }
                      },
                      function(response) {
                          if (response.status === 404) {
                              self.log('table '+tableName+' no data');
                              checkDataControl();
                          } else {
                              self.notifyError(url_select+' '+response.status+' '+
                                               response.statusText);
                              self.error('selecting in table '+tableName);
                          }
                      }
        );
    } //initExec
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         checkDataControl
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function checkDataControl(chartHeaderStored) {
        self.log('*** checkDataControl');
    
        //b data control
        //--------------
        self.log('------ dataControl', self.config.dataControl.dc_method);
        doWhenChanged = 'wait';
        if (self.config.dataControl.dc_method === 'dc_clear') {
            self.info('building up new chart');
            doWhenChanged = 'remove';
            //self.config.dataControl.dc_method = 'dc_normal';    //skip till precessing successful
        } else
        if (self.config.dataControl.dc_method === 'dc_continue') {
            self.info('continuing current chart with new devices');
            doWhenChanged = 'continue';
            //self.config.dataControl.dc_method = 'dc_normal';    //skip till precessing successful
        }
        self.log('doWhenChanged', doWhenChanged);

        if (doWhenChanged === 'remove') {
            removeOldDataset (chartHeaderStored, doWhenChanged);
        } else {
            compareHeaderData (chartHeaderStored, doWhenChanged);
        }
    
    } //checkDataControl
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         resetDataControl
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function resetDataControl() {
        self.log('*** resetDataControl');
    
        //b data control
        //--------------
        self.log('------ dataControl', self.config.dataControl.dc_method);
        if (self.config.dataControl.dc_method === 'dc_clear') {
            self.config.dataControl.dc_method = 'dc_normal';
        } else
        if (self.config.dataControl.dc_method === 'dc_continue') {
            self.config.dataControl.dc_method = 'dc_normal';
        }
    } //resetDataControl
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         removeOldDataset
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function removeOldDataset(chartHeaderStored, doWhenChanged) {
        self.log('*** removeOldDataset');

        //b delete all sensor data and exchange header
        //--------------------------------------------
        self.now = Date.now();
        var ts = self.now;
        var url_delete = self.tableNameValues+'/delete_prev?ts='+ts;
        self.ajax_post(url_delete, undefined,
                    function() {
                        self.log('table '+self.tableNameValues+' old data removed');
                        compareHeaderData (chartHeaderStored, doWhenChanged);
                    },
                    'table '+url_delete
        );
    } //removeOldDataset
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         compareHeaderData
    //h Purpose:      
    //h
    //h-------------------------------------------------------------------------------
    function compareHeaderData (chartHeaderStored, doWhenChanged) {
        self.log('*** compareHeaderData');
    
        //b build new chart header data (=>build_chart_header)
        //----------------------------------------------------
        chartHeaderBuild = build_chart_header();
        self.log('chartHeaderBuild', chartHeaderBuild);
    
        var DEVICES_REMOVED = 1;
        var DEVICES_CHANGED = 2;
        var DEVICES_ADDED = 3;
        var storeNewHeaderData;
    
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
            storeNewValueData  = true;
        } else
        //b else if header not changed
        //----------------------------
        if (chartHeaderStoredStringified === chartHeaderStringified)  {
            self.log('headerdata not changed');
            storeNewHeaderData = false;
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
                storeNewValueData  = true;
            } else
            //b else if device list changed
            //-----------------------------
            if (chartDevicesCurr !== chartDevicesNew) {
                self.info('device list changed !!!');

                var db_chartId = self.DBName+'.'+self.config.chartId;

                //b if 'wait when changed'
                //------------------------  
                if (doWhenChanged === 'wait') {
                    storeNewValueData  = false;
    
                    chartHeaderStored.chartDevicesNew = chartHeaderBuild.chartDevices;
                    //b if devices removed
                    //--------------------
                    if (chartHeaderBuild.chartDevices.length < 
                        chartHeaderStored.chartDevices.length) {
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_REMOVED;
                    } else
                    //b else if devices added
                    //-----------------------
                    if (chartHeaderBuild.chartDevices.length >
                        chartHeaderStored.chartDevices.length) {
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
                    if (chartHeaderBuild.chartDevices.length < 
                        chartHeaderStored.chartDevices.length) {
                        storeNewValueData  = false;
    
                        chartHeaderStored.chartDevicesNew = chartHeaderBuild.chartDevices;
                        chartHeaderStored.errText = db_chartId+':'+DEVICES_REMOVED;
                    //b else
                    //------
                    } else {
                        storeNewValueData  = true;
                    }
                }
            }
        } //header data changed
    
        var ts = self.now;
        var callback = function () {build_chart_index(ts);};
    
        //b if new header data
        //--------------------
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
            var db_chartId = self.DBName+'.'+self.config.chartId;
            if (self.DBName === self.IndexDBName) {
                db_chartId = self.config.chartId;
            }
            if (data) {
                self.log('chart index in', data);
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
                                  self.IndexDBName);
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
                      self.IndexDBName
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
    
        self.error = undefined;
        self.POLL_INIT = undefined;     //meaning: init completed, no repetition any more
        self.log('self.POLL_INIT', self.POLL_INIT);
        resetDataControl();

        self.log('initExec1', 'storeNewValueData='+storeNewValueData);
        if (!storeNewValueData) {return;}
    
        //b if necessary define callback
        //------------------------------
        if (!globalData.startFullTimes) {
            self.sensors.forEach( function (item) {
                if (item.polling) {
                    self.setDevCallback(item.id, item.metric);
                }
            });
        }
    
        //b set cron task
        //---------------
        if (globalData.polling_cron) {
            //calculate time for cron task:
            var p = Math.round(globalData.period);
            var s = self.id;
            var m = (p < 60) ? [s % p, 59, p] : s % 60; //different start times per instance
            if (globalData.startFullTimes) {
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

        //b run first poll (=>onPoll)
        //---------------------------
        if (!self.error) {
            if (globalData.run_after_start || 
                globalData.poll_method === 'poll_once') {
                self.onPoll(self.POLL_FIRST);
            }
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
        var spanGaps = [undefined];
        var chartFill = [undefined];
        var chartHidden = [undefined];
        var entrytypes = [undefined];
        var usedYAxes = [undefined];
    
        self.sensors.forEach(function(sensor) {
            chartLabels.push(sensor.chartLabel);
            chartDevices.push(sensor.id);
            if (sensor.chartLabel !== sensor.title) {
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
            spanGaps.push(sensor.spanGaps);
            chartFill.push(sensor.fill);
            chartHidden.push(sensor.chartHidden);
            entrytypes.push(sensor.entrytype);
            usedYAxes.push(sensor.usedYAxe);
        }); //sensors.forEach
    
        //b build chart header
        //--------------------
        //var global_js_code = globalData.global_js.code.replace(/\n/g, '').replace(/\s+/g, ' ');
        //global_js_code = JSON.stringify(global_js_code);
        var chartHeader = {
            Timestamp: self.now,
            ZWayVersion: globalData.ZWayVersion,
            ChartDBVersion: self.meta.version,   //self.VERSION,
            chartTitle: globalData.chartTitle,
            DBName: globalData.DBName,
            chartId: globalData.chartId,
            chartInstance: self.id,
            errText: 0,
            chartDevicesNew: [],
            chartLanguage: globalData.chartLanguage,
            positionYAxis: globalData.positionYAxis,
            limitYAxis: globalData.limitYAxis,
            lowerLimitY1: globalData.lowerLimitY1,
            upperLimitY1: globalData.upperLimitY1,
            lowerLimitY2: globalData.lowerLimitY2,
            upperLimitY2: globalData.upperLimitY2,
            opacity: globalData.opacity,
            chartUrl: globalData.chartUrl,
            chartInterval: globalData.chartInterval,
            initialInterval: globalData.initialInterval,
            poll_method: globalData.poll_method,
            period: globalData.period,
            startFullTimes: globalData.startFullTimes,
            use_nonnumeric: globalData.use_nonnumeric,
            convertOnOff: globalData.convertOnOff,
            y3Labeling: globalData.y3Labeling,
            y3IconsPath_Default: globalData.y3IconsPath_Default,
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
            spanGaps: spanGaps,
            chartFill: chartFill,
            chartHidden: chartHidden,
            entrytypes: entrytypes,
            usedYAxes: usedYAxes,
            nightBackground: globalData.nightBackground,
            post_calc: self.realCopyObject(globalData.post_calc),
            //define_global_js: globalData.global_js.define_global_js,
            //code: global_js_code,
            global_js: self.realCopyObject(globalData.global_js),
            post_processing: self.realCopyObject(globalData.post_processing),
        };  //chartHeader
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
