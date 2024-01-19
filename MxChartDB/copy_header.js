/*** MxChartDB copy_header.js */

//h-------------------------------------------------------------------------------
//h
//h Name:         copy_header.js
//h Type:         copy definitions of a MxChartJS instance
//h Project:      Z-Way HA
//h Usage:        
//h Remark:       
//h Result:       
//h Examples:     
//h Outline:      
//h Resources:    
//h Issues:       
//h Authors:      peb piet66
//h Version:      V1.0.1 2022-04-09/peb
//v History:      V1.0.0 2022-03-23/peb first version
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h 
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
'use strict';

//-----------
//b Constants
//-----------
//var MODULE='copy_header.js';
//var VERSION='V1.0.1';
//var WRITTEN='2022-04-09/peb';

//-----------
//b Functions
//-----------
var copy_header = function (self) {
    //self.log('*** copy_header');

    var inst;
    var num = self.config.copyMxChartJS.instanceNum;
    self.info('num='+self.config.copyMxChartJS.instanceNum);

    //b look for source instance
    //--------------------------
    Object.keys(self.controller.instances).forEach(function(ix) {
        var i = self.controller.instances[ix];
        if (i.id === num && i.moduleId === 'MxChartJS') {
            inst = i;
        }
    });

    if (!inst) {
        var err = 'no MxChartJS instance no='+num+' found!';
        self.notifyError(err);
        return false;
    }
    self.log(inst.params);

    //b copy
    //------
    function copyItem(name) {
        if (inst.params[name] !== undefined) {
            self.config[name] = inst.params[name];
            self.log(name+' copied.');
        } else {
            self.config[name] = null;
        }
    }
    function copyObj(name) {
        if (inst.params[name] !== undefined) {
            self.config[name] = self.realCopyObject(inst.params[name]);
            self.log(name+' copied.');
        } else {
            self.config[name] = [];
        }
    }
    ["chartTitle",
     "lang",
     "switch",
     "period",
     "startFullTimes",
     "interval",
     "initialInterval",
     "time_label",
     "rectangleDevices",
     "positionYAxis",
     "limitYAxis",
     "y1Label",
     "y2Label",
     "opacity"].forEach (function (name) {copyItem(name);});

    ["nonnumericLabels",
     "sensors"].forEach (function (name) {copyObj(name);});

    self.config.copyMxChartJS.copyChart = false;

    return true;
}; //copy_config
