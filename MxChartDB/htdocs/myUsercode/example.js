/*jshint strict: false */
/*globals g */
var g = {
    //sticks the current sensor value to the curve at the current timestamp
    stick_value: function() {
        var timestamp = g.x0;
        var sensor = g.ix;
        var value = g.x;
        //console.log(sensor+' '+timestamp+' '+value);
        g.annotation.text(timestamp+'_'+sensor,
            timestamp,
            value,
            g.round(value, 2),
            'black',
            '#ffffff70',
            sensor
        );
        return value;
    }, //stick_value
};
