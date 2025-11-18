/*** MxChartDB V3.7.0 2025-11-14 Z-Way HA module *********************************/

//h-------------------------------------------------------------------------------
//h
//h Name:         index.js
//h Type:         Start code for Z-Way module MxChartDB.js
//h Purpose:      
//h Project:      Z-Way HA
//h Usage:
//h Remark:
//h Result:
//h Examples:
//h Outline:      
//h Resources:    MxBaseModule
//h Issues:
//h Authors:      peb piet66
//h Version:      V3.7.0 2025-11-14/peb
//v History:      V1.0.0 2024-06-29/peb first version
//h Copyright:    (C) piet66 2024
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------
/*jshint esversion: 5 */
/*globals inherits, _module: true, MxBaseModule, executeFile */

//h-------------------------------------------------------------------------------
//h
//h Name:         MxChartDB
//h Purpose:      class definition, inheritance.
//h
//h-------------------------------------------------------------------------------
function MxChartDB(id, controller) {
'use strict';
    // Call superconstructor first (AutomationModule)
    MxChartDB.super_.call(this, id, controller);

    this.MODULE='index.js';
    this.VERSION='V3.7.0';
    this.WRITTEN='2025-11-14/peb';
}
inherits(MxChartDB, MxBaseModule);
_module = MxChartDB;

//h-------------------------------------------------------------------------------
//h
//h Name:         init
//h Purpose:      module initialization.
//h
//h-------------------------------------------------------------------------------
MxChartDB.prototype.init = function(config) {
'use strict';
    MxChartDB.super_.prototype.init.call(this, config);
    var self = this;

}; //init

MxChartDB.prototype.init0 = function(config) {
'use strict';
    var self = this;

    //b include MxChartDB.js
    //-----------------------
    var f = 'MxChartDB.js';
    f = self.moduleBasePath() + '/' + f;
    self.log('reading '+f+'...');
	executeFile(f);

    //b module start
    //--------------
    self.start(config);
}; //init0

