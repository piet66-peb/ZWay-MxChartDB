
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
//h Version:      V2.1.0 2025-11-12/peb
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
/*globals ch_utils, html_params, myFunction, sorttable, busy_indicator */
'use strict';

//-----------
//b Constants
//-----------
var MODULE='chart-index.js';
var VERSION='V2.1.0';
var WRITTEN='2025-11-12/peb';
console.log('Module: '+MODULE+' '+VERSION+' '+WRITTEN);

//------- data definitions -------------------------

var indexBuffer, instancesList, instancesRead, indexList;
var isAdmin;
var indexListStringPrev = '';
var adminQuerystring = '';
var ADMIN;
var filterInput;
var elActives;
var elInActives;
var elOrphaned;
var elSnapshots;
var target_chart, target_data;
var api;
var IndexDBName;
var tableNameIndex;
var busyi;

//------
//b Main
//------
document.addEventListener("DOMContentLoaded", function(event) {
     busyi = new busy_indicator(document.getElementById("busybox"),
                                document.querySelector("#busybox div"));
    busyi.hide();

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

    //detect index database name
    // /ZAutomation/api/v1/load/modulemedia/MxChartDB/HTML/admin.html
    IndexDBName = url.split('/')[6];
    tableNameIndex = IndexDBName+'_Index';
    console.log('IndexDBName='+IndexDBName);

    if (ADMIN === 'YES') {
        document.title = ch_utils.buildMessage(17);
        ch_utils.displayMessage(17);
        ch_utils.buttonText('MxC', 53);
    } else {
        document.title = ch_utils.buildMessage(4);
        ch_utils.displayMessage(4);
        ch_utils.buttonVisible('actives', false);
        ch_utils.buttonVisible('activesT', false);
        ch_utils.buttonVisible('inactives', false);
        ch_utils.buttonVisible('inactivesT', false);
        ch_utils.buttonVisible('orphaned', false);
        ch_utils.buttonVisible('orphanedT', false);    }

    ch_utils.buttonText('activesT', 38);
    ch_utils.buttonText('inactivesT', 49);
    ch_utils.buttonText('orphanedT', 39);
    ch_utils.buttonText('snapshotsT', 40);
    ch_utils.buttonText('delInput', 52);

    //get constants.js parameters
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
       ch_utils.displayMessage(0, consts);
    }
    api = consts.api;

    //display aspect ratio
    ch_utils.displayMessageDiv('AspectRatio', 0, window.innerWidth+' x '+window.innerHeight+', '+window.navigator.platform);
    console.log(window.navigator);

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

    elActives = document.getElementById("actives");
    elInActives = document.getElementById("inactives");
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
    var url = 'http://'+api+'/'+IndexDBName+'/'+tableNameIndex+'/select_next';
    ch_utils.ajax_get(url, success, fail, 12);
    function success(data) {
        //goto next step
        //console.log(data);
        indexBuffer = data[data.length-1];
        if (isAdmin) {step2();} else {step3();}
    } //success

    function fail(status) {
        var mess = 'error reading '+tableNameIndex+': '+status;
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
        return instance.moduleId === IndexDBName;}).forEach(function(inst) {
            var chartIdKey = inst.params.chartId;
            if (inst.params.DBName && inst.params.DBName !== IndexDBName) {
                chartIdKey = inst.params.DBName+'.'+chartIdKey;
            }
            instancesList[chartIdKey] = 
                {active: toBoolean(inst.active),
                 id: inst.id,
                 title:  inst.params.chartTitle,
                 chartId: inst.params.chartId,
                 DBName: inst.params.DBName,
                 interval: inst.params.interval,
                 period: inst.params.store_value_set.period,
                };
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
    var polling = ch_utils.buildMessage(43);
    var chartLength = ch_utils.buildMessage(44);
    var c = ch_utils.buildMessage(26);
    var s = ch_utils.buildMessage(41);
    var framePage = ch_utils.buildMessage(45);
    var frameText = ch_utils.buildMessage(47);
    var correct_chartid = ch_utils.buildMessage(48);
    var frameAll = ch_utils.buildMessage(50);
    var frameClear = ch_utils.buildMessage(51);

    var htmlText = '<table id="myTable" class="sortable">';
    htmlText += '<colgroup>';
    htmlText += '<col span="10">';
    htmlText += '<col style="visibility:COL10_VISIBILITY;">';
    var col10_visibility = 'collapse';
    htmlText += '</colgroup>';
    htmlText += '<tbody><tr><th id="title">'+t+'</th>'+
                '<th id="chartid">'+i+'</th>';
    if (instancesRead) {
        htmlText += '<th id="active">'+a+'</th>';
        if (ADMIN === 'YES') {
            htmlText += '<th id="inst">'+inst+'</th>';
        }
        if (ADMIN === 'YES') {
            htmlText += '<th id="polling">'+polling+'</th>';
            htmlText += '<th id="chartlength">'+chartLength+'</th>';
            htmlText += '<th id="clone">'+cop+'</th>';
            htmlText += '<th id="download">'+download+'</th>';
            htmlText += '<th id="remove">'+rem+'</th>';
            htmlText += '<th id="dbchange">'+change+'</th>';
            htmlText += '<th id="correctid">'+correct_chartid+'</th>';
        }
    }

    htmlText += '<th id="framing" class="sorttable_nosort" >'+
                    '<button type="button"  title="'+frameText+'"'+
                        ' onclick="framing()">'+framePage+'</button>'+
                    '<button type="button"  title="'+frameAll+'"'+
                        ' onclick="framing(1)">+</button>'+
                    '<button type="button"  title="'+frameClear+'"'+
                        ' onclick="framing(2)">-</button>'+
                '</th>';
    htmlText += '</tr>';
    if (ADMIN === 'YES') {
        adminQuerystring = '?isAdmin='+isAdmin+'&';
    } else {
        adminQuerystring = '?';
    }

    var URLChart = './draw-chartjs.html'+adminQuerystring+'chartId=';
    var URLJSON  = './data-json.html'+adminQuerystring+'chartId=';
    var URLMOVE  = './move-chart.html?chartId=';
    var URLCORRECT  = './correct-chartid.html?chartId=';
    var last = '';

    //indexArray.forEach(function(chart, ix) {
    console.log(indexArray);
    for (var ix = 0; ix < indexArray.length; ix++) {
        var htmlTextNew = '';
        var orphaned = false;
        var chartId = indexArray[ix][1];
        var chartTitle = indexArray[ix][0];
        var uChart = URLChart + chartId;
        var uJSON = URLJSON + chartId;
        var uMOVE = URLMOVE + chartId;
        var uCORRECT = URLCORRECT + chartId;
        var chartIdDisp = chartId;
        var chartIdDB = IndexDBName;
        var chartIdBase = chartId;
        //if other database:
        if (chartId.indexOf('.') > 0) {
            var chartIdSplit = chartIdDisp.split('.');
            chartIdDB = chartIdSplit[0];
            chartIdBase = chartIdSplit[1];
        }

        //chart title
        if (chartTitle === last) {
            htmlTextNew += '<tr><td headers="title"><a href="'+uChart+
                '"'+target_chart+'><font color="red"><b>'+chartTitle+'</b></font></td>';
        } else {
            htmlTextNew += '<tr><td headers="chartid"><a href="'+uChart+'"'+target_chart+'>'+chartTitle+
                '</td>';
        }
        //chart id
        if (chartIdDisp.indexOf('.') < 0) {chartIdDisp = ' '+chartIdDisp;}
        htmlTextNew += '<td headers="chartid" ><center><a href="'+uJSON+'"'+target_data+'>'+chartIdDisp+'</a></td>';

        var col, tex;
        if (instancesRead) {
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
            var disabled = '';
            if (!isAdmin) { disabled = 'disabled';}
            if (tex === y) {
                htmlTextNew += '<td headers="active" align=center>'+
                            '<input type="checkbox" id="active+'+chartId+'" checked '+disabled+'>'+
                            '</td>';
            } else
            if (tex === n) {
                htmlTextNew += '<td headers="active" align=center>'+
                            '<input type="checkbox" id="active+'+chartId+'" '+disabled+'>'+
                            '</td>';
            } else
            if (tex === e) {
                htmlTextNew += '<td headers="active"><center><font color="'+col+'"><b>'+
                            '<a href="javascript:alert(\''+
                    ch_utils.buildMessage(20)+'\');">'+tex+'</a> '+
                            '</b></font></td>';
            } else
            if (tex === c) {
                htmlTextNew += '<td headers="active"><center>'+tex+'</td>';
            } else
            if (tex === s) {
                htmlTextNew += '<td headers="active"><center>'+tex+'</td>';
            } else {
                htmlTextNew += '<td headers="active"><center><font color="'+col+'"><b>'+
                    tex+'</b></font></td>';
            }

            if (ADMIN === 'YES') {
                //instance id
                var instNo_orig;
                if (!instancesList.hasOwnProperty(chartId)) {
                    htmlTextNew += '<td headers="inst"><center></td>';
                } else {
                    htmlTextNew += '<td headers="inst"><center>';
                    instNo_orig = instancesList[chartId].id;
                    if (!instOriginal(chartId, instNo_orig)) {
                        htmlTextNew += '<font color="magenta"><b>'+
                            instNo_orig+'</b></font>';
                        col10_visibility = 'visible';
                    } else {
                        htmlTextNew += '<font color="green"><b>'+
                            instNo_orig+'</b></font>';
                    }
                    htmlTextNew += '</td>';
                }

                //chart length (period)
                var period = '';
                if (instancesList.hasOwnProperty(chartId)) {
                    period = instancesList[chartId].period || '';
                }
                htmlTextNew += '<td headers="polling"><center>'+period+'</td>';

                //chart length (interval)
                var interval = '';
                if (instancesList.hasOwnProperty(chartId)) {
                    interval = instancesList[chartId].interval;
                }
                htmlTextNew += '<td headers="chartlength"><center>'+interval+'</td>';

                //clone
                var l1 = '';
                if (!isCopy(chartIdBase)) {
                    l1 =  '<a href="javascript:copyChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                }
                htmlTextNew += '<td headers="clone"><center>'+l1+'</td>';

                //download
                var l3 =  '<a href="javascript:downloadChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                htmlTextNew += '<td headers="download"><center>'+l3+'</td>';

                //delete
                var l2 = '';
                if (tex === o || tex === n || tex === c || tex === s) {
                    l2 =  '<a href="javascript:deleteChart(\''+
                        chartId +'\',\''+api+'\');">'+y+'</a> ';
                }
                htmlTextNew += '<td headers="remove"><center>'+l2+'</td>';

                //change database
                var l4 = '';
                if (tex === y || tex === n) {
                    l4 =  '<a href="'+uMOVE+'">'+y+'</a> ';
                }
                htmlTextNew += '<td headers="dbchange"><center>'+l4+'</td>';

                //correct chartid
                var l5 = '';
                if (instNo_orig &&
                    !instOriginal(chartId, instNo_orig)) {
                    if (tex === y || tex === n) {
                        l5 =  '<a href="'+uCORRECT+'">'+y+'</a> ';
                    }
                }
                htmlTextNew += '<td headers="correctid"><center>'+l5+'</td>';

            } //if ADMIN
            else {
                if (!instancesList.hasOwnProperty(chartId)) {
                    orphaned = true;
                }
            } //if not ADMIN
        } //instancesRead

        //build framepage
        htmlTextNew += '<td headers="framing" align=center>'+
                       '<input type="checkbox" id="framing+'+chartId+'">'+
                       '</td>';
        htmlTextNew += '</tr>';

        //filter chart entry
        if (elSnapshots.checked === false && chartIdDB === 'Snapshots') {
            continue;
        } else
        if (elOrphaned.checked === false && orphaned === true && chartIdDB !== 'Snapshots') {
            continue;
        } else
        if (elActives.checked === false && tex === y) {
            continue;
        } else
        if (elInActives.checked === false && tex === n) {
            continue;
        }
        
        htmlText += htmlTextNew;
        last = chartTitle;
    }
    htmlText += '</tbody></table>';
    return htmlText.replace('COL10_VISIBILITY', col10_visibility);
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
        if (checkboxList[i].id !== 'actives' &&
            checkboxList[i].id !== 'inactives' &&
            checkboxList[i].id !== 'orphaned' &&
            checkboxList[i].id !== 'snapshots') {

        checkboxList[i].addEventListener('change', function(event) {
            //console.log(event.target);
            var id = event.target.id.split('+');
            if (id[0] === 'active') {
                var chartId = id[1];
                var checked = event.target.checked;
                changeActive(chartId, checked);
            }
        });
        }
    }
    /*jshint loopfunc:false */

    var el = document.getElementById('myTable');
    sorttable.makeSortable(el);
} //printHTML

function framing(mark_unmark) {
    var checkboxList = document.querySelectorAll('[type="checkbox"]');
    var i, id;
    if (mark_unmark) {
        for (i = 0; i < checkboxList.length; i++) {
            id = checkboxList[i].id.split('+');
            if (id[0] === 'framing') {
                //check if visible
                if (checkboxList[i].offsetParent !== null) {
                    if (mark_unmark === 2 && checkboxList[i].checked) {
                        checkboxList[i].checked = false;
                    } else
                    if (mark_unmark === 1 && !checkboxList[i].checked) {
                        checkboxList[i].checked = true;
                    }
                }
            }
        }
    } else {
        var chartList = '';
        for (i = 0; i < checkboxList.length; i++) {
            id = checkboxList[i].id.split('+');
            if (id[0] === 'framing') {
                //check if visible
                if (checkboxList[i].offsetParent !== null) {
                    if (checkboxList[i].checked) {
                        if (chartList) {
                            chartList += ',';
                        }
                        chartList += id[1];
                    }
                }
            }
        }
        if (chartList) {
            var url = './frame.html'+'?charts='+chartList;
            window.open(url, "_blank");
        } else {
            ch_utils.alertMessage(46);
        }
        filterInput = document.getElementById("myInput");
        filterInput.focus();
    }
} //framing

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
    busyi.show();

    function success_get (response) {
        busyi.hide();
        var data = response.data;
        var instNo = data.id;
        var activeNew = instancesList[chartId].active;
        data.active = activeNew;
        var url = '/ZAutomation/api/v1/instances/'+instNo;
        ch_utils.ajax_put(url, JSON.stringify(data), success_put);
    }

    function success_put(response) {
        busyi.hide();
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
    
function instOriginal(chartId, instNo) {
    if (IndexDBName+instNo === chartId.replace(/^.*\./, '')) {return true;}
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
    var chartIdDBOld = IndexDBName;
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
    var chartIdDBNew = IndexDBName;
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
       var I = tableNameIndex;
       //console.log('insert table '+I);
       url = 'http://'+api+'/'+IndexDBName+'/'+I+'/insert';
       ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}),
                               delete_old_index, fail);
    }
    function delete_old_index() {
       var I = tableNameIndex;
       //console.log('clear table '+I);
       url = 'http://'+api+'/'+IndexDBName+'/'+I+'/delete_prev?ts='+ts;
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
    var chartIdDB = IndexDBName;
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
       var I = tableNameIndex;
       //console.log('selecting table '+I);
       url = 'http://'+api+'/'+IndexDBName+'/'+I+'/select_next';
       ch_utils.ajax_get(url, correct_index, fail);
    }
   function correct_index(data) {
       delete indexBuffer[chartId];
       //console.log('indexBuffer', indexBuffer);
       var I = tableNameIndex;
       //console.log('insert table '+I);
       url = 'http://'+api+'/'+IndexDBName+'/'+I+'/insert';
       ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}), 
                               delete_old_index, fail);
    }
   function delete_old_index() {
       var I = tableNameIndex;
       //console.log('clear table '+I);
       url = 'http://'+api+'/'+IndexDBName+'/'+I+'/delete_prev?ts='+ts;
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
    var chartIdDB = IndexDBName;
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
    var chartIdDB = IndexDBName;
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
           var I = tableNameIndex;
           //console.log('insert table '+I);
           url = 'http://'+api+'/'+IndexDBName+'/'+I+'/insert';
           ch_utils.ajax_post(url, JSON.stringify({"ts": ts, "val": indexBuffer}),
                                   delete_old_index, fail);
        } //correct_index

        function delete_old_index() {
           var I = tableNameIndex;
           //console.log('clear table '+I);
           url = 'http://'+api+'/'+IndexDBName+'/'+I+'/delete_prev?ts='+ts;
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
