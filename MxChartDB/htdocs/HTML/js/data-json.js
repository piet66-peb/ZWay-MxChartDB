
//h-------------------------------------------------------------------------------
//h
//h Name:         data-json.js
//h Type:         Javascript module (MxChartDB)
//h Purpose:      Display data of chart file as json
//h Project:      ZWay
//h Usage:        
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V3.1.2 2025-01-26/peb
//v History:      V1.0.0 2022-04-01/peb taken from MxChartJS
//v               V2.1.0 2024-01-09/peb [+]other database 
//v               V3.1.2 2025-01-26/peb [*]date arithmetic
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals $, ch_utils, JsonViewer, html_params */
'use strict';

//-----------
//b Constants
//-----------
var MODULE='data-json.js';
var VERSION='V3.1.2';
var WRITTEN='2025-01-26/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

var url;
var IndexDBName;
var tableNameIndex;

//------
//b Main
//------
document.addEventListener("DOMContentLoaded", function(event) {
    
    //------- data definitions -------------------------

    var vLog = {chartHeader: {},
                chartValues: []};
    var ts_first, ts_last, endTime, db_count, db_count_latest_hour;

    //------- program code -------------------------
    //workaround:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia:
    if (window.location.pathname.indexOf('/modulemedia/') > 0) {
        ch_utils.convertMessagesToUTF8();
        //ch_utils.convertCharset = true; //for all ajax inputs
    }
    ch_utils.getLanguage();

    //get parameters
    var chartId = ch_utils.getParameter('chartId');
    console.log('chartId='+chartId);
    if (chartId.length === 0) {
        ch_utils.alertMessage(1);
        return;
    }
    var from = ch_utils.getParameter('from');
    console.log('from='+from);
    var to = ch_utils.getParameter('to');
    console.log('to='+to);

    //detect index database name
    // /ZAutomation/api/v1/load/modulemedia/MxChartDB/HTML/admin.html
    url = window.location.pathname;
    IndexDBName = url.split('/')[6];
    tableNameIndex = IndexDBName+'_Index';
    console.log('IndexDBName='+IndexDBName);

    chartId = chartId.replace('__', '.');
    var chartIdDisp = chartId;
    var chartIdDB = IndexDBName;
    var chartIdBase = chartId;
    //if other database:
    if (chartId.indexOf('.') > 0) {
        var chartIdSplit = chartIdDisp.split('.');
        chartIdDB = chartIdSplit[0];
        chartIdBase = chartIdSplit[1];
    }

    //get constants.js parameters
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
       ch_utils.displayMessage(0, consts);
    }
    var api = consts.api;

    document.title = chartIdDisp;
    ch_utils.displayMessage(0, chartIdDisp);

    if (!document.getElementById('radio_values_rang').checked) {
        ch_utils.buttonVisible('dt_picker', false);
    } else {
        ch_utils.buttonVisible('dt_picker', true);
    }

    //request chart data
    count_chart_entries();

   //count chart entries
   function count_chart_entries() {
       var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/count';
       ch_utils.ajax_get(url, success);
       function success(data) {
            db_count = data[0];
            console.log('db_count: '+db_count);
            if (db_count === 0) {
                config_datepicker();
            } else {
                read_last_ts();
            }
       }
   } //count_chart_entries
   
   //count chart entries of latest hour
   function count_chart_entries_latest(ts_last) {
       var latest_hour = ts_last - 1000*60*50;
       var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/count?ts>'+latest_hour;
       ch_utils.ajax_get(url, success);
       function success(data) {
            db_count_latest_hour = data[0];
            console.log('db_count_latest_hour: '+db_count_latest_hour);
            read_first_ts();
       }
   } //count_chart_entries_latest
   
   //read last ts
   function read_last_ts() {
       url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_last_ts?raw=yes';
       ch_utils.ajax_get(url, success, fail, no_data);
       function success(data) {
           ts_last = data;
           console.log('_ts_last: '+data);
           //read_first_ts();
           count_chart_entries_latest(ts_last);
       }
       function no_data(data) {
           ts_last = 0;
           console.log('_ts_last: '+data);
           read_first_ts();
       }
       function fail(data) {
           ts_last = false;
           var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_first_ts?raw=yes';
           console.log(url+' command not defined');
       }
   } //read_last_ts

   //read first ts
   function read_first_ts() {
       url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_first_ts?raw=yes';
       ch_utils.ajax_get(url, success, fail, no_data);
       function success(data) {
           ts_first = data;
           console.log('ts_first: '+data);
           config_datepicker();
       }
       function no_data(data) {
           ts_first = 0;
           console.log('ts_first: '+data);
           config_datepicker();
       }
       function fail(data) {
           ts_first = false;
           var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_first_ts?raw=yes';
           console.log(url+' command not defined');
       }
   } //read_first_ts

    //prepare time picker
    function config_datepicker() {
        if (!document.getElementById('radio_values_rang').checked) {
            ch_utils.buttonVisible('dt_picker', false);
        } else {
            ch_utils.buttonVisible('dt_picker', true);
        }

        ch_utils.buttonText('dt_picker_title', 6);
        ch_utils.buttonText('dt_picker_date', 7);
        ch_utils.buttonText('dt_picker_time', 8);
        ch_utils.buttonText('dt_picker_length', 9);
        ch_utils.buttonText('dt_picker_exec', 10);
        ch_utils.buttonText('header_only_text', 11);
        ch_utils.buttonText('values_all_text', 12);
        ch_utils.buttonText('values_rang_text', 13);
        if (!document.getElementById('radio_header_only').checked &&
            !document.getElementById('radio_values_all').checked &&
            !document.getElementById('radio_values_rang').checked) {
           document.getElementById('radio_header_only').checked = true;
        }

        if (db_count === 0) {
            ch_utils.displayMessageDiv('count_text', 15);
        } else {
            ch_utils.displayMessageDiv('count_text', 14, db_count, 
                ch_utils.userTime(ts_first).slice(0,16), 
                ch_utils.userTime(ts_last).slice(0,16));
            var db_count_avg = Math.round(db_count/((ts_last - ts_first)/(60*60*1000)));
            ch_utils.displayMessageDiv('count_avg', 16, db_count_avg);
            ch_utils.displayMessageDiv('count_latest_hour', 17, db_count_latest_hour);
        }

        var d = new Date(ts_first);
        var yearStart = d.getFullYear();
        var monthStart = d.getMonth() + 1;
        var dayStart = d.getDate();
        var hourStart = 0;
        var minuteStart = 0;
        var lenStart = 1;
        var typeStart = 2;

        var yearFirst = yearStart;
        d = new Date(ts_last);
        var yearLast = d.getFullYear();

        d = new Date(from*1);
        console.log(d);
        if (!isNaN(d)) {
            yearStart = d.getFullYear();
            monthStart = d.getMonth() + 1;
            dayStart = d.getDate();
            hourStart = d.getHours();
            minuteStart = d.getMinutes();

            var len = (to - from)/1000/60; //minutes
            var lenMinute = 1;
            var lenHour = 60;
            var lenDay = 60 * 24;
            var lenWeek = 60 * 24 * 7;
            var lenMonth = 60 * 24 * 31;
            var lenYear = 60 * 24 * 365;

            if (len < lenHour) {
                lenStart = Math.ceil(len/lenMinute);
                typeStart = 1;
                if (lenStart > 20) {
                    lenStart = 1;
                    typeStart = 2;
                }
            } else
            if (len < lenDay) {
                lenStart = Math.ceil(len/lenHour);
                typeStart = 2;
            } else
            if (len < lenWeek) {
                lenStart = Math.ceil(len/lenDay);
                typeStart = 3;
            } else
            if (len < lenMonth) {
                lenStart = Math.ceil(len/lenWeek);
                typeStart = 4;
            } else
            if (len < lenYear) {
                lenStart = Math.ceil(len/lenMonth);
                typeStart = 5;
                if (lenStart > 20) {
                    lenStart = 1;
                    typeStart = 6;
                }
            } else {
                lenStart = Math.ceil(len/lenYear);
                typeStart = 6;
            }
        }

        config_datepicker_numeric("dt_picker_month", 1, 12, true, monthStart);
        config_datepicker_numeric("dt_picker_day", 1, 31, true, dayStart);
        config_datepicker_numeric("dt_picker_hour", 0, 23, true, hourStart);
        config_datepicker_numeric("dt_picker_minute", 0, 59, true, minuteStart);
        config_datepicker_numeric("dt_picker_year", yearFirst, yearLast, false, yearStart);

        config_datepicker_numeric("dt_picker_intervallength", 1, 20, false, Math.min(20, lenStart));
        var list = ch_utils.buildMessage(5);
        config_datepicker_list("dt_picker_intervaltype", list, typeStart);
    } //config_datepicker

    function config_datepicker_numeric(element, first, last, leading_zero, curr) {
        var i, j, opt_value;
        var el = document.getElementById(element);
        if (el.options.length > 0) {
            return;
        }
        j = 0;
        for (i = first; i < (last+1); i++) {
            if (leading_zero && i < 10) {
                opt_value = '0'+i;
            } else {
                opt_value = ''+i;
            }
            el.options[j++] = new Option(opt_value, opt_value);
        }
        if (curr !== undefined) {
            if (leading_zero && curr < 10) {
                curr = '0'+curr;
            }
            el.value = curr;
        } else {
            el.selectedIndex = 0;
        }
    } //config_datepicker_numeric

    function config_datepicker_list(element, list, index) {
        var el = document.getElementById(element);
        if (el.options.length > 0) {
            return;
        }
        var listArray = list.split(',');
        for (var i = 0; i < listArray.length; i++) {
            el.options[i] = new Option(listArray[i], i);
        }
        el.selectedIndex = index - 1;
    } //config_datepicker_list

    function dateToTimestamp(newDateTime) {
        var ts = NaN;
        while (isNaN(ts)) {
            ts = new Date(newDateTime).getTime();
            if (! isNaN(ts)) {
                return ts;
            }
            newDateTime = newDateTime.replace('-29 ', '-28 ');
            newDateTime = newDateTime.replace('-30 ', '-29 ');
            newDateTime = newDateTime.replace('-31 ', '-30 ');
        }
    } //dateToTimestamp

    //read chart header
    function read_header(ts_start, ts_end) {
        console.log('read_header: '+ts_start+' '+ts_end);
        vLog = {chartHeader: {},
                chartValues: []};
        url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header/select_next';
        ch_utils.ajax_get(url, success, fail, 4);
        function success(data) {
            vLog.chartHeader = data[data.length - 1];
    
            //get data
            document.title = vLog.chartHeader.chartId;
            if (ts_end) {
                ch_utils.displayMessage(0, chartIdDisp+': ' +
                                   vLog.chartHeader.chartTitle + '    (' +
                                   ch_utils.userTime(ts_start) + '  -  ' +
                                   ch_utils.userTime(ts_end) + ')');
            } else {
                ch_utils.displayMessage(0, chartIdDisp+': ' +
                                   vLog.chartHeader.chartTitle);
            }
    
            //add user time
            vLog.chartHeader.Timestamp += ' = '+ 
                              ch_utils.userTime(vLog.chartHeader.Timestamp);
    
            //read chart values
            if (ts_start === undefined) {
                printJSON(vLog);
            } else {
                read_values(ts_start, ts_end);
            }
        } //success
       
        function fail(status) {
            if (status === 404) {   //file not found
                ch_utils.alertMessage(4);
            } else {
                var mess = 'error reading '+chartIdDisp+' Header data: '+status;
                console.log(mess);
                alert(mess);
            }
        } //fail
    } //read_header

    function read_values(ts_start, ts_end) {
        console.log('read_values: '+ts_start+' '+ts_end);
        if (ts_end) {
            url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_range?from='+ts_start+'&to='+ts_end;
        } else {
            url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_range?from='+ts_start;
        }
        ch_utils.ajax_get(url, success, fail, no_data);
        function success(data) {
            vLog.chartValues = data;
    
            //add user times
            addAllUserTimes(vLog.chartValues);
    
            //draw json data
            printJSON(vLog);
        } //success
       
        function no_data() {
            vLog.chartValues = [];
    
            //draw json data
            printJSON(vLog);
        } //success
    
        function fail(status) {
            if (status === 404) {   //file not found
                no_data();
            } else {
                var mess = 'error reading '+chartIdDisp+' Header data: '+status;
                console.log(mess);
                alert(mess);
            }
        } //fail
    } //read_values

    //------- function definitions -------------------------

    function addAllUserTimes(chartValues) {
        //chartValues.forEach(function(messPoint, ixPoint) {
        var len = chartValues.length;
        var messPoint;
        for (var ixPoint = 0; ixPoint < len; ixPoint++) {
            messPoint = chartValues[ixPoint];
            if (! Array.isArray(messPoint)) {
                console.log('error: messPoint '+ixPoint+' is not an array');
                console.log(messPoint);
                continue;
            }

            messPoint[0] = messPoint[0] +' = '+ ch_utils.userTime(messPoint[0]);
            try {            
                messPoint.forEach( function(sensorVal) {
                    if (sensorVal && typeof sensorVal === 'object' && sensorVal.lastChanged) {
                        sensorVal.lastChanged += ' = ' + ch_utils.userTime(sensorVal.lastChanged);
                    }
                });
            } catch(err) {
                console.log(err.message);
                console.log(messPoint);
                console.log(ixPoint);
            }
        }
    } //addAllUserTimes

    function printJSON(logData) {
        ch_utils.buttonVisible('datetimepicker', false);
        ch_utils.buttonVisible('data', true);

        /*
        $('#json-renderer').jsonViewer(logData, {
            collapsed: false,
            withQuotes: true
        });
        */
        JsonViewer.JsonViewer({container: document.getElementById('json-renderer'), 
                               data: logData, 
                               theme: 'light', 
                               expand: true});
    } //printJSON

    document.getElementById('radio_header_only').onclick = function() {
        if (!document.getElementById('radio_values_rang').checked) {
            ch_utils.buttonVisible('dt_picker', false);
        } else {
            ch_utils.buttonVisible('dt_picker', true);
        }
    };
    document.getElementById('radio_values_all').onclick = function() {
        if (!document.getElementById('radio_values_rang').checked) {
            ch_utils.buttonVisible('dt_picker', false);
        } else {
            ch_utils.buttonVisible('dt_picker', true);
        }
    };
    document.getElementById('radio_values_rang').onclick = function() {
        if (!document.getElementById('radio_values_rang').checked) {
            ch_utils.buttonVisible('dt_picker', false);
        } else {
            ch_utils.buttonVisible('dt_picker', true);
        }
    };

    document.getElementById('dt_picker_exec').onclick = function() {
        var radio_header_only = document.getElementById('radio_header_only').checked;
        console.log('radio_header_only='+radio_header_only);
        if (radio_header_only) {
            read_header();
            return;
        }

        var radio_values_all = document.getElementById('radio_values_all').checked;
        console.log('radio_values_all='+radio_values_all);
        if (radio_values_all) {
            read_header(0);
            return;
        }

        var radio_values_rang = document.getElementById('radio_values_rang').checked;
        console.log('radio_values_rang='+radio_values_rang);
        if (!radio_values_rang) {
            return;
        }

        var year_value = document.getElementById('dt_picker_year').value;
        var month_value= document.getElementById('dt_picker_month').value;
        var day_value= document.getElementById('dt_picker_day').value;
        var hour_value= document.getElementById('dt_picker_hour').value;
        var minute_value= document.getElementById('dt_picker_minute').value;
        var newDateTime = year_value+'-'+month_value+'-'+day_value+' '+hour_value+':'+minute_value+':00';
        var newStart = dateToTimestamp(newDateTime);

        var length_value = document.getElementById('dt_picker_intervallength').value-0;
        var type_value = document.getElementById('dt_picker_intervaltype').value-0;
        var type_length = [60, 3600, 86400, 604800, 2592000, 31536000][type_value];
        var newLength = length_value * type_length * 1000;
        var newEnd = newStart + newLength;

        var d;
        if (type_value === 4) {     //months
            d = new Date(newDateTime);
            newStart = d.getTime();
            d.setMonth(d.getMonth() + length_value);
            newEnd = d.getTime();          
        } else
        if (type_value === 5) {     //years
            d = new Date(newDateTime);
            newStart = d.getTime();
            d.setFullYear(d.getFullYear() + length_value);
            newEnd = d.getTime();          
        }

        console.log('newStart='+newStart);
        console.log('newEnd='+newEnd);
       
        read_header(newStart, newEnd);
    }; //dt_picker_exec

}); //document).ready
