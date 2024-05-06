
//h-------------------------------------------------------------------------------
//h
//h Name:         chart-index.js
//h Type:         Javascript module (MxChartDB)
//h Purpose:      Display chart index
//h Project:      ZWay
//h Usage:        
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V2.1.0 2024-05-05/peb
//v History:      V1.0.0 2022-04-01/peb taken from MxChartJS
//v               V1.0.1 2022-07-09/peb [-]isAdmin functions for index.html
//v                                     [+]isAdmin:refresh index on new focus
//v               V1.1.0 2023-11-07/peb [+]de-/activate instance
//v               V2.1.0 2024-01-09/peb [+]other database 
//h Copyright:    (C) piet66 2019
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals ch_utils, html_params, myFunction */
'use strict';

//-----------
//b Constants
//-----------
var MODULE='chart-index.js';
var VERSION='V2.1.0';
var WRITTEN='2024-05-05/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

//------- data definitions -------------------------

var indexBuffer, instancesList, instancesRead, indexList;
var isAdmin;
var indexListStringPrev = '';
var adminQuerystring = '';
var ADMIN;
var filterInput;
var elOperate;
var elOrphaned;
var elSnapshots;
var target_chart, target_data;
var api;

//------
//b Main
//------
document.addEventListener("DOMContentLoaded", function(event) {
    ch_utils.getLanguage();
    
    //------- program code -------------------------
    //workaround:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia:
    if (window.location.pathname.indexOf('/modulemedia/') > 0) {
        ch_utils.convertMessagesToUTF8();
    }

    //detect whether I'm index or admin page
    ADMIN = 'NO';
    var url = window.location.pathname;
    if(url.substring(url.lastIndexOf('/')+1) === 'admin.html') {
        ADMIN = 'YES';
    }

    if (ADMIN === 'YES') {
        document.title = ch_utils.buildMessage(17);
        ch_utils.displayMessage(17);
    } else {
        document.title = ch_utils.buildMessage(4);
        ch_utils.displayMessage(4);
        ch_utils.buttonVisible('orphaned', false);
        ch_utils.buttonVisible('orphanedT', false);
    }

    ch_utils.buttonText('operateT', 38);
    ch_utils.buttonText('orphanedT', 39);
    ch_utils.buttonText('snapshotsT', 40);

    //get constants.js parameters
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
       ch_utils.displayMessage(0, consts);
    }
    api = consts.api;

    target_chart = '';
    target_data = '';
    if (ADMIN === 'YES' && consts.admin.open_chart_in_new_tab) {
        target_chart = ' target="_blank"';
    }
    if (ADMIN === 'YES' && consts.admin.open_data_in_new_tab) {
        target_data = ' target="_blank"';
    }
    if (ADMIN === 'NO' && consts.index.chart_in_new_tab) {
        target_chart = ' target="_blank"';
    }
    if (ADMIN === 'NO' && consts.index.data_in_new_tab) {
        target_data = ' target="_blank"';
    }

    filterInput = document.getElementById("myInput");
    filterInput.placeholder = ch_utils.buildMessage(36);
    filterInput.focus();

    elOperate = document.getElementById("operate");
    elOrphaned = document.getElementById("orphaned");
    elSnapshots = document.getElementById("snapshots");

    step0();

    //------- event listeners -------------------------
    if (ADMIN === 'YES') {
        document.getElementById('selectFile').onchange = loadLocalFile;
    }

}); //document).addEventListener


function step0 () {
    instancesList = {};
    instancesRead = false;
    if (ADMIN === 'YES') {
        ch_utils.checkLoggedIn(go_on);
    } else {
        step1();
    }
}

function go_on(sessionId, adminRights, username) {
    console.log(sessionId+' '+adminRights+' '+username);
    if(sessionId && adminRights) {
        isAdmin = adminRights;
    } else {
        isAdmin = undefined;
    }
    console.log('isAdmin='+isAdmin);
    step1();
}

//step 1: read index data
function step1 () {
    var url = 'http://'+api+'/MxChartDB/MxChartDB_Index/select_next';
    ch_utils.ajax_get(url, success, fail, 12);
    function success(data) {
        //goto next step
        //console.log(data);
        indexBuffer = data[data.length-1];
        if (isAdmin) {step2();} else {step3();}
    } //success

    function fail(status) {
        var mess = 'error reading MxChartDB_Index: '+status;
        console.log(mess);
        alert(mess);
    } //fail
} //step1

//step2: if administrator read instances
function step2 () {
    var url = '/ZAutomation/api/v1/instances';
    instancesRead = false;
    ch_utils.ajax_get(url, success, fail, fail);
   
    function success(data) {
        //goto next step
        isAdmin = true;
        buildInstancesList(data.data);
        step3();
    } //success
    function fail(status) {
        isAdmin = false;
        ch_utils.buttonVisible('selectFile', false);
        step3();
    } //success
} //step2

//step3: build list
function step3() {
    //step4: build new index list and print output
    display();

    if (!instancesRead && ADMIN === 'YES') {
        ch_utils.buttonVisible('selectFile', false);
        ch_utils.alertMessage(13);
    }
} //step3

//------- function definitions -------------------------

function display() {
    //build new index list
    indexList = buildIndexList(indexBuffer);

    //print ourput
    printHTML(indexList);

    if (filterInput.value.length > 0) {
        myFunction();
    }
} //display

function buildInstancesList(instancesBuffer) {
    instancesList = {};
    instancesRead = true;
    instancesBuffer.filter(function(instance, ix) {
        return instance.moduleId === "MxChartDB";}).forEach(function(inst) {
            var chartIdKey = inst.params.chartId;
            if (inst.params.DBName && inst.params.DBName !== 'MxChartDB') {
                chartIdKey = inst.params.DBName+'.'+chartIdKey;
            }
            instancesList[chartIdKey] = 
                {active: toBoolean(inst.active),
                 id: inst.id,
                 title:  inst.params.chartTitle,
                 chartId: inst.params.chartId,
                 DBName: inst.params.DBName};
        });
} //buildInstancesList

function toBoolean(value) {
    value = value === 'true' ? true : value;
    value = value === 'false' ? false : value;
    return value;
} //toBoolean

function buildIndexList(indexBuffer) {
    //sort index entries
    var indexArray = [];
    Object.keys(indexBuffer).map(function(key) {
        indexArray.push([indexBuffer[key], key]);
    });
    indexArray.sort();

    //build html
    var t = ch_utils.buildMessage(5);
    var i = ch_utils.buildMessage(6);
    var a = ch_utils.buildMessage(7);
    var y = ch_utils.buildMessage(8);
    var n = ch_utils.buildMessage(9);
    var o = ch_utils.buildMessage(10);
    var e = ch_utils.buildMessage(11);
    var inst = ch_utils.buildMessage(2);
    var cop = ch_utils.buildMessage(14);
    var download = ch_utils.buildMessage(33);
    var rem = ch_utils.buildMessage(15);
    var change = ch_utils.buildMessage(42);
    var c = ch_utils.buildMessage(26);
    var s = ch_utils.buildMessage(41);

    var htmlText = '<table id="myTable"><tbody><tr><th>'+t+'</th><th>'+i+'</th>';
    if (instancesRead) {
        if (ADMIN === 'YES') {
            htmlText += '<th>'+inst+'</th>';
        }
        htmlText += '<th>'+a+'</th>';
        if (ADMIN === 'YES') {
            htmlText += '<th>'+cop+'</th>';
            htmlText += '<th>'+download+'</th>';
            htmlText += '<th>'+rem+'</th>';
            htmlText += '<th>'+change+'</th>';
        }
    }
    htmlText += '</tr>';
    if (ADMIN === 'YES') {
        adminQuerystring = '?isAdmin='+isAdmin+'&';
    } else {
        adminQuerystring = '?';
    }

    var URLChart = './draw-chartjs.html'+adminQuerystring+'chartId=';
    var URLJSON  = './data-json.html'+adminQuerystring+'chartId=';
    var URLMOVE  = './move-chart.html?chartId=';
    var last = '';

    //indexArray.forEach(function(chart, ix) {
    for (var ix = 0; ix < indexArray.length; ix++) {
        var htmlTextNew = '';
        var orphaned = false;
        var chartId = indexArray[ix][1];
        var chartTitle = indexArray[ix][0];
        var uChart = URLChart + chartId;
        var uJSON = URLJSON + chartId;
        var uMOVE = URLMOVE + chartId;
        var chartIdDisp = chartId;
        var chartIdDB = 'MxChartDB';
        var chartIdBase = chartId;
        //if other database:
        if (chartId.indexOf('.') > 0) {
            var chartIdSplit = chartIdDisp.split('.');
            chartIdDB = chartIdSplit[0];
            chartIdBase = chartIdSplit[1];
        }

        //chart title
        if (chartTitle === last) {
            htmlTextNew += '<tr><td><a href="'+uChart+
                '"'+target_chart+'><font color="red"><b>'+chartTitle+'</b></font></td>';
        } else {
            htmlTextNew += '<tr><td><a href="'+uChart+'"'+target_chart+'>'+chartTitle+
                '</td>';
        }

        //chart id
        htmlTextNew += '<td><center><a href="'+uJSON+'"'+target_data+'>'+chartIdDisp+'</a></td>';

        if (instancesRead) {
            if (ADMIN === 'YES') {
                //instance id
                var instNo_orig;
                if (!instancesList.hasOwnProperty(chartId)) {
                    htmlTextNew += '<td><center></td>';
                } else {
                    htmlTextNew += '<td><center>';
                    instNo_orig = instancesList[chartId].id;
                    if (!instOriginal(chartId, instNo_orig)) {
                        htmlTextNew += '<font color="magenta"><b>'+
                            instNo_orig+'</b></font>';
                    } else {
                        htmlTextNew += '<font color="green"><b>'+
                            instNo_orig+'</b></font>';
                    }
                    htmlTextNew += '</td>';
                }

                var col, tex;
                if (chartIdDB === 'Snapshots') {
                    col = 'black';
                    tex = s;    //snapshot
                    orphaned = true;
                } else
                if (isCopy(chartIdBase)) {
                    col = 'black';
                    tex = c;    //copy
                    orphaned = true;
                } else
                if (!instancesList.hasOwnProperty(chartId)) {
                    col = 'red';
                    tex = o;    //orphaned
                    orphaned = true;
                } else
                if (instancesList[chartId].title !== chartTitle) {
                    //maybe open and save chart module.json to repair error
                    col = 'orange';
                    tex = e;    //error
                } else
                if (instancesList[chartId].active) {
                    col = 'green';
                    tex = y;    //active
                } else {
                    col = 'black';
                    tex = n;    //inactive
                }

                //active
                if (tex === y) {
                    htmlTextNew += '<td headers="active" align=center>'+
                                '<input type="checkbox" id="active+'+chartId+'" checked>'+
                                '</td>';
                } else
                if (tex === n) {
                    htmlTextNew += '<td headers="active" align=center>'+
                                '<input type="checkbox" id="active+'+chartId+'">'+
                                '</td>';
                } else
                if (tex === e) {
                    htmlTextNew += '<td><center><font color="'+col+'"><b>'+
                                '<a href="javascript:alert(\''+
                        ch_utils.buildMessage(20)+'\');">'+tex+'</a> '+
                                '</b></font></td>';
                } else
                if (tex === c) {
                    htmlTextNew += '<td><center>'+tex+'</td>';
                } else
                if (tex === s) {
                    htmlTextNew += '<td><center>'+tex+'</td>';
                } else {
                    htmlTextNew += '<td><center><font color="'+col+'"><b>'+
                        tex+'</b></font></td>';
                }

                //clone
                var l1 = '';
                if (!isCopy(chartIdBase)) {
                    l1 =  '<a href="javascript:copyChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                }
                htmlTextNew += '<td><center>'+l1+'</td>';

                //download
                var l3 =  '<a href="javascript:downloadChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                htmlTextNew += '<td><center>'+l3+'</td>';

                //delete
                var l2 = '';
                if (tex === o || tex === n || tex === c || tex === s) {
                    l2 =  '<a href="javascript:deleteChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                }
                htmlTextNew += '<td><center>'+l2+'</td>';

                //change database
                var l4 = '';
                if (tex === y || tex === n) {
                    l4 =  '<a href="'+uMOVE+'">'+y+'</a> ';
                }
                htmlTextNew += '<td><center>'+l4+'</td>';
            } //if ADMIN
            else {
                if (!instancesList.hasOwnProperty(chartId)) {
                    orphaned = true;
                }
            } //if not ADMIN
        } //instancesRead

        htmlTextNew += '</tr>';

        //filter chart entry
        if (chartIdDB === 'Snapshots') {
            if (elSnapshots.checked === false) {
                continue;
            }
        } else
        if (orphaned === true) {
            if (elOrphaned.checked === false) {
                continue;
            }
        } else
        if (elOperate.checked === false) {
            continue;
        }
        
        htmlText += htmlTextNew;
        last = chartTitle;
    }
    htmlText += '</tbody></table>';
    return htmlText;
} //buildIndexList

function printHTML(indexList) {
    var indexListString = JSON.stringify(indexList);
    if (indexListString !== indexListStringPrev) {
        document.getElementById('json-renderer').innerHTML = indexList;
        indexListStringPrev = indexListString;
    }

    //define checkbox event:
    var checkboxList = document.querySelectorAll('[type="checkbox"]');
    //console.log(checkboxList);
    /*jshint loopfunc:true */
    for (var i = 0; i < checkboxList.length; i++) {
        if (checkboxList[i].id !== 'operate' &&
            checkboxList[i].id !== 'orphaned' &&
            checkboxList[i].id !== 'snapshots') {

        checkboxList[i].addEventListener('change', function(event) {
            //console.log(event.target);
            var id = event.target.id.split('+');
            var chartId = id[1];
            var checked = event.target.checked;
            changeActive(chartId, checked);
        });
        }
    }
    /*jshint loopfunc:false */
} //printHTML

function changeActive(chartId, checked) {
    /*
    var instNo;
    try {
        instNo = instancesList[chartId].id;
    } catch(err) {
        return;
    }
    */
    var instNo = instancesList[chartId].id;
    instancesList[chartId].active = checked;

    //get instance data
    var url = '/ZAutomation/api/v1/instances/'+instNo;
    ch_utils.ajax_get(url, success_get);

    function success_get (response) {
        var data = response.data;
        var instNo = data.id;
        var activeNew = instancesList[chartId].active;
        data.active = activeNew;
        var url = '/ZAutomation/api/v1/instances/'+instNo;
        ch_utils.ajax_put(url, JSON.stringify(data), success_put);
    }

    function success_put(response) {
        var instNo = response.data.id;
        ch_utils.alertMessage(37, instNo, response.data.active);
        window.location.reload();
    }
} //changeActive

// reselect, if isAdmin and page gets focus again
//
//https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
// Set the name of the hidden property and the change event for visibility
var hidden, visibilityChange; 
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}
document.addEventListener(visibilityChange, handleVisibilityChange, false);

function handleVisibilityChange() {
    if (!document[hidden] && isAdmin) {
        step0();
    }
} //handleVisibilityChange
    
///////////////////77}); //document).ready

function instOriginal(chartId, instNo) {
    if ('MxChartDB'+instNo === chartId.replace(/^.*\./, '')) {return true;}
    return false;
} //instOriginal

function isCopy(chartId) {
    var x = chartId.replace(/^.*_/, '');
    if (x.length !== 12 ) {return false;}
    x = x.replace(/[0-9]*/, '');
    if (x.length !== 0 ) {return false;}
    return true;
} //isCopy

function buildCopyId(chartId) {
    var dattime = ch_utils.userTime().replace(/:[0-9]*$/, '')
                                     .replace(/[- :]/g, '') ;
    var newCopyId = chartId+'_'+dattime;
    isCopy(newCopyId);
    return newCopyId;
} //buildCopyId

function copyChart(chartIdOld, api) {
    if (isCopy(chartIdOld)) {
        alert(chartIdOld+' is already a copy!');
        return;
    }

    var chartIdDispOld = chartIdOld;
    var chartIdDBOld = 'MxChartDB';
    var chartIdBaseOld = chartIdOld;
    //if other database:
    if (chartIdOld.indexOf('.') > 0) {
        var chartIdSplitOld = chartIdDispOld.split('.');
        chartIdDBOld = chartIdSplitOld[0];
        chartIdBaseOld = chartIdSplitOld[1];
    }

    var chartIdNew = prompt(ch_utils.buildMessage(21), buildCopyId(chartIdDispOld));
    if (!chartIdNew) {return;}

    var chartIdFormat = /^([0-9a-zA-Z]+\.)?[0-9a-zA-Z_]+$/;
    if (!chartIdNew.match(chartIdFormat)) {
        ch_utils.alertMessage(27);
        return;
    }

    var chartIdDispNew = chartIdNew;
    var chartIdDBNew = 'MxChartDB';
    var chartIdBaseNew = chartIdNew;
    //if other database:
    if (chartIdNew.indexOf('.') > 0) {
        var chartIdSplitNew = chartIdDispNew.split('.');
        chartIdDBNew = chartIdSplitNew[0];
        chartIdBaseNew = chartIdSplitNew[1];
    }

    var ts = Date.now();
    var url;
    write_values();

    function write_values() {
       //console.log('cloning table '+chartIdDisp);
       url = 'http://'+api+'/'+chartIdDBOld+'/'+chartIdBaseOld+'/clone?new='+chartIdDispNew;
       ch_utils.ajax_post(url, undefined, write_header, fail);
    }
    function write_header() {
       //console.log('cloning table '+chartIdBase+'_Header');
       url = 'http://'+api+'/'+chartIdDBOld+'/'+chartIdBaseOld+'_Header'+'/clone?new='+
            chartIdDispNew+'_Header';
       ch_utils.ajax_post(url, undefined, correct_index, fail);
    }
    function correct_index() {
       indexBuffer[chartIdNew] = indexBuffer[chartIdOld];
       //console.log('indexBuffer', indexBuffer);
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
       ch_utils.ajax_post(url, undefined, refresh_window, fail);
    }
    function refresh_window() {
       ch_utils.alertMessage(22, chartIdDispOld);
       window.location.reload();
    }

    function fail(status, responseText) {
       var mess;
       if (responseText.indexOf('already exists') > 0) {
           mess = ch_utils.buildMessage(25, chartIdDispOld, chartIdDispNew);
       } else {
           mess = ch_utils.buildMessage(23, chartIdDispOld, status, JSON.parse(responseText));
       }
       console.log('url='+url);
       console.log(mess);
       alert(mess);
    } //fail
} //copyChart

function deleteChart(chartId, api) {
    var chartIdDisp = chartId;
    var chartIdDB = 'MxChartDB';
    var chartIdBase = chartId;
    //if other database:
    if (chartId.indexOf('.') > 0) {
        var chartIdSplit = chartIdDisp.split('.');
        chartIdDB = chartIdSplit[0];
        chartIdBase = chartIdSplit[1];
    }
    if (!confirm(ch_utils.buildMessage(18, chartIdDisp))) {return;}

    var ts = Date.now();
    var url;
    drop_value_table();

    function drop_value_table() {
       //console.log('dropping table '+chartIdDisp);
       url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/drop_table';
       ch_utils.ajax_post(url, undefined, drop_header_table, fail);
    }
   function drop_header_table() {
       //console.log('dropping table '+chartIdDisp+'_Header');
       url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header/drop_table';
       ch_utils.ajax_post(url, undefined, select_index_table, fail);
    }
   function select_index_table() {
       var I = 'MxChartDB_Index';
       //console.log('selecting table '+I);
       url = 'http://'+api+'/MxChartDB/'+I+'/select_next';
       ch_utils.ajax_get(url, correct_index, fail);
    }
   function correct_index(data) {
       delete indexBuffer[chartId];
       //console.log('indexBuffer', indexBuffer);
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
       ch_utils.ajax_post(url, undefined, refresh_window, fail);
    }
   function refresh_window() {
       ch_utils.alertMessage(19, chartIdDisp);
       window.location.reload();
    }

    function fail(status, responseText) {
       var mess = ch_utils.buildMessage(24, chartIdDisp, status, responseText);
       console.log('url='+url);
       console.log(mess);
       alert(mess);
    } //fail
} //deleteChart

function downloadChart(chartId, api) {
    var vLog = {};

    var chartIdDisp = chartId;
    var chartIdDB = 'MxChartDB';
    var chartIdBase = chartId;
    //if other database:
    if (chartId.indexOf('.') > 0) {
        var chartIdSplit = chartIdDisp.split('.');
        chartIdDB = chartIdSplit[0];
        chartIdBase = chartIdSplit[1];
    }

    //read chart header
    var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header/select_next';
    ch_utils.ajax_get(url, success, fail, 34);
    function success(data) {
        vLog.chartHeader = data[data.length - 1];

        //read chart values
        read_values();
    } //success
   
    function fail(status) {
        if (status === 404) {   //file not found
            ch_utils.alertMessage(34);
        } else {
            var mess = 'error reading '+chartIdDisp+' Header data: '+status;
            console.log(mess);
            alert(mess);
        }
    } //fail

    function read_values() {
        var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/select_next';
        ch_utils.ajax_get(url, success, fail, no_data);
        function success(data) {
            vLog.chartValues = data;
    
            //draw json data
            storeDownload(vLog);
        } //success
       
        function no_data() {
            vLog.chartValues = [];
    
            //draw json data
            storeDownload(vLog);
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

    function storeDownload(vLog) {
        var bb = new Blob([JSON.stringify(vLog,undefined,2)], {type: 'application/json'});
        var link = document.createElement('a');
        link.style.display = "none";
        link.download = chartId+'.json';
        link.href = window.URL.createObjectURL(bb);

        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(link.href);
    } //storeDownload
} //downloadChart

function loadLocalFile(evt) {
    console.log('loadLocalFile(evt)');

    var file = evt.target.files[0];
    var chartId = file.name.replace(/\.json$/, '');

    var chartIdFormat = /^([0-9a-zA-Z]+\.)?[0-9a-zA-Z_]+$/;
    var chartIdInput = prompt(ch_utils.buildMessage(32), chartId);
    if (!chartIdInput) {return;}
    if (!chartIdInput.match(chartIdFormat)) {
        ch_utils.alertMessage(27);
        return;
    }

    var chartIdDisp = chartIdInput;
    var chartIdDB = 'MxChartDB';
    var chartIdBase = chartIdInput;
    //if other database:
    if (chartIdInput.indexOf('.') > 0) {
        var chartIdSplit = chartIdDisp.split('.');
        chartIdDB = chartIdSplit[0];
        chartIdBase = chartIdSplit[1];
    }

    if (indexBuffer.hasOwnProperty(chartIdInput)) {
        ch_utils.alertMessage(35, chartIdInput);
        return;
    }

    //read file
    var reader = new FileReader();
    reader.onload = (function(theFile) {
        if (theFile.total === theFile.loaded) {
            var obj = theFile.target.result;
            if (obj) {
              console.log('loading file '+file.name+'...');
              load_file(obj);
            }
        }
        return function(e) {
            console.log('error loading file '+file.name+': '+e);
            ch_utils.alertMessage(29, e);
        };
    });
    if (file) {
        console.log('readAsText file '+file.name+'...');
        reader.readAsText(file);
    }

    function load_file(data) {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        if (! data.hasOwnProperty('chartHeader')) {
            ch_utils.alertMessage(30);
            return;
        }
        if (! data.hasOwnProperty('chartValues')) {
            ch_utils.alertMessage(30);
            return;
        }

        var ts = Date.now();
        var url;
        create_value_table();
    
        function create_value_table() {
           //console.log('creating table '+chartIdInput);
           url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/create_table';
           ch_utils.ajax_post(url, undefined, create_header_table, fail);
        } //create_value_table

        function create_header_table() {
           //console.log('creating table '+chartIdInput+'_Header');
           url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header'+'/create_table';
           ch_utils.ajax_post(url, undefined, write_values, fail);
        } //create_header_table

        function write_values() {
           //console.log('writing table '+chartIdInput);
           url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/insert';
           var valueArray = [];
           data.chartValues.forEach( function(entry, ix) {
               valueArray.push({ts: entry[0],
                                val: entry});
           });
           ch_utils.ajax_post(url, JSON.stringify(valueArray), write_header, fail);
        } //write_values

        function write_header() {
           //console.log('writing table '+chartIdInput+'_Header');
           url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'_Header'+'/insert';
           data.chartHeader.chartIdInput = chartIdBase;
           data.chartHeader.chartInstance = 0;
           var headerArray = [{ts:  data.chartHeader.Timestamp,
                               val: data.chartHeader}];
           ch_utils.ajax_post(url, JSON.stringify(headerArray), correct_index, fail);
        } //write_header

        function correct_index() {
           indexBuffer[chartIdInput] = data.chartHeader.chartTitle;
           //console.log('indexBuffer', indexBuffer);
           var I = 'MxChartDB_Index';
           //console.log('insert table '+I);
           url = 'http://'+api+'/MxChartDB/'+I+'/insert';
           ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}),
                                   delete_old_index, fail);
        } //correct_index

        function delete_old_index() {
           var I = 'MxChartDB_Index';
           //console.log('clear table '+I);
           url = 'http://'+api+'/MxChartDB/'+I+'/delete_prev?ts='+ts;
           ch_utils.ajax_post(url, undefined, refresh_window, fail);
        } //delete_old_index

        function refresh_window() {
           ch_utils.alertMessage(31, chartIdDisp);
           window.location.reload();
        } //refresh_window
    
        function fail(status, responseText) {
           var mess;
           if (responseText.indexOf('already exists') > 0) {
               mess = ch_utils.buildMessage(25, chartIdDisp, chartIdDisp);
           } else {
               mess = ch_utils.buildMessage(23, chartIdDisp, status, JSON.parse(responseText));
           }
           console.log('url='+url);
           console.log(mess);
           alert(mess);
       } //fail
   } //load_file
} //loadLocalFile
