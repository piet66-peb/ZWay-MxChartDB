
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
//h Version:      V1.0.0 2024-12-28/peb
//v History:      V1.0.0 2024-12-16/peb first version
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals ch_utils */
'use strict';

//b version data
//--------------
var MODULE='chartjs_utils.js';
var VERSION='V1.0.0';
var WRITTEN='2024-12-28/peb';

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
            userTime: ch_utils.userTime,
            usertime: ch_utils.userTime,
            round:    ch_utils.round,
            nvl:      ch_utils.nvl,
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

}; //header_utils
