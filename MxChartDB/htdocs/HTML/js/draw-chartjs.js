//h-------------------------------------------------------------------------------
//h
//h Name:         draw-chartjs.js
//h Type:         Javascript module
//h Purpose:      Draw chart for ZWay module MxChartDB
//h Project:      ZWay
//h Usage:        
//h Remark:       
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    see libraries
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V3.7.0 2026-01-18/peb
//v History:      V1.0.0 2022-04-01/peb taken from MxChartJS
//v               V1.1.0 2022-09-04/peb [+]button showComplete
//v               V1.2.1 2022-11-20/peb [+]isZoomActive
//v               V2.1.0 2024-01-09/peb [+]other database 
//v               V2.1.0 2024-01-09/peb [+]other database 
//v               V3.0.0 2024-12-13/peb [-]remove obsolete fill100
//v               V3.1.2 2025-01-26/peb [*]date arithmetic
//v                                     [*]post calc
//v               V3.1.3 2025-02-02/peb [+]date picker: end time
//v               V3.2.0 2025-02-03/peb [+]ad hoc analysis
//v               V3.4.0 2025-06-01/peb [+]MxC
//v               V3.4.1 2025-07-15/peb [+]enhance error message 27 with typeof
//v               V3.4.2 2025-07-29/peb [+]convert tooltips to utf8
//v               V3.4.3 2025-08-03/peb [+]allow subdirs for icons in modulemedia
//v               V3.4.4 2025-08-18/peb [+]spanGaps as parameter
//v               V3.6.0 2025-10-09/peb [+]usedYScales
//v                                     [*]y scales code redesigned
//v               V3.6.1 2025-10-29/peb [x]fill with color if target sensor=1
//v               V3.7.0 2026-01-02/peb [-]adHocCalcResult
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 6 */
/*globals Chart, moment, w3color, busy_indicator, ixButtonTextBase */
/*globals ch_utils, header_utils, MxC_input: true, MxC_utils, postcalc, g: true, adHocCalc */
/*globals nightTimes, annotation, postprocess, images, imagesPathDefault: true */
/*globals annotation.fixed */
'use strict';

//-----------
//b Constants
//-----------
var MODULE = 'draw-chartjs.js';
var VERSION = 'V3.7.0';
var WRITTEN = '2026-01-18/peb';
console.log('Module: ' + MODULE + ' ' + VERSION + ' ' + WRITTEN);

//-----------
//b Variables
//-----------
var url;
var IndexDBName;
var tableNameIndex;

var config;
var data = {
    labels: [],
    datasets: []
};
var usedYScales = {
    positions: [],
    types: [],
    ids: [],
    visible: [],
    limit_exceed: []
};
var limitYAxis;

var post_processing = false;
var ts_last; //last stored ts
var ts_first; //least stored ts

//-----------
//b Functions
//-----------
document.addEventListener("DOMContentLoaded", function(event) {
    var busyi = new busy_indicator(document.getElementById("busybox"),
        document.querySelector("#busybox div"));
    busyi.hide();

    //detect index database name
    // /ZAutomation/api/v1/load/modulemedia/MxChartDB/HTML/admin.html
    url = window.location.pathname;
    IndexDBName = url.split('/')[6];
    tableNameIndex = IndexDBName + '_Index';
    console.log('IndexDBName=' + IndexDBName);

    //======= data definitions =====================================
    var isAdmin, isMobile, isFrame, isModal, displaySettings;

    var vLog = {};
    var showRefresh = true;
    var IntervalId;
    var errorMessage;

    var isZoomed = false;
    var isZoomActive = false;
    var doRefresh = (ch_utils.getCookie('doRefresh') || 'true') === 
        'true' ? true : false;
    var showTooltipBox = (ch_utils.getCookie('showTooltipBox') || 'true') === 
        'true' ? true : false;
    var showShowIx = (ch_utils.getCookie('showShowIx') || 'false') === 
        'true' ? true : false;

    //measure runtime
    var startRun;

    var startTime;
    var endTime;
    var db_count = 0;
    var initialIntervalMSEC, displayStart, displayEnd;
    var currentIntervalMSEC;
    var chartLabelsLen;
    var chartLastValues;
    var sensorsOnlyChange;
    var completeValuesReceived = false;

    var config_data_datasets_save = [];
    var chartArithmetics;
    var MxC = function(MxC_name, ts) {
        return MxC_utils.MxC(MxC_name, ts);    
    };

    //----------- text labels and icons ------------
    var y3Labels = []; //text labels list
    var y3LabelsMaxWidth; //max text label length
    var y3Icons; //icons array
    var y3IconsRender = []; //icons array for afterRender
    var y3IconsWidth; //icon size in characters
    var iconSize; //icon size in px
    var y3reduceUnusedTicks; //reduce nonnumerical y-axis topdown when
    //unnused ticks
    var y3leastTicks; //least number of ticks if y3reduceUnusedTicks
    var urlIcons = '/smarthome/storage/img/icons/';
    var modulemedia = '/ZAutomation/api/v1/load/modulemedia/' + IndexDBName + '/';
    var y3LabelsUsed;

    var drawIconsTimer, y3IconsCache = {},
        y3IconsVisible, chartAreaBottomLast;
    var y3IconsDefault = images.addPath('placeholder');

    var opacity = 60;
    var opacityHex;
    var NOFILL = '#ffffff00';

    var chartColors = {
        //http://www.farb-tabelle.de/de/farbtabelle.htm
        red: '#FF0000', //'rgb(255, 0, 0)'
        green: '#008000', //'rgb(75, 192, 192)'
        orange: '#FFA500', //'rgb(255, 165, 0)'
        blue: '#0000FF', //'rgb(54, 162, 235)'
        yellow: '#FFFF00', //'rgb(255, 205, 86)'
        purple: '#800080', //'rgb(153, 102, 255)'
        brown: '#A52A2A', //'rgb(165,42,42)'
        violet: '#EE82EE', //'rgb(238,130,238)'
        deeppink: '#FF1493', //'rgb(255,16,118)'
        darkgoldenrod: '#B8860B', //'rgb(255,185,15)'
        grey: '#808080', //'rgb(201, 203, 207)'
        chartreuse: '#7FFF00', //'rgb(127, 255, 0)'
        olivedrab: '#6B8E23', //'rgb(107, 142, 35)'
        greenyellow: '#ADFF2F', //'rgb(173, 255, 47)'
        pink: '#FFC0CB', //'rgb(255,192,203)'
    };

    var colorNames = Object.keys(chartColors);
    var posYAxis1;
    var posYAxis2;
    var maxValues;
    var textAxisNecessary, numberAxisNecessary, scaleType;

    ///config structure for chart.js
    config = {
        plugins: [{}],
        data: {},
        options: {
            responsive: true,
            maintainAspectRatio: true, //maintainAspectRatio=false: 
            //fixed height of the chart,
            //set the height of the parent
            onClick: function(event) {
                //needs tooltip enabled
                var chart = event.chart;
                if (chart._active.length === 0) {
                    return;
                }
                var el = chart._active[0].element;
                var ctx = chart.ctx;
                var x = el.x; //event.x;
                var y = el.y; //event.y;
                if (!showTooltipBox) {
                    var xValue = ch_utils.userTime(el.$context.parsed.x);
                    var yRaw = el.$context.parsed.y;
                    var yValue = el.$context.raw; //parsed.y;
                    var label = el.$context.dataset.label;
                    ctx.fillText('    ' + label, x, y);
                    if (yValue !== yRaw) {
                        ctx.fillText('    ' + xValue + ': ' + yRaw + ' = ' + 
                            yValue, x, y + 20);
                    } else {
                        ctx.fillText('    ' + xValue + ': ' + yValue, x, y + 20);
                    }
                }
                var leftX = chart.chartArea.left;
                var topY = chart.chartArea.top;
                var RightX = chart.chartArea.right;
                var bottomY = chart.chartArea.bottom;
                ctx.beginPath();
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.moveTo(leftX, y);
                ctx.lineTo(RightX, y);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#C2C7CC";
                ctx.setLineDash([15, 3, 3, 3]);
                ctx.stroke();
                ctx.closePath();
            },
            animation: false,
            normalized: true,

            plugins: {
                //common: {
                //    drawTime: 'beforeDraw'
                //},
                //we use annotations to create the background for nighttime
                annotation: {
                    drawTime: 'afterDatasetsDraw', //'beforeDraw',
                    annotations: {},
                },
                title: {
                    display: true,
                    text: '',
                    font: {
                        weight: "bold"
                    },
                    color: "black"
                },
                legend: {
                    display: true,
                    //hide legend if label is empty:
                    labels: {
                        filter: function(legendItem, data) {
                            if (!data.datasets[legendItem.datasetIndex].label) {
                                return false;
                            }
                            return true;
                        }
                    },
                    //change behavior at click on legend
                    onClick: function(event, legendItem, legend) {
                        //toggle visibility
                        var hidden = legendItem.hidden;
                        hidden = hidden === true ? false : true;
                        data.datasets[legendItem.datasetIndex].hidden = hidden;

                        //toggle visibility of fixed annotations
                        var sensor_no = legendItem.datasetIndex+1;
                        if (annotation.fixed[sensor_no]) {
                            var id, drawTime, ids = annotation.fixed[sensor_no];
                            for (var i = 0; i < ids.length; i++) {
                                id = ids[i];
                                drawTime = hidden === false ? 'afterDatasetsDraw' : null;
                                if (config.options.plugins.annotation.annotations[id]) {
                                    config.options.plugins.annotation.annotations[id].drawTime = drawTime;
                                } else {
                                    delete annotation.fixed[sensor_no][i];
                                }
                            }
                        }
                        g.redraw();
                    }
                },
                tooltip: {
                    //hide tooltip if label is empty
                    filter: function(tooltipItem, index, tooltipItems, data) {
                        if (!showTooltipBox) {
                            return;
                        }
                        if (!data.datasets[tooltipItem.datasetIndex].label) {
                            return false;
                        }
                        return true;
                    },
                    //displayColors:false,  //hide boxes
                    mode: 'index',
                    intersect: true,
                    callbacks: {
                        afterLabel: function(tooltipItem) {
                            var x_index = tooltipItem.dataIndex;
                            var label = tooltipItem.dataset.tooltips[x_index];
                            if (!label) {
                                return false;
                            }
                            if (typeof label !== 'string') {
                                return label;
                            }
                            if (label.trim() === '') {
                                return false;
                            }
                            label = ch_utils.convertToUTF8(label);
                            if (label.indexOf('>') < 0) {
                                return label;
                            }
                            return label.split("|");
                        },
                    },
                    footerFontStyle: 'normal'
                }, //tooltip
                //plugin chartjs-plugin-zoom:
                zoom: {
                    zoom: {
                        wheel: { //zoom via mouse wheel
                            enabled: true,
                        },
                        pinch: { //zoom via finger pinch
                            enabled: true
                        },
                        drag: { //drag to zoom
                            enabled: true,
                            modifierKey: 'ctrl',
                        },
                        mode: 'x',
                        onZoomStart: function(chart, event, point) {
                            if (isZoomActive) {
                                return false;
                            }
                            isZoomed = true;
                            isZoomActive = true;
                            closeToolTip(window.myLine);
                        },
                        onZoomComplete: function(chart) {
                            isZoomActive = false;
                            currentIntervalMSEC = header_utils.xRange().len;
                            //console.log('!!!!!!!!!!! currentIntervalMSEC='+currentIntervalMSEC);
                            
                            //add night backgrounds
                            if (vLog.chartHeader.nightBackground) {
                                nightTimes.annotations(1);
                            }

                            //execute post processing
                            if (post_processing) {
                                postprocess(1);
                            }
                            
                            if (vLog.chartHeader.nightBackground ||
                                post_processing) {
                                g.redraw(1);
                            }

                            display_startTime();
                        },
                    },
                    pan: {
                        enabled: true, //shift
                        mode: 'x',
                        //modifierKey: 'ctrl',
                        onPanStart: function(chart, event, point) {
                            if (isZoomActive) {
                                return false;
                            }
                            isZoomed = true;
                            isZoomActive = true;
                            closeToolTip(window.myLine);
                        },
                        onPanComplete: function(chart) {
                            isZoomActive = false;

                            //add night backgrounds
                            if (vLog.chartHeader.nightBackground) {
                                nightTimes.annotations(2);
                            }

                            //execute post processing
                            if (post_processing) {
                                postprocess(2);
                            }

                            if (vLog.chartHeader.nightBackground ||
                                post_processing) {
                                g.redraw(2);
                            }

                            display_startTime();
                        },
                    }
                }, //zoom
            }, //plugins
            elements: {
                point: {
                    pointStyle: 'circle',
                }
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            millisecond: "SSS [ms]",
                            second: "HH:mm:ss",
                            //second: "ddd HH:mm:ss",
                            minute: "HH:mm",
                            //minute: "ddd HH:mm",
                            hour: "ddd HH:mm",
                            day: "ddd D.MMM YY",
                            week: "ll",
                            month: "MMM",
                            quarter: "[Q]Q - YY",
                            year: "YYYY",
                        },
                        tooltipFormat: 'ddd D.MMM YYYY, HH:mm'
                    },
                    ticks: {
                        source: 'auto',
                    },
                    title: {
                        display: false,
                        text: 'time',
                        font: {
                            weight: "bold"
                        },
                        color: "black"
                    },
                },
                yUright: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: false,
                        text: '',
                        font: {
                            weight: "bold"
                        },
                        color: "black",
                    },
                },
                yUleft: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: false,
                        text: '',
                        font: {
                            weight: "bold"
                        },
                        color: "black",
                    },
                },
                yLright: {
                    type: 'category',
                    position: 'right',
                    title: {
                        display: false,
                        text: '',
                        font: {
                            weight: "bold"
                        },
                        color: "black",
                    },
                },
                yLleft: {
                    type: 'category',
                    position: 'left',
                    title: {
                        display: false,
                        text: '',
                        font: {
                            weight: "bold"
                        },
                        color: "black",
                    },
                },
            }, //scales
        } //options
    }; //config

    //======= program main ===================================

    //workaround:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia:
    var isModulemedia = (window.location.pathname.indexOf('/modulemedia/') > 0);
    if (isModulemedia) {
        ch_utils.convertMessagesToUTF8();
    }
    var lang = ch_utils.getLanguage();

    //get parameters
    var chartId = ch_utils.getParameter('chartId');
    console.log('chartId=' + chartId);
    if (chartId.length === 0) {
        ch_utils.alertMessage(3);
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
    ch_utils.displayMessage(0, chartIdDisp);
    document.title = chartIdDisp;

    isModal = ch_utils.getParameter('isModal') || false;
    console.log('isModal=' + isModal);
    isAdmin = ch_utils.getParameter('isAdmin');
    console.log('isAdmin=' + isAdmin);
    isMobile = ch_utils.isMobile();
    console.log('isMobile=' + isMobile);
    isFrame = ch_utils.getParameter('isFrame') || false;
    console.log('isFrame=' + isFrame);

    //get constants.js parameters
    var vars = ch_utils.evalConstants();
    if (typeof vars === 'string') {
        ch_utils.displayMessage(0, vars);
    }
    var api = vars.api;
    var snapshots_possible = vars.snapshots_possible;
    var snapshotAdmin = vars.snapshots.admin_required;

    //process output settings
    function correct_aspect(aspect, inp) {
        var num, unit, ret;
        if (isNaN(inp)) {
            unit = inp.replace(/^[\d\.]+/, '');
            num = inp.replace(unit, '');
        } else {
            num = inp;
            unit = '';
        }
        //alert(aspect+': inp='+inp+' > num='+num+ ', unit='+unit);
        if (!num) {
            //alert(aspect+': inp='+inp+' not changed');
            return inp;
        }
        num = Math.round(num);
        ret = Math.round(num) + (unit || 'px');
        //alert(aspect+': '+inp+' > '+ret);
        return ret;
    } //correct_aspect

    displaySettings = vars.standard_display;
    if (isFrame && Object.keys(vars.frame).length !== 0) {
        displaySettings = vars.frame;
    } else
    if (isModal && Object.keys(vars.modal).length !== 0) {
        displaySettings = vars.modal;
        if (!displaySettings.html_fontSize) {
            displaySettings.html_fontSize = 'small';
        }
        if (!displaySettings.chart_fontSize) {
            displaySettings.chart_fontSize = 12;
        }
        showShowIx = false;
    } else
    if (isMobile && Object.keys(vars.mobile).length !== 0) {
        displaySettings = vars.mobile;
    }
    if (!displaySettings.html_fontSize) {
        displaySettings.html_fontSize = 'medium';
    }
    if (!displaySettings.chart_fontSize) {
        displaySettings.chart_fontSize = 14;
    }
    if (!displaySettings.main_width && !displaySettings.chart_height) {
        displaySettings.main_width = '100%';
        displaySettings.chart_height = window.innerHeight / 1.46;
    }
    if (!displaySettings.main_width) {
        displaySettings.main_width = '100%';
    }
    console.log(displaySettings);

    document.body.style.fontSize =
        correct_aspect('fontSize', displaySettings.html_fontSize);
    Chart.defaults.font.size = displaySettings.chart_fontSize;

    var el_main = document.getElementById('main');
    el_main.style.width = correct_aspect('width', displaySettings.main_width);

    if (displaySettings.border) {
        el_main.style.border = displaySettings.border;
    }
    if (displaySettings.margin) {
        el_main.style.margin = displaySettings.margin;
    }

    var el_canvas = document.getElementById('canvas');
    if (displaySettings.chart_height) {
        el_canvas.style.height =
            correct_aspect('height', displaySettings.chart_height);
        config.options.maintainAspectRatio = false;
    } else {
        config.options.maintainAspectRatio = true;
    }

    ch_utils.buttonText('interval_start', 5, '');
    ch_utils.buttonText('interval_end', 5, '');

    //check current API version
    check_API_version('1.7.0');

    //*** call main
    //read and draw chart 'chartId'
    var step;
    var tsLastHeader = 0,
        tsLastValues = 0,
        headerChanged;
    main('REQUEST_FIRST');

    //======= function definitions ===========================

    function main(request_mode, from, to) {
        if (request_mode !== 'REQUEST_UPDATE') {
            tsLastHeader = 0;
            tsLastValues = 0;
        }
        step = 0;
        startRun = Date.now();

        program_control(request_mode, from, to);
    } //main

    //check API version
    function check_API_version(version_least) {
        url = 'http://' + api + '/version';
        ch_utils.ajax_get(url, success);

        function success(data) {
            var version_string = data.VERSION;
            var v = version_string.replace('V', '').split('.');
            var v_comp = version_least.split('.');
            var correct_version = false;
            for (var i = 0; i < v_comp.length; i++) {
                if (v[i] === undefined) {
                    correct_version = false;
                    break;
                }
                var v_int = parseInt(v[i]);
                if (v_int > v_comp[i]) {
                    correct_version = true;
                    break;
                }
                if (v_int < v_comp[i]) {
                    correct_version = false;
                    break;
                }
                correct_version = true;
            }
            if (!correct_version) {
                alert('current API version: ' + version_string + 
                    ', you need at least API version V' + version_least);
            }
        }
    } //check_API_version

    //program control
    function program_control(request_mode, from, to) {
        //console.log('program_control: '+(Date.now()-startRun)/1000+' sec, step='+step+', request_mode='+request_mode);
        step++;
        switch (step) {
            case 1:
                if (isAdmin) {
                    check_administratorRights();
                }
                count_chart_entries(request_mode, from, to);
                break;
            case 2:
                read_last_ts(request_mode, from, to);
                break;
            case 3:
                read_first_ts(request_mode, from, to);
                break;
            case 4:
                read_header(request_mode, from, to);
                break;
            case 5:
                //*** test for used MxC constants
                var MxC_used = MxC_utils.test_MxC_used(vLog.chartHeader, api); 
                if (isAdmin || MxC_used) {
                    obtain_MxC(request_mode, from, to);
                } else {
                    //*** call read_values
                    program_control(request_mode, from, to);
                }
                break;
             case 6:
                if (!headerChanged) {    //TODO ????????????
                    program_control(request_mode, from, to);
                    break;
                }
                //*** test for usercode in separate file
                if (vLog.chartHeader.global_js.define_global_js &&
                    vLog.chartHeader.global_js.file_name) {
                    obtain_usercode(vLog.chartHeader.global_js.file_name,
                                    request_mode, from, to);
                } else {
                    //*** set/reset global object g
                    header_utils.take_global_code(vLog.chartHeader);
                    program_control(request_mode, from, to);
                }
                break;
             case 7:
                if (!headerChanged) {    //TODO ????????????
                    program_control(request_mode, from, to);
                    break;
                }
                //*** test for usercode in separate file
                if (vLog.chartHeader.post_processing.define_post_processing &&
                    vLog.chartHeader.post_processing.file_name) {
                    obtain_post_processing(vLog.chartHeader.post_processing.file_name,
                                           request_mode, from, to);
                } else {
                    //*** take post processing code postprocess
                    if (typeof vLog.chartHeader.post_processing !== 'undefined') {
                        if (vLog.chartHeader.post_processing.define_post_processing) {
                            post_processing = true;
                            header_utils.take_post_processing(vLog.chartHeader);
                        }
                    }
                    program_control(request_mode, from, to);
                }
                break;
           case 8:
                //console.log('read_values start: '+(Date.now()-startRun)/1000+' sec');
                if (!vLog.chartHeader.initialInterval ||
                    vLog.chartHeader.initialInterval === 'complete') {
                    vLog.chartHeader.initialInterval =
                        vLog.chartHeader.chartInterval;
                }
                initialIntervalMSEC = 
                    initialInterval2msec(vLog.chartHeader.initialInterval);
                if (initialIntervalMSEC) {
                    currentIntervalMSEC = initialIntervalMSEC;
                }
                limitYAxis = vLog.chartHeader.limitYAxis;
                read_values(request_mode, initialIntervalMSEC, from, to);
                break;
            case 9:
                //console.log('prepareData start: '+(Date.now()-startRun)/1000+' sec');
                try {
                    config.data = prepareData();
                    //console.log('prepareData: '+(Date.now()-startRun)/1000+' sec');

                    //whenever the data inthe browsers buffer has changed
                    //we newly build sv array for post processing aso
                    postcalc.create_sv_buf(config.data);
                } catch (err) {
                    ch_utils.alertMessage(0, 'prepareData: ' + err.message);
                    throw (err);
                }
                drawLogsChart(request_mode, from, to);
                //console.log('drawLogsChart: '+(Date.now()-startRun)/1000+' sec');
                if (request_mode !== 'REQUEST_UPDATE') {
                    setRefreshInterval(showRefresh && doRefresh);
                }
                break;
        }
    } //program_control

    //check for administrator rights
    function check_administratorRights() {
        if (!isAdmin) {
            return;
        }
        ch_utils.checkLoggedIn(go_on);

        function go_on(sessionId, adminRights, username) {
            //console.log(sessionId+' '+adminRights+' '+username);
            //console.log('adminRights='+adminRights);
            if (sessionId && adminRights) {
                ch_utils.buttonVisible('textShowIx', true);
                ch_utils.buttonVisible('configuration', true);
                ch_utils.buttonVisible('adHocCalcButton', true);
                if (snapshots_possible && (snapshotAdmin === false || isAdmin)) {
                    ch_utils.buttonVisible('snapshot', true);
                }
            } else {
                ch_utils.buttonVisible('textShowIx', false);
                showShowIx = false;
                ch_utils.buttonVisible('configuration', false);
                ch_utils.buttonVisible('adHocCalcButton', false);
                ch_utils.buttonVisible('snapshot', false);
            }
        }
    } //check_isAdmin

    //count chart entries
    function count_chart_entries(request_mode, from, to) {
        var chartIdDisp = chartIdDB + '.' + chartIdBase;
        var url = 'http://'+api+'/'+chartIdDB+'/'+chartIdBase+'/count';
        ch_utils.ajax_get(url, success, fail);

        function success(data) {
            db_count = data[0];
            console.log('db_count ' + chartIdDisp + ': ' + db_count);
            if (request_mode) {
                program_control(request_mode, from, to);
            }
        }

        function fail(status, responseText) {
            var mess = status + ': ' + responseText;
            console.log(mess);
            alert(mess);
        }
    } //count_chart_entries

    //read first ts
    function read_first_ts(request_mode, from, to) {
        var chartIdDisp = chartIdDB + '.' + chartIdBase;
        url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
            '/select_first_ts?raw=yes';
        ch_utils.ajax_get(url, success, fail, no_data);

        function success(data) {
            ts_first = data;
            console.log('ts_first ' + chartIdDisp + ': ' + ts_first);
            if (request_mode) {
                program_control(request_mode, from, to);
            }
        }

        function no_data(data) {
            ts_first = 0;
            console.log('ts_first ' + chartIdDisp + ': ' + ts_first);
            if (request_mode) {
                program_control(request_mode, from, to);
            }
        }

        function fail(data) {
            ts_first = false;
            var url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_first_ts?raw=yes';
            console.log(url + ' command not defined');
        }
    } //read_first_ts

    //read last ts
    function read_last_ts(request_mode, from, to) {
        var chartIdDisp = chartIdDB + '.' + chartIdBase;
        url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
            '/select_last_ts?raw=yes';
        ch_utils.ajax_get(url, success, fail, no_data);

        function success(data) {
            ts_last = data;
            console.log('ts_last ' + chartIdDisp + ': ' + ts_last);
            //*** call next functiomA
            if (request_mode) {
                program_control(request_mode, from, to);
            }
        }

        function no_data(data) {
            ts_last = 0;
            console.log('ts_last ' + chartIdDisp + ': ' + ts_last);
            if (request_mode) {
                program_control(request_mode, from, to);
            }
        }

        function fail(data) {
            ts_last = false;
            var url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_first_ts?raw=yes';
            console.log(url + ' command not defined');
        }
    } //read_last_ts

    //obtain MxC constants
    function obtain_MxC (request_mode, from, to) {
        //console.log('obtain_MxC');
        url = 'http://' + api + '/MxChartDB/MxC/select_last';
        ch_utils.ajax_get(url, success, fail);

        function success(data) {
            MxC_input = data[0];
            //console.log('MxC_input', MxC_input);
            program_control(request_mode, from, to);
        } //success

        function fail(status, responseText) {
            console.log('obtain MxC: '+ status + ' ' + responseText);
            alert('obtain MxC: '+ status + ' ' + responseText);
        } //fail
    } //obtain_MxC

    //obtain usercode from file
    function obtain_usercode (filename, request_mode, from, to) {
        console.log('obtain_usercode');
        url = '../myUsercode/' + filename;
        url = ch_utils.convertToUTF8(url);
        ch_utils.ajax_get(url, success, fail);

        function success(data) {
            data = ch_utils.convertToUTF8(data);
            vLog.chartHeader.global_js.code = data;
            //*** set/reset global object g
            header_utils.take_global_code(vLog.chartHeader);
            program_control(request_mode, from, to);
        } //success

        function fail(status, responseText) {
            if (status === 500) {
                responseText = 'file not found';
            }
            var err = 'obtain_usercode '+filename+': '+ status + ' ' + responseText;
            console.log(err);
            alert(err);
            header_utils.take_global_code(vLog.chartHeader);
            program_control(request_mode, from, to);
        } //fail
    } //obtain_usercode

    //obtain post_processing code from file
    function obtain_post_processing (filename, request_mode, from, to) {
        console.log('obtain_post_processing');
        url = '../myPostprocessing/' + filename;
        url = ch_utils.convertToUTF8(url);
        ch_utils.ajax_get(url, success, fail);

        function success(data) {
            data = ch_utils.convertToUTF8(data);
            vLog.chartHeader.post_processing.code = data;
            //*** take post processing code postprocess
            if (typeof vLog.chartHeader.post_processing !== 'undefined') {
                if (vLog.chartHeader.post_processing.define_post_processing) {
                    post_processing = true;
                    header_utils.take_post_processing(vLog.chartHeader);
                }
            }
            program_control(request_mode, from, to);
        } //success

        function fail(status, responseText) {
            if (status === 500) {
                responseText = 'file not found';
            }
            var err = 'obtain_post_processing '+filename+': '+ status + ' ' + responseText;
            console.log(err);
            alert(err);
            program_control(request_mode, from, to);
        } //fail
    } //obtain_post_processing

    //read chart header
    function read_header(request_mode, from, to) {
        //console.log('read_header tsLastHeader old', tsLastHeader);
        url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
            '_Header/select_next?ts=' + tsLastHeader;
        ch_utils.ajax_get(url, success, fail, 31);

        function success(data) {
            vLog.chartHeader = data[data.length - 1];
            tsLastHeader = vLog.chartHeader.Timestamp;
            console.log('tsLastHeader new', tsLastHeader);
            if (tsLastHeader === undefined) {
                console.log('tsLastHeader is undefined');
                console.log(data);
                alert('tsLastHeader is undefined');
                alert(data);
            }
            headerChanged = true;
            read_first_ts();

            //get data
            document.title = vLog.chartHeader.chartId;

            var errText = vLog.chartHeader.errText || 0;
            console.log('errText=' + errText);
            var errChart;
            if (errText !== 0) {
                if (isNaN(errText)) {
                    var errSplit = errText.split(':');
                    errText = errSplit[1];
                    console.log('errText=' + errText);
                    errChart = errSplit[0];
                    console.log('errChart=' + errChart);
                    console.log('chartIdDisp=' + chartIdDisp);
                    if (errChart &&
                        errChart !== chartIdDisp &&
                        errChart !== chartId &&
                        errChart !== chartIdDB + '.' + chartIdBase) {
                        errText = 0;
                        console.log('errText=' + errText);
                    }
                }
            }

            if (errText <= 0) {
                //*** set used y axes (only numeric, text axes later)
                usedYScales = {
                    positions: [],
                    types: [],
                    ids: [],
                    visible: [],
                    limit_exceed: []
                };
                var posYAxis1 = 'right';
                if (vLog.chartHeader.hasOwnProperty('positionYAxis')) {
                    posYAxis1 = vLog.chartHeader.positionYAxis;
                }
                if (!vLog.chartHeader.hasOwnProperty('usedYAxes')) {
                    //for backward compatibility
                    vLog.chartHeader.usedYAxes =
                        Array(vLog.chartHeader.chartLabels.length).fill(null);
                }
                var usedYAxes = vLog.chartHeader.usedYAxes;

                var used_i, id_i, pos_i, type_i;
                for (var i = 0; i < usedYAxes.length; i++) {
                    used_i = usedYAxes[i] || '1_axe';
                    if (used_i === '1_axe' && posYAxis1 === 'right') {
                        pos_i = 'right';
                    } else
                    if (used_i === '1_axe' && posYAxis1 === 'left') {
                        pos_i = 'left';
                    } else
                    if (used_i === '2_axe' && posYAxis1 === 'right') {
                        pos_i = 'left';
                    } else
                    if (used_i === '2_axe' && posYAxis1 === 'left') {
                        pos_i = 'right';
                    }
                    usedYScales.positions.push(pos_i);
                    usedYScales.types.push('number');
                    id_i = 'yU'+pos_i;
                    usedYScales.ids.push(id_i);
                    usedYScales.visible.push(false);
                    usedYScales.limit_exceed.push(false);
                }
                //change for category(text) axes later when textAxisNecessary === true
                console.log(usedYScales);

                //*** prepare and enable arithmetics
                chartArithmetics = 
                    header_utils.prepare_formulas(vLog.chartHeader);

                //*** enable post calc
                postcalc.enable_post_calc('postcalcButton', vLog.chartHeader);
/*
                //*** set/reset global object g
                header_utils.take_global_code(vLog.chartHeader);

                //*** take post processing code postprocess
                if (typeof vLog.chartHeader.post_processing === 'undefined') {
                    vLog.chartHeader.post_processing = {
                        define_post_processing : false,
                        lines : 30,
                        code : ''
                    };
                }

                //*** take post processing code postprocess
                if (typeof vLog.chartHeader.post_processing !== 'undefined') {
                    if (vLog.chartHeader.post_processing.define_post_processing) {
                        post_processing = true;
                        header_utils.take_post_processing(vLog.chartHeader);
                    }
                }
*/
                //*** test for used  = data;MxC constants
                program_control(request_mode, from, to);
            } else {
                doRefresh = false;
                showTooltipBox = false;
                showShowIx = false;
                buildErrorHTML(errText - 0);
            }
        } //success

        function fail(status) {
            if (status === 304) { //not modified
                headerChanged = false;
                program_control(request_mode, from, to);
            } else
            if (status === 404) { //file not found
                ch_utils.alertMessage(31);
            } else {
                var mess = 'error reading '+chartIdDisp+' Header data: '+status;
                console.log(mess);
                alert(mess);
            }
        } //fail
    } //read_header

    function read_values(request_mode, initialIntervalMSEC, from, to) {
        console.log('read_values(request_mode, initialIntervalMSEC, from, to) ' +
            request_mode + ', ' + initialIntervalMSEC + ', ' + from + ', ' + to);
        //console.log('read_values tsLastValues old', tsLastValues);
        if (headerChanged || 
            typeof vLog.chartValues === 'undefined' ||
            Object.keys(vLog.chartValues).length === 0) {
            tsLastValues = 0; //reread complete value list, if header changed
            if (initialIntervalMSEC) {
                //tsLastValues = Date.now() - initialIntervalMSEC;
                tsLastValues = ts_last - initialIntervalMSEC; //TODO - 1000;
                console.log('ts_last=' + ts_last + ', initialIntervalMSEC=' + 
                    initialIntervalMSEC);
                if (displayStart) {
                    displayStart = Math.min(displayStart, tsLastValues);
                } else {
                    displayStart = tsLastValues;
                }
                if (ts_first > 0) {
                    ts_first = ts_first - 1;
                }
                if (tsLastValues <= ts_first) {
                    tsLastValues = 0;
                }
            }
            console.log('tsLastValues=' + tsLastValues);
        }
        if (request_mode === 'REQUEST_INTERVAL') {
            url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_range?from=' + from + '&to=' + to;
        } else {
            url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_next?ts=' + tsLastValues;
        }
        ch_utils.ajax_get(url, success, fail, no_data);

        function success(data) {
            if (headerChanged) {
                vLog.chartValues = data;
            } else
            if (tsLastValues === 0) {
                vLog.chartValues = data;
            } else {
                vLog.chartValues = vLog.chartValues.concat(data);
            }
            var data_length = data.length;
            console.log(data_length + ' values received');

            if (tsLastValues === 0) {
                completeValuesReceived = true;
            }

            tsLastValues = vLog.chartValues[vLog.chartValues.length - 1][0];
            console.log('tsLastValues new', tsLastValues);
            if (tsLastValues > ts_last) {
                ts_last = tsLastValues;
            }

            //*** call drawLogsChart
            program_control(request_mode, from, to);
        } //success

        function no_data() {
            console.log('no data: ' + (Date.now() - startRun) / 1000 + ' sec');
            vLog.chartValues = [];

            //*** call drawLogsChart
            program_control(request_mode, from, to);
        } //success

        function fail(status) {
            if (status === 304) { //not modified
                //console.log('not modified: '+(Date.now()-startRun)/1000+' sec');
                if (!headerChanged) {
                    /*
                    //execute post processing
                    if (post_processing) {  //TODO ????????????????????
                        postprocess(7);
                        g.redraw();
                    }
                    */
                    ch_utils.displayMessage2(8, ch_utils.userTime('now'));
                    return;
                }
            } else
            if (status === 404) { //file not found
                no_data();
            } else {
                var mess = 'error reading '+chartIdDisp+' Header data: '+status;
                console.log(mess);
                alert(mess);
            }
        } //fail
    } //read_values

    function prepareData() {
        //console.log('prepareData');
        //------------------- global data ----------------------------------------

        var i;
        chartLabelsLen = vLog.chartHeader.chartLabels.length;
        chartLastValues = new Array(chartLabelsLen);
        chartLastValues.fill([]);

        sensorsOnlyChange = new Array(chartLabelsLen);
        sensorsOnlyChange.fill(false);

        for (i = 0; i < chartLabelsLen; i++) {
            if (['points', 'straightpoints', 'interpolatedpoints'].
                //if (['points', 'straightpoints', 'interpolatedpoints', 
                //'rectangle_left'].
                indexOf(vLog.chartHeader.chartgraphTypes[i]) >= 0) {
                sensorsOnlyChange[i] = true;
            }
            //console.log(vLog.chartHeader.chartgraphTypes[i], 
            //sensorsOnlyChange[i]);
        }

        //convert opacity
        if (vLog.chartHeader.hasOwnProperty('opacity')) {
            if (vLog.chartHeader.opacity >= 0) {
                opacity = vLog.chartHeader.opacity;
            }
        }
        opacityHex = (opacity * 255 / 100).toString(16).
            replace(/\..*$/, '').padStart(2, '0');

        //set title of x axis
        var xLabel = vLog.chartHeader.chartLabels[0];
        if (xLabel && xLabel !== 'null') {
            config.options.scales.x.title.text = xLabel;
            config.options.scales.x.title.display = true;
        }

        //positions of y axes
        posYAxis1 = 'right';
        if (vLog.chartHeader.hasOwnProperty('positionYAxis')) {
            posYAxis1 = vLog.chartHeader.positionYAxis;
        }
        posYAxis2 = posYAxis1 === 'right' ? 'left' : 'right';

        //set title of main axis
        var yMLabel = vLog.chartHeader.y1Label;
        if (yMLabel && yMLabel !== 'null') {
            if (posYAxis1 === 'right') {
                config.options.scales.yUright.title.text = yMLabel;
                config.options.scales.yLright.title.text = yMLabel;
                //config.options.scales.yUright.title.display = true;
                //config.options.scales.yLright.title.display = true;
            } else {
                config.options.scales.yUleft.title.text = yMLabel;
                config.options.scales.yLleft.title.text = yMLabel;
                //config.options.scales.yUleft.title.display = true; //!!!!!
                //config.options.scales.yLleft.title.display = true;
            }
        }

        //set title of second axis
        var ySLabel = vLog.chartHeader.y2Label;
        if (ySLabel && ySLabel !== 'null') {
            if (posYAxis2 === 'right') {
                config.options.scales.yUright.title.text = ySLabel;
                config.options.scales.yLright.title.text = ySLabel;
                //config.options.scales.yUright.title.display = true;
                //config.options.scales.yLright.title.display = true;
            } else {
                config.options.scales.yUleft.title.text = ySLabel;
                config.options.scales.yLleft.title.text = ySLabel;
                //config.options.scales.yUleft.title.display = true;
                //config.options.scales.yLleft.title.display = true;
            }
        }

        //set sizes of upper main axis
        var lowerLimityM = vLog.chartHeader.lowerLimitY1;
        if (lowerLimityM !== undefined) {
            if (posYAxis1 === 'right') {
                config.options.scales.yUright.suggestedMin = lowerLimityM;
            } else {
                config.options.scales.yUleft.suggestedMin = lowerLimityM;
            }
        }
        var upperLimityM = vLog.chartHeader.upperLimitY1;
        if (upperLimityM !== undefined) {
            if (posYAxis1 === 'right') {
                config.options.scales.yUright.suggestedMax = upperLimityM;
            } else {
                config.options.scales.yUleft.suggestedMax = upperLimityM;
            }
        }

        //set sizes of upper second axis
        var lowerLimityS = vLog.chartHeader.lowerLimitY2;
        if (lowerLimityS !== undefined) {
            if (posYAxis2 === 'right') {
                config.options.scales.yUright.suggestedMin = lowerLimityS;
            } else {
                config.options.scales.yUleft.suggestedMin = lowerLimityS;
            }
        }
        var upperLimityS = vLog.chartHeader.upperLimitY2;
        //alert(lowerLimityM+' '+upperLimityM+' '+lowerLimityS+' '+upperLimityS);
        if (upperLimityS !== undefined) {
            if (posYAxis2 === 'right') {
                config.options.scales.yUright.suggestedMax = upperLimityS;
            } else {
                config.options.scales.yUleft.suggestedMax = upperLimityS;
            }
        }

        //--- y-axis ---
        //category (text) labels
        var y3LabelsString = vLog.chartHeader.y3Labeling || '';
        if (y3LabelsString.indexOf('\\u') >= 0) {
            y3LabelsString = decodeURIComponent(JSON.parse('"' + y3LabelsString +
                '"'));
        }
        imagesPathDefault = vLog.chartHeader.y3IconsPath_Default || '';
        y3Labels = y3LabelsString.split(',');
        y3LabelsMaxWidth = 0;
        y3Labels.forEach(function(entry, i) {
            y3LabelsMaxWidth = Math.max(y3LabelsMaxWidth, entry.length);
        });

        //if text labels for display
        if (y3LabelsMaxWidth > 0) {
            y3IconsWidth = vLog.chartHeader.y3IconsWidth || 0;

            //if icons for display
            if (y3IconsWidth > 0) {
                y3Icons = vLog.chartHeader.y3Icons.split(',');
                y3Icons.forEach(function(entry, i) {
                    if (entry.length > 0) {
                        y3Icons[i] = images.addPath(entry.trim());
                        if (y3Icons[i].length === 0) {
                            y3Icons[i] = ' '; //= hide text label
                        }
                    }
                });
                if (y3Icons.length === 0) {
                    y3IconsWidth = 0;
                }
            }

            //reduce nonnumerical y-axis topdown when unnused ticks
            y3reduceUnusedTicks = vLog.chartHeader.y3reduceUnusedTicks || false;

            //least number of ticks if y3reduceUnusedTicks
            y3leastTicks = vLog.chartHeader.y3leastTicks || 2;
            y3leastTicks = Math.max(y3leastTicks, 2);

            if (y3IconsWidth > 0) {
                if (y3Icons.length < y3Labels.length) {
                    for (i = 0; i <= (y3Labels.length - y3Icons.length); i++) {
                        y3Icons.unshift('');
                    }
                }
            }
        } //if (y3LabelsMaxWidth > 0)

        //------------------- buffering ------------------------------------------

        data.labels = [];
        data.datasets = [];
        y3LabelsUsed = {};

        //definitions for category part
        maxValues = [];
        textAxisNecessary = false;
        numberAxisNecessary = false;
        scaleType = [];

        //------------------- set line header data -------------------------------
        //*** process disabled lines
        if (vLog.chartHeader.entrytypes) {
            var len1 = vLog.chartHeader.entrytypes.length;
            for (var ix1 = 1; ix1 < len1; ix1++) {
                if (vLog.chartHeader.entrytypes[ix1] === 'disabled') {
                    vLog.chartHeader.chartLabels[ix1] = 'null';
                    chartArithmetics[ix1] = 'null';
                }
            }
        }

        //*** call setDatasetHeader
        for (var label_ix = 1; label_ix < chartLabelsLen; label_ix++) {
            var label_text = vLog.chartHeader.chartLabels[label_ix];
            data.datasets.push(setDatasetHeader(label_text, label_ix));
        }
        //console.log('+++++++++++++ data.datasets');
        //console.log(data.datasets);

        //restore user hidden line flag to the state before update 
        for (var ih = 0; ih < config_data_datasets_save.length; ih++) {
            try {
                data.datasets[ih].hidden = config_data_datasets_save[ih].hidden;
            } catch (err) {
                console.log(err.message);
            }
        }
        //console.log('chartHeader: '+(Date.now()-startRun)/1000+' sec');

        //------------------- set line values data -------------------------------
        //b for all data points ip
        //------------------------
        var lengthChartValues = vLog.chartValues.length;
        var ip, ix, X, Xprev, TOOLTIPs;
        for (ip = 0; ip < lengthChartValues; ip++) {
            if (!Array.isArray(vLog.chartValues[ip])) {
                console.log('error: at chartValues[' + ip + ']:');
                console.log('X is not an array:');
                console.log(vLog.chartValues[ip]);
                continue;
            }

            //b save the values of previous datapoint ip-1
            //--------------------------------------------
            if (typeof X !== 'undefined') {
                Xprev = JSON.parse(JSON.stringify(X));
            } else {
                Xprev = new Array(lengthChartValues).fill(undefined);
            }
            X = JSON.parse(JSON.stringify(vLog.chartValues[ip]));
            TOOLTIPs = [];
            //console.log(Xprev);
            //console.log(X);

            //b prepare values for all sensors ix of the current datapoint ip
            //---------------------------------------------------------------
            var values_count = X.length;
            for (ix = 0; ix < chartLabelsLen; ix++) {
                //add null-value for subsequent added sensors without values
                if (ix >= values_count) {X[ix] = null;}

                //get tooltip
                if (X[ix] && typeof X[ix] === 'object') {
                    if (X[ix].hasOwnProperty('tooltip')) {
                        TOOLTIPs[ix] = X[ix].tooltip.toString().replace(/\|/g, 
                            '\n');
                    } else {
                        TOOLTIPs[ix] = '';
                    }
                    if (X[ix].hasOwnProperty('value')) {
                        X[ix] = X[ix].value;
                    }
                }
            }

            //b compute sensor values and store value (=>setDatasetValues)
            //------------------------------------------------------------
            for (ix = 0; ix < chartLabelsLen; ix++) {
                setDatasetValues(data, X, ix, ix, ip, Xprev, TOOLTIPs);
            }

            //store last values
            for (ix = 1; ix < chartLabelsLen; ix++) {
                var currValue = X[ix];
                if (currValue && typeof currValue === 'object') {
                    currValue = currValue.value || null;
                }
                if (chartLastValues[ix].length === 0) {
                    chartLastValues[ix] = [X[0], currValue];
                } else
                if (!sensorsOnlyChange[ix]) {
                    chartLastValues[ix] = [X[0], currValue];
                } else
                if (typeof currValue !== typeof chartLastValues[ix][1] ||
                    currValue !== chartLastValues[ix][1]) {
                    chartLastValues[ix] = [X[0], currValue];
                }
            }
        } //chartValues for ip
        //console.log('chartValues: '+(Date.now()-startRun)/1000+' sec');

        //------------------- set y scales and y ticks -------------------------------
        resetScales();

        //for text values prepare data
        var y3LabelsCount = y3Labels.length;
        if (textAxisNecessary) {
            //maybe we must shorten text label axis
            if (y3reduceUnusedTicks) {
                var y3LabelsNew = [];
                var labelText, addRemaining = false;
                for (var y3Labels_ix = 0; y3Labels_ix < y3LabelsCount; 
                    y3Labels_ix++) {
                    labelText = y3Labels[y3Labels_ix];
                    if (y3LabelsUsed[labelText] || addRemaining ||
                        y3Labels_ix >= y3LabelsCount - y3leastTicks) {
                        y3LabelsNew.push(labelText);
                        addRemaining = true;
                    }
                }
                var removeLen = y3Labels.length - y3LabelsNew.length;
                y3Labels = y3LabelsNew;

                if (y3IconsWidth > 0) {
                    y3Icons = y3Icons.slice(removeLen);
                }
            }
            if (y3IconsWidth > 0) {
                y3IconsRender = JSON.parse(JSON.stringify(y3Icons));
            }

            //set labels to both text axes
            config.options.scales.yLright.labels = y3Labels;
            config.options.scales.yLleft.labels = y3Labels;

            //prepare icons
            //if icons
            if (y3IconsWidth > 0) {
                //hide text label, if icon defined or icon = blank
                //ensure that there's enough space for the icons
                config.options.scales.yLright.ticks = {
                    color: 'black',
                    font: {
                        family: 'Monospace'
                    }, //necessary to compute space 
                    callback: function(val, index, ticks) {
                        var text = y3Labels[index] || '';
                        if (y3IconsRender[index]) {
                            text = ' ';
                        }
                        return text.padStart(Math.ceil(y3IconsWidth), ' ');
                    },
                };
                config.options.scales.yLleft.ticks = 
                    config.options.scales.yLright.ticks;

                config.plugins[0].afterRender =
                    function(chart) {
                        if (drawIconsTimer) {
                            return;
                        }
                        if (!chartAreaBottomLast) {
                            //postpone drawing till all afterRenders are through,
                            //cause 
                            //only the last chartArea position is definitively 
                            //useful
                            drawIconsTimer = setTimeout(drawIcons, 0, chart);
                        } else {
                            drawIcons(chart);
                        }
                    }; //afterRender

                //in case the labels list was enhanced we must enhanced icons 
                //list too
                if (y3IconsWidth > 0 && y3LabelsCount - y3Icons.length > 0) {
                    for (var ii = 0; ii <= (y3LabelsCount - y3Icons.length); 
                        ii++) {
                        y3Icons.unshift('');
                    }
                }
            } //icons
        } //textAxisNecessary

        //for all sensors
        var sensor_no;
        var yRightUsed = false, yLeftUsed = false;
        for (sensor_no = 1; sensor_no < usedYScales.ids.length; sensor_no++) {
            if (usedYScales.visible[sensor_no]) {
                //display y scale + title
                var id = usedYScales.ids[sensor_no];
                config.options.scales[id].display = true;
                //if (config.options.scales[id].title.text) {
                //    config.options.scales[id].title.display = true;
                //}
                data.datasets[sensor_no-1].yAxisID = id;

                //for stacking the text axe
                if (usedYScales.positions[sensor_no] === 'right') {
                    yRightUsed = true;
                } else {
                    yLeftUsed = true;
                }
            }
        }  //for sensor_no


        //console.log(posYAxis1);
        //console.log(config.options.scales.yUright.title.text);
        //console.log(config.options.scales.yLright.title.text);
        //console.log(config.options.scales.yLleft.title.text);
        //console.log(config.options.scales.yUleft.title.text);
        if (posYAxis1 === 'right') {
            if (config.options.scales.yUright.title.text &&
                config.options.scales.yUright.display) {
                config.options.scales.yUright.title.display = true;
            } else
            if (config.options.scales.yLright.title.text &&
                config.options.scales.yLright.display) {
                config.options.scales.yLright.title.display = true;
            }
        } else {
            if (config.options.scales.yLleft.title.text &&
                config.options.scales.yLleft.display) {
                config.options.scales.yLleft.title.display = true;
            } else
            if (config.options.scales.yUleft.title.text &&
                config.options.scales.yUleft.display) {
                config.options.scales.yUleft.title.display = true;
            }
        }
        if (posYAxis2 === 'right') {
            if (config.options.scales.yUright.title.text &&
                config.options.scales.yUright.display) {
                config.options.scales.yUright.title.display = true;
            } else
            if (config.options.scales.yLright.title.text &&
                config.options.scales.yLright.display) {
                config.options.scales.yLright.title.display = true;
            }
        } else {
            if (config.options.scales.yLleft.title.text &&
                config.options.scales.yLleft.display) {
                config.options.scales.yLleft.title.display = true;
            } else
            if (config.options.scales.yUleft.title.text &&
                config.options.scales.yUleft.display) {
                config.options.scales.yUleft.title.display = true;
            }
        }



        //stacking text axes
        if (numberAxisNecessary && textAxisNecessary && y3LabelsCount <= 2) {
            setScale('yUright', 'stack_right', 5, undefined, 1);
            setScale('yLright', 'stack_right', 1, true, 2);
            setScale('yUleft', 'stack_left', 5, undefined, 4);
            setScale('yLleft', 'stack_left', 1, true, 3);

            if (yRightUsed && yLeftUsed) {
                config.options.scales.yLleft.display = true;
                config.options.scales.yLright.display = true;
            }
        }
        return data;
    } //prepareData

    function setScale(scale, stack, stackWeight, offset, weight) {
        config.options.scales[scale].stack = stack;
        config.options.scales[scale].stackWeight = stackWeight;
        config.options.scales[scale].offset = offset;
        config.options.scales[scale].weight = weight;
    }

    function resetScales() {
        ['yUright','yLright','yUleft','yLleft'].forEach(function(scale) {
            ['stack','stackWeight','offset','weight'].forEach(function(option) {
                config.options.scales[scale][option] = undefined;
            });
            config.options.scales[scale].display = false;
        });
        config.plugins[0].afterRender = undefined;
    }

    function setDatasetHeader(label, ix) {
        //console.log('setDatasetHeader', label, ix);
        //console.log('data', data);

        //set color
        var colorName = vLog.chartHeader.chartColors[ix];
        if (!colorName) {
            var colCount = colorNames.length;
            if (colCount >= ix) {
                colorName = chartColors[colorNames[ix - 1]];
            } else {
                colorName = '#000000'; //black
            }
            //console.log('colorName='+colorName);
        }
        //set charttype
        var chartType = 'line';
        if (['bar', 'bar_overlap'].indexOf(
            vLog.chartHeader.chartgraphTypes[ix]) >= 0) {
            chartType = 'bar';
        }

        var sIx = '';
        if (showShowIx) {
            sIx = ix + ' ';
        }

        var spanGaps =  false;
        if (typeof vLog.chartHeader.spanGaps !== 'undefined') {
            spanGaps = vLog.chartHeader.spanGaps[ix];
        }

        label = label === 'null' ? null : label;
        var item = {
            label: label === null ? '' : sIx + label.trim(),
            type: chartType,
            backgroundColor: colorName,
            borderColor: colorName,
            fill: false,
            borderWidth: 2,
            pointStyle: 'circle', //'rectRot',   //'cross', //'dash'
            pointBorderWidth: 0,
            pointRadius: 1.5,
            pointHoverRadius: 5,
            pointHitRadius: 10,
            pointBackgroundColor: colorName,
            pointBorderColor: colorName,
            spanGaps: spanGaps, //missing values cause gaps in line
            data: [],
            tooltips: [],
            cubicInterpolationMode: 'monotone'
        };

        if (vLog.chartHeader.chartlineTypes[ix] === 'dotted') {
            var dotWidth = 3;
            item.borderDash = [dotWidth, dotWidth];
            item.borderWidth = dotWidth;
        } else
        if (vLog.chartHeader.chartlineTypes[ix] === 'dashed') {
            item.borderDash = [7, 5];
        } else
        if (vLog.chartHeader.chartlineTypes[ix] === 'invisible') {
            item.borderDash = [1, 1000];
            item.pointBackgroundColor = 'white';
            item.pointBorderColor = 'white';
            item.pointRadius = 0;
            item.pointHoverRadius = 0;
            item.pointHitRadius = 0;
        }
        if (vLog.chartHeader.chartgraphTypes[ix] === 'straightlines') {
            item.tension = 0;
            item.cubicInterpolationMode = undefined;
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'straightpoints') {
            item.tension = 0;
            item.cubicInterpolationMode = undefined;
            item.spanGaps = true; //connect across missing values
            item.pointRadius = 5;
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'interpolatedpoints') {
            item.spanGaps = true; //connect across missing values
            item.pointRadius = 5;
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'rectangle') {
            item.stepped = 'before';
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'rectangle_left') {
            item.stepped = 'after';
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'bar') {
            item.barThickness = 'flex';
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'bar_overlap') {
            item.barThickness = 'flex';
            item.barPercentage = 1.5;
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'points') {
            item.pointStyle = 'circle';
            item.showLine = false;
            item.pointRadius = 5;
        } else
        if (vLog.chartHeader.chartgraphTypes[ix] === 'pointseries') {
            item.tension = 0;
            item.cubicInterpolationMode = undefined;
            item.pointStyle = 'circle';
            item.showLine = false;
            item.pointRadius = 5;
        } else {
            item.stepped = false;
        }

        //suppress sensor output completely
        if (chartArithmetics[ix] === 'null') {
            item.label = '';
            item.showLine = false;
        }

        if (vLog.chartHeader.hasOwnProperty('chartFill')) {
            if (vLog.chartHeader.chartFill[ix] !== null) {
                var fillStr = (vLog.chartHeader.chartFill[ix] + '').replace(/ /g,
                    '');
                var fillArr = fillStr.split(':');
                var fill0 = false,
                    fill1, fill2;
                if (fillArr.length <= 3 && fillArr[0] &&
                    (fillArr.length !== 3 || fillArr[1] || fillArr[2])) {
                    //part 1:
                    if (fillArr[0].charAt(0).toLowerCase() === 'y') {
                        fillArr[0] = fillArr[0].substring(1);
                        if (isNaN(fillArr[0]) === false) {
                            fill0 = {
                                value: fillArr[0] * 1
                            };
                        }
                    } else {
                        fillArr[0] = fillArr[0] * 1;
                        if (fillArr[0] === 0) { //fill till x-axis
                            fill0 = 'origin';
                        } else if (fillArr[0] === 98) { //fill to bottom
                            fill0 = 'start';
                        } else if (fillArr[0] === 99) { //fill to top
                            fill0 = 'end';
                        } else if (fillArr[0] >= 1) {
                            fill0 = (fillArr[0] - 1)+'';
                        }
                    }
                    //part 2:
                    if (fillArr.length > 1) {
                        fill1 = formatColor(fillArr[1]);
                    }
                    //part 3:
                    if (fillArr.length > 2) {
                        fill2 = formatColor(fillArr[2]);
                    }
                    //pur fill string together:
                    if (!fill1 && !fill2) {
                        item.fill = fill0;
                        // fill: set color transparent
                        if (item.fill && item.fill === fill0) {
                            if (item.backgroundColor.charAt(0) !== '#') {
                                var col = w3color(item.backgroundColor).
                                    toHexString();
                                //console.log('converted color '+
                                //item.backgroundColor+' to '+col);
                                item.backgroundColor = col;
                            }
                            if (item.backgroundColor.charAt(0) === '#') {
                                item.backgroundColor += opacityHex;
                            } else {
                                console.log(
                                    'cannot add opacity to backgroundColor=' + 
                                    item.backgroundColor);
                            }
                        }
                    } else {
                        if (chartType === 'bar') {
                            item.backgroundColor = fill1 || fill2;
                        } else {
                            item.fill = {
                                target: fill0,
                                above: fill1 || NOFILL,
                                below: fill2 || NOFILL,
                            };
                        }
                    }
                    //console.log('ix='+ix+': fillStr='+fillStr+': item.fill='+item.fill);
                }
            } //fillStr
        }
        if (vLog.chartHeader.hasOwnProperty('chartHidden')) {
            if (vLog.chartHeader.chartlineTypes[ix] !== 'invisible') {
                item.hidden = vLog.chartHeader.chartHidden[ix] || false;
            }
        }
        //console.log('+++++++++++++ item');
        //console.log(item);
        return item;
    } //setDatasetHeader

    function setErrormessage(ix, errMess, d) {
        errorMessage = errMess;
        if (d) {
            var label = d.label;
            var indicator = ch_utils.buildMessage(34);
            if (label.indexOf(indicator) < 0) {
                label = indicator + label;
                d.label = label;
                console.log(errMess);
                alert(errMess);
            }
        }
    }

    function add_type(v) {
        return v + ',type '+typeof v;
    } //add_type

    function store_maxValues(x, ix_store, ix, data, ip, timestamp, X) {
        var mess, x_pre = null;
        if (x === null) {
            if (maxValues[ix_store - 1] === undefined) {
                maxValues[ix_store - 1] = null;
            }
            if (scaleType[ix_store - 1] === undefined) {
                scaleType[ix_store - 1] = null;
            }
            return x;
        } else
        if (typeof x === 'string' && x !== '' && maxValues[ix_store - 1] && 
            !isNaN(x - 0)) {
            //convert string to number
            x = x - 0;
            maxValues[ix_store - 1] = maxValues[ix_store - 1] ? 
                Math.max(maxValues[ix_store - 1], x) : x;
            scaleType[ix_store - 1] = 'number';
            numberAxisNecessary = true;
            usedYScales.visible[ix_store] = true;
            if (limitYAxis !== undefined && x > limitYAxis-0) {
                if (!usedYScales.limit_exceed[ix_store]) {
                    usedYScales.limit_exceed[ix_store] = true;
                    if (usedYScales.positions[ix_store] === 'right') {
                        usedYScales.positions[ix_store] ='left';
                        usedYScales.ids[ix_store] = usedYScales.ids[ix_store].replace('right', 'left');
                    } else {
                        usedYScales.positions[ix_store] ='right';
                        usedYScales.ids[ix_store] = usedYScales.ids[ix_store].replace('left', 'right');
                    }
                }
            }
            return Math.round(x * 100) / 100;
        } else
        if (typeof x === 'string') {
            if (maxValues[ix_store - 1]) {
                x_pre = vLog.chartValues[ip - 1][ix];
                if (x_pre === null || x_pre === undefined || x !== x_pre.toString()) {
                    mess = ch_utils.buildMessage(27, ix, ip, 
                        ch_utils.userTime(timestamp), add_type(x_pre), add_type(x));
                    setErrormessage(ix, mess, data.datasets[ix - 1]);
                    console.log(X);
                }
                return null;
            } else {
                maxValues[ix_store - 1] = false;
                scaleType[ix_store - 1] = 'string';
                textAxisNecessary = true;

                //correct usedYScales for category/text scale
                if (usedYScales.types[ix] !== 'text') {
                    usedYScales.types[ix] = 'text';
                    usedYScales.ids[ix] = usedYScales.ids[ix].replace('U', 'L');
                    usedYScales.visible[ix] = true;
                }

                return x;
            }
        } else
        if (typeof x === 'number') {
            if (maxValues[ix_store - 1] === false) {
                x_pre = vLog.chartValues[ip - 1][ix];
                if (x_pre === null || x_pre === undefined || x.toString() !== x_pre) {
                    mess = ch_utils.buildMessage(27, ix, ip, 
                        ch_utils.userTime(timestamp), add_type(x_pre), add_type(x));
                    setErrormessage(ix, mess, data.datasets[ix - 1]);
                    console.log(X);
                }
                return null;
            } else {
                maxValues[ix_store - 1] = maxValues[ix_store - 1] ? 
                    Math.max(maxValues[ix_store - 1], x) : x;
                scaleType[ix_store - 1] = 'number';
                numberAxisNecessary = true;
                usedYScales.visible[ix_store] = true;
                if (limitYAxis !== undefined && x > limitYAxis-0) {
                    if (!usedYScales.limit_exceed[ix_store]) {
                        usedYScales.limit_exceed[ix_store] = true;
                        if (usedYScales.positions[ix_store] === 'right') {
                            usedYScales.positions[ix_store] = 'left';
                            usedYScales.ids[ix_store] = usedYScales.ids[ix_store].replace('right', 'left');
                        } else {
                            usedYScales.positions[ix_store] = 'right';
                            usedYScales.ids[ix_store] = usedYScales.ids[ix_store].replace('left', 'right');
                        }
                    }
                }
                return Math.round(x * 100) / 100;
            }
        }
    } //store_maxValues

    //h
    //h setDatasetValues
    //h computes sensor value for index ix by formula and stores value and
    //h tooltip to dataset
    //h setDatasetValues(...);
    //-------------------------------------------------------------------------
    function setDatasetValues(data, X, ix, ix_store, ip, Xprev, TOOLTIPs) {
        //console.log('setDatasetValues ip='+ip+ ' ix='+ix);
        //console.log(X);

        //b if timestamp
        //--------------
        if (ix === 0) {
            //b push timestamp to data.labels
            //-------------------------------
            data.labels.push(X[0]);
            if (!startTime) {startTime = X[0];}
            else {startTime = Math.min(startTime, X[0]);}
            endTime = X[0];

            g.x0 = X[0];
            g.x0_prev = Xprev[0] || null;
            g.v0_prev = g.v0 || null;
            g.v0 = X[0];

        //b else if sensor value
        //----------------------
        } else {
            //current values:
            var x = X[ix];
            g.ix = ix;
            g.x = x;
            g.x_prev = Xprev[ix] || null;
            //previous value:
            g['v' + ix+ '_prev'] = g['v' + ix] || null;
            g.v = g['v' + ix] || null;
/*            
            if (x) {
                console.log('g', g);
            }
*/
            //b correct value by formula
            //--------------------------
            //console.log(ip+'-'+ix);
            var formula = chartArithmetics[ix];
            //console.log(formula);
            if (sensorsOnlyChange[ix] && chartLastValues[ix][1] === undefined) {
                x = null;
                formula = null;
            } else
            if (sensorsOnlyChange[ix] && x === chartLastValues[ix][1]) {
                x = null;
                formula = null;
            } else
            if (formula && formula === 'null') {
                x = null;
            } else
            if (formula && formula !== 'null') {
                var label = data.datasets[ix - 1].label;
                var errmess = ch_utils.buildMessage(24, ix, label, X[0]+'='+
                    ch_utils.userTime(X[0]));

                try {
                    /*jshint evil: true */
                    x = eval(formula);
                    /*jshint evil: false */

                    if (typeof x === 'undefined') {
                        console.log(ch_utils.buildMessage(24, ix, label, 
                            ch_utils.userTime(X[0])));
                        console.log(ch_utils.buildMessage(25));
                        console.log('formula = "' + formula + '"');
                        console.log('Xprev', Xprev);
                        console.log('X', X);
                        console.log('g', g);
                        console.log('result = ' + x);
                        setErrormessage(ix, '4 ' + errmess+'\n'+
                            ch_utils.buildMessage(39), data.datasets[ix - 1]);
                    } else
                    if (typeof x === 'number' && !isFinite(x)) {
                        console.log(ch_utils.buildMessage(24, ix, label, 
                            ch_utils.userTime(X[0])));
                        console.log(ch_utils.buildMessage(25));
                        console.log('formula = "' + formula + '"');
                        console.log('Xprev', Xprev);
                        console.log('X', X);
                        console.log('g', g);
                        console.log('result = ' + x);
                        setErrormessage(ix, '3 ' + errmess+'\n'+
                            ch_utils.buildMessage(39), data.datasets[ix - 1]);
                    } else
                    if (typeof x !== 'string' && x !== null && isNaN(x)) {
                        if (label.indexOf(ch_utils.buildMessage(34)) < 0) {
                            console.log(ch_utils.buildMessage(25));
                            console.log('formula = "' + formula + '"');
                            console.log('Xprev', Xprev);
                            console.log('X', X);
                            console.log('g', g);
                            console.log('result = ' + x);
                            setErrormessage(ix, '1 ' + errmess, 
                                data.datasets[ix - 1]);
                        }
                        x = null;
                    }
                    x = x === undefined ? null : x;
                } catch (err) {
                    if (label.indexOf(ch_utils.buildMessage(34)) < 0) {
                        console.log(ch_utils.buildMessage(24, ix, label, 
                            ch_utils.userTime(X[0])));
                        console.log(ch_utils.buildMessage(25));
                        console.log('formula = "' + formula + '"');
                        console.log(Xprev);
                        console.log(X);
                        console.log(g);
                        setErrormessage(ix, '2 ' + errmess+'\n'+err.message, 
                            data.datasets[ix - 1]);
                    }
                    x = null;
                } //catch
            } //formula
            //console.log('x='+x);

            //b convert on/off
            //----------------
            if (vLog.chartHeader.convertOnOff) {
                if (x === 'on')  {x = 1;}
                if (x === 'off') {x = 0;}
            }

            //b store data for to build the scales
            //------------------------------------
            x = store_maxValues(x, ix_store, ix, data, ip, X[0], X);

            //b if text value
            //---------------
            if (typeof x === 'string') {
                //b add new, not defined text labels
                //----------------------------------
                if (y3Labels.indexOf(x) < 0) {
                    y3Labels.unshift(x);
                    y3reduceUnusedTicks = false;
                    y3LabelsMaxWidth = Math.max(y3LabelsMaxWidth, x);
                }
                y3LabelsUsed[x] = 'used';
            }

            //b store sensor value and tooltip to data.datasets
            //-------------------------------------------------
            data.datasets[ix_store - 1].data.push(x);
            data.datasets[ix_store - 1].tooltips.push(TOOLTIPs[ix]);

            //b store computed x value to g.vi
            //--------------------------------
            g['v' + ix] = x;
        } //else if sensor value
    } //setDatasetValues

    function formatColor(strColor) {
        //console.log('formatColor');
        strColor = strColor.toLowerCase();
        if (!strColor || strColor === 'white') {
            return NOFILL;
        }
        //convert to hex string
        if (strColor.charAt(0) !== '#') {
            var col = w3color(strColor);
            if (!col.valid) {
                alert(strColor + ' is not a valid color!');
                return NOFILL;
            }
            strColor = w3color(strColor).toHexString();
        }
        if (strColor === '#ffffff') {
            return NOFILL;
        }

        //set transparent
        if (strColor.charAt(0) === '#') {
            if (strColor.length === 4 || strColor.length === 5) {
                strColor = strColor.charAt(0) +
                    strColor.charAt(1) +
                    strColor.charAt(1) +
                    strColor.charAt(2) +
                    strColor.charAt(2) +
                    strColor.charAt(3) +
                    strColor.charAt(3);
            } else
            if (strColor.length === 6) {
                strColor = strColor.charAt(0) +
                    strColor.charAt(1) +
                    strColor.charAt(2) +
                    strColor.charAt(3) +
                    strColor.charAt(4) +
                    '0' +
                    strColor.charAt(5);
            }
            if (strColor.length === 7) {
                return strColor + opacityHex;
            }
        }
        return strColor;
    } // formatColor

    function initialInterval2msec(iv) {
        if (iv) {
            var initialIntervalMSEC;
            switch (iv) {
                case 'hour':
                    initialIntervalMSEC = 1000 * 60 * 60;
                    break;
                case 'day':
                    initialIntervalMSEC = 1000 * 60 * 60 * 24;
                    break;
                case '2days':
                    initialIntervalMSEC = 1000 * 60 * 60 * 24 * 2;
                    break;
                case 'week':
                    initialIntervalMSEC = 1000 * 60 * 60 * 24 * 7;
                    break;
                case '2weeks':
                    initialIntervalMSEC = 1000 * 60 * 60 * 24 * 7 * 2;
                    break;
                case 'month':
                    var d = new Date();
                    var now = d.getTime();          
                    d.setMonth(d.getMonth()-1);
                    var then = d.getTime();          
                    initialIntervalMSEC = now - then;
                    break;
            }
            return initialIntervalMSEC;
        }
    } // initialInterval2msec

    function drawLogsChart(request_mode, from, to) {
        //console.log('drawLogsChart');
       
        //for night coloring
        if (request_mode === 'REQUEST_INTERVAL') {
            displayStart = from;
            displayEnd = to;
        }

        errorMessage = undefined;
        var varCanvasEl = document.getElementById("canvas");
        varCanvasEl.style.display = "inherit";

        //ch_utils.displayMessage(11, chartIdDisp);
        //localisation
        var langChart = vLog.chartHeader.chartLanguage;
        if (langChart && langChart !== 'system' && langChart !== lang) {
            lang = langChart;
            ch_utils.lang = langChart;
        }
        langTexts();
        moment.locale(lang);

        var lengthChartValues = vLog.chartValues.length;

        //prepare data for chart
        var titleTextOldSave = config.options.plugins.title.text;
        config.options.plugins.title.text = vLog.chartHeader.chartTitle;
        if (titleTextOldSave !== config.options.plugins.title.text) {
            console.log(config.options.plugins.title.text);
        }

        if (!isModal) {
            document.title = config.options.plugins.title.text;
        }
        ch_utils.displayMessage(1, lengthChartValues,
            (completeValuesReceived ? '* ' : '') +
            ch_utils.userTime(startTime),
            ch_utils.userTime(endTime),
            db_count);
        ch_utils.displayMessage2(7, ch_utils.userTime('now'));

        // set initial displayed time period
        if (initialIntervalMSEC && !isZoomed) {
            var min = startTime; // * 1000;
            var max = endTime; // * 1000;
            min = max - initialIntervalMSEC;
            config.options.scales.x.min = min;
        }
        if (!currentIntervalMSEC) {
            currentIntervalMSEC = endTime - startTime;
            //console.log('!!!!!!!!!!! currentIntervalMSEC='+currentIntervalMSEC);
        }

        if (request_mode === 'REQUEST_INTERVAL') {
            config.options.scales.x.min = from;
            config.options.scales.x.max = to;
        }

        if (request_mode === 'REQUEST_FIRST') {
/*            
            //draw chart
            var ctx = document.getElementById('canvas').getContext('2d');
            window.myLine = new Chart(ctx, config);
            busyi.hide();
            console.log('chart displayed: ' + (Date.now() - startRun) / 1000 + 
                ' sec');
*/
            //show buttons cause we now have a chart
            ch_utils.buttonText('dataJSON', 2);

            //date time picker:
            ch_utils.buttonText('dtpickButton', 3);
            ch_utils.buttonText('dtpick_title', 18);
            ch_utils.buttonText('dtpick_date_start', 19);
            ch_utils.buttonText('dtpick_date_end', 20);
            ch_utils.buttonText('dtpick_length', 21);
            ch_utils.buttonText('dtpick_exec', 22);
            ch_utils.buttonText('dtpick_break', 23);

            ch_utils.buttonVisible('recoverData', true);
            ch_utils.buttonVisible('shiftLeftLong', true);
            ch_utils.buttonVisible('shiftLeft', true);
            ch_utils.buttonVisible('shiftRight', true);
            ch_utils.buttonVisible('shiftRightLong', true);
            ch_utils.buttonVisible('showComplete', true);
            ch_utils.buttonVisible('chartIndex', true);
            if (!isFrame && !isModal && !isMobile && displaySettings.main_width) {
                ch_utils.buttonVisible('expand', true);
            } else {
                ch_utils.buttonVisible('expand', false);
            }
            if (isAdmin) {
                ch_utils.buttonVisible('textShowIx', true);
                //ch_utils.buttonVisible('adHocCalcButton', true);
            } else {
                ch_utils.buttonVisible('textShowIx', false);
                showShowIx = false;
                //ch_utils.buttonVisible('adHocCalcButton', false);
            }
            if (isModal) {
                ch_utils.buttonVisible('textShowIx', false);
                ch_utils.buttonVisible('showIxCheckbox', false);
                ch_utils.buttonVisible('configuration', false);
                ch_utils.buttonVisible('dtpickButton', false);
                ch_utils.buttonVisible('newTab', true);
                ch_utils.buttonVisible('snapshot', false);
                ch_utils.buttonVisible('adHocCalcButton', false);
            }
            if (!isModal) {
                ch_utils.buttonVisible('dtpickButton', true);
                ch_utils.buttonVisible('dataJSON', true);
                //if (snapshots_possible && (snapshotAdmin === false || isAdmin)) {
                //    ch_utils.buttonVisible('snapshot', true);
                //}
            }
            ch_utils.buttonVisible('textTooltip', true);
            ch_utils.buttonVisible('textRefresh', true);
            ch_utils.buttonVisible('postcalcModal', false);
            ch_utils.buttonVisible('dtpickModal', false);
            ch_utils.buttonVisible('adHocCalcModal', false);

            //draw chart
            var ctx = document.getElementById('canvas').getContext('2d');
            window.myLine = new Chart(ctx, config);

            //add night backgrounds
            if (vLog.chartHeader.nightBackground) {
                nightTimes.annotations(3);
            }

            //execute post processing
            if (post_processing) {
                postprocess(3);
            }

            if (vLog.chartHeader.nightBackground ||
                post_processing) {
                g.redraw(3);
            }

            //drawing ready
            busyi.hide();
            console.log('chart displayed: ' + (Date.now() - startRun) / 1000 + 
                ' sec');
        } //REQUEST_FIRST
        else {
            //update chart
            window.myLine.update();

            //add night backgrounds
            if (vLog.chartHeader.nightBackground) {
                nightTimes.annotations(4);
            }

            //execute post processing
            if (post_processing) {
                postprocess(4);
            }

            if (vLog.chartHeader.nightBackground ||
                post_processing) {
                g.redraw(4);
            }
            
            busyi.hide();
            console.log('chart updated: ' + (Date.now() - startRun) / 1000 + 
                ' sec');
        }

        ch_utils.displayMessageDiv('notif3', 4);
        if (errorMessage) {
            alert(errorMessage);
        }

        display_startTime();
    } //drawLogsChart

    function toString(text) {
        if (text === undefined) {
            return ' ';
        }
        if (text === null) {
            return 'null';
        }
        if (typeof text === 'string') {
            return text;
        }
        return text.toString();
    }

    function buildErrorHTML(errTextNo) {
        console.log(errTextNo);
        ch_utils.buttonText('dataJSON', 2);
        ch_utils.buttonText('chartIndex', 13);
        ch_utils.buttonText('configuration', 1);

        var htmlText = '<center><b>';
        htmlText += '<em>' + vLog.chartHeader.chartTitle + '</em>';
        htmlText += '<br><br>';
        htmlText += ch_utils.buildMessage(16 + errTextNo);
        htmlText += '</b><br><br></center>';
        var o = ch_utils.buildMessage(14);
        var n = ch_utils.buildMessage(15);
        var t = ch_utils.buildMessage(23);
        var devTitles, devOld, devNew, devDiff;
        var chartDevTitles = vLog.chartHeader.chartDevTitles;
        var chartDevicesOld = vLog.chartHeader.chartDevices;
        var chartDevicesNew = vLog.chartHeader.chartDevicesNew;
        htmlText += '<table><tbody><tr><th>' + t + '</th><th>' + o + 
            '</th><th>' + n + '</th></tr>';
        for (var i = 1; i < Math.max(chartDevicesOld.length, 
            chartDevicesNew.length); i++) {
            devTitles = chartDevTitles[i] ||
                vLog.chartHeader.chartLabels[i] || '';
            devOld = toString(chartDevicesOld[i]);
            devNew = toString(chartDevicesNew[i]);
            htmlText += '<tr><td>' + devTitles + '</td><td>';
            devDiff = devOld !== devNew;
            htmlText += devOld + '</td><td>';
            if (devDiff) {
                htmlText += '<font color="red"><b>';
            }
            htmlText += devNew;
            if (devDiff) {
                htmlText += '</b></font>';
            }
            htmlText += '</td></tr>';
        }
        htmlText += '</tbody></table><br><br>';

        if (!isModal) {
            document.title = vLog.chartHeader.chartTitle;
        }
        //ch_utils.displayMessage(0, vLog.chartHeader.chartTitle+' ('+
        //chartIdDisp+')');
        ch_utils.displayMessage(0, ''); //empty notification line
        var varCanvasEl = document.getElementById("canvas");
        varCanvasEl.style.display = "none";
        doRefresh = false;
        showRefresh = false;
        showTooltipBox = false;
        showShowIx = false;
        ch_utils.buttonVisible('dtpickButton', false);
        ch_utils.buttonVisible('recoverData', false);
        ch_utils.buttonVisible('shiftLeftLong', false);
        ch_utils.buttonVisible('shiftLeft', false);
        ch_utils.buttonVisible('shiftrRight', false);
        ch_utils.buttonVisible('shiftrRightLong', false);
        ch_utils.buttonVisible('showComplete', false);
        ch_utils.buttonVisible('newTab', false);
        ch_utils.buttonVisible('dataJSON', true);
        ch_utils.buttonVisible('chartIndex', true);
        ch_utils.buttonVisible('textRefresh', false);
        ch_utils.buttonVisible('textTooltip', false);
        ch_utils.buttonVisible('textShowIx', false);
        ch_utils.buttonVisible('postcalcButton', false);
        ch_utils.buttonVisible('adHocCalcButton', false);
        ch_utils.buttonVisible('snapshot', false);
        ch_utils.buttonVisible('expand', false);

        document.getElementById('htmlText').innerHTML = htmlText;
    } //buildErrorHTML

    function drawIcons(chart) {
        function enumLabels(scaleObj) {
            if (!iconSize) {
                //all label texts have same length
                var charWidth = scaleObj._labelSizes.widest.width /
                    scaleObj._labelItems[0].label.length;
                iconSize = Math.min(charWidth * y3IconsWidth,
                    scaleObj._labelSizes.widest.width);
            }

            scaleObj._labelItems.forEach(function(labelItem, ix) {
                if (y3IconsRender[ix] && y3IconsRender[ix] !== ' ') {
                    var k = scaleObj.id + '_' + ix;

                    var x = labelItem.translation[0];
                    if (scaleObj.position === 'left') {
                        x -= iconSize;
                    }
                    var y = labelItem.translation[1] - iconSize / 2;

                    if (y3IconsCache.hasOwnProperty(k)) {
                        changeIconPosition(k, x, y, iconSize);
                        y3IconsVisible[k] = true;
                    } else {
                        setNewIcon(k, x, y, iconSize, y3IconsRender[ix]);
                    }
                }
            });
        } //enumLabels

        function setNewIcon(k, x, y, iconSize, y3Icon) {
            //console.log('y3Icon', y3Icon);
            var entry = [new Image(), x, y, iconSize];
            entry[0].src = y3Icon;

            //wait till image loaded
            entry[0].onload = function() {
                ctx.drawImage(entry[0], x, y, iconSize, iconSize);
                y3IconsCache[k] = entry;
                y3IconsVisible[k] = true;
            };
            entry[0].onerror = function() {
                if (y3Icon !== y3IconsDefault) {
                    entry[0].src = y3IconsDefault;
                    alert(ch_utils.buildMessage(30, y3Icon));
                }
            };
        } //setNewIcon

        function changeIconPosition(k, x, y, iconSize) {
            var entry = y3IconsCache[k];
            entry[1] = x;
            entry[2] = y;
            ctx.drawImage(entry[0], x, y, iconSize, iconSize);
        } //changeIconPosition

        var ctx = chart.ctx;
        if (chartAreaBottomLast === chart.chartArea.bottom) {
            //chartArea not changed, we can just redraw
            Object.keys(y3IconsVisible).forEach(function(k) {
                var entry = y3IconsCache[k];
                ctx.drawImage(entry[0], entry[1], entry[2], entry[3], entry[3]);
            });
            return;
        }
        y3IconsVisible = {};

        //enum scales
        Object.keys(chart.scales).forEach(function(scaleKey) {
            var scaleObj = chart.scales[scaleKey];
            if (scaleObj.type === 'category' && scaleObj._ticksLength > 0 &&
                scaleObj.axis === 'y') {
                enumLabels(scaleObj);
            }
        });

        chartAreaBottomLast = chart.chartArea.bottom;
        drawIconsTimer = undefined;
    } //drawIcons

    //for category icons

    function addIconPath(icon) {
        //no icon
        if (!icon || icon.indexOf('.png') === 0) {
            return urlIcons + 'placeholder.png';
        }
        //png + no path or relative to htdocs
        if (icon.indexOf('.png') > 0 &&
            (icon.indexOf('/') < 0 ||
            icon.indexOf('./') === 0)) {
            //add default path
            if (imagesPathDefault) {
                icon = imagesPathDefault + icon;
            }
        }
        //htdocs relative path
        if (icon.indexOf('./') === 0) {
            return modulemedia + icon;
        }
        //complete path
        if (icon.indexOf('/') >= 0) {
            return icon;
        }
        //htdocs
        if (icon.indexOf('.png') > 0) {
            return modulemedia + icon;
        }
        return urlIcons + icon + '.png';
    } //addIconPath

    function closeToolTip(myChart) { //window.myLine
        var mouseOutEvent = new MouseEvent('mouseout');
        return myChart.canvas.dispatchEvent(mouseOutEvent);
    }

    //------------- event listeners -----------------------------------------------

    //https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
    // Set the name of the hidden property and the change event for visibility
    var hidden, visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 
                                                  // and later support 
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

    var el = document.getElementById("refreshCheckbox");
    if (el) {
        document.getElementById('refreshCheckbox').onchange = toggleDoRefresh;
    }
    el = document.getElementById("tooltipCheckbox");
    if (el) {
        document.getElementById('tooltipCheckbox').onchange = toggleTooltipBox;
    }
    el = document.getElementById("showIxCheckbox");
    if (el) {
        document.getElementById('showIxCheckbox').onchange = toggleShowIx;
    }

    function config_datepicker_numeric(element, first, last, leading_zero, curr) {
        var i, j, opt_value;
        el = document.getElementById(element);
        if (el.options.length > 0) {
            return;
        }
        j = 0;
        for (i = first; i < (last + 1); i++) {
            if (leading_zero && i < 10) {
                opt_value = '0' + i;
            } else {
                opt_value = '' + i;
            }
            el.options[j++] = new Option(opt_value, opt_value);
        }
        if (curr !== undefined) {
            if (leading_zero && curr < 10) {
                curr = '0' + curr;
            }
            el.value = curr;
        } else {
            el.selectedIndex = 0;
        }
    } //config_datepicker_numeric

    function config_datepicker_list(element, list, initValue) {
        var el = document.getElementById(element);
        if (el.options.length > 0) {
            return;
        }
        var listArray = list.split(',');
        for (var i = 0; i < listArray.length; i++) {
            el.options[i] = new Option(listArray[i], i);
        }
        el.selectedIndex = initValue;
    } //config_datepicker_list

    function config_datepicker() {
        //start time
        var monthStart = new Date(ts_first).getMonth() + 1;
        config_datepicker_numeric("dtpick_month_start", 1, 12, true, monthStart);
        var dayStart = new Date(ts_first).getDate();
        config_datepicker_numeric("dtpick_day_start", 1, 31, true, dayStart);
        config_datepicker_numeric("dtpick_hour_start", 0, 23, true);
        config_datepicker_numeric("dtpick_minute_start", 0, 59, true);
        config_datepicker_numeric("dtpick_intervallength", 1, 20, false);

        var yearStart = new Date(ts_first).getFullYear();
        var yearEnd = new Date().getFullYear();
        config_datepicker_numeric("dtpick_year_start", yearStart, yearEnd, false);

        //end time
        var monthEnd = new Date().getMonth() + 1;
        var dayEnd = new Date().getDate();
        config_datepicker_numeric("dtpick_month_end", 1, 12, true, monthEnd);
        config_datepicker_numeric("dtpick_day_end", 1, 31, true, dayEnd);
        config_datepicker_numeric("dtpick_hour_end", 0, 23, true, 23);
        config_datepicker_numeric("dtpick_minute_end", 0, 59, true, 59);
        config_datepicker_numeric("dtpick_intervallength", 1, 20, false);
        config_datepicker_numeric("dtpick_year_end", yearStart, yearEnd, true, yearEnd);

        //interval
        var list = ch_utils.buildMessage(ixButtonTextBase + 7);
        config_datepicker_list("dtpick_intervaltype", list, 2);
        ch_utils.buttonVisible("dtpick_table_interval", true);

        if (db_count === 0) {
            ch_utils.displayMessageDiv('dtpick_count_text', 36);
        } else {
            ch_utils.displayMessageDiv('dtpick_count_text', 35, db_count,
                ch_utils.userTime(ts_first).slice(0, 16));
        }
    } //config_datepicker

    function dtpicker_toggle_visibility(event, target_state) {
        if (ch_utils.isVisible('dtpickModal')) {
            ch_utils.buttonVisible('dtpickModal', false);
        } else {
            ch_utils.buttonVisible('dtpickModal', true);
            config_datepicker();
         }
    } //dtpicker_toggle_visibility

    document.getElementById('dtpickButton').onclick = function(event) {
        dtpicker_toggle_visibility(event, "visible");
    }; //dtpickButton

    document.getElementById('dtpick_break').onclick = function(event) {
        dtpicker_toggle_visibility(event);
    }; //dtpick_break

    function hide_postcalcModal(event) {
        var buttonEvent = ch_utils.buttonIdEvent(event);
        if (['postcalcModal', 'postcalcContents', 'noIntervalRadio', 'noIntervalRadio'].indexOf(buttonEvent) >= 0) {
            return;
        }
        ch_utils.buttonVisible('postcalcModal', false);
    } //hide_postcalcModal

    function hide_dtpickModal(event) {
        var el = event.target;
        var elId = el.id;
        if (elId && elId.indexOf('dtpick_') === 0) {
            return;
        }
        if (elId && elId.indexOf('dtpickButton') === 0) {
            return;
        }

        while (!elId) {
            el = el.parentElement;
            if (el === null) {
                ch_utils.buttonVisible('dtpick_', false);
                return;
            }
            elId = el.id;
        }

        if (elId.indexOf('dtpick_') === 0) {
            return;
        }
        ch_utils.buttonVisible('dtpickModal', false);
    } //hide_dtpickModal

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        var buttonEvent = ch_utils.buttonIdEvent(event);
        var parentEvent = event.target.parentNode.id;
       
        if (buttonEvent !== 'dtpickButton' && 
            ch_utils.isVisible('dtpickModal')) {
            hide_dtpickModal(event);
        }
        if (buttonEvent !== 'postcalcButton' && 
            ch_utils.isVisible('postcalcModal')) {
            hide_postcalcModal(event);
        }
        if (buttonEvent.indexOf('adHocCalc') !== 0 &&
            parentEvent.indexOf('adHocCalc') !== 0) {
            if (ch_utils.isVisible('adHocCalcModal')) {
                ch_utils.buttonVisible('adHocCalcModal', false);
            }
        }
    }; //window.onclick

    function dateToTimestamp(newDateTime) {
        var ts = NaN;
        while (isNaN(ts)) {
            ts = new Date(newDateTime).getTime();
            if (!isNaN(ts)) {
                return ts;
            }
            newDateTime = newDateTime.replace('-29 ', '-28 ');
            newDateTime = newDateTime.replace('-30 ', '-29 ');
            newDateTime = newDateTime.replace('-31 ', '-30 ');
        }
    } //dateToTimestamp

    document.getElementById('dtpick_exec').onclick = function(event) {
        dtpicker_toggle_visibility(event);

        //start
        var year_value = document.getElementById('dtpick_year_start').value;
        var month_value = document.getElementById('dtpick_month_start').value;
        var day_value = document.getElementById('dtpick_day_start').value;
        var hour_value = document.getElementById('dtpick_hour_start').value;
        var minute_value = document.getElementById('dtpick_minute_start').value;
        var newDateTime = year_value + '-' + month_value + '-' + day_value + 
            ' ' + hour_value + ':' + minute_value + ':00';
        var newStart = dateToTimestamp(newDateTime);

        var el = document.getElementById("dtpick_nointerval");
        var newEnd;
        if (el.checked) {
            //end
            year_value = document.getElementById('dtpick_year_end').value;
            month_value = document.getElementById('dtpick_month_end').value;
            day_value = document.getElementById('dtpick_day_end').value;
            hour_value = document.getElementById('dtpick_hour_end').value;
            minute_value = document.getElementById('dtpick_minute_end').value;
            newDateTime = year_value + '-' + month_value + '-' + day_value + 
            ' ' + hour_value + ':' + minute_value + ':00';
            newEnd = dateToTimestamp(newDateTime);

        } else {
            //interval
            var length_value = document.getElementById('dtpick_intervallength').value-0;
            var type_value = document.getElementById('dtpick_intervaltype').value-0;
            var type_length = [60,3600,86400,604800,2592000,31536000][type_value];  //in secs
            var newLength = length_value * type_length * 1000;
            newEnd = newStart + newLength;
    
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
        }

        var radio_values_hist = true;
        if (radio_values_hist) {
            ch_utils.buttonVisible("taskbar", false);
            ch_utils.buttonVisible("textRefresh", false);
            ch_utils.buttonVisible("refreshCheckbox", false);
            requestInterval(newStart, newEnd);
        }
    }; //dtpick_exec

    document.getElementById('recoverData').onclick = function(event) {
        if (isZoomed) {
            //------------------- set night background -------------------------------
            //workaround for incompatibility of annotation plugin with
            //chart.js/ zoom plugin
            var start = vLog.chartValues[0][0];
            var stop = ts_last; //reset max limit of night array
            var first = vLog.chartValues[0][0];
            var lengthChartValues = vLog.chartValues.length;
            var last = vLog.chartValues[lengthChartValues-1][0];

            startRun = Date.now();
            isZoomed = false;
            window.myLine.resetZoom();
            console.log('update time resetZoom: ' + (Date.now() - startRun) / 
                1000 + ' sec');
            currentIntervalMSEC = initialIntervalMSEC || (endTime - startTime);
            //console.log('!!!!!!!!!!! currentIntervalMSEC='+currentIntervalMSEC);

            //add night backgrounds
            if (vLog.chartHeader.nightBackground) {
                nightTimes.annotations(5);
            }

            //execute post processing
            if (post_processing) {
                postprocess(5);
            }

            if (vLog.chartHeader.nightBackground ||
                post_processing) {
                g.redraw(5);
            }

            displayStart = undefined;
            displayEnd = undefined;
            start = undefined;
            stop = undefined;

            display_startTime();
        }
    }; //recoverData

    function display_startTime() {
        //display user timestamp
        var timeRange = header_utils.xRange();
        ch_utils.buttonText('interval_start', 5, 
            ch_utils.userTime(timeRange.min));
        ch_utils.buttonText('interval_end', 5, ch_utils.userTime(timeRange.max));
    } //display_startTime

    document.getElementById('shiftLeft').onclick = function(event) {
        shiftleft(0.5);
    }; //shiftLeft

    document.getElementById('shiftLeftLong').onclick = function(event) {
        shiftleft(1);
    }; //shiftLeftLong

    document.getElementById('shiftRight').onclick = function(event) {
        shiftRight(0.5);
    }; //shiftRight

    document.getElementById('shiftRightLong').onclick = function(event) {
        shiftRight(1);
    }; //shiftRightLong

    function shiftleft(length) {
        var timeRange = header_utils.xRange();
        timeRange.len = currentIntervalMSEC;
        var xMin_target = Math.round(timeRange.min - Math.round(timeRange.len * 
            length));
        var xMax_target = xMin_target + timeRange.len;
        if (completeValuesReceived && xMax_target <= startTime) {
            return;
        } else
        if (completeValuesReceived) {
            startRun = Date.now();
            //xMin_target = Math.max(xMin_target, startTime);
            //xMax_target = xMin_target + timeRange.len;
            //xMax_target = Math.min(xMax_target, endTime);
            do_zoom(xMin_target, xMax_target);
        } else
        if (xMin_target >= startTime) {
            startRun = Date.now();
            //xMax_target = Math.min(xMax_target, endTime);
            do_zoom(xMin_target, xMax_target);
        } else {
            //console.log(timeRange.min+'='+ch_utils.userTime(timeRange.min)+
            //' timeRange.len='+timeRange.len);  
            requestPrevious(xMin_target, xMax_target);
        }
    } //shiftLeft

    function do_zoom(from, to) {
        console.log('do_zoom: from=' + ch_utils.userTime(from) + 
            ' to=' + ch_utils.userTime(to));
        //------------------- set night background -------------------------------
        var start = from;
        var stop = to;
        start = Math.min(start, vLog.chartValues[0][0]);
        var first = vLog.chartValues[0][0];
        var lengthChartValues = vLog.chartValues.length;
        var last = vLog.chartValues[lengthChartValues-1][0];
    
        isZoomed = true;
        window.myLine.zoomScale('x', {
            min: from,
            max: to
        }, 'none');

        //add night backgrounds
        if (vLog.chartHeader.nightBackground) {
            nightTimes.annotations(6);
        }

        //execute post processing
        if (post_processing) {
            postprocess(6);
        }

        if (vLog.chartHeader.nightBackground ||
            post_processing) {
            g.redraw(6);
        }

        displayStart = undefined;
        displayEnd = undefined;
        start = undefined;
        stop = undefined;

        console.log('update time do_zoom: ' + (Date.now() - startRun) / 1000 + 
            ' sec');
        busyi.hide();
        currentIntervalMSEC = to - from;
        //console.log('!!!!!!!!!!! currentIntervalMSEC='+currentIntervalMSEC);

        display_startTime();
    } //do_zoom

    function shiftRight(length) {
        var timeRange = header_utils.xRange();
        timeRange.len = currentIntervalMSEC;

        var xMax_target = Math.round(timeRange.max + Math.round(timeRange.len * 
            length));
        var xMin_target = xMax_target - timeRange.len;
        if (xMin_target < endTime) {
            startRun = Date.now();
            do_zoom(xMin_target, xMax_target);
        }
    } //shiftRight

    document.getElementById('showComplete').onclick = function(event) {
        startRun = Date.now();
        do_zoom(startTime, endTime);
    }; //showComplete

    function requestInterval(from, to) {
        //console.log('requestInterval: from='+from+' to='+to);
        console.log('requestInterval: from=' + ch_utils.userTime(from) + 
            ' to=' + ch_utils.userTime(to));

        //for night coloring
        displayStart = from;
        displayEnd = to;

        ch_utils.buttonVisible("refreshCheckbox", false);
        doRefresh = false;
        setRefreshInterval(doRefresh);
        startRun = Date.now();
        busyi.show();
        vLog = {};
        startTime = undefined;
        endTime = undefined;
        isZoomed = false;
        tsLastHeader = 0;
        tsLastValues = 0;
        main('REQUEST_INTERVAL', from, to);
    } //requestInterval

    function requestPrevious(from, to) {
        //console.log('requestPrevious: from='+from+' to='+to);
        console.log('requestPrevious: from=' + ch_utils.userTime(from) + 
            ' to=' + ch_utils.userTime(to));

        function success_complete(data) {
            completeValuesReceived = true;
            process_previous(data, from, to);
        } //success_complete
        function success_previous(data) {
            process_previous(data, from, to);
        } //success_previous
        function fail_previous(status, responseText) {
            if (from > 0 &&
                status === 404 &&
                ts_first > 0 &&
                ts_first < vLog.chartValues[0][0]) {
                console.log('fail_previous: ' + status + ' ' + responseText);
                console.log('first ts in db: ' + ts_first + 
                           ' first ts in buffer: ' + vLog.chartValues[0][0]);
                console.log('length=' + (to - from + 1));
                //display empty page:
                do_zoom(from, to);
            } else {
                process_fail_previous(status, responseText);
            }
        } //fail_previous

        startRun = Date.now();
        busyi.show();

        read_first_ts();
        count_chart_entries();
        //console.log('requesting previous data from '+from+'...');
        if (from > 0) {
            url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_range?from=' + (from - 1) + '&to=' + (startTime - 1);
            console.log('requestPrevious: from=' + ch_utils.userTime((from - 1)) +
            ' to=' + ch_utils.userTime((startTime - 1)));
            ch_utils.ajax_get(url, success_previous, 
                fail_previous, nodata_previous);
        } else {
            url = 'http://' + api + '/' + chartIdDB + '/' + chartIdBase + 
                '/select_range?from=' + from + '&to=' + (startTime - 1);
            console.log('requestPrevious: from=' + ch_utils.userTime((from - 1)) +
                ' to=' + ch_utils.userTime((startTime - 1)));
            ch_utils.ajax_get(url, success_complete, fail_previous, 
                nodata_previous);
        }
    } //requestPrevious

    function nodata_previous() {
        console.log('no previous data');
        completeValuesReceived = true;
        busyi.hide();
        ch_utils.displayMessage(1, vLog.chartValues.length,
            (completeValuesReceived ? '* ' : '') +
            ch_utils.userTime(startTime),
            ch_utils.userTime(endTime),
            db_count);
    } //nodata_previous

    function process_fail_previous(status, responseText) {
        busyi.hide();
        if (status === 404) {
            completeValuesReceived = true;
            ch_utils.displayMessage(1, vLog.chartValues.length,
                (completeValuesReceived ? '* ' : '') +
                ch_utils.userTime(startTime),
                ch_utils.userTime(endTime),
                db_count);
        } else {
            alert(responseText);
        }
    } //process_fail_previous

    function process_previous(data, from, to) {
        console.log('process_previous: from=' + ch_utils.userTime(from) + 
            ' to=' + ch_utils.userTime(to));
        console.log(data.length + ' values received: ' +
            ch_utils.userTime(data[0][0]) + ' ' +
            ch_utils.userTime(data[data.length - 1][0]));

        //for night coloring
        if (from > 0) {
            displayStart = from;
        } else {
            displayStart = undefined;
        }

        vLog.chartValues = data.concat(vLog.chartValues);
        tsLastValues = vLog.chartValues[vLog.chartValues.length - 1][0];
        step = 8;   //!!!!!!!!!!!!!!!
        program_control('REQUEST_UPDATE');
        do_zoom((from || startTime), (to || endTime));
    } //process_previous

    document.getElementById('newTab').onclick = function(event) {
        var url = './draw-chartjs.html';
        url = url + '?chartId=' + chartId + '&isAdmin=' + isAdmin;
        console.log(url);
        window.open(url);
    }; //newTab

    document.getElementById('dataJSON').onclick = function(event) {
        var url = './data-json.html';
        url = url + '?chartId=' + chartId + '&isAdmin=' + isAdmin;
        url += '&from=' + Math.ceil(header_utils.xRange().min) + '&to=' + 
            Math.floor(header_utils.xRange().max);
        console.log(url);
        window.open(url);
    }; //dataJSON

    document.getElementById('chartIndex').onclick = function(event) {
        var url = './index.html' + '?isAdmin=' + isAdmin;
        console.log(url);
        window.open(url);
    }; //chartIndex

    document.getElementById('expand').onclick = function(event) {
        var el_main = document.getElementById('main');
        var currWidth = el_main.style.width;
        if (currWidth === '100%') {
            ch_utils.buttonText('expand', 33);
            el_main.style.width = 
                correct_aspect('width', displaySettings.main_width);
        } else {
            ch_utils.buttonText('expand', 34);
            el_main.style.width = '100%';
        }
    }; //expand

    document.getElementById('configuration').onclick = function(event) {
        var url = '/smarthome/#/module/put/' + vLog.chartHeader.chartInstance;
        console.log(url);
        window.open(url);
    }; //configuration

    document.getElementById('snapshot').onclick = function(event) {
        var timeRange = header_utils.xRange();
        var url = './take-snapshot.html';
        url = url + '?chartId=' + chartId +
            '&ts_from=' + timeRange.min +
            '&ts_to=' + timeRange.max +
            '&isAdmin=' + isAdmin;
        console.log(url);
        window.open(url);
    }; //snapshot

    //------- auxiliary function definitions -------------------------

    function langTexts() {
        ch_utils.buttonText('dataJSON', 2);
        ch_utils.buttonText('newTab', 4);
        ch_utils.buttonText('chartIndex', 13);
        ch_utils.buttonText('configuration', 1);
        ch_utils.buttonText('snapshot', 31);
        ch_utils.buttonText('textRefresh', 8);
        ch_utils.buttonTitle('textRefresh', 9);
        ch_utils.buttonText('textTooltip', 16);
        ch_utils.buttonText('textShowIx', 17);
        ch_utils.buttonText('expand', 33);
        ch_utils.buttonText('showComplete', 36);
        ch_utils.buttonText('recoverData', 35);
        ch_utils.buttonText('adHocCalcButton', 37);

        ch_utils.buttonTitle('recoverData', 11);
        ch_utils.buttonTitle('shiftRightLong', 12);
        ch_utils.buttonTitle('shiftRight', 14);
        ch_utils.buttonTitle('shiftLeft', 15);
        ch_utils.buttonTitle('shiftLeftLong', 24);
        ch_utils.buttonTitle('showComplete', 25);
        ch_utils.buttonTitle('dtpickButton', 26);

        var el = document.getElementById("refreshCheckbox");
        el.checked = doRefresh;

        el = document.getElementById("tooltipCheckbox");
        el.checked = showTooltipBox;

        el = document.getElementById("showIxCheckbox");
        el.checked = showShowIx;
    } //langTexts

    function toggleDoRefresh() {
        var el = document.getElementById("refreshCheckbox");
        if (!el) {
            doRefresh = false;
        } else {
            doRefresh = el.checked;
            setRefreshInterval(showRefresh && doRefresh);
            if (doRefresh) {
                main('REQUEST_UPDATE');
            }
        }
        document.cookie = "doRefresh=" + doRefresh + ";SameSite=Strict";
    } //toggleDoRefresh

    function toggleTooltipBox() {
        //console.log(window.myLine.getInitialScaleBounds());
        var el = document.getElementById("tooltipCheckbox");
        if (!el) {
            showTooltipBox = false;
        } else {
            showTooltipBox = el.checked;
            window.myLine.update();
        }
        document.cookie = "showTooltipBox=" + showTooltipBox + ";SameSite=Strict";
    } //toggleTooltipBox

    function toggleShowIx() {
        //console.log(window.myLine.getInitialScaleBounds());
        var el = document.getElementById("showIxCheckbox");
        if (!el) {
            showShowIx = false;
        } else {
            showShowIx = el.checked;
        }
        document.cookie = "showShowIx=" + showShowIx + ";SameSite=Strict";
    } //toggleShowIx

    //------- auxiliary function definitions for refresh -------------

    function setRefreshInterval(set) {
        if (set) {
            //set interval
            if (!IntervalId) {
                IntervalId = setInterval(updateChart, 1 * 60 * 1000); 
                //once a minute
                //console.log('updateChart interval set');
            }
        } else {
            //remove interval
            if (IntervalId) {
                clearInterval(IntervalId);
                IntervalId = undefined;
                //console.log('updateChart interval removed');
            }
        }
    } //setRefreshInterval

    function updateChart() {
        if (!ch_utils.isPageHidden() && ch_utils.isVisible("refreshCheckbox")) {
            //console.log('1 REQUEST_UPDATE');
            main('REQUEST_UPDATE');
        }
    } //updateChart

    function handleVisibilityChange() {
        setRefreshInterval(!document[hidden] && showRefresh && doRefresh);
        //if (!document[hidden] && showRefresh && doRefresh || isAdmin) {
        if (!document[hidden] && showRefresh && doRefresh &&
            ch_utils.isVisible("refreshCheckbox")) {
            //console.log('2 REQUEST_UPDATE');
            main('REQUEST_UPDATE');
        }
    } //handleVisibilityChange

    //---------------------------------------------------------------------
    // call postcalc modal window
    //---------------------------------------------------------------------
    document.getElementById('postcalcButton').onclick = function(event) {
        if (ch_utils.isVisible('postcalcModal')) {
            hide_postcalcModal(event);
        } else {
            postcalc.post_calc_exec(vLog.chartHeader.post_calc);
        }
    }; //onclick postcalcButton

    //---------------------------------------------------------------------
    // Treatment of special keys
    //---------------------------------------------------------------------
    document.addEventListener("keydown", function(event) {
         // Escape: close all modal windows
         if (event.key === 'Escape') {
            ch_utils.buttonVisible('postcalcModal', false);
            ch_utils.buttonVisible('dtpickModal', false);
            ch_utils.buttonVisible('adHocCalcModal', false);
        } else
         // Enter(Return): call adHocCalc.Execute()
        if (event.key === 'Enter') {
            if (ch_utils.isVisible('adHocCalcModal')) {
                adHocCalc.Execute();
            }
        }
    }); //keydown Escape
}); //DOMContentLoaded

