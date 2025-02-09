/*** MxChartDB V2.3.1 2024-07-08 Z-Way HA module *********************************/

//h-------------------------------------------------------------------------------
//h
//h Name:         MxChartDB.js
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
//h Version:      V3.3.0 2025-02-07/peb
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
//v               V2.0.1 2024-05-01/peb [+]skip if device level already stored 
//v               V2.3.0 2024-05-07/peb [+]after insert wait for response before
//v                                        next insert
//v               [x]fixed
//v               [*]reworked, changed
//v               [-]removed
//v               [+]added
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals MxChartDB, http, constants, executeFile */
/*globals init:true */

///h-------------------------------------------------------------------------------
//h
//h Name:         start
//h Purpose:      module start.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.start = function(config) {
'use strict';
    var self = this;

    self.MODULE = 'MxChartDB.js';
    self.VERSION = 'V3.3.0';
    self.WRITTEN = '2025-02-07/peb';

    self.LEAST_API_VERSION = '1.1.0';
    self.POLL_INIT = 999;
    self.constants = undefined;
    self.api = undefined;

    //b remove obsolete configuration parameters/ add new
    //---------------------------------------------------
    _.each(self.config.sensors, function(sensor, ix) {
        if (typeof sensor.disableDevice !== "undefined") {
            if (sensor.disableDevice === true) {
                sensor.entrytype = 'disabled';
            } else {
                if (sensor.device) {
                    sensor.entrytype = 'sensor';
                } else {
                    sensor.entrytype = 'formula';
                }
            }
            sensor.disableDevice = undefined;
        }
        if (typeof sensor.entrytype === "undefined") {
            if (sensor.device) {
                sensor.entrytype = 'sensor';
            } else {
                sensor.entrytype = 'formula';
            }
        }
    });
    if (typeof self.config.copyMxChartJS !== "undefined") {
        self.config.copyMxChartJS = undefined;
    }
    if (typeof self.config.axes === "undefined") {
        self.config.axes = {time_label:    self.config.time_label,
                            positionYAxis: self.config.positionYAxis,
                            limitYAxis:    self.config.limitYAxis,
                            y1Label:       self.config.y1Label,
                            y2Label:       self.config.y2Label
        };
        self.config.time_label = undefined;
        self.config.positionYAxis = undefined;
        self.config.limitYAxis = undefined;
        self.config.y1Label = undefined;
        self.config.y2Label = undefined;
    }
    if (typeof self.config.store_value_set === 'undefined') {
        self.config.store_value_set = {};
    }
    if (typeof self.config.post_calc === 'undefined') {
        self.config.post_calc = [];
    }
    if (typeof self.config.period !== "undefined") {
        self.config.nonnumericLabels.use_nonnumeric = true;
        self.config.startFullTimes = false;

        if (self.config.period === '0') { //= value_change
            self.config.store_value_set.poll_method = 'poll_value_change';
        } else {
            self.config.store_value_set.poll_method = 'poll_interval_rectangle';
            self.config.store_value_set.period = self.config.period;
        }
        self.config.period = undefined;
    }
    if (self.config.startFullTimes) {
        self.config.store_value_set.startFullTimes = self.config.startFullTimes;
        self.config.startFullTimes = undefined;
    }
    if (typeof self.config.copyMxChartJS !== "undefined") {
        self.config.copyMxChartJS = undefined;
    }
    if (typeof self.config.dataControl.dc_method === "undefined") {
        if (self.config.dataControl.dC_new) {
            self.config.dataControl.dc_method = 'dc_clear';
        } else 
        if (self.config.dataControl.dC_continue) {
            self.config.dataControl.dc_method = 'dc_continue';
        } else {
            self.config.dataControl.dc_method = 'dc_normal';
        }
        self.config.dataControl.dC_new = undefined;
        self.config.dataControl.dC_continue = undefined;
    }
    if (typeof self.config.store_value_set.run_after_start === "undefined") {
        if (self.config.store_value_set.startFullTimes) {
            self.config.store_value_set.run_after_start = false;
        } else {
            self.config.store_value_set.run_after_start = true;
        }
    }
    if (self.config.switch !== undefined) {
        self.config.switch = undefined;
    }
    if (typeof self.config.specials.nightBackDev !== 'undefined') {
        self.config.specials.nightBackDev = undefined;
    }

    //b global variables
    //------------------
    self.now = Date.now(); //milliseconds

    //database to store the global index
    if (self.config.IndexDBName === undefined) {
        self.config.IndexDBName = self.moduleName;
    }
    self.IndexDBName = self.config.IndexDBName;
    self.log(' *** self.IndexDBName', self.IndexDBName);
    self.tableNameIndex  = self.IndexDBName+'_Index';

    //default database for user charts
    if (self.config.DBName === undefined) {
        self.config.DBName = self.IndexDBName;      //default
    }
    self.DBName = self.config.DBName;
    self.log(' *** self.DBName', self.DBName);

    self.data_buffer = undefined;
    self.buffer_max_rows = undefined;

    self.tableNameHeader = undefined;
    self.tableNameValues = undefined;

    self.lastValuesStored = undefined;

    self.intchartIcons = undefined;

    self.sensors = undefined;
    self.chartIntervalMSecs = undefined;

    self.chartUrl = undefined;
    self.timerId_delay = undefined;
    self.POLL_TIMER_DELAY = self.POLL_TIMER;
    self.timerId_repeat_post = undefined;
    self.timerId_init = undefined;

    self.last_ts_pending = undefined;
    self.flag_notifyConnectionFault = undefined;

    //b read constants
    //----------------
    var f = 'htdocs/constants.js';
    f = self.moduleBasePath() + '/' + f;
    self.info('executing '+f+'...');
    executeFile(f);
    //don't permanently link to constants file:
    self.constants = self.realCopyObject(constants);

    //b if only store chart definition
    //--------------------------------
    if (self.config.store_value_set.poll_method === 'poll_never') {
        //b continue
        //----------
        self.initExec();
    //b else
    //------
    } else {
        //b build devices array
        //---------------------
        var devicesArray = [];
        _.each(self.config.sensors, function(sensor, ix) {
            if (sensor.device && sensor.entrytype === 'sensor') {
                devicesArray.push(sensor.device);
            }
        });
        self.log('devicesArray', devicesArray);

        //b wait till all devices are ready (=>initExec)
        //----------------------------------------------
        self.waitDevicesReady(devicesArray);
    }
}; //start

//h-------------------------------------------------------------------------------
//h
//h Name:         initExec
//h Purpose:      module kickoff.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.initExec = function() {
'use strict';
    var self = this;
    self.now = Date.now(); //milliseconds

    //b initialisation
    //----------------
    var f = 'MxChartDB_init.js';
    f = self.moduleBasePath() + '/' + f;
    self.info('executing '+f+'...');
	executeFile(f);
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
'use strict';
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
MxChartDB.prototype.onPoll = function(n, i, t, l, m) {
'use strict';
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
                //avoid insert accumulation jam at full minute
                self.timerId_delay = setTimeout(function() {
                    self.timerId_delay = undefined;
                    self.onPoll(self.POLL_TIMER_DELAY);
                }, 10000 + 80 * self.id);    // 10sec + x msec
                return;
            }
            break;
        //b device sensor value
        //---------------------
        case self.POLL_DEVICE:
            self.log('--- onPoll by', i+'/'+t, m+'='+l);

            if (self.lastValuesStored === undefined) {
                self.lastValuesStored = {};
            }
            if (self.lastValuesStored[i] === undefined) {
                self.lastValuesStored[i] = {};
            }
            if (self.lastValuesStored[i][m] === undefined) {
                self.lastValuesStored[i][m] = null;
            }
            if (self.lastValuesStored[i][m] === l) {
                self.log('value not changed, skipped.');
                return;
            }
            self.log('--- value changed', i+'/'+t, 
                      m+'='+self.lastValuesStored[i][m]+' to '+l);
            self.lastValuesStored[i][m] = l;
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

                    i = sensor.id;
                    l = sensor.val;
                    m = sensor.metric;
                    if (self.lastValuesStored === undefined) {
                        self.lastValuesStored = {};
                    }
                    if (self.lastValuesStored[i] === undefined) {
                        self.lastValuesStored[i] = {};
                    }
                    if (self.lastValuesStored[i][m] === undefined) {
                        self.lastValuesStored[i][m] = null;
                    }
                    if (self.lastValuesStored[i][m] !== l) {
                        self.lastValuesStored[i][m] = l;
                    }
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
'use strict';
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
'use strict';
    var self = this;
    self.log('*** store_table_data', tableName, ts, '?data', '?callback', 
              ts_del, database);

    if (!database) {database = self.DBName;}
    if (!self.data_buffer) {self.data_buffer = [];}

    var dataRow = {"ts": ts, "val": data};
    if (self.POLL_INIT || self.buffer_max_rows === 0) {
        self.data_buffer = [dataRow];
    } else {
        self.data_buffer.push(dataRow);
        if (self.data_buffer.length > self.buffer_max_rows) {
            self.data_buffer.shift();
        }
    }
    //self.log('self.data_buffer', self.data_buffer);

    var url_insert = tableName+'/insert?';
    if (ts_del) {
        url_insert += 'ts_del='+ts_del+'&';
    }
    url_insert += 'self='+self.id;  //for analysis only
    self.do_insert(url_insert, tableName, callback, database);
}; //store_table_data

//h-------------------------------------------------------------------------------
//h
//h Name:         do_insert
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.do_insert = function(url_insert, tableName, callback, database) {
'use strict';
    var self = this;
    self.log('*** do_insert', tableName);

    var rowcount_to_send = self.data_buffer.length;
    var last_ts_in_buffer_to_send;
    if (rowcount_to_send) {
        last_ts_in_buffer_to_send = self.data_buffer[rowcount_to_send-1].ts;
    }

    self.log('check: rowcount_to_send', rowcount_to_send);
    self.log('check: last_ts_in_buffer_to_send', last_ts_in_buffer_to_send);
    self.log('check: self.last_ts_pending', self.last_ts_pending);
    self.log('check: self.timerId_repeat_post', self.timerId_repeat_post);

    if (rowcount_to_send > 0 &&     //data to send
        !self.last_ts_pending &&    //not waiting for response from API
        !self.timerId_repeat_post   //not waiting for timer delay for resend
       ) {
        self.log('calling ajax_post...');
        self.last_ts_pending = last_ts_in_buffer_to_send;
        self.ajax_post(
            url_insert, 
            self.data_buffer,
            //success
            function(response) { 
                //self.info('--- success');
                if (self.timerId_repeat_post) {
                    self.log('clearing timer timerId_repeat_post...');
                    clearTimeout(self.timerId_repeat_post);
                    self.timerId_repeat_post = undefined;
                }

                var rowcount_now = self.data_buffer.length;
                var last_ts_in_buffer_now;
                if (rowcount_now) {
                    last_ts_in_buffer_now = self.data_buffer[rowcount_now-1].ts;
                }
                self.log('rowcount_now', rowcount_now);
                self.log('last_ts_in_buffer_now', last_ts_in_buffer_now);
                self.log('self.last_ts_pending', self.last_ts_pending);

                if (last_ts_in_buffer_now <= self.last_ts_pending) {
                    self.data_buffer = [];
                    //self.info('--- last ts = all rows acknowledged');
                } else {
                    var rowcount_sent = self.data_buffer.length;
                    var i = 0;
                    for (i = 0; i < last_ts_in_buffer_now; i++) {
                        if (self.data_buffer[i].ts > self.last_ts_pending) {
                            break;
                        }
                    }
                    if (i) {
                        self.data_buffer = self.data_buffer.slice(i);
                    }
                    rowcount_now = self.data_buffer.length;
                    if (rowcount_now) {
                        self.log('--- not all rows acknowledged, remain '+
                                 rowcount_now+' of '+rowcount_sent);
                    }
                }
                rowcount_now = self.data_buffer.length;
                last_ts_in_buffer_now = undefined;
                if (rowcount_now) {
                    last_ts_in_buffer_now = self.data_buffer[rowcount_now-1].ts;
                }
                self.log('rowcount_now', rowcount_now);
                self.log('last_ts_in_buffer_now', last_ts_in_buffer_now);

                self.last_ts_pending = null;    //enable new sending
                if (rowcount_now > 0) {
                    //send remaining rows
                    self.log('sending '+rowcount_now+' remaining rows');
                    self.do_insert(url_insert, tableName, callback, database);
                } else {
                    //all rows stored
                    callback();
                }
            },
            //failure
            function(response) {
                //self.info('--- failure');
                self.notifyConnectionFault('0a '+'table '+tableName+' store data');

                self.last_ts_pending = null;    //enable new sending
/*
                //resend after delay
                self.notifyWarn('pending since '+self.userTime(self.last_ts_pending));
                self.timerId_repeat_post = setTimeout(function() {
                    self.timerId_repeat_post = undefined;

                    self.last_ts_pending = null;
                    self.notifyWarn('resending now '+self.userTime(Date.now()));
                    self.do_insert(url_insert, tableName, callback, database);
                }, 20000 + 20 * self.id);    // 20sec + x msec
*/                
            },
            //database
            database
        ); //self.ajax_post
    } //if (!self.last_ts_pending)
}; //do_insert

//h-------------------------------------------------------------------------------
//h
//h Name:         ajax_post
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.ajax_post = function(urlPath, data, success, failure, database) {
'use strict';
    var self = this;
    self.log('*** ajax_post', urlPath, database);

    var dataC = data;
    if (data) {
        if (typeof data === 'object') {
            dataC = JSON.stringify(data);
        }
    }

    if (arguments.length < 4) {
        self.error('ajax_post', 'wrong number of arguments '+arguments.length+' < 4');
    }
    if (!database) {database = self.DBName;}

    function failureF(response, err_text) {
        //case 1
        if (!response.status) {
            self.notifyConnectionFault('1a '+url+' communication fault');
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure({status: 503});
            } else {
                self.notifyConnectionFault('1b '+failure);
                return;
            } 
        } else
        //case 2
        if (response.status < 100 ||
            response.status === 500 ||      //!!!!!!!!!!!!!!!! unendliche schleife ?????????????
            response.status === 900 && 
            (response.statusText.indexOf('database is locked') >= 0 ||
             err_text.indexOf('database is locked') >= 0)) {

            if (response.status === 900) {
                self.notifyConnectionFault('2a '+url+' status='+response.status+' '+err_text);
                // status=900 sqlite3.Error on ...: database is locked/busy
                //
            } else {
                self.notifyConnectionFault('2b '+url+' status='+response.status+' '+
                                           response.statusText+' '+err_text);
            }

            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure(response);
            } else {
                self.notifyConnectionFault('2c '+failure);
                return;
            }
        } else
        //case 3
        if (typeof failure === 'string') {
            self.notifyError('3a '+url+' status='+response.status+' '+
                             response.statusText+' '+err_text);
            self.notifyError(failure);
            self.stop();
        } else
        //case 4
        if (typeof failure === 'function') {
            self.warn('4a '+url, response.status, response.statusText, err_text);
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
        timeout: 20000,         //default: 20000 ms 
                                // >> response:status = -1 
                                //             data   = Timeout was reached
        success: function(response) {
                    self.flag_notifyConnectionFault = false;
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
    http.request(request);
}; //ajax_post

//h-------------------------------------------------------------------------------
//h
//h Name:         ajax_get
//h Purpose:      
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.ajax_get = function(urlPath, success, failure, database) {
'use strict';
    var self = this;
    self.log('*** ajax_get', urlPath, database);

    if (arguments.length < 3) {
        self.error('ajax_get', 'wrong number of arguments '+arguments.length+' < 3');
    }
    if (!database) {database = self.DBName;}

    function failureF(response, err_text) {
        if (!response.status) {
            self.notifyConnectionFault('11 '+url+' communication fault');
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure({status: 503});
            } else {
                self.notifyConnectionFault('12 '+failure);
                return;
            } 
        } else
        if (response.status < 100 ||
            response.status === 500 ||      //!!!!!!!!!!!!!!!! unendliche schleife ?????????????
            response.status === 900 && 
            (response.statusText.indexOf('database is locked') >= 0 ||
             err_text.indexOf('database is locked') >= 0)) {
            self.notifyConnectionFault('13 '+url+' status='+response.status+' '+response.statusText+' '+err_text);
            if (self.POLL_INIT) {
                self.checkRetry();
                return;
            } else
            if (typeof failure === 'function') {
                failure(response);
            } else {
                self.notifyConnectionFault('14 '+failure);
                return;
            }
        } else
        if (typeof failure === 'string') {
            self.notifyError(url+' status='+response.status+' '+response.statusText+' '+err_text);
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
                    self.flag_notifyConnectionFault = false;
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
'use strict';
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
'use strict';
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
'use strict';
    var self = this;

    if (!self.flag_notifyConnectionFault) {
        self.flag_notifyConnectionFault = true;
        self.notifyWarn(text);
    }
}; //notifyConnectionFault
