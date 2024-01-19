
//h-------------------------------------------------------------------------------
//h
//h Name:         take-snapshot.js
//h Type:         Javascript module (MxChartDB)
//h Purpose:      Take a chart snapshot
//h Project:      ZWay
//h Usage:        
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V1.0.0 2024-01-17/peb
//v History:      V1.0.0 2024-01-12/peb first version
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals $, ch_utils, JsonViewer, html_params, constants */
'use strict';

//-----------
//b Constants
//-----------
var MODULE='take-snapshot.js';
var VERSION='V1.0.0';
var WRITTEN='2024-01-17/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

//------
//b Main
//------
document.addEventListener("DOMContentLoaded", function(event) {
    
    //------- data definitions -------------------------

    var vLog = {chartHeader: {},
                chartValues: []};
    var url;
    var ts_first, ts_last, endTime, db_count;

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
    var ts_from = ch_utils.getParameter('ts_from');
    if (ts_from) {ts_from = ts_from-0;}
    console.log('ts_from='+ts_from);
    var ts_to = ch_utils.getParameter('ts_to')-0;
    if (ts_to) {ts_to = ts_to-0;}
    console.log('ts_to='+ts_to);

    //get constants.js parameters
    var snapshots_possible = false;
    var api, ip, hostname, port, snapshotDB, snapshotAdmin, errtext;
    try {
        port = constants.port;
        ip = constants.browser_client.ip;
        hostname = constants.browser_client.hostname;
        snapshotAdmin = constants.browser_client.snapshots.admin_required;
        snapshotDB = constants.browser_client.snapshots.database_name;
    } catch(err) {
        errtext = err;
    }
    if (!errtext) {
        if (!ip && !hostname) {
            errtext = 'constants.js: no ip/hostname defined, break,';
        } else
        if (!port) {
            errtext = 'constants.js: port defined, break,';
        } else
        if (!snapshotDB) {
            errtext = 'constants.js: no snapshot database defined, break,';
        } else
        if (snapshotAdmin === undefined) {
            errtext = 'constants.js: admin_required not defined, break,';
        }
    }
    if (errtext) {
        ch_utils.displayMessage(0, errtext);
        alert(errtext);
    } else {
        snapshots_possible = true;
        api = (ip || hostname)+':'+port;
        console.log('snapshots db='+snapshotDB);
        console.log('api='+api);
    }

    if (snapshots_possible) {
        //evaluateartId
        chartId = chartId.replace('__', '.');
        var chartIdDisp = chartId;
        var chartIdDB = 'MxChartDB';
        var chartIdBase = chartId;
        //if other database:
        if (chartId.indexOf('.') > 0) {
            var chartIdSplit = chartIdDisp.split('.');
            chartIdDB = chartIdSplit[0];
            chartIdBase = chartIdSplit[1];
        }
    
        document.title = chartIdDisp;
        ch_utils.displayMessage(2, chartIdDisp);
    
        //creat snapshot database
        check_create_snapshot_db(snapshotDB);

        //request chart data
        count_chart_entries();
    } //snapshots_possible

    function check_create_snapshot_db (snapshotDB) {
        console.log('*** check_create_db');
    
        //b check/ create db server + database (=>ajax_post)
        //--------------------------------------------------
        url = 'http://'+api+'/'+snapshotDB+'/'+'create_db';
        ch_utils.ajax_post(url, undefined, success);
        function success(data) {
            console.log('database file '+snapshotDB+' created/ already existing');
       }
    } //check_create_snapshot_db
    
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
   
   //read last ts
   function read_last_ts() {
       url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_last_ts?raw=yes';
       ch_utils.ajax_get(url, success, fail, no_data);
       function success(data) {
           ts_last = data;
           console.log('ts_last: '+data);
           read_first_ts();
       }
       function no_data(data) {
           ts_last = 0;
           console.log('ts_last: '+data);
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

    //set choosen select value:
    function set_select_by_value(el, value) {
        var elId = document.getElementById(el);
        var len = elId.options.length;
        for(var i = 0; i < len; i++)
        {
            if (elId.options[i].innerHTML-0 === value-0)
            {
                elId.selectedIndex = i;
                break;
            }     
        }
    } //set_select_by_value

    //prepare time picker
    function config_datepicker() {
        //kind of storage:
        ch_utils.buttonText('kind', 19);
        ch_utils.buttonText('header_only_text', 11);
        ch_utils.buttonText('values_all_text', 12);
        ch_utils.buttonText('values_rang_text', 13);
        document.getElementById('radio_header_only').checked = false;
        document.getElementById('radio_values_all').checked = false;
        document.getElementById('radio_values_rang').checked = false;
        if (ts_from || ts_to) {
           document.getElementById('radio_values_rang').checked = true;
        }

        //interval:
        ch_utils.buttonText('dt_picker_title', 6);
        ch_utils.buttonText('start_date', 7);
        ch_utils.buttonText('start_time', 8);
        ch_utils.buttonText('end_date', 20);
        ch_utils.buttonText('end_time', 21);

        config_datepicker_numeric("start_month", 1, 12, true);
        config_datepicker_numeric("start_day", 1, 31, true);
        config_datepicker_numeric("start_hour", 0, 23, true);
        config_datepicker_numeric("start_minute", 0, 59, true);

        config_datepicker_numeric("end_month", 1, 12, true);
        config_datepicker_numeric("end_day", 1, 31, true);
        config_datepicker_numeric("end_hour", 0, 23, true);
        config_datepicker_numeric("end_minute", 0, 59, true);

        var yearStart = new Date(ts_first).getFullYear();
        var yearEnd = new Date(ts_last).getFullYear();
        config_datepicker_numeric("start_year", yearStart, yearEnd, false);
        config_datepicker_numeric("end_year", yearStart, yearEnd, false);

        //set interval:
        var chartId_from, chartId_to;
        if (ts_from || ts_to) {
            var ts = ts_from || ts_first;
            ts = Math.max(ts, ts_first);
            var dt = new Date(ts);
            set_select_by_value('start_year', dt.getFullYear());
            set_select_by_value('start_month', dt.getMonth()+1);
            set_select_by_value('start_day', dt.getDate());
            set_select_by_value('start_hour', dt.getHours());
            set_select_by_value('start_minute', dt.getMinutes());
            chartId_from = ch_utils.userTime(ts).slice(0, 10).replace(/-/g, '');
    
            ts = ts_to || ts_last;
            dt = new Date(ts);
            set_select_by_value('end_year', dt.getFullYear());
            set_select_by_value('end_month', dt.getMonth()+1);
            set_select_by_value('end_day', dt.getDate());
            set_select_by_value('end_hour', dt.getHours());
            set_select_by_value('end_minute', dt.getMinutes());
            chartId_to = ch_utils.userTime(ts).slice(0, 10).replace(/-/g, '');
        }

        //info: stored records
        if (db_count === 0) {
            ch_utils.displayMessageDiv('count_text', 15);
        } else {
            ch_utils.displayMessageDiv('count_text', 14, db_count, 
                ch_utils.userTime(ts_first).slice(0,16), 
                ch_utils.userTime(ts_last).slice(0,16));
        }

        //target:
        ch_utils.buttonText('target', 16);
        ch_utils.buttonText('dbase_target_txt', 17);
        ch_utils.buttonText('chartId_target_txt', 18);
        var el = document.getElementById('dbase_target');
        el.value = snapshotDB;
        el.readOnly = true;
        var chartIdNew = chartIdBase;
        if (ts_from || ts_to) {
            chartIdNew = chartIdNew + '_' + 
                         (chartId_from||'') + '_' + (chartId_to||'');
        }
        document.getElementById('chartId_target').value = chartIdNew;

        ch_utils.buttonText('start_exec', 10);

        var list = ch_utils.buildMessage(5);
    } //config_datepicker

    function config_datepicker_numeric(element, first, last, leading_zero) {
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
        el.selectedIndex = 0;
    } //config_datepicker_numeric

    function config_datepicker_list(element, list) {
        var el = document.getElementById(element);
        if (el.options.length > 0) {
            return;
        }
        var listArray = list.split(',');
        for (var i = 0; i < listArray.length; i++) {
            el.options[i] = new Option(listArray[i], i);
        }
        el.selectedIndex = 0;
    } //config_datepicker_list

    document.getElementById('start_exec').onclick = function() {
        var radio_header_only = document.getElementById('radio_header_only').checked;
        var radio_values_all = document.getElementById('radio_values_all').checked;
        var radio_values_rang = document.getElementById('radio_values_rang').checked;
        if (!radio_header_only && !radio_values_all && !radio_values_rang) {
            return;
        }

        var dbase_target = document.getElementById('dbase_target').value;
        var chartId_target = document.getElementById('chartId_target').value;
        var chartIdNew = dbase_target+'.'+chartId_target;

        var chartIdFormat = /^([0-9a-zA-Z]+\.)?[0-9a-zA-Z_]+$/;
        if (!chartIdNew.match(chartIdFormat)) {
            ch_utils.alertMessage(22, chartIdNew);
            return;
        }

        if (radio_header_only) {
            copyChart(chartIdDB, chartIdBase, dbase_target, chartId_target, '&where=ts>=0 AND ts<=0');
        }
        else 
        if (radio_values_all) {
            copyChart(chartIdDB, chartIdBase, dbase_target, chartId_target, '');
        }
        else {
            var start_year = document.getElementById('start_year').value;
            var start_month = document.getElementById('start_month').value;
            var start_day = document.getElementById('start_day').value;
            var start_hour = document.getElementById('start_hour').value;
            var start_minute = document.getElementById('start_minute').value;
            var dt = new Date(start_year+'-'+start_month+'-'+start_day+' '+start_hour+':'+start_minute);
            var ts_from = dt.getTime();

            var end_year = document.getElementById('end_year').value;
            var end_month = document.getElementById('end_month').value;
            var end_day = document.getElementById('end_day').value;
            var end_hour = document.getElementById('end_hour').value;
            var end_minute = document.getElementById('end_minute').value;
            dt = new Date(end_year+'-'+end_month+'-'+end_day+' '+end_hour+':'+end_minute);
            var ts_to = dt.getTime();

            var where = '&where=ts>='+ts_from+' AND ts<='+ts_to;

            copyChart(chartIdDB, chartIdBase, dbase_target, chartId_target, where);
        }
    }; //start_exec

    function copyChart(dbNameOld, chartIdOld, dbNameNew, chartIdNew, where) {
        var chartIdDispOld, chartIdDispNew, url;
        if (dbNameNew !== dbNameOld) {
            chartIdDispOld = dbNameOld+'.'+chartIdOld;
            chartIdDispNew = dbNameNew+'.'+chartIdNew;
        } else {
            chartIdDispOld = chartIdOld;
            chartIdDispNew = chartIdNew;
        }
        var ts = Date.now();
        write_values();
    
        function write_values() {
           //console.log('cloning table '+chartIdDisp);
           url = 'http://'+api+'/'+dbNameOld+'/'+chartIdOld+'/clone?new='+chartIdDispNew+where;
           console.log(url);
           ch_utils.ajax_post(url, undefined, write_header, fail);
        }
        function write_header() {
           //console.log('cloning table '+chartIdBase+'_Header');
           url = 'http://'+api+'/'+dbNameOld+'/'+chartIdOld+'_Header'+'/clone?new='+
                chartIdDispNew+'_Header';
           console.log(url);
           ch_utils.ajax_post(url, undefined, read_index, fail);
        }
        function read_index() {
           var I = 'MxChartDB_Index';
            var url = 'http://'+api+'/MxChartDB/'+I+'/select_next';
            ch_utils.ajax_get(url, correct_index, fail);
        }
        function correct_index(data) {
           var indexBuffer = data[data.length-1];
           //console.log('indexBuffer', indexBuffer);
           var chartIdTitleOld = indexBuffer[chartIdDispOld];
           console.log('chartIdTitleOld='+chartIdTitleOld);
           indexBuffer[chartIdDispNew] = chartIdTitleOld;
           var I = 'MxChartDB_Index';
           //console.log('insert table '+I);
           url = 'http://'+api+'/MxChartDB/'+I+'/insert';
           ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}),
                                   delete_old_index, fail);
        }
        function delete_old_index() {
           var I = 'MxChartDB_Index';
           //console.log('clear table '+I);
           url = 'http://'+api+'/MxChartDB/'+I+'/delete_prev?ts='+ts;
           ch_utils.ajax_post(url, undefined, success_message, fail);
        }
        
        function success_message() {
           ch_utils.alertMessage(25, chartIdDispOld);
        }
    
        function fail(status, responseText) {
           var mess;
           if (responseText.indexOf('already exists') > 0) {
               mess = ch_utils.buildMessage(24, chartIdDispOld, chartIdDispNew);
           } else {
               mess = ch_utils.buildMessage(23, chartIdDispOld, status, JSON.parse(responseText));
           }
           console.log('url='+url);
           console.log(mess);
           alert(mess);
        } //fail
    } //copyChart
}); //document).ready
