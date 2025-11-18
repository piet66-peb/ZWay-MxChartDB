/*jshint strict: false */
/*globals g, sv4, sv5, sv6 */

//displays the current time at the upper right corner
var x_pos = g.LAST();
var y_pos = g.lastTick();
var text = g.usertime(Date.now());
g.annotation.text('time', x_pos, y_pos, text);


