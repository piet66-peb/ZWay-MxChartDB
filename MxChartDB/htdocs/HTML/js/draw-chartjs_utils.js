
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
//h Version:      V1.0.0 2025-01-22/peb
//v History:      V1.0.0 2024-12-16/peb first version
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals ch_utils, g */
'use strict';

//b version data
//--------------
var MODULE='chartjs_utils.js';
var VERSION='V1.0.0';
var WRITTEN='2025-01-22/peb';

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

        var g = {
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
                var ts_first_disp = Math.ceil(timeRange.min),
                    ts_last_disp = Math.floor(timeRange.max);
                if ( x >= ts_first_disp && x <= ts_last_disp) {
                    return true;
                } else {
                    return false;
                }
            },
        };

        if (!header.hasOwnProperty('global_js')) {
            return g;
        }
        if (!header.global_js.define_global_js) {
            return g;
        }
        try {
            var g_tmp = {};
            /*jshint evil: true */
            eval('g_tmp = ' + header.global_js.code);
            /*jshint evil: false */
            common.concatObjects(g, g_tmp);
            return g;
        } catch (err) {
            ch_utils.alertMessage(38, err.message);
            return g;
        }
    }, // take_global_code

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

    create_v_buf: function create_v_buf(config_data) {
        //creates the complete 2-dimensional values array v_buf
        v_buf = [];
        v_buf[0] = config_data.labels;
        var datasets = config_data.datasets;
        var n = datasets.length;
        for (var i = 1; i <= n; i++) {
            v_buf[i] = datasets[i - 1].data;
        }
    }, //create_v_buf;
 
    post_calc_exec: function (header_post_calc) {
        //restrict buffer to visible part
        v = postcalc.FILTER(v_buf, 0, 'g.isVisible(x)');

        //create abbreviations
        var i, abbrevs = 'var v0 = v[0];';
        var n = v_buf.length - 1;
        for (i = 1; i <= n; i++) {
            abbrevs += 'var v'+i+'=v['+i+'];';
        }

        //execute post calculation
        var form_calc, comp;
        var post_calc_len = header_post_calc.length;

        var result = '<table>\n';
        for (i = 0; i < post_calc_len; i++) {
            form_calc = header_post_calc[i].form_calc;
            comp = '';
            if (form_calc) {
                //console.log(form_calc);
                form_calc = form_calc.replace(/g\.isChanged\s*\(\s*x\s*\)/g, 
                                              'g.isChanged(x,x_last)');
                //console.log(form_calc);
                var c = abbrevs + form_calc;
                try {
                    /*jshint evil: true */
                    //console.log(c);
                    comp = eval(c);
                    /*jshint evil: false */
                } catch (err) {
                    comp = err.message;
                }
            }
            result += '<tr>'+
                '<td>' + (header_post_calc[i].text_calc || '') + '</td>'+
                '<td></td>'+
                '<td>' + comp + '</td></tr>'+
                '\n';
        }
        result += '</table>';

        document.getElementById('postcalcContents').innerHTML = result;
        ch_utils.buttonVisible('postcalcModal', true);
    }, // post_calc_exec

    FILTER: function (v_array, sensor, condition) {
        //console.log('FILTER', v_array, sensor, condition);
        var v_length = v_array.length;
        var v_ret = new Array(v_length).fill([]);
        if (typeof v_array === 'undefined') {return v_ret;}
        if (typeof v_array[0] === 'undefined') {return v_ret;}

        var n = -1;
        var len = v_array[0].length;
        for (var i = 0; i < len; i++) {
            var x = v_array[sensor][i];
            var x_last = v_array[sensor][i-1] || null;
            /*jshint evil: true */
            if (eval(condition))  {
            /*jshint evil: false */
                n++;
                for (var j = 0; j < v_length; j++) {
                    if (n === 0) {v_ret[j] = [];}
                    v_ret[j][n] = v_array[j][i];
                }
            }
        }
        //console.log(v_array);
        //console.log(v_ret);
        return v_ret;
    }, //FILTER

    SUM: function (sensarray, condition) {
        if (sensarray.length === 0) {
            return null;
        }

        function myFunc(total, x) {
            if (g.noNumber(x)) {
                x_last = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_last = x; return total;
                }
                /*jshint evil: false */
            }
            x_last = x;
            var n = x - 0;
            return total + n;
        }
        var x_last = null;
        return sensarray.reduce(myFunc, null);
    }, //SUM

    MAX: function (sensarray, condition) {
        if (sensarray.length === 0) {
            return '';
        }

        function myFunc(total, x) {
            if (g.noNumber(x)) {
                x_last = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_last = x; return total;
                }
                /*jshint evil: false */
            }
            x_last = x;
            var n = x - 0;
            return Math.max(total, n);
        }
        var x_last = null;
        return sensarray.reduce(myFunc, null);
    }, //MAX

    MIN: function (sensarray, condition) {
        if (sensarray.length === 0) {
            return '';
        }

        function myFunc(total, x) {
            if (g.noNumber(x)) {
                x_last = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_last = x; return total;
                }
                /*jshint evil: false */
            }
            x_last = x;
            var n = x - 0;
            return Math.min(total, n);
        }
        var x_last = null;
        return sensarray.reduce(myFunc, Number.MAX_VALUE);
    }, //MIN

    AVG: function (sensarray, condition) {
        if (sensarray.length === 0) {
            return '';
        }

        function myFunc(total, x) {
            if (g.noNumber(x)) {
                x_last = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_last = x; return total;
                }
                /*jshint evil: false */
            }
            x_last = x;
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
        var x_last = null;
        var count = 0;
        var sum = filtered.reduce(myFunc, null);
        //buid avg:
        var avg = sum / count;
        return avg;
    }, //AVG

    COUNT: function (sensarray, condition) {
        if (sensarray.length === 0) {return 0;}

        function myFunc(total, x) {
            if (x === null) {
                x_last = x; return total;
            }
            if (condition) {
                /*jshint evil: true */
                if (eval(condition) === false)  {
                    x_last = x; return total;
                }
                /*jshint evil: false */
            }
            x_last = x; return total + 1;
        }

        //filter not nulls:
        var filtered = sensarray.filter(function(x) {
            return x;
        });
        if (filtered.length === 0) {return 0;}

        //count all left entries:
        var x_last = null;
        var count = filtered.reduce(myFunc, null);
        return count;
    }, //COUNT

    FIRST: function (sensarray) {
        //console.log('FIRST', sensarray);
        if (typeof sensarray === 'undefined') {return '';}
        if (typeof sensarray[0] === 'undefined') {return '';}
        return sensarray[0];
    }, //FIRST

    LAST: function (sensarray) {
        //console.log('LAST', sensarray);
        if (typeof sensarray === 'undefined') {return '';}
        if (typeof sensarray[0] === 'undefined') {return '';}
        return sensarray[sensarray.length-1];
    }, //LAST
}; //postcalc

//abbrevations for the postcalc configuration
var FILTER = postcalc.FILTER;
var SUM = postcalc.SUM;
var MAX = postcalc.MAX;
var MIN = postcalc.MIN;
var AVG = postcalc.AVG;
var COUNT = postcalc.COUNT;
var FIRST = postcalc.FIRST;
var LAST = postcalc.LAST;

//2-dimensional sensor arrays
var v_buf;  //complete buffered, pointers to config
var v;      //visible part of v_buf, copy

