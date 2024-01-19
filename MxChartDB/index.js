/*** MxChartDB V2.0.0 2024-01-17 Z-Way HA module *********************************/

//h-------------------------------------------------------------------------------
//h
//h Name:         index.js
//h Type:         Provides a fast and easy way to create nice sensor logging 
//h               charts. Storage into database.
//h Project:      Z-Way HA
//h Usage:        
//h Remark:       
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    MxBaseModule
//h Issues:       
//h Authors:      peb piet66
//h Version:      V2.0.0 2024-01-17/peb
//v History:      V1.0.0 2022-03-23/peb first version
//v               V1.1.0 2022-04-15/peb [+]handle broken connection and locked
//v                                        database
//v                                     [*]some response status
//v                                     [+]bulk inserts
//v                                     [*]graph type 'points'
//v                                     [+]graph type 'pointseries'
//v                                     [x]draw: shorten unused text scales
//v                                     [x]reread value list if header changed
//v                                     [*]combine db insert + delete old rows
//v                                     [+]set nighttime background
//v               V1.1.1 2022-04-15/peb [x]correct wording
//v                                     [x]issue if communication problem
//v                                     [+]admin.html enhanced
//v                                     [x]skip first poll if period == 0
//v               V1.1.2 2022-05-21/peb [*]refactor previous values
//v                                     [*]change initially displayed view
//v               V1.1.3 2022-07-09/peb [-]admin functions for index,html
//v                                     [+]isAdmin:refresh index on new focus
//v               [x]fixed
//v               [*]reworked, changed
//v               [-]removed
//v               [+]added
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals inherits, _module:true, MxBaseModule, http, constants */
/*globals copy_header:true, init:true */
'use strict';

//h-------------------------------------------------------------------------------
//h
//h Name:         MxChartDB
//h Purpose:      class definition, inheritance.
//h
//h-------------------------------------------------------------------------------
function MxChartDB(id, controller) {
    // Call superconstructor first (AutomationModule)
    MxChartDB.super_.call(this, id, controller);

    this.MODULE = 'index.js';
    this.VERSION = 'V2.0.0';
    this.WRITTEN = '2024-01-17/peb';

    this.LEAST_API_VERSION = '1.1.0';
    this.POLL_INIT = 999;
    this.constants = undefined;
    this.api = undefined;

    this.data_buffer = undefined;
    this.buffer_max_rows = undefined;

    this.databaseIndex = undefined;
    this.database = undefined;
    this.tableNameHeader = undefined;
    this.tableNameValues = undefined;
    this.tableNameIndex  = undefined;

    this.intchartIcons = undefined;
    this.now = undefined;

    this.sensors = undefined;
    this.chartIntervalMSecs = undefined;

    this.chartUrl = undefined;
    this.timerId_delay = undefined;
    this.POLL_TIMER_DELAY = this.POLL_TIMER;
    this.timerId_repeat_post = undefined;
    this.timerId_init = undefined;
}
inherits(MxChartDB, MxBaseModule);
_module = MxChartDB;

//h-------------------------------------------------------------------------------
//h
//h Name:         init
//h Purpose:      module initialization.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.init = function(config) {
    MxChartDB.super_.prototype.init.call(this, config);
    var self = this;
}; //init

MxChartDB.prototype.init0 = function() {
    var self = this;

    self.databaseIndex = self.moduleName;
    self.database = self.databaseIndex;
    self.log('self.databaseIndex', self.database);

    //b copy MxChartJS definitons
    //---------------------------
    if (self.config.copyMxChartJS.copyChart) {
        var f = 'copy_header.js';
        self.info('executing '+f+'...');
	    executeFile(self.moduleBasePath() + '/' + f);
        if (copy_header(self) === true) {
            copy_header = undefined;
            self.init1();
        }

    //b else continue (=>init1)
    //-------------------------
    } else {
        self.init1();
    }
}; //init0

MxChartDB.prototype.init1 = function() {
    var self = this;

    //b read constants
    //----------------
    var f = 'htdocs/constants.js';
    self.info('executing '+f+'...');
    executeFile(self.moduleBasePath() + '/' + f);
    //don't permanently link to constants file:
    self.constants = self.realCopyObject(constants);

    //b build devices array
    //---------------------
    self.devicesArray = [];
    if (self.config.switch) {
        self.devicesArray.push(self.config.switch);
    }
    _.each(self.config.sensors, function(sensor, index) {
        if (sensor.disableDevice === undefined) {
            sensor.disableDevice = false;
        }
        if (sensor.device && !sensor.disableDevice) {
            self.devicesArray.push(sensor.device);
        }
    });
    self.log('self.devicesArray', self.devicesArray);

    //b wait till all devices are ready (=>initExec)
    //----------------------------------------------
    self.waitDevicesReady(self.devicesArray);
}; //init1

//h-------------------------------------------------------------------------------
//h
//h Name:         initExec
//h Purpose:      module kickoff.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.initExec = function() {
    var self = this;

    //b initialisation
    //----------------
    var f = 'init.js';
    self.info('executing '+f+'...');
	executeFile(self.moduleBasePath() + '/' + f);
    init(self);
    init = undefined;
}; //initExec

//h-------------------------------------------------------------------------------
//h
//h Name:         stop
//h Purpose:      module stop.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.stop = function() {
    var self = this;

    //b delete timer
    //--------------
    if (self.timerId_repeat_post) {
        self.log('clearing timer timerId_repeat_post...');
        clearTimeout(self.timerId_repeat_post);
        self.timerId_repeat_post = undefined;
    }
    if (self.timerId_delay) {
        self.log('clearing timer timerId_delay...');
        clearTimeout(self.timerId_delay);
        self.timerId_delay = undefined;
    }
    if (self.timerId_init) {
        self.log('clearing timer timerId_init...');
        clearTimeout(self.timerId_init);
        self.timerId_init = undefined;
    }

    //b for all devices with intchartUrl set by this instance
    //-------------------------------------------------------
    if (self.chartUrl !== undefined) {
        self.controller.devices.filter(function(vDev) {
                return vDev.get("metrics:intchartUrl") === self.chartUrl;
            }).map(function(vDev) {
                //b remove intchart icon from device
                //----------------------------------
                vDev.set("metrics:intchartUrl", ""); //first we change it, then we
                var metrics = vDev.get("metrics");   //delete it, cause delete doesn't
                delete metrics.intchartUrl;          //throw a callback
            });
        self.chartUrl = undefined;
        self.intchartIcons = [];
    }

    MxChartDB.super_.prototype.stop.call(this);
}; //stop

//h-------------------------------------------------------------------------------
//h
//h Name:         onPoll
//h Purpose:      central waiting point of module.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.onPoll = function(n, i, t, l) {
    var self = this;

    //b onPoll
    //--------
    switch (n) {
        //repeat initializations
        //----------------------
        case self.POLL_INIT:
            self.log('--- init onPoll');
            self.initExec();
            return;
        case self.POLL_FIRST:
            self.log('--- first onPoll');
            break;
        //b cron
        //------
        case self.POLL_CRON:
            self.log('--- onPoll by', i);
            //b start processing after delay
            //------------------------------
            if (!self.config.startFullTimes) {
                //avoid module jam at full minute
                self.timerId_delay = setTimeout(function() {
                    self.timerId_delay = undefined;
                    self.onPoll(self.POLL_TIMER_DELAY);
                }, 80 * self.id +10000);
                return;
            }
            break;
        //b device sensor value
        //---------------------
        case self.POLL_DEVICE:
            self.log('--- onPoll by', i + '/' + t, l);
            if (JSON.stringify(arguments) === self.argumentsOld) {
                self.log('skipped.');
                return;
            }
            self.argumentsOld = JSON.stringify(arguments);

            if (self.timerId_delay) {
                self.log('clearing timer...');
                clearTimeout(self.timerId_delay);
                self.timerId_delay = undefined;
            }
            break;
        //b timer delay
        //-------------
        case self.POLL_TIMER_DELAY:
            self.log('--- onPoll by timer POLL_TIMER_DELAY');
            break;
        default:
            self.log('--- onPoll by unknown, skipped.');
            return;
    }

    //b skip if chart switched off
    //----------------------------
    if (self.config.switch) {
        if (self.controller.devices.get(self.config.switch).get('metrics:level') === 'off') {
            return;
        }
    }

    //b for all sensors
    //-----------------
    self.sensors.forEach(function(sensor) {
        if (sensor.id) {
            var vDevId = sensor.id;
            var vDev = self.controller.devices.get(vDevId);

            //b read current sensor value
            //---------------------------
            try {
                if (sensor.metric === 'updateTime') {
                    sensor.val = vDev.get("updateTime");
                } else {
                    sensor.val = vDev.get("metrics:" + sensor.metric);
                }
            } catch (err) {
                self.warn("read sensor value", sensor.metric, sensor.id, sensor.title);
                sensor.val = undefined;
            }

            //b read current tooltip text
            //---------------------------
            sensor.tooltip = undefined;
            if (sensor.tooltip_metric.length > 0) {
                try {
                    if (sensor.tooltip_metric === 'updateTime') {
                        sensor.tooltip = vDev.get("updateTime");
                    } else {
                        sensor.tooltip = vDev.get("metrics:" + sensor.tooltip_metric);
                    }
                    self.log('tooltip_metric='+sensor.tooltip_metric+', tooltip='+sensor.tooltip);
                } catch (err) {
                    self.warn("read sensor tooltip", sensor.tooltip_metric, sensor.id, sensor.title);
                    sensor.tooltip = undefined;
                }
            }
        }else {
            sensor.val = null;
            sensor.tooltip = undefined;
        }
    }); //sensors.forEach

    //b process sensor data (=>build_values_array)
    //--------------------------------------------
    self.build_values_array(self.sensors);
}; //onPoll

//h-------------------------------------------------------------------------------
//h
//h Name:         build_values_array
//h Purpose:      .
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.build_values_array = function(sensors) {
    var self = this;
    //self.log('build_values_array');

    //b collect sensor data
    //---------------------
    self.now = Date.now(); //milliseconds

    var chartValues = [self.now];
    sensors.forEach(function(sensor) {
        if ((sensor.tooltip === undefined || sensor.tooltip === '')) {
            chartValues.push(sensor.val);
        } else {
            var item = {value: sensor.val,
                        tooltip: sensor.tooltip};
            chartValues.push(item);
        }
    }); //sensors.forEach

    //b store sensor value data (=>store_table_data)
    //----------------------------------------------
    var ts = self.now;
    var ts_remove = self.chartIntervalMSecs ? ts-self.chartIntervalMSecs : null;
    self.store_table_data(self.tableNameValues, ts, chartValues, 
                          function () {}, ts_remove);

}; //build_values_array

//h-------------------------------------------------------------------------------
//h
//h Name:         store_table_data
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.store_table_data = function(tableName, ts, data, 
                                                   callback, ts_del, database) {
    var self = this;
    self.log('store_table_data', tableName);

    if (!database) {
        database = self.database;
    }

    var dataRow = {"ts": ts, "val": data};
    var dataArrayLength;
    if (self.POLL_INIT || self.buffer_max_rows === 0) {
        self.data_buffer = dataRow;
        dataArrayLength = 0;
    } else {
        self.data_buffer.push(dataRow);
        if (self.data_buffer.length > self.buffer_max_rows) {
            self.data_buffer.shift();
        }
        dataArrayLength = self.data_buffer.length;
    }

    var url_insert = tableName+'/insert';
    if (ts_del) {
        url_insert += '?ts_del='+ts_del;
    }

    self.log('store_table_data: ts='+ts+', dataArrayLength='+dataArrayLength);
    self.ajax_post(url_insert, 
                   self.data_buffer,
                   function(response) {
                       self.log('table '+tableName+' data stored: '+
                                 'ts='+ts+', dataArrayLength='+dataArrayLength);
                       if (!dataArrayLength) {
                           self.data_buffer = [];
                       } else {
                           var len = self.data_buffer.length;
                           //self.info('self.data_buffer.length', self.data_buffer.length);
                           if (len === 0) {
                               self.data_buffer = [];   //shouldn't occur
                           } else
                           if (self.data_buffer[len-1].ts === ts) {
                               self.data_buffer = [];
                               self.log('last ts acknowledged');
                           } else {
                               //self.info(self.data_buffer);
                               var i = 0;
                               for (i = 0; i < len; i++) {
                                   if (self.data_buffer[i].ts > ts) {
                                       break;
                                   }
                               }
                               if (i) {
                                   self.data_buffer = self.data_buffer.slice(i);
                               }
                               self.log(tableName+': still waiting for ack on '+self.data_buffer.length+
                                         ' rows (ts>'+ts+')');
                           }
                       }
                       callback();
                   },
                   'table '+tableName+' store data',
                   database
    );
}; //store_table_data

//h-------------------------------------------------------------------------------
//h
//h Name:         ajax_post
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.ajax_post = function(urlPath, data, success, failure, database) {
    var self = this;

    var dataC = data;
    if (data) {
        if (typeof data === 'object') {
            dataC = JSON.stringify(data);
        }
    }

    if (arguments.length < 4) {
        self.error('ajax_post', 'wrong number of arguments '+arguments.length+' < 4');
    }
    if (!database) {
        database = self.database;
    }

    function failureF(response, err_text) {
        if (!response.status) {
            self.notifyConnectionFault(url+' communication fault');
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure({status: 503});
            } else {
                self.notifyConnectionFault(failure);
                return;
            } 
        } else
        if (response.status < 100 ||
            response.status === 500 ||      //!!!!!!!!!!!!!!!! unendliche schleife ?????????????
            response.status === 900 && 
            (response.statusText.indexOf('database is locked') >= 0 ||
             err_text.indexOf('database is locked') >= 0)) {
            if (response.status === 900) {
                self.notifyConnectionFault(url+' '+response.status+' '+err_text);
            } else {
                self.notifyConnectionFault(url+' '+response.status+' '+response.statusText+' '+err_text);
            }
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure(response);
            } else {
                self.notifyConnectionFault(failure);
                return;
            }
        } else
        if (typeof failure === 'string') {
            self.notifyError(url+' '+response.status+' '+response.statusText+' '+err_text);
            self.notifyError(failure);
            self.stop();
        } else
        if (typeof failure === 'function') {
            self.warn(url, response.status, response.statusText, err_text);
            failure(response);
        }
    }

    function successF(response, dataSentLength) {
        if (typeof success === 'string') {
            self.log(success);
        } else
        if (typeof success === 'function') {
            success(response, dataSentLength);
        }
    }

    var url = self.api+':'+self.constants.port+'/'+database+'/'+urlPath;
    self.log('ajax_post_url', url);
    self.log('ajax_post_data', dataC);
    var request = {
        url:     url,
        method:  'POST',
        auth: {
            "login":    self.constants.username,
            "password": self.constants.password
        },
        // since ZWay sends data serialized as ’key1=value1&key2[0]=value2&key2[1]=value2&...’)
        // we convert javascript objects with JSON.stringify before sending
        data:    dataC || '',
        async:   true,
        success: function(response) {
                    self.connection_failed = false;
                    //self.log('response', response);
                    //status=201: created
                    successF(response);
                 },
        error:   function(response) {
                    self.log('response', response);
                    var err_text = '';
                    if (response.data) {
                        if (response.headers["Content-Type"] &&
                            response.headers["Content-Type"].indexOf('html') >= 0) {
                            //don't log data = flask debug html page
                            err_text = self.AssertionError(response.data);
                        } else {
                            err_text = response.data;
                        }
                    }
                    failureF(response, err_text);
                 }
    };
    //self.log('request', request);
    http.request(request);
}; //ajax_post

//h-------------------------------------------------------------------------------
//h
//h Name:         ajax_get
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.ajax_get = function(urlPath, success, failure, database) {
    var self = this;

    if (arguments.length < 3) {
        self.error('ajax_get', 'wrong number of arguments '+arguments.length+' < 3');
    }
    if (!database) {
        database = self.database;
    }

    function failureF(response, err_text) {
        if (!response.status) {
            self.notifyConnectionFault(url+' communication fault');
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure({status: 503});
            } else {
                self.notifyConnectionFault(failure);
                return;
            } 
        } else
        if (response.status < 100 ||
            response.status === 500 ||      //!!!!!!!!!!!!!!!! unendliche schleife ?????????????
            response.status === 900 && 
            (response.statusText.indexOf('database is locked') >= 0 ||
             err_text.indexOf('database is locked') >= 0)) {
            self.notifyConnectionFault(url+' '+response.status+' '+response.statusText+' '+err_text);
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure(response);
            } else {
                self.notifyConnectionFault(failure);
                return;
            }
        } else
        if (typeof failure === 'string') {
            self.notifyError(url+' '+response.status+' '+response.statusText+' '+err_text);
            self.notifyError(failure);
            self.stop();
        } else
        if (typeof failure === 'function') {
            self.warn(url, response.status, response.statusText, err_text);
            failure(response);
        }
    }

    function successF(response) {
        if (typeof success === 'string') {
            self.log(success);
        } else
        if (typeof success === 'function') {
            success(response);
        }
    }

    var url = self.api+':'+self.constants.port+'/'+database+'/'+urlPath;
    self.log('ajax_get url =', url);
    var request = {
        url:     url,
        method:  'GET',
        auth: {
            "login":    self.constants.username,
            "password": self.constants.password
        },
        async:   true,
        success: function(response) {
                    self.connection_failed = false;
                    //self.log('response', response);
                    successF(response);
                 },
        error:   function(response) {
                    self.log('response', response);
                    var err_text = '';
                    if (response.data) {
                        if (response.headers["Content-Type"] &&
                            response.headers["Content-Type"].indexOf('html') >= 0) {
                            //don't log data = flask debug html page
                            err_text = self.AssertionError(response.data);
                        } else {
                            err_text = response.data;
                        }
                    }
                    failureF(response, err_text);
                 }
    };
    //self.log('request', request);
    http.request(request);
}; //ajax_get

//h-------------------------------------------------------------------------------
//h
//h Name:         AssertionError
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.AssertionError = function(dataString) {
    var self = this;

    var begin = dataString.lastIndexOf('<title>');
    if (begin === -1) { return '';}
    var end   = dataString.lastIndexOf('</title>');
    if (end === -1) { return '';}
    return dataString.substring(begin+7, end);
}; //AssertionError

//h-------------------------------------------------------------------------------
//h
//h Name:         checkRetry
//h Purpose:      check for retry init at connection fault
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.checkRetry = function() {
    var self = this;

    self.data_buffer = [];

    if (!self.timerId_init) {
        self.info('retry init after '+self.constants.retry_init_min+' minutes...');
        self.timerId_init = setTimeout(function() {
            self.timerId_init = undefined;
            self.onPoll(self.POLL_INIT);
        }, self.constants.retry_init_min * 60 * 1000);
    }
}; //checkRetry

//h-------------------------------------------------------------------------------
//h
//h Name:         notifyConnectionFault
//h Purpose:      suppress repeated connection fault message
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.notifyConnectionFault = function(text) {
    var self = this;

    if (!self.connection_failed) {
        self.connection_failed = true;
        self.notifyWarn(text);
    }
}; //notifyConnectionFault
