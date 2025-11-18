//h-------------------------------------------------------------------------------
//h
//h Name:         MxC.js
//h Type:         Javascript module
//h Purpose:      Administer MxC constants for ZWay module MxChartDB
//h Project:      ZWay
//h Usage:        
//h Remark:       
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    see libraries
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V0.0.1 2025-11-17/peb
//v History:      V0.0.1 2025-11-14/peb first version
//h Copyright:    (C) piet66 2025
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 6 */
/*globals ch_utils, ixTableHeader */
'use strict';

//b constants
//-----------
var MODULE = 'MxC.js';
var VERSION = 'V0.0.1';
var WRITTEN = '2025-11-17/peb';
console.log('Module: ' + MODULE + ' ' + VERSION + ' ' + WRITTEN);

//b variables
//-----------

//b DOMContentLoaded
//------------------
document.addEventListener("DOMContentLoaded", function(event) {
    //b data definitions
    //------------------
    var dbName = 'MxChartDB';
    var tabName = 'MxC';
    var MxC_obj;
    var htmlText;
    var MxC_status;
    let lastFocusedRow = null;

    //b preparations
    //--------------
    document.title = tabName;
    var lang = ch_utils.getLanguage();

    //workaround:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia:
    var isModulemedia = (window.location.pathname.indexOf('/modulemedia/') > 0);
    if (isModulemedia) {
        ch_utils.convertMessagesToUTF8();
    }
    document.getElementById('notification-message0').innerHTML = 
        ch_utils.buildMessage(6);

    //b get constants.js parameters
    //-----------------------------
    var consts = ch_utils.evalConstants();
    if (typeof consts === 'string') {
       ch_utils.displayMessage(0, consts);
    }
    var api = consts.api;

    //b check for admin rights (==>checkLoggedIn)
    //-------------------------------------------
    var isAdmin = ch_utils.getParameter('isAdmin');
    console.log('isAdmin=' + isAdmin);
    ch_utils.checkLoggedIn(program_start);

    //b main functions
    //----------------
    //b program_start
    //---------------
    function program_start(sessionId, adminRights, username) {
        console.log(sessionId+' '+adminRights+' '+username);
        if(sessionId && adminRights) {
            isAdmin = adminRights;
        } else {
            isAdmin = undefined;
        }
        console.log('isAdmin='+isAdmin);
        request_MxC();
    } //program_start

    //b request_MxC
    //-------------
    function request_MxC () {
        console.log('request_MxC');
        var url = 'http://'+api+'/'+dbName+'/'+tabName+'/select_last';
        console.log(url);
        //ch_utils.displayMessage(1, url);
        ch_utils.ajax_get(url, success, fail, no_data);
        function success(data) {
            MxC_status = 'read';
            ch_utils.displayMessage(2, tabName);
            console.log('input', data);
            MxC_obj = data[0];
            //console.log(MxC_obj);
            htmlText = eval_MxC(MxC_obj);
            printHTML(htmlText);
        } //success
    
        function no_data(status) {
            console.log('no_data');
            ch_utils.displayMessage(3, tabName);
            htmlText = create_MxC();
            printHTML(htmlText);
        } //no_data

        function fail(status, response) {
            if (status === 900) {   //table not existing
                console.log('900');
                ch_utils.displayMessage(8, tabName);
                init_MxC();
                htmlText = create_MxC();
                printHTML(htmlText);
            } else 
            if (status === 404) {   //table empty
                MxC_status = 'read';
                ch_utils.displayMessage(3, tabName);
                htmlText = create_MxC();
                printHTML(htmlText);
            } else {
                var mess = 'error reading '+tabName+': '+status;
                console.log(mess);
                alert(mess);
            }
        } //fail
    } //request_MxC

    //b eval_MxC
    //----------
    //https://www.html.de/threads/formular-mit-button-in-tabelle-einfugen.58078/
    function eval_MxC(MxC_obj) { 
        console.log('eval_MxC');
        if (!isAdmin) {
            ch_utils.displayMessage(4);
        }
        function convertTimestampToString(ts) {
            function padTo2Digits(num) {
                return num.toString().padStart(2, '0');
            }
            var date = new Date(ts);
            return (
                date.getFullYear() + '-' +
                padTo2Digits(date.getMonth() + 1) + '-' +
                padTo2Digits(date.getDate()) + 'T' +
                padTo2Digits(date.getHours()) + ':' +
                padTo2Digits(date.getMinutes())
            );
        }        
        
        //b build html
        //------------
        //html table head
        //---------------
        var htmlText = table_header();

        //html table body
        //---------------
        var count = 0;
        Object.keys(MxC_obj).sort().forEach( function(el, ix) {
            //console.log(el, MxC_obj[el]);
            var arr = MxC_obj[el].sort();
            for (var i = 0; i < arr.length; i++) {
                //console.log(arr);
                count++;
                htmlText += '<tr>';
                htmlText += add_input('name', el, 'required');
                htmlText += add_input('value', arr[i][4], 'size=15');
                htmlText += '<td headers="type">'+
                            '<select name="type">';
                if (arr[i][5] === 'number') {
                    htmlText += '<option value="number" selected>number</option>';
                } else {
                    htmlText += '<option value="number">number</option>';
                }
                if (arr[i][5] === 'string') {
                    htmlText += '<option value="string" selected>string</option>';
                } else {
                    htmlText += '<option value="string">string</option>';
                }
                htmlText += '</select>'+
                            '</td>';
                if (arr[i].length > 7) {
                    //unit nachträglich angehängt
                    htmlText += add_input('unit', arr[i][7], 'size=10');
                } else {
                    htmlText += add_input('unit', '', 'size=10');
                }
                if (arr[i][1] === null) {
                    htmlText += '<td headers="valid_from">'+
                                '<input type="text" '+
                                'onfocus="(this.type=\'datetime-local\')" '+
                                'onblur="if(!this.value) this.type=\'text\'">'+
                                '</td>';
                } else {
                    htmlText += '<td headers="valid_from_user">'+
                                '<input type="datetime-local" name="termin" value="'+ 
                                convertTimestampToString(arr[i][0])+'"</td>';
                }
                //htmlText += '<td headers="valid_from">'+
                //            suppress_null(arr[i][0])+
                //            '</td>';
                if (arr[i][3] === null) {
                    htmlText += '<td headers="valid_from">'+
                                '<input type="text" '+
                                'placeholder="" '+
                                'onfocus="(this.type=\'datetime-local\')" '+
                                'onblur="if(!this.value) this.type=\'text\'">'+
                                '</td>';
                } else {
                    htmlText += '<td headers="valid_from_user">'+
                                '<input type="datetime-local" name="termin" value="'+ 
                                convertTimestampToString(arr[i][2])+'"</td>';
                }
                //htmlText += '<td headers="valid_to">'+
                //            suppress_null(arr[i][2])+
                //            '</td>';
                htmlText += add_input('comment', arr[i][6], 'size=30');
                htmlText += '</tr>';
            }
        });
        htmlText += table_empty_rows(Math.max((10 - count), 0));

        //html table foot
        //---------------
        htmlText += '</tbody></table>';
        return htmlText;
    } //eval_MxC

    //b init_MxC
    //----------
    function init_MxC() { 
        console.log('init_MxC');
        if (!isAdmin) {
            create_MxC();
        }
        var url = 'http://'+api+'/'+dbName+'/'+tabName+'/create_table';
        console.log(url);
        ch_utils.ajax_post(url, undefined, success, fail);
        function success(data) {
            MxC_status = 'init';
            console.log('create_table '+tabName+' success');
            ch_utils.displayMessage(3);
            ch_utils.buttonVisible('store', true);
        } //success
    
        function fail(status, response) {
            var mess = 'error creating table '+tabName+': '+status;
            console.log(mess);
        } //fail
    } //init_MxC

    //b create_MxC
    //------------
    function create_MxC(){ 
        console.log('create_MxC');
        if (!isAdmin) {
            ch_utils.displayMessage(4);
        }

        //b build html
        //------------
        //html table head
        //---------------
        var htmlText = table_header();

        //html table body
        //---------------
        htmlText += table_empty_rows(10);

        //html table foot
        //---------------
        htmlText += '</tbody></table>';
        //console.log(htmlText);
        return htmlText;
    } //create_MxC

    function printHTML(htmlText) {
        console.log('printHTML');
        //console.log(htmlText);

        ch_utils.buttonText('request', 0);
        ch_utils.buttonVisible('request', true);
        ch_utils.buttonText('store', 1);
        if (isAdmin && MxC_status) {
            ch_utils.buttonVisible('store', true);
        } else {
            ch_utils.buttonVisible('store', false);
        }
        ch_utils.buttonText('del_row', 2);
        ch_utils.buttonVisible('del_row', true);
        ch_utils.buttonText('ins_row', 3);
        ch_utils.buttonVisible('ins_row', true);
        ch_utils.buttonText('dup_row', 4);
        ch_utils.buttonVisible('dup_row', true);

        document.getElementById('html-renderer').innerHTML = htmlText;

        //add event to all input fields to get and store the focus
        document.querySelectorAll('table input').forEach(input => {
            input.addEventListener('focus', function() {
                lastFocusedRow = this.closest('tr');
                //console.log(lastFocusedRow);
            });
        });
        //add event to all input fields to get and store the focus
        document.querySelectorAll('table select').forEach(input => {
            input.addEventListener('focus', function() {
                lastFocusedRow = this.closest('tr');
                console.log(lastFocusedRow);
            });
        });
    } //printHTML

    //b event listeners
    //-----------------
    document.getElementById('request').onclick = function(event) {
        request_MxC();
    }; //request

    document.getElementById('del_row').onclick = function(event) {
        if (lastFocusedRow) {
            lastFocusedRow.querySelectorAll('input').forEach(input => input.value = '');
        }
    }; //del_row

    document.getElementById('ins_row').onclick = function(event) {
        if (lastFocusedRow) {
            // Neue Zeile erstellen
            const table = document.getElementById('myTable');
            const newRow = lastFocusedRow.cloneNode(true);
            // Werte der neuen Zeile leeren:
            newRow.querySelectorAll('input').forEach(input => input.value = '');
            // Neue Zeile direkt nach der aktuellen Zeile einfügen
            lastFocusedRow.parentNode.insertBefore(newRow, lastFocusedRow.nextSibling);
        }
    }; //ins_row

    document.getElementById('dup_row').onclick = function(event) {
        if (lastFocusedRow) {
            // Neue Zeile erstellen
            const table = document.getElementById('myTable');
            const newRow = lastFocusedRow.cloneNode(true);
            // Werte der neuen Zeile leeren:
            //newRow.querySelectorAll('input').forEach(input => input.value = '');
            // Neue Zeile direkt nach der aktuellen Zeile einfügen
            lastFocusedRow.parentNode.insertBefore(newRow, lastFocusedRow.nextSibling);
        }
    }; //dup_row

    document.getElementById('store').onclick = function(event) {
        //console.log('tabData', getTableValues());
        var tabData = getTableValues();
        var sendData = {};

        //b evaluate table data
        //---------------------
        var count = 0;
        for (var i = 0; i < tabData.length; i++) {
            var arri = tabData[i];
            var name = arri[0];
            if (!name) {continue;}
            //console.log(arri);

            if (typeof sendData[name] === 'undefined') {
                sendData[name] = [];
            }

            var value = arri[1] || null;
            var unit = arri[2] || null;
            var valid_from = arri[3] || null;
            var valid_to = arri[4] || null;
            var comment = arri[5] || null;
            var type = arri[6] || null; //!!!

            if (value && type === 'number') {
                var val = value-0;
                if (isNaN(val)) {
                    ch_utils.alertMessage(5, value);
                    break;
                }
                value = val;
            }

            var ts_from = toTimestamp(valid_from);
            var ts_to = toTimestamp(valid_to);

            sendData[name].push(
                [ ts_from,
                  valid_from,
                  ts_to,
                  valid_to,
                  value,
                  type,
                  comment,
                  unit
                ]);
            count++;
        }
        console.log(sendData);

        //b send data
        //-----------
        var now = Date.now();
        var url = 'http://'+api+'/'+dbName+'/'+tabName+'/insert?ts_del=' + now + '&';
        console.log(url);
        var sendBuffer = { ts: now,
                           val: sendData
                         };
        ch_utils.ajax_post(url, JSON.stringify(sendBuffer), success, fail);
        function success(data) {
            console.log('send data '+tabName+' success');
            ch_utils.alertMessage(10, count, tabName);
        } //success
    
        function fail(status, response) {
            var mess = 'error sending data to '+tabName+': '+status;
            console.log(mess);
            ch_utils.alertMessage(9, tabName, status, response);
        } //fail

    }; //store

    //b auxiliary functions
    //---------------------
    function suppress_null(val) {
        if (val === null) {
            return '';
        }
        return val;
    }
    function add_input(headers, val, opt) {
        var htmlText = 
            '<td headers="'+headers+'">'+
            '<input type="text" name="'+headers+'"'+
            ' value="'+suppress_null(val)+'"';
        if (opt) {
            htmlText += ' '+opt;
        }
        htmlText += '></td>';
        //console.log(htmlText);
        return htmlText;
    }

    function table_header(){ 
        var i = ixTableHeader;
        var htmlText = '<table id="myTable" class="sortable">';
        htmlText += '<tbody>';
        htmlText += '<tr>'+
                    '<th id="name">'+ch_utils.buildMessage(i+0)+'</th>'+
                    '<th id="value">'+ch_utils.buildMessage(i+1)+'</th>'+
                    '<th id="type">'+ch_utils.buildMessage(i+2)+'</th>'+
                    '<th id="unit" width=10>'+ch_utils.buildMessage(i+8)+'</th>'+
                    '<th id="valid_from_user">'+ch_utils.buildMessage(i+3)+'</th>'+
                    //'<th id="valid_from">'+ch_utils.buildMessage(i+4)+'</th>'+
                    '<th id="valid_to_user">'+ch_utils.buildMessage(i+5)+'</th>'+
                    //'<th id="valid_to">'+ch_utils.buildMessage(i+6)+'</th>'+
                    '<th id="comment">'+ch_utils.buildMessage(i+7)+'</th>';
        htmlText += '</tr>';

        return htmlText;
    } //table_header

    function table_empty_rows(count){ 
        var htmlText = '';
        for (var i = 0; i < count; i++) {
            htmlText += '<tr>';
            htmlText += add_input('name', '', 'required');
            htmlText += add_input('value', '', 'size=15');
            htmlText += '<td headers="type">'+
                        '<select name="type">';
            htmlText += '<option value="number">number</option>';
            htmlText += '<option value="string">string</option>';
            htmlText += '</select>'+'</td>';
            htmlText += add_input('unit', '', 'size=10');
            htmlText += '<td headers="valid_from">'+
                        '<input type="text" '+
                        'onfocus="(this.type=\'datetime-local\')" '+
                        'onblur="if(!this.value) this.type=\'text\'">'+
                        '</td>';
            //htmlText += '<td headers="valid_from">'+''+'</td>';
            htmlText += '<td headers="valid_to">'+
                        '<input type="text" '+
                        'placeholder="" '+
                        'onfocus="(this.type=\'datetime-local\')" '+
                        'onblur="if(!this.value) this.type=\'text\'">'+
                        '</td>';
            //htmlText += '<td headers="valid_to">'+''+'</td>';
            htmlText += add_input('comment', '', 'size=30');
            htmlText += '</tr>';
        }
        return htmlText;
    } //table_empty_rows

    function getTableValues() {
        const table = document.getElementById('myTable');
        const rows = table.querySelectorAll('tr');
        const data = [];
  
        rows.forEach(row => {
            const rowData = [];
            // Alle input Felder in einer Zeile abfragen
            row.querySelectorAll('input').forEach(input => rowData.push(input.value));
            // Alle select Felder in einer Zeile abfragen
            row.querySelectorAll('select').forEach(select => {
                rowData.push(select.value); // oder select.options[select.selectedIndex].text für den Text
            });
            if (rowData.length > 0) {
                data.push(rowData);
            }
        });
        return data;
    }

    function toTimestamp(timeString) {
        if (!timeString) {return null;}
        return new Date(timeString).getTime();
    }


}); //DOMContentLoaded


/*
[
  {
    "STROM_2021": [
      [
        null,
        null,
        null,
        null,
        0.59152968,
        "number",
        "5181,8/365/24"
      ]
    ],
    "STROM_2022": [
      [
        null,
        null,
        null,
        null,
        0.534018265,
        "number",
        "4.678,0/365/24"
      ]
    ],
    "STROM_2023": [
      [
        null,
        null,
        null,
        null,
        0.505719178,
        "number",
        "4.430,1/365/24"
      ]
    ],
    "STROM_2024": [
      [
        null,
        null,
        null,
        null,
        0.497495446,
        "number",
        "4.370,0/366/24"
      ]
    ],
    "grüün_Preis": [
      [
        1740524400000,
        "02/26/2025 00:00:00",
        null,
        null,
        24.45,
        "number",
        "Grundpreis: 108 €/J"
      ]
    ],
    "Maingau_Preis": [
      [
        1679094000000,
        "03/18/2023 00:00:00",
        1735686000000,
        "01/01/2025 00:00:00",
        34.31,
        "number",
        "Grundpreis: 60 €/J"
      ],
      [
        1735686000000,
        "01/01/2025 00:00:00",
        null,
        null,
        35.59,
        "number",
        "Grundpreis: 60 €/J"
      ]
    ],
    "Oeltank_voll": [
      [
        null,
        null,
        null,
        null,
        132.5,
        "number",
        "cm bei vollem Tank"
      ]
    ],
    "Oeltank_leer": [
      [
        null,
        null,
        null,
        null,
        10,
        "number",
        "cm bei leerem Tank"
      ]
    ],
    "Oeltank_Liter_pro_cm": [
      [
        null,
        null,
        null,
        null,
        53.23,
        "number",
        "Liter/ cm"
      ]
    ],
    "Hzg_Laufzeit_pro_Liter": [
      [
        null,
        null,
        null,
        null,
        0.343,
        "number",
        "Laufzeit/ Liter"
      ]
    ],
    "Oelstand": [
      [
        1762902000000,
        "11/12/2025 00:00:00",
        null,
        null,
        43.14,
        "number",
        "Ölstand [cm] um 00:00"
      ]
    ]
  }
]

[
  [
    "Hzg_Laufzeit_pro_Liter",
    "0.343",
    "",
    "",
    "Laufzeit/ Liter",
    "number"
  ],
  [
    "Maingau_Preis",
    "34.31",
    "2023-03-18T00:00",
    "2025-01-01T00:00",
    "Grundpreis: 60 €/J",
    "number"
  ],
  [
    "Maingau_Preis",
    "35.59",
    "2025-01-01T00:00",
    "",
    "Grundpreis: 60 €/J",
    "number"
  ],
  [
    "Oelstand",
    "43.14",
    "2025-11-12T00:00",
    "",
    "Ölstand [cm] um 00:00",
    "number"
  ],
  [
    "Oeltank_Liter_pro_cm",
    "53.23",
    "",
    "",
    "Liter/ cm",
    "number"
  ],
  [
    "Oeltank_leer",
    "10",
    "",
    "",
    "cm bei leerem Tank",
    "number"
  ],
  [
    "Oeltank_voll",
    "132.5",
    "",
    "",
    "cm bei vollem Tank",
    "number"
  ],
  [
    "STROM_2021",
    "0.59152968",
    "",
    "",
    "5181,8/365/24",
    "number"
  ],
  [
    "STROM_2022",
    "0.534018265",
    "",
    "",
    "4.678,0/365/24",
    "number"
  ],
  [
    "STROM_2023",
    "0.505719178",
    "",
    "",
    "4.430,1/365/24",
    "number"
  ],
  [
    "STROM_2024",
    "0.497495446",
    "",
    "",
    "4.370,0/366/24",
    "number"
  ],
  [
    "grüün_Preis",
    "24.45",
    "2025-02-26T00:00",
    "",
    "Grundpreis: 108 €/J",
    "number"
  ]
]
*/


