
//h-------------------------------------------------------------------------------
//h
//h Name:         writes-chart.js
//h Type:         Javascript module (MxChartDB)
//h Purpose:      displays timstamps of given graph for analysis
//h Project:      Z-Way
//h Usage:        
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Platforms:    
//h Authors:      peb piet66
//h Version:      V1.0.0 2024-08-07/peb
//v History:      V1.0.0 2024-05-04/peb first version
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals ch_utils */
'use strict';

//b Constants
//-----------
var MODULE='writes-chart.js';
var VERSION='V1.0.0';
var WRITTEN='2024-08-07/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

var url;
var IndexDBName;
var tableNameIndex;

//b Main
//------
document.addEventListener("DOMContentLoaded", function(event) {
    
    //------- program code -------------------------
    //workaround:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia:
    if (window.location.pathname.indexOf('/modulemedia/') > 0) {
        ch_utils.convertMessagesToUTF8();
        //ch_utils.convertCharset = true; //for all ajax inputs
    }

    //detect index database name
    // /ZAutomation/api/v1/load/modulemedia/MxChartDB/HTML/admin.html
    url = window.location.pathname;
    IndexDBName = url.split('/')[6];
    tableNameIndex = IndexDBName+'_Index';
    console.log('IndexDBName='+IndexDBName);

    ch_utils.getLanguage();

    //b get start parameters
    //----------------------
    var chartId = ch_utils.getParameter('chartId');
    console.log('chartId='+chartId);
    if (chartId.length === 0) {
        ch_utils.alertMessage(1);
        return;
    }

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

    //b read constants.js parameters
    //------------------------------
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
        ch_utils.displayMessage(0, consts);
    }
    var api = consts.api;

    //b display title
    //---------------
    document.title = chartIdDisp;
    ch_utils.displayMessage(0, chartIdDisp);

    //b request, process and display data (all timestamps) (=>build_output)
    //---------------------------------------------------------------------
    var url = 'http://'+api+'/'+chartIdDB+'/sql?select ts from '+chartIdBase;
    ch_utils.ajax_get(url, success_ts, failed);
    function success_ts(data) {
        build_output(data);
    }
    function failed(status, text) {
        alert(text);
    }

    //request chart header and display chart title
    //--------------------------------------------
    url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header/select_next';
    ch_utils.ajax_get(url, success_header, failed);
    function success_header(data) {
        ch_utils.displayMessage(0, chartIdDisp+': ' +
                               data[data.length - 1].chartTitle);
    }
}); //DOMContentLoaded

//b Functions
//-----------
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         build_output
    //h Purpose:      request, process and display data (all timestamps)
    //h
    //h-------------------------------------------------------------------------------
    function build_output(data) {
        var db_count = data.length;
        var output = '';
        var ts_first, ts_last, ts_prev, ts_diff = '', ts_diff_min, ts_diff_sec, per_hour;
        for (var i=0; i < db_count; i++) {
            if (!ts_first) {ts_first = data[i][0];}
            if (ts_last) {ts_prev = ts_last;}
            ts_last = data[i][0];
            if (ts_prev) {
                ts_diff = (ts_last - ts_prev)/1000/60;  //minutes
                ts_diff_min = Math.floor(ts_diff);
                ts_diff_sec = Math.floor((ts_diff - ts_diff_min) * 60);
                ts_diff = '= '.padStart(10, ' ');
                ts_diff += ts_diff_min.toString().padStart(2, ' ');
                ts_diff += ':';
                ts_diff += ts_diff_sec.toString().padStart(2,"0");
                ts_diff += ch_utils.buildMessage(4);
            }
            output += ch_utils.userTime(data[i][0])+' '+ts_diff+'<br>';
        }
    
        if (db_count === 0) {
            ch_utils.displayMessageDiv('count_text', 2);
            ch_utils.displayMessageDiv('statistics', 0, '');
        } else {
            ch_utils.displayMessageDiv('count_text', 1, db_count, 
                ch_utils.userTime(ts_first).slice(0,16), 
                ch_utils.userTime(ts_last).slice(0,16));
            per_hour = Math.round(db_count*1000*60*60/(ts_last-ts_first)*100)/100;
            ch_utils.displayMessageDiv('statistics', 3, per_hour);
        }
    
        document.getElementById('json-renderer').innerHTML = output;
    } //build_output
    
