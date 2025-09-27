
//h-------------------------------------------------------------------------------
//h
//h Name:         draw-chartjs_utils.js
//h Type:         Javascript module
//h Purpose:      utilities for MxChartDB draw-chartjs
//h Project:      ZWay MxChartDB
//h Usage:
//h Remark:
//h Result:
//h Examples:
//h Outline:
//h Resources:
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V3.4.1 2025-09-23/peb
//v History:      V1.0.0 2024-12-16/peb first version
//v               V3.1.2 2025-01-26/peb [+]post calc enhanced
//v               V3.4.0 2025-08-14/peb [+]annotation
//v               V3.4.1 2025-08-14/peb [x]MxC bugfix
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 6 */
/*globals ch_utils, suntimes, SunCalc, config, data, ts_last, imagesDefaultPath */
'use strict';

//b version data
//--------------
var MODULE='chartjs_utils.js';
var VERSION='V3.4.1';
var WRITTEN='2025-09-23/peb';

//b common: common functions
//--------------------------
var common = {
    concatObjects: function(targetObj, newObj) {
        //console.log('concatObjects');
        for (var key in newObj) {
            if (newObj.hasOwnProperty(key)) {
                //console.log('key='+key);
                //console.log('item='+newObj[key]);
                targetObj[key] = newObj[key];
            }
        }
    } //concatObjects
}; //common,

//b MxC_utils: MxC functions
//--------------------------------
var MxC_input = {};
var MxC_utils = {
    //h
    //h test_MxC_used
    //h test whether MxC(param1 [, param2]) function is used anywhere:
    //h true|false = test_MxC_used(header);
    //-------------------------------------------------------------------------
    test_MxC_used: function (header, api) {
        var match = JSON.stringify(header).match(/MxC\s*\([^\),]*,?[^\),]*\)/);
        if (!match) {
            match = JSON.stringify(header).match(/MxC_horizontals\s*\([^\),]*,?[^\),]*\)/);
        }
        if (match) {
            return true;
        } else {
            return false;
        }
    }, // test_MxC_used

    //h
    //h MxC
    //h returns the constant value:
    //h value = MxC_utils.MxC(MxC_name, ts);
    //-------------------------------------------------------------------------
    MxC: function(MxC_name, ts) {
        function return_value(MxC_entry) {
            var value = MxC_entry[4];
            var type = MxC_entry[5];
            //alert(value);
            if (type === 'string') {return value;}
            if (type === 'number') {
                ret = value-0;
                if (Number.isNaN(ret)) {
                    alert('MxC: wrong value/type '+ value + '/'+type+
                        ' for ' + MxC_name +'(NaN)');
                }
                return ret;
            }
            alert('MxC: unknown value type '+type+ ' for ' + MxC_name);
            return null;
        }

        if (!MxC_name) {return null;}
        if (!MxC_input[MxC_name]) {
            alert('MxC: unknown constant ' + MxC_name);
            console.log('MxC: unknown constant ' + MxC_name);
            console.log(JSON.stringify(MxC_input));
            return null;
        }

        //real copy, cause otherwise reverse doesn't work:
        var MxC_name_data = JSON.parse(JSON.stringify(MxC_input[MxC_name]));
        var len = MxC_name_data.length;
        if (len === 0) {return null;}

        //if previous MxC version 1.0.0
        var i;
        if (MxC_name_data[0].length === 5) {
            var ix_found, ret;
            if (ts === undefined) {
                ix_found = 0;
            } else {
                MxC_name_data.reverse(function(a,b) {    //sort:    -fist nulls
                    return a[0]-b[0];               //         - then others up
                                                    //reverse: -first others down
                                                    //         - then nulls
                });
    
                for (i = 0; i < MxC_name_data.length; i++) {
                    if (MxC_name_data[i][0] > 0 &&
                        ts >= MxC_name_data[i][0]) {
                        ix_found = i;
                        break;
                    } else
                    if (MxC_name_data[i][0] === null) {
                        ix_found = i;
                        break;
                    }
                }
            }
            if (ix_found === undefined) {return null;}
            var value = MxC_name_data[ix_found][2];
            if (value === 'null') {return null;}
            var type = MxC_name_data[ix_found][3];
            if (type === 'string') {return value;}
            if (type === 'number') {
                ret = value-0;
                if (Number.isNaN(ret)) {
                    alert('MxC: wrong value/type '+ value + '/'+type+
                        ' for ' + MxC_name +'(NaN)');
                }
                return ret;
            }
            alert('MxC: unknown value type '+type+ ' for ' + MxC_name);
            return null;
        }  //1.0.0
        //else if MxC version 1.1.0
        else {
            //order according timestamp
            MxC_name_data.reverse(function(a,b) {//sort:    -fist nulls
                return a[0]-b[0];                //         - then others up
                                                 //reverse: -first others down
                                                 //         - then nulls
            });
            //if no timestamp required
            len = MxC_name_data.length;
            if (ts === undefined) {
                //return last value
                return return_value(MxC_name_data[len - 1]);
            } else {
                for (i = 0; i < MxC_name_data.length; i++) {
                    if (MxC_name_data[i][0] > 0 &&
                        ts >= MxC_name_data[i][0] &&
                        (MxC_name_data[i][2] === null ||
                            ts < MxC_name_data[i][2])) {
                        return return_value(MxC_name_data[i]);
                    } else
                    if (MxC_name_data[i][0] === null) {
                        return return_value(MxC_name_data[i]);
                    }
                }
            }
        } //1.1.0
    }, //MxC

    //h
    //h MxC_data
    //h returns the complete arry for the given constant name:
    //h entry array| [] = MxC_utils.MxC_data(MxC_name);
    //-------------------------------------------------------------------------
    MxC_data: function(MxC_name) {
        console.log('MxC_data('+MxC_name+')');
        console.log(MxC_input);
        return MxC_input[MxC_name] || [];
    }, //MxC_data
}; //MxC_utils,

//b header_utils: header functions
//--------------------------------
var header_utils = {
    //h
    //h take_global_code
    //h builds up the global object g with user defined code
    //h g = take_global_code(<target object>, <chart header>);
    //-------------------------------------------------------------------------
    take_global_code: function (header) {
        console.log('take_global_code');

        var g_ini = {
            notSet:   ch_utils.notSet,
            noNumber: ch_utils.noNumber,
            notChanged: ch_utils.notChanged,
            isChanged: ch_utils.isChanged,
            userTime: ch_utils.userTime,
            usertime: ch_utils.userTime,
            round:    ch_utils.round,
            nvl:      ch_utils.nvl,
            isVisible: function(x) {
                var timeRange = header_utils.xRange();
                var ts_first_disp = Math.floor(timeRange.min),
                    ts_last_disp = Math.ceil(timeRange.max);
                if ( x >= ts_first_disp && x <= ts_last_disp) {
                    return true;
                } else {
                    return false;
                }
            },
            isNight: nightTimes.isNight,
            sunrise: nightTimes.sunrise,
            sunset: nightTimes.sunset,
            azimuth: suncalc.azimuth,
            altitude: suncalc.altitude,
            ts_last_db: function() {return ts_last;},
            annotation: annotation,
            FILTER: postcalc.FILTER,
            SUM: postcalc.SUM,
            MAX: postcalc.MAX,
            MIN: postcalc.MIN,
            AVG: postcalc.AVG,
            COUNT: postcalc.COUNT,
            FIRST: postcalc.FIRST,
            LAST: postcalc.LAST,
            firstTick: yScales.firstTick,
            lastTick: yScales.lastTick,
            yMin: yScales.yMin,
            yMax: yScales.yMax,
            ticksArray: yScales.ticksArray,
            ticksLabels: yScales.ticksLabels,
            tickNumber: yScales.tickNumber,
            yScaleID: yScales.yScaleID,
            redraw: function(pos) {
                console.log('redraw('+pos+')');
                console.log('images_pending='+images_pending);
                if (images_pending) {
                    if(!imagesTimer) {
                        //console.log('set timeout');
                        imagesTimer = setTimeout(
                            function()                  {
                                imagesTimer = 0;
                                g.redraw('timer');
                        }, 100);
                    }
                    return;
                }
                console.log('do redraw');
                clearTimeout(imagesTimer);
                window.myLine.update();
            },
            MxC: MxC_utils.MxC,
            MxC_data: MxC_utils.MxC_data,
        };

        if (!header.hasOwnProperty('global_js')) {
            g = g_ini;
        } else
        if (!header.global_js.define_global_js) {
            g = g_ini;
        } else {
            var comm ='';
            try {
                var g_tmp = {};
                comm = 'g_tmp = ' + header.global_js.code;
                /*jshint evil: true */
                eval(comm);
                /*jshint evil: false */
                comm = 'common.concatObjects';
                common.concatObjects(g_ini, g_tmp);
                g = g_ini;
            } catch (err) {
                console.log(err.message);
                console.log('at '+comm);
                ch_utils.alertMessage(38, err.message);
                g = g_ini;
            }
        }
        console.log(g);
    }, // take_global_code

    //h
    //h take_post_processing
    //h builds up the global object g with user defined code
    //h g = take_post_processing(<target object>, <chart header>);
    //-------------------------------------------------------------------------
    take_post_processing: function (header) {
        console.log('take_post_processing');

        var pp_empty = function() {
            return;
        };
        var pp_first = [
"postprocess = function(pos) {\n",
"    console.log('post_processing('+pos+')');\n",
"    annotation.restrict_to_visible = true;\n",
"    try {\n",
"        ++pp_count;\n",
"        console.log('pos=' + pos + ' pp_count=' + pp_count);\n",
"        //every time ad post processing is called\n",
"        //we restrict buffer to visible part\n",
"        sv = undefined;\n",
"        sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');\n\n",
        ].join('');

        var pp_last = [
"\n",
"    } catch(err) {\n",
"        alert(err.message);\n",
"    }\n",
"    annotation.restrict_to_visible = false;\n",
"}\n",
        ].join('');

        if (!header.hasOwnProperty('post_processing')) {
            postprocess = pp_empty;
        } else
        if (!header.post_processing.define_post_processing) {
            postprocess = pp_empty;
        } else {
            var comm ='';
            try {
                comm = pp_first;
                comm += abbrevs;
                comm += ch_utils.convertToUTF8(header.post_processing.code);
                comm += pp_last;
                console.log(comm);
                /*jshint evil: true */
                pp_empty = eval(comm);
                /*jshint evil: false */
            } catch (err) {
                console.log(err.message);
                console.log('at '+comm);
                ch_utils.alertMessage(42, err.message);
                postprocess = pp_empty;
            }
        }
    }, // take_post_processing

    //h
    //h prepare_formulas
    //h prepares all sensor formulas:
    //h x >> X[ix], x[-1] >> Xprev[ix]
    //h xi >> X[i], xi[-1] >> Xprev[i]
    //h prepare_formulas(<chart header>);
    //-------------------------------------------------------------------------
    prepare_formulas: function (header) {
        var formulas = header.chartArithmetics;

        function replace_Xi(f, len) {
            for (var ix = 0; ix < len; ix++) {
               var patt = new RegExp('\\bx'+ix+'\\b', "g");
               f = f.replace(patt, 'X['+ix+']');
            }
            return f;
        }

        function replace_Xprevi(f, len) {
            for (var ix = 0; ix < len; ix++) {
               var patt = new RegExp('\\bx'+ix+'\\b\\[-1\\]', "g");
               f = f.replace(patt, 'Xprev['+ix+']');
            }
            return f;
        }

        var len = formulas.length;
        var f, patt;
        for (var ix = 1; ix < len; ix++) {
            f = formulas[ix];
            if (f === null) {continue;}
            if (f === 'null') {continue;}

            //xi[-1]:
            f = replace_Xprevi(f, len);

            //xi:
            f = replace_Xi(f, len);

            //x[-1]:
            f = f.replace(/\bx\b\[-1\]/g, 'Xprev[ix]');

            //x:
            f = f.replace(/\bx\b/g, 'X[ix]');

            formulas[ix] = f;
        }
        //console.log(formulas);
        return formulas;
    }, // prepare_formulas

    //h
    //h xRange
    //h returns the dimensions of the visible part of the chart:
    //h xRange();
    //-------------------------------------------------------------------------
    xRange: function xRange() {
        var boxes = window.myLine.boxes;
        for (var i = 0; i < boxes.length; i++) {
            //console.log(boxes[i]);
            if (boxes[i].axis === 'x') {
                var xCurrMin = boxes[i]._range.min;
                var xCurrMax = boxes[i]._range.max;
                var xCurrLen = xCurrMax - xCurrMin;
                //console.log(ch_utils.userTime(xCurrMin)+' '+
                //ch_utils.userTime(xCurrMax));

                return {
                    min: xCurrMin,
                    max: xCurrMax,
                    len: xCurrLen
                };
            }
        }
    }, //xRange
}; //header_utils,

//b postcalc: postcalc functions
//------------------------------
var postcalc = {
    //h
    //h enable_post_calc
    //h enables/ disables the post calc button 
    //h enable_post_calc(<button name>, <chart header>);
    //-------------------------------------------------------------------------
    enable_post_calc: function (button, header) {
        if (!header.hasOwnProperty('post_calc')) {
            ch_utils.buttonVisible(button, false);
            return;
        }
        if (header.post_calc.length === 0) {
            ch_utils.buttonVisible(button, false);
            return;
        }
        ch_utils.buttonText(button, 32);
        ch_utils.buttonVisible(button, true);
    }, // enable_post_calc

    create_sv_buf: function create_sv_buf() {
        //console.log('create_sv_buf');
        //creates the complete 2-dimensional values array sv_buf
        sv_buf = [];
        sl = [];
        //console.log(data.labels);
        sv_buf[0] = data.labels;
        //console.log(data.datasets);
        var datasets = data.datasets;
        var n = datasets.length;
        //console.log('aaaa');
        for (var i = 1; i <= n; i++) {
            sv_buf[i] = datasets[i - 1].data;
            sl[i] = datasets[i - 1].label;
        }
        //console.log(sv_buf);
        //console.log(sl);
    }, //create_sv_buf;

    create_abbrevs_S: function () {
        //create short sensor array pointers 0..20
        //is called in FILTER
        var i, n = sv_buf.length - 1;
        for (i = 0; i <= 20; i++) {
            /*jshint evil: true */
            eval('sv'+i+' = sv['+i+']');
            /*jshint evil: false */
        }

        //create abbreviations for remaining sensors > 20
        abbrevs = '';
        for (i = 21; i <= n; i++) {
            abbrevs += 'var sv'+i+'=sv['+i+'];';
        }
    }, //create_abbrevs_S;

    post_calc_exec: function (header_post_calc) {

        function exec_eval (form_calc) {
            //console.log('exec_eval form_calc='+form_calc);
            var comp, c = abbrevs + form_calc;
            annotation.restrict_to_visible = true;
            try {
                /*jshint evil: true */
                //console.log(c);
                comp = eval(c);
                /*jshint evil: false */
            } catch (err) {
                comp = err.message;
            }
            annotation.restrict_to_visible = false;
            return comp;
        }

        //every time post calc is called
        //we restrict buffer to visible part
        sv = undefined;
        sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');

        //execute post calculation
        var form_calc, comp;
        var post_calc_len = header_post_calc.length;

        var result = '<table>\n';

        for (var ix = 0; ix < post_calc_len; ix++) {
            form_calc = header_post_calc[ix].form_calc;
            comp = '';
            if (form_calc) {
                //console.log('form_calc='+form_calc);

                var patt, res;
                //no nesting
                //patt = /\bS\b\s*=\s+FILTER\s*\([^)]*\)/g;
                //maximum nesting of (): 1
                patt = /\bS\b\s*=\s+FILTER\s*\([^()]*(\([^()]*\)[^()]*)*\)/g;
                res = form_calc.match(patt);
                //console.log('res', res);
                if (res) {
                    for (var p in res) {             
                        if (res.hasOwnProperty(p)) {
                            var a = res[p];
                            var b = a.replace(/\)$/, ',"sv")');
                            form_calc = form_calc.replace(a, b);
                        }
                    }
                    //console.log('form_calc new='+form_calc);
                }
                comp = exec_eval(form_calc);
            }

            result += '<tr>'+
                '<td>' + (header_post_calc[ix].text_calc || '') + '</td>'+
                '<td></td>'+
                '<td>' + comp + '</td></tr>'+
                '\n';
        } //for
        result += '</table>';

        document.getElementById('postcalcContents').innerHTML = result;
        ch_utils.buttonVisible('postcalcModal', true);
    }, // post_calc_exec

    FILTER: function (v_array, sensor, condition, target) {
        //console.log('FILTER', v_array, sensor, condition, target);
        var countDatapoints = v_array[0].length;
        var countSensors = v_array.length;
        var v_ret = new Array(countSensors).fill([]);
        if (typeof v_array !== 'undefined' &&
            typeof v_array[0] !== 'undefined') {
            var n = -1;
            for (var i = 0; i < countDatapoints; i++) {
                var x = v_array[sensor][i];
                var x_pre = v_array[sensor][i-1] || null;
                /*jshint evil: true */
                if (eval(condition))  {
                /*jshint evil: false */
                    n++;
                    for (var j = 0; j < countSensors; j++) {
                        if (n === 0) {v_ret[j] = [];}
                        v_ret[j][n] = v_array[j][i];
                    }
                }
            }
        }
        //console.log(v_array);
        //console.log(v_ret);

        //console.log('v_array[0].length', v_array[0].length);
        //console.log('v_ret[0].length', v_ret[0].length);
        if (target === 'sv') {
            sv = v_ret;
            //console.log('sv[0].length', sv[0].length);
            postcalc.create_abbrevs_S();
            //console.log('sv0.length', sv0.length);
        }
        return v_ret;
    }, //FILTER

    SUM: function (sensarray, condition) {
        //console.log('SUM');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            i++;
            if (g.noNumber(x)) {
                x_pre = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_pre = x; return total;
                }
                /*jshint evil: false */
            }
            x_pre = x;
            var n = x - 0;
            return total + n;
        }
        var x_pre = null;
        var i = -1;
        return sensarray.reduce(myFunc, null);
    }, //SUM

    MAX: function (sensarray, condition) {
        //console.log('MAX');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            i++;
            if (g.noNumber(x)) {
                x_pre = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_pre = x; return total;
                }
                /*jshint evil: false */
            }
            x_pre = x;
            var n = x - 0;
            return Math.max(total, n);
        }
        var x_pre = null;
        var i = -1;
        return sensarray.reduce(myFunc, null);
    }, //MAX

    MIN: function (sensarray, condition) {
        //console.log('MIN');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            i++;
            if (g.noNumber(x)) {
                x_pre = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_pre = x; return total;
                }
                /*jshint evil: false */
            }
            x_pre = x;
            var n = x - 0;
            return Math.min(total, n);
        }
        var x_pre = null;
        var i = -1;
        return sensarray.reduce(myFunc, Number.MAX_VALUE);
    }, //MIN

    AVG: function (sensarray, condition) {
        //console.log('AVG');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            i++;
            if (g.noNumber(x)) {
                x_pre = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_pre = x; return total;
                }
                /*jshint evil: false */
            }
            x_pre = x;
            count = count + 1;
            var n = x - 0;
            return total + n;
        }

        //filter not nulls:
        var filtered = sensarray.filter(function(x) {
            return x;
        });
        if (filtered.length === 0) {
            return null;
        }
        //add all:
        var x_pre = null;
        var i = -1;
        var count = 0;
        var sum = filtered.reduce(myFunc, null);
        //buid avg:
        var avg = sum / count;
        return avg;
    }, //AVG

    COUNT: function (sensarray, condition) {
        //console.log('COUNT');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            i++;
            if (x === null) {
                x_pre = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_pre = x; return total;
                }
                /*jshint evil: false */
            }
            x_pre = x; return total + 1;
        }

        //filter not nulls:
        var filtered = sensarray.filter(function(x) {
            return x;
        });
        if (filtered.length === 0) {return 0;}

        //count all left entries:
        var x_pre = null;
        var i = -1;
        var count = filtered.reduce(myFunc, null);
        return count;
    }, //COUNT

    FIRST: function (sensarray) {
        //console.log('FIRST');
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (typeof sensarray === 'object' && Array.isArray(sensarray)) {
            return sensarray[0];
        }
        return '';
    }, //FIRST

    LAST: function (sensarray) {
        if (typeof sensarray === 'undefined') {
            sensarray = 0;
        }
        if (typeof sensarray === 'number') {
            sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');
            sensarray = sv[sensarray];
        }
        if (typeof sensarray === 'object' && Array.isArray(sensarray)) {
            return sensarray[sensarray.length-1];
        }
        return '';
    }, //LAST
}; //postcalc

//b adHocCalc: postcalc functions
//-------------------------------
var adHocCalc = {
    raiseModal: function() {
        //console.log('adHocCalc.raiseModal');

        var html = [
            '<style>',
            'textarea {',
            '  resize: true;',
            '}',
            '</style>',
            '<div id="adHocCalcCodeI">',
            'This function makes it possible to define and execute',
            '<br>ad hoc commands for evaluating the displayed data.',
            '<br>',
            'For further information see:',
            '<input id="adHocCalcHelp" type="button" value="Help" onclick="adHocCalc.Help();" />',
            '',
            '<p><label for="adHocCalcCode">Javascript code:</label></p>',
            '',
            '<textarea id="adHocCalcCode" rows="15" cols="60"">',
            adHocCode,
            '</textarea><br><br>',
            '<input id="adHocCalcBreak" type="button" value="Break" onclick="adHocCalc.Break();" />',
            '<input id="adHocCalcClear" type="button" value="Clear" onclick="adHocCalc.Clear();" />',
            '<input id="adHocCalcStore" type="button" value="Store" onclick="adHocCalc.Store();" />',
            '<input id="adHocCalcExecute" type="button" value="Execute" onclick="adHocCalc.Execute();" />',
            '</div>'
        ].join("\n");

        document.getElementById('adHocCalcContents').innerHTML = html;
        ch_utils.buttonVisible('adHocCalcModal', true);
        document.getElementById("adHocCalcCode").focus();
    },

    Help: function() {
        window.open('http:/ZAutomation/api/v1/load/modulemedia/MxChartDB/help_post_calc.html', '_blank');
    },
    Break: function() {
        ch_utils.buttonVisible('adHocCalcModal', false);
        ch_utils.buttonVisible('adHocCalcResult', false);
    },
    Clear: function() {
        document.getElementById('adHocCalcCode').value = '';
        document.getElementById("adHocCalcCode").focus();
    },
    Store: function() {
        adHocCode = document.getElementById('adHocCalcCode').value;
        document.getElementById("adHocCalcCode").focus();
    },
    Return: function() {
        ch_utils.buttonVisible('adHocCalcResult', false);
        adHocCalc.raiseModal();
    },
    Execute: function() {
        adHocCode = document.getElementById('adHocCalcCode').value;
        ch_utils.buttonVisible('adHocCalcModal', false);

        //every time ad hoc calc is called
        //we restrict buffer to visible part
        sv = undefined;
        sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');

        var result = '';
        annotation.restrict_to_visible = true;
        try {
            /*jshint evil: true */
            result += eval(abbrevs + adHocCode);
            /*jshint evil: false */
            console.log('result='+result);
        } catch(err) {
            console.log(err.message);
            console.log(adHocCode);
            result += err.message;
        }
        annotation.restrict_to_visible = false;
        if (!result || result === 'undefined') {
            var err_message ="this code doesn't return anything";
            console.log(err_message);
            console.log(adHocCode);
            result = err_message;
        }

        result += '<br><br>'+
            '<input id="adHocCalcBreak" type="button" value="OK" onclick="adHocCalc.Break();" />';
        result += ' '+
            '<input id="adHocCalcReturn" type="button" value="Return" onclick="adHocCalc.Return();" />';
        document.getElementById('adHocCalcResultContents').innerHTML = result;
        ch_utils.buttonVisible('adHocCalcResult', true);
    },
}; //adHocCalc

var adHocCode = '';

document.getElementById('adHocCalcButton').onclick = function(event) {
    ch_utils.buttonVisible('adHocCalcResult', false);
    adHocCalc.raiseModal();
}; //onclick adHocCalc

//b yScales: helper functions for to check existing y scales
//----------------------------------------------------------
var yScales = {
    scales: function(position, type) {
    //usage:
    //    yScales.scales(position: <right|left>,
    //                   type: <number|text>,
    //    });
        //console.log('yScales.scales: '+position+' '+type);
        var scales = [];
        var scaleIds = Object.keys(config.options.scales);

        if (typeof position === 'undefined' && typeof type === 'undefined') {
            return scaleIds;
        }

        for (var i = 0; i < scaleIds.length; i++)   {
            var currpos, currtype;
            var scale = scaleIds[i];
            if (scale.charAt(0) !== 'y') {
                continue;
            }
            if (config.options.scales[scale].display !== true) {
                continue;
            }
            currpos = config.options.scales[scale].position;
            if (position && position !== currpos) {
                continue;
            }

            currtype = null;
            currtype = scale.charAt(1) === 'U' ? 'number' : currtype;
            currtype = scale.charAt(1) === 'L' ? 'text' : currtype;
            if (type && type !== currtype) {
                continue;
            }
            
            scales.push(scale);
        }
        return scales;
    }, //scales

    testScale: function(yScaleID) {
    //usage:
    //    yScales.testScale(yScaleID);
        var position, type;
        var scaleIds = Object.keys(config.options.scales);

        if (yScaleID === undefined) {
            return false;
        }
        if (yScaleID.charAt(0) !== 'y') {
            return false;
        }
        if (scaleIds.indexOf(yScaleID) < 0) {
            return false;
        }
        if (config.options.scales[yScaleID].display !== true) {
            return false;
        }

        type = null;
        type = yScaleID.charAt(1) === 'U' ? 'number' : type;
        type = yScaleID.charAt(1) === 'L' ? 'text' : type;
        if (!type) {
            return false;
        }

        position = config.options.scales[yScaleID].position;
        if (position !== 'left' && position !== 'right') {
            return false;
        }
        return true;
    }, //testScale

    ticksArray: function (yScalePosition, //<right|left>
                          yScaleType,     //<number|text>
                          yScaleID 
                         ) {
        //returns the array of ticks for the given y scale
        var myChart = window.myLine;

        var avail_scales;
        if (typeof yScaleID === 'undefined') {
            if (typeof yScalePosition !== 'undefined' && 
                typeof yScaleType!== 'undefined') {
                yScaleID = 'y';
                if (yScaleType === 'number') {yScaleID += 'U';}
                if (yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += yScalePosition;
            } else
            if (typeof yScalePosition !== 'undefined') {
                avail_scales = yScales.scales.apply(null, [yScalePosition]);
                if (avail_scales.length >= 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (typeof yScaleType !== 'undefined') {
                avail_scales = yScales.scales.apply(null, [undefined, yScaleType]);
                if (avail_scales.length >= 1) {
                    yScaleID = avail_scales[0];
                }
            } else {
                avail_scales = yScales.scales();
                if (avail_scales.length > 1) {
                    yScaleID = avail_scales[1];
                }
            }
        }
        if (typeof yScaleID === 'undefined') {
            return [];
        }
        var ticksArr = myChart.scales[yScaleID].ticks;
        //console.log(myChart.scales);
        return ticksArr;
    }, //ticksArray;

    ticksLabels: function (yScalePosition, //<right|left>
                           yScaleType,     //<number|text>
                           yScaleID 
                          ) {
        //returns the array of tick labels for the given y scale
        //!!!! only returns string labels, not images !!!!
        if (!yScaleID) {
            yScaleID = g.yScaleID(yScalePosition, yScaleType);
        }
        //alert(yScalePosition+' '+yScaleType+' '+yScaleID);
        var ticksArray = 
            yScales.ticksArray.apply(null,
                               [yScalePosition,
                               yScalePosition,
                               yScaleID]);
        var labels = null;
        if (ticksArray.length > 0) {
            //labels = ticksArray.map(tick => tick.label);
            labels = ticksArray.map(function(tick) { return tick.label; });
            //console.log(labels);
        }
        return labels;
    }, //ticksLabels;

    firstTick: function (yScalePosition, //<right|left>
                         yScaleType,     //<number|text>
                         yScaleID 
                        ) {
        //returns the first tick for the given y scale
        var ticksArray = 
            yScales.ticksArray.apply(null,
                               [yScalePosition,
                               yScaleType,
                               yScaleID]);
        var tick = null;
        if (ticksArray.length > 0) {
            tick = ticksArray[0].value;
        }
        return tick;
    }, //firstTick;

    lastTick: function (yScalePosition, //<right|left>
                        yScaleType,     //<number|text>
                        yScaleID 
                       ) {
        //returns the last tick for the given y scale
        var ticksArray = 
            yScales.ticksArray.apply(null,
                               [yScalePosition,
                               yScaleType,
                               yScaleID]);
        var tick = null;
        if (ticksArray.length > 0) {
            tick = ticksArray[ticksArray.length-1].value;
        }
        return tick;
    }, //lastTick;

    yMin: function (yScalePosition, //<right|left>
                    yScaleType,     //<number|text>
                    yScaleID 
                   ) {
        //returns the minimum y value for the given y scale
        if (!yScaleID) {
            yScaleID = yScales.yScaleID(yScalePosition, yScaleType);
        }
        var myChart = window.myLine;
        var yMin = myChart.scales[yScaleID].min;
        return yMin;
    }, //yMin;

    yMax: function (yScalePosition, //<right|left>
                    yScaleType,     //<number|text>
                    yScaleID 
                   ) {
        //returns the maximum y value for the given y scale
        if (!yScaleID) {
            yScaleID = yScales.yScaleID(yScalePosition, yScaleType);
        }
        var myChart = window.myLine;
        var yMax = myChart.scales[yScaleID].max;
        return yMax;
    }, //yMin;

    tickNumber: function (label,
                          yScalePosition, //<right|left>
                          yScaleType,     //<number|text>
                          yScaleID 
                         ) {
        //returns the tick for the given y label and the given y scale
        //!!!! only returns string labels, not images !!!!
        var labels = 
            yScales.ticksLabels.apply(null,
                                      [yScalePosition,
                                       yScalePosition,
                                       yScaleID]);
        //console.log(label);
        //console.log(labels);
        var myChart = window.myLine;
        //console.log(config.options.scales);
        var tickNumber = labels.indexOf(label);
        return tickNumber;
    }, //tickNumber;

    yScaleID: function (yScalePosition, //<right|left>
                        yScaleType    //<number|text>
                       ) {
        //returns the internal scale id
        var avail_scales, yScaleID;
        if (yScalePosition && yScaleType) {
            yScaleID = 'y';
            if (yScaleType === 'number') {yScaleID += 'U';}
            if (yScaleType === 'text') {yScaleID += 'L';}
            yScaleID += yScalePosition;
        } else
        if (yScalePosition) {
            avail_scales = yScales.scales(yScalePosition);
            if (avail_scales.length >= 1) {
                yScaleID = avail_scales[0];
            }
        } else
        if (yScaleType) {
            avail_scales = yScales.scales(undefined, yScaleType);
            if (avail_scales.length >= 1) {
                yScaleID = avail_scales[0];
            }
        } else {
            //get visible y scales
            var scales = yScales.scales('right');
            var scalesLeft = yScales.scales('left');
            if (scalesLeft.length > scales) {
                scales = scalesLeft;
            }
            yScaleID = scales[0];
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('yScaleID '+yScaleID+'/'+
                yScalePosition+'/'+yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
            yScaleID = undefined;
        }
        return yScaleID;
    }, //yScaleID;
}; //yScales

//b annotation: adds or deletes an annotation to chart,js config
//--------------------------------------------------------------
var annotation = {
    restrict_to_visible: false,
    //due to an issue in the annotation plugin 2.1.0 (chart.js 3.9.1)
    //(some label fragments remain visible)
    //we restrict annotation.line in post processing to the visible part

    del: function(arg1) {
    //usage:
    //    annotation.del({id: <unique annotation id>});
        //console.log('annotation.del');
        if (arg1) {
            if (typeof arg1 === 'string') {
                config.options.plugins.annotation.annotations[arg1] = undefined;
                return;
            } else
            if (typeof arg1 === 'object' &&
                typeof arg1.id+'' === 'string') {
                config.options.plugins.annotation.annotations[arg1.id+''] = undefined;
                return;
            }
        }
        alert('parameter error in function annotation.del({}) !');
    }, //del

    point: function(arg1) {
    //usage:
    //    annotation.point({id: <unique annotation id>,   //for storing the annotation, mandatory
    //                      xValue: <x value>,
    //                      yValue: <y value>,
    //                      yScaleID: <'yUright'|'yLright'|'yUleft'|'<yLleft'>,
    //                      yScalePosition: <right|left>,
    //                      yScaleType: <number|text>,
    //                      pointStyle: <'cross'|'crossRot'|'dash'|'line'|'rect'|'rectRounded'|'retRot'|'star'|'triangle'|false>,
    //                      radius: <point radius in pixels>
    //                      color: <color>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.point');
        //console.log('annotation.point: pointStyle='+arg1.pointStyle+', yScaleID='+arg1.yScaleID+'/'+
        //        arg1.yScalePosition+'/'+arg1.yScaleType);
        if (!arg1 || 
            typeof arg1 !== 'object' ||
            typeof arg1.id !== 'string'
           ) {
            alert('parameter error in function annotation.point({}) !');
            return;
        }

        var yScaleID = arg1.yScaleID, avail_scales;
        if (typeof arg1.yScaleID === 'undefined') {
            if (arg1.yScalePosition && arg1.yScaleType) {
                yScaleID = 'y';
                if (arg1.yScaleType === 'number') {yScaleID += 'U';}
                if (arg1.yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += arg1.yScalePosition;
            } else
            if (arg1.yScalePosition) {
                avail_scales = yScales.scales(arg1.yScalePosition);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (arg1.yScaleType) {
                avail_scales = yScales.scales(undefined, arg1.yScaleType);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            }
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('annotation.point: yScaleID '+arg1.yScaleID+'/'+
                arg1.yScalePosition+'/'+arg1.yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
        }

        if (arg1.hide === undefined) {arg1.hide = true;}
        var anno_config = {
            drawTime: arg1.drawTime || 'afterDatasetsDraw',
            type: 'point',
            backgroundColor: 'transparent',
            borderColor: arg1.color,
            borderWidth: 5,
            pointStyle: arg1.pointStyle,
            radius: arg1.radius,
            xScaleID: 'x',
            yScaleID: yScaleID,
            xValue: arg1.xValue,
            yValue: arg1.yValue,
            click: function(e) { 
                        if (arg1.hide === true) {
                            config.options.plugins.annotation.annotations[arg1.id+''].drawTime = null;
                            window.myLine.update();
                   }
            },
        };
        config.options.plugins.annotation.annotations[arg1.id+''] = anno_config;
    }, //point

    label: function(arg1) {
    //usage:
    //    annotation.label({id: <unique annotation id>,   //for storing the annotation, mandatory
    //                      xValue: <x value>,
    //                      yValue: <y value>,
    //                      content: <string|string[]|HTMLCanvasElement>,
    //                      color: <color>,
    //                      backgroundColor: <backgroundColor>,
    //                      yScaleID: <'yUright'|'yLright'|'yUleft'|'<yLleft'>,
    //                      yScalePosition: <right|left>,
    //                      yScaleType: <number|text>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.label');
        if (!arg1 || 
            typeof arg1 !== 'object' ||
            typeof arg1.id !== 'string'
           ) {
            alert('parameter error in function annotation.label({}) !');
            return;
        }

        var yScaleID = arg1.yScaleID, avail_scales;
        if (typeof arg1.yScaleID === 'undefined') {
            if (arg1.yScalePosition && arg1.yScaleType) {
                yScaleID = 'y';
                if (arg1.yScaleType === 'number') {yScaleID += 'U';}
                if (arg1.yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += arg1.yScalePosition;
            } else
            if (arg1.yScalePosition) {
                avail_scales = yScales.scales(arg1.yScalePosition);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (arg1.yScaleType) {
                avail_scales = yScales.scales(undefined, arg1.yScaleType);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            }
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('annotation.label: yScaleID '+arg1.yScaleID+'/'+
                arg1.yScalePosition+'/'+arg1.yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
        }

        /*
g.annotation.label({id: 'test', content: ['line 1', 'line 2'], 
                    color: 'green', 
                    backgroundColor: 'lightGreen',
                    hide: true});
g.redraw();
         * */

        if (arg1.hide === undefined) {arg1.hide = true;}
        var anno_config = {
            drawTime: arg1.drawTime || 'afterDatasetsDraw',
            type: 'label',
            xValue: arg1.xValue,
            yValue: arg1.yValue,
            color: arg1.color || 'black',
            backgroundColor: arg1.backgroundColor || 'transparent',
            content: arg1.content,
            font: {
                size: 18
            },
            xScaleID: 'x',
            yScaleID: yScaleID,
            click: function(e) { 
                        if (arg1.hide === true) {
                            config.options.plugins.annotation.annotations[arg1.id+''].drawTime = null;
                            window.myLine.update();
                   }
            },
        };
        config.options.plugins.annotation.annotations[arg1.id+''] = anno_config;
    }, //label

    image: function(arg1) {
    //usage:
    //    annotation.image({id: <unique annotation id>,   //for storing the annotation, mandatory
    //                      xValue: <x value>,
    //                      yValue: <y value>,
    //                      image: <image>,
    //                      width: <pixel>,
    //                      hight: <pixel>,
    //                      borderColor: <borderColor>,
    //                      backgroundColor: <backgroundColor>,
    //                      yScaleID: <'yUright'|'yLright'|'yUleft'|'<yLleft'>,
    //                      yScalePosition: <right|left>,
    //                      yScaleType: <number|text>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //    });
        console.log('annotation.image');
        if (!arg1 || 
            typeof arg1 !== 'object' ||
            typeof arg1.id !== 'string'
           ) {
            alert('parameter error in function annotation.image({}) !');
            return;
        }

        var yScaleID = arg1.yScaleID, avail_scales;
        if (typeof arg1.yScaleID === 'undefined') {
            if (arg1.yScalePosition && arg1.yScaleType) {
                yScaleID = 'y';
                if (arg1.yScaleType === 'number') {yScaleID += 'U';}
                if (arg1.yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += arg1.yScalePosition;
            } else
            if (arg1.yScalePosition) {
                avail_scales = yScales.scales(arg1.yScalePosition);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (arg1.yScaleType) {
                avail_scales = yScales.scales(undefined, arg1.yScaleType);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            }
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('annotation.image: yScaleID '+arg1.yScaleID+'/'+
                arg1.yScalePosition+'/'+arg1.yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
        }

        if (arg1.hide === undefined) {arg1.hide = true;}
        var anno_config = {
            drawTime: arg1.drawTime || 'afterDatasetsDraw',
            type: 'label',
            xValue: arg1.xValue,
            yValue: arg1.yValue,
            width: arg1.width || 100,
            height: arg1.height || 100,
            //content: img,
            borderWidth: 1,
            borderDash: [6, 6],
            borderColor: arg1.borderColor || 'transparent',
            backgroundColor: arg1.backgroundColor || 'transparent',
            xScaleID: 'x',
            yScaleID: yScaleID,
            click: function(e) { 
                        if (arg1.hide === true) {
                            config.options.plugins.annotation.annotations[arg1.id+''].drawTime = null;
                            window.myLine.update();
                   }
            },
        };

        //load image
        const img = new Image();
        var ignore_default = true;
        img.src = images.addPath(arg1.image, ignore_default);
        ++images_pending;

        //check for error on image load
        img.onerror = function() {
            //console.log('onerror');
            if (arg1.image !== 'placeholder') {
                img.src = images.addPath('placeholder');
            } else {
                --images_pending;
            }
        };

        //wait till image loaded
        img.onload = function() {
            //console.log('onload');
            anno_config.content = img;
            config.options.plugins.annotation.annotations[arg1.id+''] = anno_config;
            --images_pending;
        };
    }, //image
/*
g.annotation.image({
    id: 'test', 
    image: 'icon.png', 
    //image: ',/myIcons/bath.png', 
    //image: 'caution', 
    //image: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Database_icon_shortcut.png?20110724224416',
});
g.redraw(9);
*/

    line: function(arg1) {
    //usage:
    //    annotation.line({id: <unique annotation id>,   //for storing the annotation, mandatory
    //                     xMin: <x min value>,
    //                     xMax: <x max value>,
    //                     yMin: <y min value>,
    //                     yMax: <y max value>,
    //                     borderWidth: <line width in pics>,
    //                     yScaleID: <'yUright'|'yLright'|'yUleft'|'<yLleft'>,
    //                     yScalePosition: <'right'|'left'>,
    //                     yScaleType: <'number'|'text'>,
    //                     text: <text>,
    //                     text_color: <text color>,
    //                     text_background: <text background color>,
    //                     arrow_start: <true|false>,  //add arrow at line start
    //                     arrow_end: <true|false>,  //add arrow at line end
    //                     drawTime: <drawTime>,
    //                     hide: <true|false>  //hide line at click
    //    });
        //console.log('annotation.line');
        if (!arg1 || 
            typeof arg1 !== 'object' ||
            typeof arg1.id !== 'string'
           ) {
            alert('parameter error in function annotation.line({}) !');
            return;
        }

        var yScaleID = arg1.yScaleID, avail_scales;
        if (typeof arg1.yScaleID === 'undefined') {
            if (arg1.yScalePosition && arg1.yScaleType) {
                yScaleID = 'y';
                if (arg1.yScaleType === 'number') {yScaleID += 'U';}
                if (arg1.yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += arg1.yScalePosition;
            } else
            if (arg1.yScalePosition) {
                avail_scales = yScales.scales(arg1.yScalePosition);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (arg1.yScaleType) {
                avail_scales = yScales.scales(undefined, arg1.yScaleType);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            }
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('annotation.line: yScaleID '+arg1.yScaleID+'/'+
                arg1.yScalePosition+'/'+arg1.yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
        }

        if (arg1.hide === undefined) {arg1.hide = true;}
        var anno_config = {
            drawTime: arg1.drawTime || 'afterDatasetsDraw',
            type: 'line',
            borderColor: 'black',
            borderDash: [6, 6],
            borderWidth: arg1.borderWidth || 1,
            label: {
                display: true,
                backgroundColor: arg1.text_background,
                borderRadius: 0,
                color: arg1.text_color,
                content: arg1.text,
            },
            arrowHeads: {
                start: {
                    display: arg1.arrow_start,
                    fill: true,
                    borderDash: [],
                    borderColor: 'black'
                },
                end: {
                    display: arg1.arrow_end,
                    fill: true,
                    borderDash: [],
                    borderColor: 'black'
                }
            },
            xScaleID: 'x',
            yScaleID: yScaleID,
            xMin: arg1.xMin,
            xMax: arg1.xMax,
            yMin: arg1.yMin,
            yMax: arg1.yMax,
            click: function(e) { 
                        if (arg1.hide === true) {
                            config.options.plugins.annotation.annotations[arg1.id+''].drawTime = null;
                            window.myLine.update();
                   }
            },
        };
        
        if (annotation.restrict_to_visible) {
            //console.log(arg1.id+' '+anno_config.label.content);
            var x_first = g.FIRST() || null;
            var x_last = g.LAST() || null;
            //console.log(g.usertime(anno_config.xMin)+'-'+g.usertime(anno_config.xMax));
            //console.log(g.usertime(x_first)+'-'+g.usertime(x_last));
            if (anno_config.xMin === undefined) {
                anno_config.xMin = x_first;
            }
            anno_config.xMin = Math.max(anno_config.xMin || x_first, x_first);
            if (anno_config.xMax === undefined) {
                anno_config.xMax = x_last;
            }
            anno_config.xMax = Math.min(anno_config.xMax || x_last, x_last);
            //console.log('>>> '+g.usertime(anno_config.xMin)+'-'+g.usertime(anno_config.xMax));
            if (anno_config.xMax < x_first ||
                anno_config.xMin > x_last) {
                console.log('skip/ delete '+arg1.id);
                annotation.del({id: arg1.id});
                return;
            }
        }        
        console.log('create line '+arg1.id);
        config.options.plugins.annotation.annotations[arg1.id+''] = anno_config;
    }, //line

    box: function(arg1) {
    //usage:
    //    annotation.box({id: <unique annotation id>,   //for storing the annotation, mandatory
    //                    xMin: <x min value>,
    //                    xMax: <x max value>,
    //                    yMin: <y min value>,
    //                    yMax: <y max value>,
    //                    yScaleID: <'yUright'|'yLright'|'yUleft'|'<yLleft'>,
    //                    yScalePosition: <right|left>,
    //                    yScaleType: <number|text>,
    //                    backgroundColor: <color>,
    //                    borderWidth: <true|false>,
    //                    drawTime: <drawTime>,
    //                    hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.box');
        if (!arg1 || 
            typeof arg1 !== 'object' ||
            typeof arg1.id !== 'string'
           ) {
            alert('parameter error in function annotation.box({}) !');
            return;
        }

        var yScaleID = arg1.yScaleID, avail_scales;
        if (typeof arg1.yScaleID === 'undefined') {
            if (arg1.yScalePosition && arg1.yScaleType) {
                yScaleID = 'y';
                if (arg1.yScaleType === 'number') {yScaleID += 'U';}
                if (arg1.yScaleType === 'text') {yScaleID += 'L';}
                yScaleID += arg1.yScalePosition;
            } else
            if (arg1.yScalePosition) {
                avail_scales = yScales.scales(arg1.yScalePosition);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            } else
            if (arg1.yScaleType) {
                avail_scales = yScales.scales(undefined, arg1.yScaleType);
                if (avail_scales.length === 1) {
                    yScaleID = avail_scales[0];
                }
            }
        }

        if (yScaleID && !yScales.testScale(yScaleID)) {
            console.log('annotation.box: yScaleID '+arg1.yScaleID+'/'+
                arg1.yScalePosition+'/'+arg1.yScaleType+' is not displayed!');
            console.log('available scales: ', yScales.scales());
        }

        if (arg1.hide === undefined) {arg1.hide = true;}
        var anno_config = {
            drawTime: arg1.drawTime || 'afterDatasetsDraw',
            type: 'box',
            xMin: arg1.xMin,
            xMax: arg1.xMax,
            yMin: arg1.yMin,
            yMax: arg1.yMax,
            xScaleID: 'x',
            yScaleID: yScaleID,
            backgroundColor: arg1.backgroundColor,
            borderWidth: arg1.borderWidth,
        };

        if (annotation.restrict_to_visible) {
            //console.log(arg1.id);
            var x_first = g.FIRST() || null;
            var x_last = g.LAST() || null;
            //console.log(g.usertime(anno_config.xMin)+'-'+g.usertime(anno_config.xMax));
            //console.log(g.usertime(x_first)+'-'+g.usertime(x_last));
            if (anno_config.xMin === undefined) {
                anno_config.xMin = x_first;
            }
            anno_config.xMin = Math.max(anno_config.xMin || x_first, x_first);
            if (anno_config.xMax === undefined) {
                anno_config.xMax = x_last;
            }
            anno_config.xMax = Math.min(anno_config.xMax || x_last, x_last);
            //console.log('>>> '+g.usertime(anno_config.xMin)+'-'+g.usertime(anno_config.xMax));
            if (anno_config.xMax < x_first ||
                anno_config.xMin > x_last) {
                console.log('skip/ delete '+arg1.id);
                annotation.del({id: arg1.id});
                return;
            }
        }        

        console.log('create box '+arg1.id);
        config.options.plugins.annotation.annotations[arg1.id+''] = anno_config;
    }, //box

    horizontal: function(id,
                         y_pos,
                         text,
                         text_color,
                         text_background,
                         yScalePosition,
                         yScaleType) {
        g.annotation.line({
            id: id,
            xMin: null, xMax: null, yMin: y_pos, yMax: y_pos,
            text: text || g.round(y_pos, 2),
            text_color: text_color || 'green',
            text_background: text_background || 'lightGreen',
            yScalePosition: yScalePosition,
            yScaleType: yScaleType,
            hide: true,
        });
    }, //horizontal

    vertical: function(id,
                       x_pos,
                       text,
                       text_color,
                       text_background,
                       yScalePosition,
                       yScaleType) {
        if (!x_pos) {
            x_pos = Date.now();
            if (!text) {
                text = g.usertime(x_pos);
            }
        }
        if (yScalePosition || yScaleType) {
            g.annotation.line({
                id: id,
                xMin: x_pos, xMax: x_pos,
                text: text,
                text_color: text_color || 'green',
                text_background: text_background || 'lightGreen',
                yScalePosition: yScalePosition,
                yScaleType: yScaleType,
                hide: true,
            });
        } else {
            //get visible y scales
            var scales = yScales.scales('right');
            var scalesLeft = yScales.scales('left');
            if (scalesLeft.length > scales) {
                scales = scalesLeft;
            }

            //add to all scales 
            for (var i = 0; i < scales.length; i++) {
                var text_i = scales[i].indexOf('U') > 0 ? text : undefined;
                g.annotation.line({
                    id: id+'_'+i,
                    xMin: x_pos, xMax: x_pos,
                    text: text_i,
                    text_color: text_color || 'green',
                    text_background: text_background || 'lightGreen',
                    yScaleID: scales[i],
                    hide: true,
                });
            }
        }
    }, //vertical

    text: function(id,
                   x_pos,
                   y_pos,
                   text,
                   text_color,
                   text_background,
                   yScalePosition,
                   yScaleType) {
        g.annotation.line({
            id: id,
            xMin: x_pos, xMax: x_pos, yMin: y_pos, yMax: y_pos,
            text: text || g.round(y_pos, 2),
            text_color: text_color || 'green',
            text_background: text_background || 'lightGreen',
            yScalePosition: yScalePosition,
            yScaleType: yScaleType,
            hide: true,
        });
    }, //text

    MxC_horizontals: function(MxC_name, label) {
    //draws horizontals for the MxC data Preis
     console.log('annotation.MxC_horizontals '+ MxC_name + ' '+ label);
     var arr = g.MxC_data.apply(null, [MxC_name]);
     console.log(arr);
     for (var i = 0; i < arr.length; i++) {
         var xMin = arr[i][0];
         var xMax = arr[i][2];
         var yMin = arr[i][4];
         var yMax = arr[i][4];
         g.annotation.line({
             id: label + i,
             xMin: xMin,
             xMax: xMax,
             yMin: yMin,
             yMax: yMax,
             text: label + ' ' + yMin,
             text_color: 'green',
             text_background: 'lightGreen',
         });
     }
    }, //MxC_horizontals

}; //annotation

//b images: functions onserning images
//----------------------------------------------------------------------------------
var imagesPathDefault = '';
var images_pending = 0;
var imagesTimer = 0;
var images = {
    addPath: function (icon, ignore_default) {
    var zwayIcons = '/smarthome/storage/img/icons/';
    var modulemedia = '/ZAutomation/api/v1/load/modulemedia/' + 'MxChartDB' + '/';
        imagesPathDefault = imagesPathDefault || '';

        //no icon
        if (!icon || icon.indexOf('.png') === 0) {
            icon = 'placeholder';
        }

        if (ignore_default === undefined) {ignore_default = false;}
        var def = imagesPathDefault;
        if (ignore_default) {
            def = '';
        }

        //no path and no extension
        if (icon.indexOf('/') < 0 && icon.indexOf('.') < 0) {
            return zwayIcons + icon + '.png';
        }

        var extension = icon.split('.').pop();
        //extension # .png
        if (extension !== 'png') {
            return icon;
        }

        //htdocs no path
        if (icon.indexOf('/') < 0) {
            return modulemedia + def +icon;
        }

        //htdocs relative path
        if (icon.indexOf('./') === 0) {
            return modulemedia + def +icon;
        }

        //htdocs relative path
        if (icon.indexOf('../') === 0) {
            return modulemedia + def +icon;
        }

        //anything else
        if (icon.indexOf('/') >= 0) {
            return icon;
        }
    } //addPath
}; //images

//b nightTimes: compute sunrise and sunset array depending date, longitude, latitude
//----------------------------------------------------------------------------------
var nightTimes = {
    nightArray: [],
    annotations: function (pos) {
    //usage:
    //    nightTimes.annotations();
        console.log('nightTimes.annotations ('+pos+')');

        //delete old annotations
        console.log('delete old nights');
        nightTimes.nightArray.forEach(function (el, index) {
            console.log('delete '+'night_'+el[0]);
            annotation.del({id: 'night_'+el[0]});
        });
        nightTimes.nightArray = [];

        //build new nightArray
        var day_length = 1000 * 60 * 60 * 24;
        //console.log('day_length='+day_length);
        //console.log('g.FIRST()='+g.FIRST());
        //console.log('g.LAST()='+g.LAST());
        var day_first = g.FIRST() - day_length;
        var day_last = g.LAST() + day_length;
        var days = Math.ceil((day_last - day_first) / day_length);
        //console.log('days='+days);
        //console.log(g.usertime(day_first) +' - ' + g.usertime(day_last) + ', ' +
        //      days + ' days');

        for (var i= 0; i < days; i++) {
            nightTimes.nightArray.push(
                [nightTimes.sunset(day_first + i * day_length), 
                 nightTimes.sunrise(day_first + (i+1) * day_length)]);
        }
        console.log(nightTimes.nightArray);

        //add night backgrounds
        console.log('add new nights');
        annotation.restrict_to_visible = true;
        nightTimes.nightArray.forEach(function(night, index) {
            console.log('index='+index);
            annotation.box({id: 'night_'+night[0], 
                            xMin: night[0], 
                            xMax: night[1],
                            backgroundColor: ch_utils.night.backColor || '#cccccc60',
                            //yScaleID: scales[i],
                            borderWidth: 0,
                            drawTime: 'beforeDatasetsDraw'});
        });
        annotation.restrict_to_visible = false;
    }, //annotations

    isNight: function (x0) {
        //console.log('nightTimes.isNight');
        var night;
        if (!x0) {return night;}

        //get geo position
        var loc = ch_utils.night;
        if (!loc || !loc.longitude || !loc.latitude) {
            ch_utils.alertMessage(40);
            return night;
        }
        var lng = loc.longitude;
        var lat = loc.latitude;
        var tz = loc.tz;

        //get dawn times
        var ret = suntimes(x0, lat, lng, tz);
        if (x0 >= ret[0] && x0 < ret[1]) {
            night = false;
        } else {
            night = true;
        }
        return night;
    }, //isNight

    sunrise: function (x0) {
        //console.log('nightTimes.sunrise');
        if (!x0) {return null;}

        //get geo position
        var loc = ch_utils.night;
        if (!loc || !loc.longitude || !loc.latitude) {
            ch_utils.alertMessage(40);
            return null;
        }
        var lng = loc.longitude;
        var lat = loc.latitude;
        var tz = loc.tz;

        //get dawn times
        var ret = suntimes(x0, lat, lng, tz);
        return ret[0];
    }, //sunrise

    sunset: function (x0) {
        //console.log('nightTimes.sunset');
        if (!x0) {return null;}

        //get geo position
        var loc = ch_utils.night;
        if (!loc || !loc.longitude || !loc.latitude) {
            ch_utils.alertMessage(40);
            return null;
        }
        var lng = loc.longitude;
        var lat = loc.latitude;
        var tz = loc.tz;

        //get dawn times
        var ret = suntimes(x0, lat, lng, tz);
        return ret[1];
    }, //sunset
}; //nightTimes

//b suncalc: sun azimuth and altitude
//-----------------------------------
var suncalc = {
    azimuth: function (x0) {
        var azimuth;
        if (!x0) {return azimuth;}

        //get geo position
        var loc = ch_utils.night;
        if (!loc || !loc.longitude || !loc.latitude) {
            ch_utils.alertMessage(40);
            return azimuth;
        }

        function round(number) {
            var factor = Math.pow(10, 2);
            return Math.round(number * factor) / factor;
        }
        var position = SunCalc.getPosition(x0, loc.latitude, loc.longitude);
        azimuth = round(position.azimuth * 180 / Math.PI + 180);
        return azimuth;
    },

    altitude: function (x0) {
        var altitude;
        if (!x0) {return altitude;}

        //get geo position
        var loc = ch_utils.night;
        if (!loc || !loc.longitude || !loc.latitude) {
            ch_utils.alertMessage(40);
            return altitude;
        }

        function round(number) {
            var factor = Math.pow(10, 2);
            return Math.round(number * factor) / factor;
        }
        var position = SunCalc.getPosition(x0, loc.latitude, loc.longitude);
        altitude = round(position.altitude * 180 / Math.PI);
        return altitude;
    },
}; //suncalc

var g; //object for global user defined functions
var postprocess; //post processing code
var pp_count = 0; //postprocess counter for testing

//abbrevations for the postcalc configuration
var abbrevs = '';
var FILTER = postcalc.FILTER;
var SUM = postcalc.SUM;
var MAX = postcalc.MAX;
var MIN = postcalc.MIN;
var AVG = postcalc.AVG;
var COUNT = postcalc.COUNT;
var FIRST = postcalc.FIRST;
var LAST = postcalc.LAST;
var firstTick = yScales.firstTick;
var lastTick = yScales.lastTick;
var ticksArray = yScales.ticksArray;
var ticksLabels = yScales.ticksLabels;
var tickNumber = yScales.tickNumber;
var yScaleID = yScales.yScaleID;

//2-dimensional sensor arrays
var sv_buf;  //complete buffered, pointers to config
var sv;      //visible part of sv_buf, copy
var sv0, sv1, sv2, sv3, sv4, sv5, sv6, sv7, sv8, sv9, sv10;
var sv11, sv12, sv13, sv14, sv15, sv16, sv17, sv18, sv19, sv20;

//sensor labels
var sl;


