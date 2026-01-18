
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
//h Version:      V3.8.0 2026-01-18/peb
//v History:      V1.0.0 2024-12-16/peb first version
//v               V3.1.2 2025-01-26/peb [+]post calc enhanced
//v               V3.4.0 2025-08-14/peb [+]annotation
//v               V3.4.1 2025-08-14/peb [x]MxC: bugfix
//v               V3.7.0 2026-01-02/peb [+]adHocCalc: syntax highlighting
//v                                     [+]ch_utils.show
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 9 */
/*globals ch_utils, suntimes, SunCalc, config, usedYScales, data, ts_last, imagesDefaultPath */
'use strict';

//b version data
//--------------
var MODULE='chartjs_utils.js';
var VERSION='V3.8.0';
var WRITTEN='2026-01-18/peb';

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
        var match = JSON.stringify(header).match(/MxC\s*\(/);
        if (!match) {
            match = JSON.stringify(header).match(/MxC_data/);
        }
        if (!match) {
            match = JSON.stringify(header).match(/MxC_horizontals/);
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
    MxC: function(MxC_name, ts, returntype) {
        function return_number(MxC_entry) {
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
        } //return_number

        if (!MxC_name) {return null;}
        var MxC_array = MxC_input[MxC_name];
        //console.log('typeof MxC_array='+typeof MxC_array);
        if (!MxC_array) {
            alert('MxC: unknown constant name ' + MxC_name);
            console.log('MxC: unknown constant name ' + MxC_name);
            console.log(JSON.stringify(MxC_input));
            return null;
        }
        //console.log(MxC_array);

        //real copy, cause otherwise reverse doesn't work:
        var MxC_name_data = JSON.parse(JSON.stringify(MxC_input[MxC_name]));
        //console.log(MxC_name_data);
        var len = MxC_name_data.length;
        //console.log('len='+len);
        if (len === 0) {
            if (returntype === 'array') {
                return [];
            } else {
                return null;
            }
        }

        //order according timestamp reverse
        MxC_name_data.reverse(function(a,b) { //sort:    -fist nulls
            return a[0]-b[0];                 //         - then others up
                                              //reverse: -first others down
                                              //         - then nulls
        });
        //console.log(MxC_name_data);
   
        //if current MxC version > 1.0.0
        var i;
        if (MxC_name_data[0].length !== 5) {
            //console.log('1.1.0');
            //if no timestamp required
            len = MxC_name_data.length;
            if (ts === undefined) {
                //return last value
                if (returntype === 'array') {
                    return MxC_name_data[0]; //MxC_name_data[len - 1];
                } else {
                    return return_number(MxC_name_data[0]); //return_number(MxC_name_data[len - 1]);
                }
            }

            //else if timestamp required
            for (i = 0; i < MxC_name_data.length; i++) {
                //take first match
                if (MxC_name_data[i][0] > 0 &&
                    ts >= MxC_name_data[i][0] &&
                    (MxC_name_data[i][2] === null ||
                        ts < MxC_name_data[i][2])) {
                    if (returntype === 'array') {
                        return MxC_name_data[i];
                    } else {
                        return return_number(MxC_name_data[i]);
                    }
                } else
                if (MxC_name_data[i][0] === null) {
                    if (returntype === 'array') {
                        return MxC_name_data[i];
                    } else {
                        return return_number(MxC_name_data[i]);
                    }
                }
            }
        //else if previuous MxC version == 1.0.0
        } else {
            //console.log('1.0.0');
            var ix_found, ret;
            if (ts === undefined) {
                ix_found = 0;
            } else {
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
    }, //MxC

    //h
    //h MxC_data
    //h returns the complete arry for the given constant name:
    //h entry array| [] = MxC_utils.MxC_data(MxC_name);
    //-------------------------------------------------------------------------
    MxC_data: function(MxC_name, ts) {
        if (ts !== undefined) {
            return MxC_utils.MxC(MxC_name, ts, 'array');
        }
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
        //console.log('take_global_code');

        var g_ini = {
            show:     ch_utils.show,
            notSet:   ch_utils.notSet,
            noNumber: ch_utils.noNumber,
            notChanged: ch_utils.notChanged,
            isChanged: ch_utils.isChanged,
            userTime: ch_utils.userTime,
            usertime: ch_utils.userTime,
            round:    ch_utils.round,
            nvl:      ch_utils.nvl,
            isVisible: function(x0) {
                var timeRange = header_utils.xRange();
                var ts_first_disp = Math.floor(timeRange.min),
                    ts_last_disp = Math.ceil(timeRange.max);
                if ( x0 >= ts_first_disp && x0 <= ts_last_disp) {
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
            yScaleID: yScales.yScaleID,
            firstTick: yScales.firstTick,
            lastTick: yScales.lastTick,
            //yMin: yScales.yMin,
            //yMax: yScales.yMax,
            //ticksArray: yScales.ticksArray,
            //ticksLabels: yScales.ticksLabels,
            //tickNumber: yScales.tickNumber,
            //scalesArray: yScales.scalesArray,
            //yScaleIDnvl: yScales.yScaleIDnvl,
            redraw: function(pos) {
                //console.log('redraw('+pos+')');
                //console.log('images_pending='+images_pending);
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
                console.log('do redraw('+pos+')');
                clearTimeout(imagesTimer);
                window.myLine.update();
            },
            MxC: MxC_utils.MxC,
            MxC_data: MxC_utils.MxC_data,
            //usedYScales: usedYScales,
            list: function(itemtype) {
                //shows all items of object g with type, sorted
                var keys = Object.keys(g).sort();
                var keysarr = [];
                var typeslist = {};
                //check all items og object g
                keys.forEach( function (key) {
                    var n = 'g.'+key;
                    /*jshint evil: true */
                    var t = eval('typeof '+n);
                    /*jshint evil: false */

                    var o;
                    if (t === 'object') {
                        /*jshint evil: true */
                        o = eval(n);
                        /*jshint evil: false */
                        if (o === null) {
                            t = 'null';
                        } else
                        if (Array.isArray(o)) {
                            t = 'array';
                        }
                    }

                    if (t === 'object') {
                        var keys2 = Object.keys(o).sort();
                        //check all subobjects
                        keys2.forEach( function (key2) {
                            var n2 = n+'.'+key2;
                            /*jshint evil: true */
                            var t2 = eval('typeof '+n2);
                            /*jshint evil: false */

                            var o2;
                            if (t2 === 'object') {
                                /*jshint evil: true */
                                o2 = eval(n2);
                                /*jshint evil: false */
                                if (o2 === null) {
                                    t2 = 'null';
                                } else
                                if (Array.isArray(o2)) {
                                    t2 = 'array';
                                }
                            }

                            if (!itemtype || 
                                t2.indexOf(itemtype) === 0) {
                                keysarr.push([n2, t2]);
                                typeslist[t2] = '1';
                            }
                        });
                    } else {
                        if (!itemtype || 
                            t.indexOf(itemtype) === 0) {
                            keysarr.push([n, t]);
                            typeslist[t] = '1';
                        }
                    }
                });

                //add function parameters
                var types = Object.keys(typeslist).sort();
                var out = '';
                types.forEach( function (type) {
                    if (out) {out += '\n\n';}
                    out += type+':';
                    keysarr.forEach( function (key) {
                        if (key[1] === type) {
                            out += '\n    '+key[0];
                            if (type === 'function') {
                                var f_def = '(...)';
                                if (['g.noNumber',
                                     'g.notSet',
                                     'g.show'].indexOf(key[0]) < 0) {
                                    /*jshint evil: true */
                                    f_def = eval(key[0]+'.toString();');
                                    /*jshint evil: false */
                                    f_def = f_def.replace(/\).*/sm, ")").
                                                  replace(/^.*\(/sm, "(").
                                                  replace('arg_list', '{arg_list}');
                                }
                                out += f_def;
                            }
                        }
                    });
                });
                return out;
            }, //list
        };

        if (!header.hasOwnProperty('global_js')) {
            g = g_ini;
        } else
        if (!header.global_js.define_global_js) {
            g = g_ini;
        } else {
            var comm ='';
            try {
                if (header.global_js.code) {
                    var g_tmp = {};
                    header.global_js.code = 
                        //header.global_js.code.replace(/\s*var\s+myUsercode\s+=\s*\n/, '');
                        header.global_js.code.replace(/^[^\{]*{/, '{');
                    comm = 'g_tmp = ' + header.global_js.code;
                    /*jshint evil: true */
                    eval(comm);
                    /*jshint evil: false */
                    comm = 'common.concatObjects';
                    common.concatObjects(g_ini, g_tmp);
                } else {
                    console.log('header_utils.take_global_code: no header.global_js.code defined!');
                }
                g = g_ini;
            } catch (err) {
                console.log(err.message);
                console.log('at '+comm);
                ch_utils.alertMessage(38, err.message);
                g = g_ini;
            }
        }
        //console.log(g);
    }, // take_global_code

    //h
    //h take_post_processing
    //h builds up the global object g with user defined code
    //h g = take_post_processing(<target object>, <chart header>);
    //-------------------------------------------------------------------------
    take_post_processing: function (header) {
        //console.log('take_post_processing');

        var pp_empty = function() {
            return;
        };
        var pp_first = [
"postprocess = function(pos) {\n",
"    console.log('postprocess('+pos+')');\n",
"    annotation_restrict_to_visible = true;\n",
"    try {\n",
"        ++pp_count;\n",
"        //console.log('pos=' + pos + ' pp_count=' + pp_count);\n",
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
"    annotation_restrict_to_visible = false;\n",
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
                comm += postcalc.abbrevs;
                //comm += ch_utils.convertToUTF8(header.post_processing.code);
                comm += header.post_processing.code;
                comm += pp_last;
                //console.log(comm);
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
    abbrevs: '',

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
        postcalc.abbrevs = '';
        for (i = 21; i <= n; i++) {
            postcalc.abbrevs += 'var sv'+i+'=sv['+i+'];';
        }
    }, //create_abbrevs_S;

    post_calc_exec: function (header_post_calc) {

        function exec_eval (form_calc) {
            //console.log('exec_eval form_calc='+form_calc);
            var comp, c = postcalc.abbrevs + form_calc;
            annotation_restrict_to_visible = true;
            try {
                /*jshint evil: true */
                //console.log(c);
                comp = eval(c);
                /*jshint evil: false */
            } catch (err) {
                comp = err.message;
            }
            annotation_restrict_to_visible = false;
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
        var html = [
            '<style>',
            'textarea {',
            '  resize: true;',
            '}',
            '</style>',
            '<div id="adHocCalcCodeI" >',
            'This function makes it possible to define and execute',
            '<br>ad hoc commands for evaluating the displayed data.',
            '<br>',
            'For further information see:',
            '<input id="adHocCalcHelp" type="button" value="Help" onclick="adHocCalc.Help();" />',
            '',
            '<input id="adHocCalcList" type="button" value="List" onclick="alert(g.list());" />',
            '',
            '<input id="adHocCalcList" type="button" value="MxC Constants" onclick="adHocCalc.MxC();" />',
            '',
            '<p><label for="adHocCalcCode">Javascript code:</label></p>',
            '',
            '<div style="border:1px solid black;">',
                '<code-input language="JavaScript">',
                    '<textarea data-code-input-fallback id="adHocCalcCode">',
                        adHocCode,
                    '</textarea>',
                '</code-input>',
            '</div>',
            '<br>',
            '<input id="adHocCalcBreak" type="button" value="Break" onclick="adHocCalc.Break();" />',
            '<input id="adHocCalcClear" type="button" value="Clear" onclick="adHocCalc.Clear();" />',
            '<input id="adHocCalcStore" type="button" value="Store" onclick="adHocCalc.Store();" />',
            '<input id="adHocCalcExecute" type="button" value="Execute" onclick="adHocCalc.Execute();" />',
            '</div>'
        ].join("\n");

        var ta = document.getElementById('adHocCalcCode');
        if (!document.getElementById("adHocCalcCode")) {
            document.getElementById('adHocCalcContents').innerHTML = html;
        }
        ch_utils.buttonVisible('adHocCalcModal', true);
        document.getElementById("adHocCalcCode").focus();
    },

    Help: function() {
        window.open('http:/ZAutomation/api/v1/load/modulemedia/MxChartDB/help_post_calc.html', '_blank');
    },
    MxC: function() {
        var url = './MxC.html';
        window.open(url, '_blank');
    },
    Break: function() {
        ch_utils.buttonVisible('adHocCalcModal', false);
    },
    Clear: function() {
        var ta = document.getElementById('adHocCalcCode');
        adHocCode = '';
        ta.value = adHocCode;
        ta.focus();
    },
    Store: function() {
        var ta = document.getElementById('adHocCalcCode');
        adHocCode = ta.value;
        ta.focus();
    },
    Return: function(cursorPos) {
        var ta = document.getElementById('adHocCalcCode');
        ta.focus();
        if (cursorPos !== undefined) {
            ta.setSelectionRange(cursorPos.start, cursorPos.end);
        }
    },
    Execute: function() {
        //save current cusor position
        var ta = document.getElementById('adHocCalcCode');
        //var cursorPos = {start: ta.selectionStart, end: ta.selectionEnd};

        adHocCode = ta.value;
        console.log(adHocCode);
        //every time ad hoc calc is called
        //we restrict buffer to visible part
        sv = undefined;
        sv = postcalc.FILTER(sv_buf, 0, 'g.isVisible(x)', 'sv');

        annotation_restrict_to_visible = true;
        try {
            /*jshint evil: true */
            var result = eval(postcalc.abbrevs + adHocCode);
            /*jshint evil: false */
            if (typeof result !== 'undefined' &&
                typeof result !== 'function') {
                g.show(result);
            }
        } catch(err) {
            g.show(err.message);
            console.log(err.message);
            console.log(adHocCode);
        }
        annotation_restrict_to_visible = false;
        adHocCalc.Return();
    },
}; //adHocCalc

var adHocCode = '';

document.getElementById('adHocCalcButton').onclick = function(event) {
    if (ch_utils.isVisible('adHocCalcModal')) {
        ch_utils.buttonVisible('adHocCalcModal', false);
        return;
    }
    adHocCalc.raiseModal();
}; //onclick adHocCalcButton

document.getElementById('adHocCalcPage').onclick = function(event) {
    adHocCalc.Return();
}; //onclick adHocCalcPage

//b yScales: helper functions for to check existing y scales
//----------------------------------------------------------
var yScales = {
    yScaleID: function (usedScale) {
    //returns the internal scale id
    //usage:
    //    = yScales.yScaleID(yScaleID);
    //    = yScales.yScaleID(sensor_no);
    //    = yScales.yScaleID([position: <right|left>,
    //                        type:     <number|text>]);
        //usedScale = sensor number:
        if (!isNaN(usedScale)) {
                return usedYScales.ids[usedScale];
        }
        //usedScale = scaleid:
        if (typeof usedScale === 'string' && 
            ['yUright', 'yUleft', 'yLright', 'yLleft'].indexOf(usedScale) >= 0) {
                return usedScale;
        }

        //usedScale = array:
        var par1, par2;
        if (typeof usedScale === 'object' && Array.isArray(usedScale)) {
                par1 = usedScale[0];
                par2 = usedScale[1];
        }

        var scaleid = 'y';
        if (par1 === 'number' || par2 === 'number') {
            scaleid += 'U';
        } else
        if (par1 === 'text' || par2 === 'text') {
            scaleid += 'L';
        } else {
            return undefined;
        }

        if (par1 === 'right' || par2 === 'right') {
            scaleid += 'right';
        } else
        if (par1 === 'left' || par2 === 'left') {
            scaleid += 'left';
        } else {
            return undefined;
        }
        return scaleid;
    }, //yScaleID

    scalesArray: function(position, type) {
    //usage:
    //    yScales.scalesArray(position: <right|left>,
    //                        type: <number|text>,
    //    );
        //console.log('yScales.scalesArray: '+position+' '+type);
        var scalesArray = [];
        var scaleIds = Object.keys(config.options.scales);
        console.log(scaleIds);

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
            scalesArray.push(scale);
        }

        //console.log(scalesArray);
        //console.log(usedYScales);
        return scalesArray;
    }, //scalesArray

    yScaleIDnvl: function (yScaleID) {
        //returns the id of the y scale, checks if displayed
        //if not displayed: a default id
        yScaleID = yScales.yScaleID(yScaleID);

        if (!yScaleID || !config.options.scales[yScaleID].display) {
            var avail_scales = yScales.scalesArray();
            if (avail_scales.length > 0) {
                yScaleID = avail_scales[0];
            }
        }
        return yScaleID;
    }, //yScaleIDnvl;

    ticksArray: function (yScaleID) {
        //returns the array of ticks for the given y scale
        yScaleID = yScales.yScaleIDnvl(yScaleID);
        if (!yScaleID) { return undefined; }

        var myChart = window.myLine;
        return myChart.scales[yScaleID].ticks;
    }, //ticksArray;

    firstTick: function (yScaleID) {
        //returns the first tick for the given y scale
        var ticksArray = yScales.ticksArray(yScaleID);
        if (!ticksArray) { return undefined; }

        var tick = ticksArray[0].value;
        return tick;
    }, //firstTick;

    lastTick: function (yScaleID) {
        //returns the last tick for the given y scale
        var ticksArray = yScales.ticksArray(yScaleID);
        if (!ticksArray) { return undefined; }

        var tick = ticksArray[ticksArray.length-1].value;
        return tick;
    }, //lastTick;

/* not used
    yScaleIDtest: function (usedScale) {
    //returns the id of the y scale, checks if displayed
    //if not displayed: undefined
    //usage:
    //  = yScaleIDtest(usedScale);
        var yScaleID = g.yScaleID(usedScale);
        if (!yScaleID) {
            return undefined;
        }
        if (!config.options.scales[yScaleID].display) {
            return undefined;
        }
        return yScaleID;
    }, //yScaleIDtest;

    yMin: function (yScaleID) {
        //returns the minimum y value for the given y scale
        yScaleID = yScales.yScaleIDtest(yScaleID);
        if (!yScaleID) { return undefined; }

        var myChart = window.myLine;
        var yMin = myChart.scales[yScaleID].min;
        return yMin;
    }, //yMin;

    yMax: function (yScaleID) {
        //returns the maximum y value for the given y scale
        yScaleID = yScales.yScaleIDtest(yScaleID);
        if (!yScaleID) { return undefined; }

        var myChart = window.myLine;
        var yMax = myChart.scales[yScaleID].max;
        return yMax;
    }, //yMin;
*/
/* experimental
    ticksLabels: function (yScaleID) {
        //returns the array of tick labels for the given y scale
        //!!!! only returns string labels, not images !!!!
        var ticksArray = yScales.ticksArray(yScaleID);
        var labels;
        if (ticksArray.length > 0) {
            labels = ticksArray.map(function(tick) { return tick.label; });
        }
        return labels;
    }, //ticksLabels;

    tickNumber: function (label, yScaleID) {
        //returns the tick for the given y label and the given y scale
        //!!!! only returns string labels, not images !!!!
        //sensor_no?
        if (!isNaN(yScaleID)) {
            yScaleID = g.yScaleID(yScaleID);
        }
        if (config.options.scales[yScaleID].display !== true) {
            return undefined;
        }
        var labels = yScales.ticksLabels(yScaleID);
        var myChart = window.myLine;
        var tickNumber = labels.indexOf(label);
        return tickNumber;
    }, //tickNumber;
*/
}; //yScales

//b annotation: adds or deletes an annotation to chart,js config
//--------------------------------------------------------------
var annotation_restrict_to_visible = false;
    //due to an issue in the annotation plugin 2.1.0 (chart.js 3.9.1)
    //(some label fragments remain visible)
    //we restrict annotation.line in post processing to the visible part
var annotation = {
    fixed: {},  
    //all annotations fixed to a sensor label

    del: function(id) {
    //usage:
    //    annotation.del(<unique annotation id>);
        //console.log('annotation.del('+id+')');
        config.options.plugins.annotation.annotations[id] = undefined;
    }, //del

    point: function(id, arg_list) {
    //usage:
    //    annotation.point(<unique annotation id>,   //for storing the annotation, mandatory
    //                     {xValue: <x value>,
    //                      yValue: <y value>,
    //                      usedYScale: <used scale>,
    //                      pointStyle: <'cross'|'crossRot'|'dash'|'line'|'rect'|'rectRounded'|'retRot'|'star'|'triangle'|false>,
    //                      radius: <point radius in pixels>
    //                      color: <color>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //                      fix: <sensor no>    //fix to sensor label
    //    });
        //console.log('annotation.point');
        //console.log('annotation.point: pointStyle='+arg_list.pointStyle+'/'+
        //        arg_list.usedYScale);
        if (!arg_list || 
            typeof arg_list !== 'object' ||
            typeof id !== 'string'
           ) {
            alert('parameter error in function annotation.point({}) !');
            return;
        }

        if (arg_list.hide === undefined) {arg_list.hide = true;}
        var anno_config = {
            drawTime: arg_list.drawTime || 'afterDatasetsDraw',
            type: 'point',
            backgroundColor: 'transparent',
            borderColor: arg_list.color,
            borderWidth: 5,
            pointStyle: arg_list.pointStyle,
            radius: arg_list.radius,
            xScaleID: 'x',
            yScaleID: yScales.yScaleID(arg_list.usedYScale),
            xValue: arg_list.xValue,
            yValue: arg_list.yValue,
            click: function(e) { 
                        config.options.plugins.annotation.annotations[id+''].drawTime = null;
                        window.myLine.update();
            },
        };
        if (!arg_list.hide) {
            anno_config.click = false;
        }
        config.options.plugins.annotation.annotations[id+''] = anno_config;

        // fix annotation to sensor label
        if (arg_list.fix) {
            if (typeof annotation.fixed[arg_list.fix] === 'undefined') {
                annotation.fixed[arg_list.fix] = [id];
            } else {
                annotation.fixed[arg_list.fix].push(id);
            }
            //console.log(JSON.stringify(annotation.fixed));
        }
    }, //point

    label: function(id, arg_list) {
    //usage:
    //    annotation.label(<unique annotation id>,   //for storing the annotation, mandatory
    //                     {xValue: <x value>,
    //                      yValue: <y value>,
    //                      content: <string|string[]|HTMLCanvasElement>,
    //                      color: <color>,
    //                      backgroundColor: <backgroundColor>,
    //                      usedYScale: <used scale>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.label');
        if (!arg_list || 
            typeof arg_list !== 'object' ||
            typeof id !== 'string'
           ) {
            alert('parameter error in function annotation.label({}) !');
            return;
        }

        /*
g.annotation.label('test', {content: ['line 1', 'line 2'], 
                    color: 'green', 
                    backgroundColor: 'lightGreen',
                    hide: true});
g.redraw();
         * */

        if (arg_list.hide === undefined) {arg_list.hide = true;}
        var anno_config = {
            drawTime: arg_list.drawTime || 'afterDatasetsDraw',
            type: 'label',
            xValue: arg_list.xValue,
            yValue: arg_list.yValue,
            color: arg_list.color || 'black',
            backgroundColor: arg_list.backgroundColor || 'transparent',
            content: arg_list.content,
            font: {
                size: 18
            },
            xScaleID: 'x',
            yScaleID: yScales.yScaleID(arg_list.usedYScale),
            click: function(e) { 
                        config.options.plugins.annotation.annotations[id+''].drawTime = null;
                        window.myLine.update();
            },
        };
        if (!arg_list.hide) {
            anno_config.click = false;
        }
        config.options.plugins.annotation.annotations[id+''] = anno_config;
    }, //label

    image: function(id, arg_list) {
    //usage:
    //    annotation.image(<unique annotation id>,   //for storing the annotation, mandatory
    //                     {xValue: <x value>,
    //                      yValue: <y value>,
    //                      image: <image>,
    //                      width: <pixel>,
    //                      hight: <pixel>,
    //                      borderColor: <borderColor>,
    //                      backgroundColor: <backgroundColor>,
    //                      usedYScale: <used scale>,
    //                      drawTime: <drawTime>,
    //                      hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.image');
        if (!arg_list || 
            typeof arg_list !== 'object' ||
            typeof id !== 'string'
           ) {
            alert('parameter error in function annotation.image({}) !');
            return;
        }

        if (arg_list.hide === undefined) {arg_list.hide = true;}
        var anno_config = {
            drawTime: arg_list.drawTime || 'afterDatasetsDraw',
            type: 'label',
            xValue: arg_list.xValue,
            yValue: arg_list.yValue,
            width: arg_list.width || 100,
            height: arg_list.height || 100,
            //content: img,
            borderWidth: 1,
            borderDash: [6, 6],
            borderColor: arg_list.borderColor || 'transparent',
            backgroundColor: arg_list.backgroundColor || 'transparent',
            xScaleID: 'x',
            yScaleID: yScales.yScaleID(arg_list.usedYScale),
            click: function(e) { 
                        config.options.plugins.annotation.annotations[id+''].drawTime = null;
                        window.myLine.update();
            },
        };
        if (!arg_list.hide) {
            anno_config.click = false;
        }

        //load image
        const img = new Image();
        var ignore_default = true;
        img.src = images.addPath(arg_list.image, ignore_default);
        ++images_pending;

        //check for error on image load
        img.onerror = function() {
            //console.log('onerror');
            if (arg_list.image !== 'placeholder') {
                img.src = images.addPath('placeholder');
            } else {
                --images_pending;
            }
        };

        //wait till image loaded
        img.onload = function() {
            //console.log('onload');
            anno_config.content = img;
            config.options.plugins.annotation.annotations[id+''] = anno_config;
            --images_pending;
        };
    }, //image
/*
g.annotation.image('test', 
   {image: 'icon.png', 
    //image: ',/myIcons/bath.png', 
    //image: 'caution', 
    //image: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Database_icon_shortcut.png?20110724224416',
});
g.redraw(9);
*/

    line: function(id, arg_list) {
    //usage:
    //    annotation.line(<unique annotation id>,   //for storing the annotation, mandatory
    //                    {xMin: <x min value>,
    //                     xMax: <x max value>,
    //                     yMin: <y min value>,
    //                     yMax: <y max value>,
    //                     borderWidth: <line width in pics>,
    //                     usedYScale: <used scale>,
    //                     text: <text>,
    //                     text_color: <text color>,
    //                     text_background: <text background color>,
    //                     arrow_start: <true|false>,  //add arrow at line start
    //                     arrow_end: <true|false>,  //add arrow at line end
    //                     drawTime: <drawTime>,
    //                     hide: <true|false>  //hide line at click
    //                     fix: <sensor no>    //fix to sensor label
    //    });
        //console.log('annotation.line');
        if (!arg_list || 
            typeof arg_list !== 'object' ||
            typeof id !== 'string'
           ) {
            alert('parameter error in function annotation.line({}) !');
            return;
        }

        if (arg_list.hide === undefined) {arg_list.hide = true;}
        if (!g.notSet(arg_list.text) && typeof arg_list.text === 'number') {
            arg_list.text = arg_list.text+'';
        }
        id = id+'';
        var anno_config = {
            drawTime: arg_list.drawTime || 'afterDatasetsDraw',
            type: 'line',
            borderColor: 'black',
            borderDash: [6, 6],
            borderWidth: arg_list.borderWidth || 1,
            label: {
                display: true,
                backgroundColor: arg_list.text_background,
                borderRadius: 0,
                color: arg_list.text_color,
                content: arg_list.text,
            },
            arrowHeads: {
                start: {
                    display: arg_list.arrow_start,
                    fill: true,
                    borderDash: [],
                    borderColor: 'black'
                },
                end: {
                    display: arg_list.arrow_end,
                    fill: true,
                    borderDash: [],
                    borderColor: 'black'
                }
            },
            xScaleID: 'x',
            yScaleID: yScales.yScaleID(arg_list.usedYScale),
            xMin: arg_list.xMin,
            xMax: arg_list.xMax,
            yMin: arg_list.yMin,
            yMax: arg_list.yMax,
            click: function(e) { 
                        config.options.plugins.annotation.annotations[id].drawTime = null;
                        window.myLine.update();
            },
        };
        if (!arg_list.hide) {
            anno_config.click = false;
        }

        //annotation_restrict_to_visible:
        //  due to a bug in annotation.box + annotation.line we have to restrict
        //  this annotation to the visible part
        if (annotation_restrict_to_visible) {
            //console.log(id+' '+anno_config.label.content);
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
                //console.log('annotation.line: skip/ delete '+id);
                annotation.del(id);
                return;
            }
        }        
        
        //console.log('create line '+id);
        config.options.plugins.annotation.annotations[id] = anno_config;

        // fix annotation to sensor label
        if (arg_list.fix) {
            if (typeof annotation.fixed[arg_list.fix] === 'undefined') {
                annotation.fixed[arg_list.fix] = [id];
            } else {
                annotation.fixed[arg_list.fix].push(id);
            }
            //console.log(JSON.stringify(annotation.fixed));
        }
    }, //line

    box: function(id, arg_list) {
    //usage:
    //    annotation.box(<unique annotation id>, //mandatory
    //                   {xMin: <x min value>,
    //                    xMax: <x max value>,
    //                    yMin: <y min value>,
    //                    yMax: <y max value>,
    //                    usedYScale: <used scale>,
    //                    backgroundColor: <color>,
    //                    borderWidth: <line width in pics>,
    //                    drawTime: <drawTime>,
    //                    hide: <true|false>  //hide point at click
    //    });
        //console.log('annotation.box: '+id+', '+arg_list.usedYScale);
        if (typeof id !== 'string' ||
            !arg_list || 
            typeof arg_list !== 'object'
           ) {
            alert('parameter error in function annotation.box({}) !');
            return;
        }

        var anno_config = {
            drawTime: arg_list.drawTime || 'afterDatasetsDraw',
            type: 'box',
            xMin: arg_list.xMin,
            xMax: arg_list.xMax,
            yMin: arg_list.yMin,
            yMax: arg_list.yMax,
            xScaleID: 'x',
            yScaleID: yScales.yScaleID(arg_list.usedYScale),
            backgroundColor: arg_list.backgroundColor,
            borderWidth: arg_list.borderWidth,
            click: function(e) { 
                        config.options.plugins.annotation.annotations[id+''].drawTime = null;
                        window.myLine.update();
            },
        };
        if (!arg_list.hide) {
            anno_config.click = false;
        }

        if (annotation_restrict_to_visible) {
        //annotation_restrict_to_visible:
        //  due to a bug in annotation.box + annotation.line we have to restrict
        //  this annotation to the visible part
            //console.log(id);
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
                //console.log('annotation.box: skip/ delete '+id);
                annotation.del(id);
                return;
            }
        }        

        //console.log('annotation.box: create '+id);
        config.options.plugins.annotation.annotations[id+''] = anno_config;
        //console.log(config.options.plugins.annotation.annotations[id+'']);
        //console.log(config.options.plugins.annotation.annotations);
    }, //annotation.box

    horizontal: function(id, y_pos, text, text_color, text_background, usedYScale) {
        g.annotation.line(id,
           {xMin: null, xMax: null, yMin: y_pos, yMax: y_pos,
            text: text || g.round(y_pos, 2),
            text_color: text_color || 'green',
            text_background: text_background || 'lightGreen',
            usedYScale: usedYScale,
            hide: true,
        });
    }, //horizontal

    vertical: function(id, x_pos, text, text_color, text_background, usedYScale) {
        if (!x_pos) {
            x_pos = Date.now();
            if (!text) {
                text = g.usertime(x_pos);
            }
        }
        if (usedYScale) {
            g.annotation.line(id,
               {xMin: x_pos, xMax: x_pos,
                text: text,
                text_color: text_color || 'green',
                text_background: text_background || 'lightGreen',
                usedYScale: usedYScale,
                hide: true,
            });
        } else {
            //get visible y scales
            var scales = yScales.scalesArray('right');
            var scalesLeft = yScales.scalesArray('left');
            if (scalesLeft.length > scales) {
                scales = scalesLeft;
            }

            //add to all scales 
            for (var i = 0; i < scales.length; i++) {
                var text_i = scales[i].indexOf('U') > 0 ? text : undefined;
                g.annotation.line(id+'_'+i,
                   {xMin: x_pos, xMax: x_pos,
                    text: text_i,
                    text_color: text_color || 'green',
                    text_background: text_background || 'lightGreen',
                    usedYScale: scales[i],
                    hide: true,
                });
            }
        }
    }, //vertical

    text: function(id, x_pos, y_pos, text, text_color, text_background, usedYScale, sensor_no) {
    //adds a text to the chart at the special position
        g.annotation.line(id,
           {xMin: x_pos, xMax: x_pos, yMin: y_pos, yMax: y_pos,
            text: text || g.round(y_pos, 2),
            text_color: text_color || 'green',
            text_background: text_background || 'lightGreen',
            usedYScale: usedYScale,
            hide: true,
            fix: sensor_no
        });
    }, //text

    sensor_value: function(arg_list) {
        //fixes the sensor value as a black text to a sensor chart at the special position
        //usage: 
        //annotation.sensor_value({id: <id>,
        //                        x_pos: <x_pos>, 
        //                        sensor_no: <sensor_no>, 
        //                        sensor_value: <sensor_value>, 
        //                        text_color: <text_color>, 
        //                        text_background: <text_background>});
        var x_pos = arg_list.x_pos || g.x0;
        var sensor_no = arg_list.sensor_no || g.ix;
        var sensor_value = arg_list.sensor_value;
        sensor_value = sensor_value === undefined ? g.x : sensor_value;
        var id = arg_list.id || sensor_no+'_'+x_pos;
        if (sensor_value !== null) {
            g.annotation.line(id,
               {xMin: x_pos, xMax: x_pos, 
                yMin: sensor_value, yMax: sensor_value,
                text: g.round(sensor_value, 2),
                text_color: arg_list.text_color || 'black',
                text_background: arg_list.text_background || 'transparent',
                usedYScale: sensor_no,
                hide: false,
                fix: sensor_no
            });
        }
    }, //sensor_value

    MxC_horizontals: function(MxC_name, label, usedYScale) {
    //draws horizontals for the MxC data Preis
     //console.log('annotation.MxC_horizontals '+ MxC_name + ' '+ label);

     //read all entries for this name, sorted in ascending timstamp
     var arr = g.MxC_data.apply(null, [MxC_name]).sort();
     //console.log(arr);

     //evaluate entries:
     var lines = [];
     for (var i = 0; i < arr.length; i++) {
         var xMin = arr[i][0];
         var xMax = arr[i][2];
         var value = arr[i][4];

         var param = 
            {xMin: xMin,
             xMax: xMax,
             yMin: value,
             yMax: value,
             text: label + ' ' + value,
             text_color: 'green',
             text_background: 'lightGreen',
             usedYScale: usedYScale,
         };
         if (i > 0) {
             lines[i-1].xMax = xMin;
         }
         console.log(param);
         lines.push(param);
     }
     
     //display all lines
     for (i = 0; i < lines.length; i++) {
         g.annotation.line(label + i, lines[i]);
     }
    }, //MxC_horizontals

}; //annotation

//b images: functions conserning images
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

        var extension = icon.split('.').pop();

        //no path and no extension
        if (icon.indexOf('/') < 0 && icon.indexOf('.') < 0) {
            icon =  zwayIcons + icon + '.png';
        } else

        //extension # .png
        if (extension !== 'png') {
            icon =  icon;
        } else

        //htdocs no path
        if (icon.indexOf('/') < 0) {
            icon =  modulemedia + def +icon;
        } else

        //htdocs relative path
        if (icon.indexOf('./') === 0) {
            icon =  modulemedia + def +icon;
        } else

        //htdocs relative path
        if (icon.indexOf('../') === 0) {
            icon =  modulemedia + def +icon;
        }

        //anything else
        return icon;
    } //addPath
}; //images

//b nightTimes: compute sunrise and sunset array depending date, longitude, latitude
//----------------------------------------------------------------------------------
var nightTimes = {
    nightBoxes: [],
    annotations: function (pos) {
    //usage:
    //    nightTimes.annotations();
        //console.log('nightTimes.annotations ('+pos+')');

        //delete old annotation boxes
        //console.log('delete old nights');
        nightTimes.nightBoxes.forEach(function (el, index) {
            annotation.del(el);
        });
        nightTimes.nightBoxes = [];

        //build new nightArray
        var nightArray = [];
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

        var min = 1000 *60;
        for (var i= 0; i < days; i++) {
            nightArray.push(
                [Math.round(nightTimes.sunset(day_first + i * day_length)/min)*min, 
                 Math.round(nightTimes.sunrise(day_first + (i+1) * day_length)/min)*min]);
        }
        //console.log(nightArray);

        var scaleList = ['yUright', 'yLright','yUleft', 'yLleft'];
        var yScaleIDs = [], weight1;
        for (i = 0; i < scaleList.length; i++) {
            if (config.options.scales[scaleList[i]].display === true) {
                if (!weight1) {
                    weight1 = config.options.scales[scaleList[i]].stackWeight;
                    yScaleIDs.push(scaleList[i]);
                    if (weight1 === undefined) {break;}
                } else {
                    if (config.options.scales[scaleList[i]].stackWeight !== weight1) {
                        yScaleIDs.push(scaleList[i]);
                        break;
                    }
                }
            }
        }
        //console.log('nightTimes', yScaleIDs);

        //add night backgrounds
        //console.log('add new nights');
        annotation_restrict_to_visible = true;
        yScaleIDs.forEach(function(scaleid, ix1) {
            nightArray.forEach(function(night, ix) {
                var id = 'night_'+scaleid+'_'+night[0];
                //console.log('==== create night id='+id);
                annotation.box(id, 
                               {xMin: night[0], 
                                xMax: night[1],
                                backgroundColor: ch_utils.night.backColor || '#cccccc60',
                                usedYScale: scaleid,
                                borderWidth: 0,
                                drawTime: 'beforeDatasetsDraw',
                                hide: false});
                nightTimes.nightBoxes.push(id);
            });
        });
        annotation_restrict_to_visible = false;
        //console.log(config.options.plugins.annotation.annotations);
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

/*
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
//var ticksArray = yScales.ticksArray;
//var ticksLabels = yScales.ticksLabels;
//var tickNumber = yScales.tickNumber;
//var yScaleID = yScales.yScaleID;
*/

//2-dimensional sensor arrays
var sv_buf;  //complete buffered, pointers to config
var sv;      //visible part of sv_buf, copy
var sv0, sv1, sv2, sv3, sv4, sv5, sv6, sv7, sv8, sv9, sv10;
var sv11, sv12, sv13, sv14, sv15, sv16, sv17, sv18, sv19, sv20;

//sensor labels
var sl = [];

