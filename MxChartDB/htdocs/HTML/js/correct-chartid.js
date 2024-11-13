//h-------------------------------------------------------------------------------
//h
//h Name:         correct-chartid.js
//h Type:         Javascript module (MxChartDB)
//h Purpose:      correct the chart id of thegiven chart to  McChartDB+<InstNo>
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
var MODULE='correct-chartid.js';
var VERSION='V1.0.0';
var WRITTEN='2024-08-07/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

//b Variables
//-----------
var isAdmin;
var instNo, moduleId, isActive, title;
var chartIdDisp, chartIdDB, chartIdBase;
var chartIdDisp_new, chartIdBase_new;
var log, logId, line;
var api;
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
    var url = window.location.pathname;
    IndexDBName = url.split('/')[6];
    tableNameIndex = IndexDBName+'_Index';
    console.log('IndexDBName='+IndexDBName);

    //b set language texts
    //--------------------
    ch_utils.getLanguage();
    ch_utils.buttonText('ctitle_txt', 0);
    ch_utils.buttonText('cid_txt', 1);
    ch_utils.buttonText('cd_name_txt', 2);
    ch_utils.buttonText('inst_no_txt', 3);
    ch_utils.buttonText('inst_name_txt', 4);
    ch_utils.buttonText('active_txt', 5);
    ch_utils.buttonText('count_txt', 6);
    ch_utils.buttonText('first_txt', 7);
    ch_utils.buttonText('last_txt', 8);
    ch_utils.buttonText('do_change', 9);

    //b get start parameters
    //----------------------
    var chartId = ch_utils.getParameter('chartId');
    console.log('chartId='+chartId);
    if (chartId.length === 0) {
        ch_utils.alertMessage(1);
        return;
    }

    chartId = chartId.replace('__', '.');
    chartIdDisp = chartId;
    chartIdDB = IndexDBName;
    chartIdBase = chartId;
    //if other database:
    if (chartId.indexOf('.') > 0) {
        var chartIdSplit = chartIdDisp.split('.');
        chartIdDB = chartIdSplit[0];
        chartIdBase = chartIdSplit[1];
    }
    chartIdDisp = chartIdDB+'.'+chartIdBase;
    document.getElementById('cid_val').firstChild.data = chartIdBase;
    document.getElementById('cd_name_val').firstChild.data = chartIdDB;

    //b read constants.js parameters
    //------------------------------
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
        ch_utils.displayMessage(0, consts);
    }
    api = consts.api;

    //b if administrator rights
    //-------------------------
    ch_utils.checkLoggedIn(go_on);

    //b display title
    //---------------
    document.title = chartIdDisp;
    ch_utils.displayMessage(0, chartIdDisp);

    //request chart header and display chart title
    //request instance data
    //--------------------------------------------
    document.getElementById('ctitle_val').firstChild.data = ' ';
    document.getElementById('inst_no_val').firstChild.data = ' ';
    document.getElementById('inst_name_val').firstChild.data = ' ';
    document.getElementById('active_val').firstChild.data = ' ';
    url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header/select_next';
    ch_utils.ajax_get(url, success_header, failed);
    function success_header(data) {
        var header = data[data.length - 1];
        ch_utils.displayMessage(0, chartIdDisp+': ' + header.chartTitle);
        document.getElementById('ctitle_val').firstChild.data = header.chartTitle;
        instNo = header.chartInstance;
        document.getElementById('inst_no_val').firstChild.data = instNo;

        if (instNo) {
            chartIdBase_new = IndexDBName + instNo;
            url = '/ZAutomation/api/v1/instances/'+instNo;
            ch_utils.ajax_get(url, success_inst, failed_inst);
        }
    }
    function failed(status, text) {
        alert(text);
    }
    function success_inst(instance) {
        moduleId = instance.data.moduleId;
        var chartId_param = instance.data.params.chartId;
        if (moduleId === IndexDBName && chartId_param === chartIdBase) {
            isActive = toBoolean(instance.data.active);
            title = instance.data.title;
            document.getElementById('inst_name_val').firstChild.data = title;
            document.getElementById('active_val').firstChild.data = isActive;
            check_continue();
        } else
        if (moduleId !== IndexDBName) {
            alert('falsche ModulId');
        } else
        if (chartId_param !== chartIdBase) {
            alert('falsche ChartId');
        }
    }
    function failed_inst(status, text) {
        if (status === 404) {
            alert('Instanz nicht gefunden');
        } else {
            alert(text);
        }
    }

    //b request record count and first and last timestamp
    //---------------------------------------------------
    var db_count;
    url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/count';
    ch_utils.ajax_get(url, success_count);
    function success_count(data) {
        db_count = data[0];
        document.getElementById('count_val').firstChild.data = db_count;

        if (db_count) {
            url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_first_ts?raw=yes';
            ch_utils.ajax_get(url, success_first);
            url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_last_ts?raw=yes';
            ch_utils.ajax_get(url, success_last);
        }
        check_continue();
        function success_first(data) {
            document.getElementById('first_val').firstChild.data = ch_utils.userTime(data);
        }
        function success_last(data) {
            document.getElementById('last_val').firstChild.data = ch_utils.userTime(data);
        }
    }

    //b after all data are collected
    //------------------------------
    function check_continue() {
        if (!isAdmin) {
            document.getElementById('correct_txt').firstChild.data = ch_utils.buildMessage(2);
            return;
        }

        //b if instance found
        //-------------------
        if (isActive !== undefined && db_count !== undefined) {
            //b enable correct-chartid function
            //----------------------------
            if (chartIdBase_new === chartIdBase) {
                document.getElementById('correct_txt').firstChild.data = ch_utils.buildMessage(7);
            } else {
                document.getElementById('correct_txt').firstChild.data = ch_utils.buildMessage(1, 
                    chartIdBase, chartIdBase_new);
                ch_utils.buttonVisible('correct_div', true);
                if (isActive) {
                    document.getElementById('note1').firstChild.data = ch_utils.buildMessage(6);
                }
            }
        }
    }
}); //DOMContentLoaded

//b Functions
//-----------
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         toBoolean
    //h Purpose:      converts strings 'true', 'false' into boolean
    //h
    //h-------------------------------------------------------------------------------
    function toBoolean(value) {
        value = value === 'true' ? true : value;
        value = value === 'false' ? false : value;
        return value;
    } //toBoolean

    //h-------------------------------------------------------------------------------
    //h
    //h Name:         go_on
    //h Purpose:      checks for administration rights
    //h
    //h-------------------------------------------------------------------------------
    function go_on(sessionId, adminRights, username) {
        console.log(sessionId+' '+adminRights+' '+username);
        if(sessionId && adminRights) {
            isAdmin = adminRights;
        } else {
            isAdmin = undefined;
        }
        console.log('isAdmin='+isAdmin);
    } //go_on

    //h-------------------------------------------------------------------------------
    //h
    //h Name:         line_to_log
    //h Purpose:      adds an additional line to the log
    //h
    //h-------------------------------------------------------------------------------
    function line_to_log(line) {
        if (!logId) {
            ch_utils.buttonVisible('result', true);
            logId = document.getElementById('json-renderer');
            log = '';
        }
        log += line+'\n';
        logId.innerHTML = log;

    } //line_to_log

    //h-------------------------------------------------------------------------------
    //h
    //h Name:         step
    //h Purpose:      executes chart id change step by step
    //h
    //h-------------------------------------------------------------------------------
    function step(stepNo) {
        var chartIdOld = chartIdBase;
        var chartIdNew = chartIdBase_new;
        var headerOld = chartIdOld+'_Header';
        var headerNew = chartIdNew+'_Header';
        console.log(stepNo);
        switch(stepNo) {
            case 0:
                //disable new input:
                document.getElementById('do_change').disabled = true;

                line = '<b>Correct Chart Id '+chartIdOld+' into '+chartIdNew+'</b>';
                line_to_log(line);
                line_to_log('');
                step(++stepNo);
                break;
            case 1:
                line = 'testing for existing table '+headerNew+'...';
                line_to_log(line);
                testTable(chartIdDB, headerNew, stepNo);
                break;
            case 2:
                line = 'testing for existing table '+chartIdNew+'...';
                line_to_log(line);
                testTable(chartIdDB, chartIdNew, stepNo);
                break;
            case 3:
                if (isActive) {
                    line = 'deactivating instance '+instNo+'...';
                    line_to_log(line);
                    changeInstanceActive(instNo, false, stepNo);
                } else {
                    step(++stepNo);
                }
                break;
            case 4:
                line = 'copying header table '+headerNew+'...';
                line_to_log(line);
                cloneTable(chartIdDB, headerOld, headerNew, stepNo);
                break;
            case 5:
                line = 'copying value table '+chartIdNew+'...';
                line_to_log(line);
                cloneTable(chartIdDB, chartIdOld, chartIdNew, stepNo);
                break;
            case 6:
                line = 'correcting chart index...';
                line_to_log(line);
                correctIndex(stepNo);
                break;
            case 7:
                line = 'correcting the Chart Id of chart instance '+instNo+'...';
                line_to_log(line);
                changeInstanceChartid(instNo, chartIdNew, stepNo);
                break;
            case 8:
                line = 'dropping header table '+headerOld+'...';
                line_to_log(line);
                dropTable(chartIdDB, headerOld, stepNo);
                break;
            case 9:
                line = 'dropping value table '+chartIdOld+'...';
                line_to_log(line);
                dropTable(chartIdDB, chartIdOld, stepNo);
                break;
            case 10:
                if (isActive) {
                    line = 'activating chart instance '+instNo+'...';
                    line_to_log(line);
                    changeInstanceActive(instNo, true, stepNo);
                } else {
                    step(++stepNo);
                }
                break;
            default:
                line = '<b>work completed.</b>';
                line_to_log(line);
                line_to_log('');
                return;
        }
    } //step

    //h-------------------------------------------------------------------------------
    //h
    //h Name:         changeInstanceActive
    //h Purpose:      changes the active state of a given instance
    //h
    //h-------------------------------------------------------------------------------
    function changeInstanceActive(instNo,newState, stepNo) {
        var url = '/ZAutomation/api/v1/instances/'+instNo;
        ch_utils.ajax_get(url, success_get, failed);
    
        function success_get (response) {
            var data = response.data;
            data.active = newState;
            ch_utils.ajax_put(url, JSON.stringify(data), success_put, failed);
        }
        function success_put(response) {
            line_to_log('done.');
            line_to_log('');
            step(++stepNo);
        }
        function failed(status, text) {
            line_to_log(text);
            line_to_log('');
        }
    } //changeInstanceActive
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         changeInstanceChartid
    //h Purpose:      changes the chart id of a given instance
    //h
    //h-------------------------------------------------------------------------------
    function changeInstanceChartid(instNo, chartId, stepNo) {
        var url = '/ZAutomation/api/v1/instances/'+instNo;
        ch_utils.ajax_get(url, success_get, failed);
    
        function success_get (response) {
            var data = response.data;
            data.params.chartId = chartId;
            ch_utils.ajax_put(url, JSON.stringify(data), success_put, failed);
        }
        function success_put(response) {
            line_to_log('done.');
            line_to_log('');
            step(++stepNo);
        }
        function failed(status, text) {
            line_to_log(text);
            line_to_log('');
        }
    } //changeInstanceChartid
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         cloneTable
    //h Purpose:      clones a complete table
    //h
    //h-------------------------------------------------------------------------------
    function cloneTable(db, tableOld, tableNew, stepNo) {
        var url = 'http://'+api+'/'+db+'/'+tableOld+'/clone?new='+tableNew;
        ch_utils.ajax_post(url, undefined, success_post, failed);
    
        function success_post(response) {
            line_to_log('done.');
            line_to_log('');
            step(++stepNo);
        }
        function failed(status, text) {
            line_to_log(text);
            line_to_log('');
        }
    } //cloneTable
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         dropTable
    //h Purpose:      drops a table
    //h
    //h-------------------------------------------------------------------------------
    function dropTable(db, table, stepNo) {
        var url = 'http://'+api+'/'+db+'/'+table+'/drop';
        ch_utils.ajax_post(url, undefined, success_post, failed);
    
        function success_post(response) {
            line_to_log('done.');
            line_to_log('');
            step(++stepNo);
        }
        function failed(status, text) {
            line_to_log(text);
            line_to_log('');
        }
    } //dropTable
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         testTable
    //h Purpose:      test a table for existence
    //h
    //h-------------------------------------------------------------------------------
    function testTable(db, table, stepNo) {
        var url = 'http://'+api+'/'+db+'/'+table+'/check';
        ch_utils.ajax_get(url, success_get, failed);
    
        function success_get(response) {
            line_to_log('table '+db+'.'+table+' is already existing.');
            line_to_log('you have to repair this first.');
            line_to_log('');
        }
        function failed(status, text) {
            if (status === 404) {
                line_to_log('done.');
                line_to_log('');
                step(++stepNo);
            } else {
                line_to_log(text);
                line_to_log('');
            }
        }
    } //testTable
    
    //h-------------------------------------------------------------------------------
    //h
    //h Name:         correctIndex
    //h Purpose:      corrects the chart index
    //h
    //h-------------------------------------------------------------------------------
    function correctIndex(stepNo) {
        var url = 'http://'+api+'/'+IndexDBName+'/'+tableNameIndex+'/select_next';
        ch_utils.ajax_get(url, success_get, failed);
    
        function success_get (data) {
            var indexBuffer = data[data.length-1];
            var chartIdOld = chartIdDB+'.'+chartIdBase;
            if (chartIdDB === IndexDBName) {chartIdOld = chartIdBase;}
            var chartIdNew = chartIdDB+'.'+chartIdBase_new;
            if (chartIdDB === IndexDBName) {chartIdNew = chartIdBase;}
            indexBuffer[chartIdNew] = indexBuffer[chartIdOld];
            delete indexBuffer[chartIdOld];
            console.log(indexBuffer);
            var ts = Date.now();
            var I = tableNameIndex;
            url = 'http://'+api+'/'+IndexDBName+'/'+I+'/insert?ts_del='+ts;
            ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}),
                               success_post, failed);
        }
        function success_post(response) {
            line_to_log('done.');
            line_to_log('');
            step(++stepNo);
        }
        function failed(status, text) {
            line_to_log(text);
            line_to_log('');
        }
    } //correctIndex
