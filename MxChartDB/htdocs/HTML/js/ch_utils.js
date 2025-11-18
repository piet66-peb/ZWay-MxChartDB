
//h-------------------------------------------------------------------------------
//h
//h Name:         ch_utils.js
//h Type:         Javascript module
//h Purpose:      utilities for ZWay html modules
//h Project:      ZWay
//h Usage:
//h Remark:
//h Result:
//h Examples:
//h Outline:
//h Resources:
//h Platforms:    independent
//h Authors:      peb piet66
//h Version:      V3.3.1 2025-11-15/peb
//v History:      V1.0.0 2022-01-02/peb first version
//v               V3.3.1 2025-11-11/peb [x]notSet
//h Copyright:    (C) piet66 2022
//h License:      http://opensource.org/licenses/MIT
//h
//h-------------------------------------------------------------------------------

/*jshint esversion: 5 */
/*globals messageFormats, ixButtonTextBase, escape, constants */
'use strict';

//-----------
//b Constants
//-----------
var MODULE='ch_utils.js';
var VERSION='V3.3.1';
var WRITTEN='2025-11-15/peb';

//-----------
//b Functions
//-----------
var ch_utils = {
    lang: null,
    isAdmin: null,
    isAdminOld: null,
    url: null,
    urlOld: null,
    userpass: null,
    night: null,

    //workaround for server issue:
    //convert from charset ISO-8859-1 to utf-8
    //cause ZWay server ignores the utf-8 directive in modulemedia folder:
    convertCharset: false, //convert from charset ISO-8859-1 to utf-8
    convertToUTF8: function (text) {
        try{
            //if the string is utf-8, this will work and not throw an error.
            var fixedstring = JSON.parse(decodeURIComponent(escape(JSON.stringify(text))));
            ch_utils.convertCharset = true;
            console.log('charset converted from ISO-8859-1 to utf-8');
            return fixedstring;
        }catch(e){
            //if it isn't, an error will be thrown, and we can assume that we have an ISO string.
            console.log('charset=utf-8');
            return text;
        }
    },  //convertToUTF8

    //convert all message formats
    convertMessagesToUTF8: function () {
        var f;
        messageFormats.forEach(function (messFormat, formatIx) {
            Object.keys(messFormat).forEach(function(lang) {
                try {
                    f = messageFormats[formatIx][lang];
                    messageFormats[formatIx][lang] = JSON.parse(decodeURIComponent(escape(JSON.stringify(f))));
                } catch(err) {
                }
            });
        });
    }, //convertMessagesToUTF8

    //check whether running on a mobile
    isMobile: function () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, //isMobile

    //check if any argument is not set (undefined or null)
    notSet: function() {
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'undefined' ||
                arguments[i] === undefined ||
                arguments[i] === null ||
                typeof arguments[i] === 'string' &&  
                    arguments[i].trim() === ''
            ) {
                return true;
            }
        }
        return false;
    }, //notSet

    //check if any argument is not set (undefined or null) or no number
    noNumber: function() {
        var ret = false;
        for (var i = 0; i < arguments.length; i++) {
            if ((arguments[i] === undefined ||
                arguments[i] === null ||
                typeof arguments[i] === 'string' &&  
                    arguments[i].trim() === '' ||
                isNaN(arguments[i]))) {
                ret = true;
                break;
            }
        }
        return ret;
    }, //noNumber

    //check if any argument is not set (undefined or null) or no number
    notChanged: function(val1, val2) {
        var ret = false;
        if (val1 === val2) {ret = true;}
        return ret;
    }, //notChanged

    isChanged: function(val1, val2) {
        //console.log(val1, val2, !ch_utils.notChanged(val1, val2));
        return !ch_utils.notChanged(val1, val2);
    }, //isChanged

    //round a value to the given amount of decimals
    round: function(value, decimals) {
        return +(value.toFixed(decimals));
    }, //round

    //returns a default value
    nvl: function(value, defaultvalue) {
        if (!ch_utils.notSet(value)) {return value;} 
        if (!ch_utils.notSet(defaultvalue)) {return defaultvalue;} 
        return null;
    }, //notSet

    evalConstants: function () {
        var consts = {
            username: btoa(constants.username),
            password: btoa(constants.password),
            userpass: btoa(constants.username+':'+constants.password),
            ip:       constants.ip,
            hostname: constants.hostname,
            port:     constants.port,
            index:    {},
            admin:    {},
            snapshots:{},
            snapshots_possible: false,
            standard_display:{},
            frame:{},
            modal:{},
            mobile:{},
            night:{},
        };
        if (constants.hasOwnProperty('browser_client')) {
            var cbc = constants.browser_client;
            if (cbc.ip) {
                consts.ip = cbc.ip;
            }
            if (cbc.hostname) {
                consts.hostname = cbc.hostname;
            }
            if (cbc.hasOwnProperty('index')) {
                consts.index =  cbc.index;
            }
            if (cbc.hasOwnProperty('admin')) {
                consts.admin =  cbc.admin;
            }
            if (cbc.hasOwnProperty('snapshots')) {
                consts.snapshots = cbc.snapshots;
                if (cbc.snapshots.database_name) {
                    consts.snapshots_possible = true;
                }
            }
            if (cbc.hasOwnProperty('standard_display')) {
                consts.standard_display = cbc.standard_display;
            }
            if (cbc.hasOwnProperty('modal')) {
                consts.modal = cbc.modal;
            }
            if (cbc.hasOwnProperty('frame')) {
                consts.frame = cbc.frame;
            }
            if (cbc.hasOwnProperty('mobile')) {
                consts.mobile = cbc.mobile;
            }
            if (cbc.hasOwnProperty('night')) {
                consts.night = cbc.night;
                ch_utils.night = consts.night;
            }
        }
        if (!consts.ip && !consts.hostname || ! consts.port) {
            consts = 'constants.js: no ip/hostname or port defined, break,';
            alert('errtext');
        } else {
            consts.api = (consts.ip || consts.hostname)+':'+consts.port;
            if (!consts.snapshots.database_name) {
                consts.snapshots.database_name = 'Snapshots';
            }
            if (consts.snapshots.admin_required === undefined) {
                consts.snapshots.admin_required = true;
            }
            ch_utils.userpass = consts.userpass;
        }
        return consts;
    }, //evalConstants

    getLanguage: function () {
        //get html language
        var lang = document.getElementsByTagName('html')[0].getAttribute('lang') ||   //html language
                   navigator.language || navigator.userLanguage || 'en';
        if (lang.indexOf('-') > 0) {
            lang = lang.substr(0,lang.indexOf('-'));
        }
        //set default language, if no language texts are defined
        if (!messageFormats[0].hasOwnProperty(lang)) {
            lang = 'en';
        }
        this.lang = lang;
        return lang;
    }, //getLanguage

    getCookie: function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                //console.log(name, c.substring(0));
                return c.substring(name.length, c.length);
            }
        }
        return undefined;
    }, //getCookie

    checkLoggedIn: function (go_on, acceptBasicLogin) {
        //return: go_on(sessionId, isAdmin, username);
        //first check for ZWAYSession
        var sessionId, isAdmin, username, smarthomeLoggedIn, url; 
        sessionId = ch_utils.getCookie('ZWAYSession');
        //alert('sessionId='+sessionId);
        if (!sessionId && acceptBasicLogin) {
            url = '/ZAutomation/api/v1/profiles';
            ch_utils.ajax_get(url, success, fail);
        } else
        if (!sessionId) {
            ch_utils.isAdmin = isAdmin;
            go_on(sessionId, isAdmin, username);
        } else {
            var user = ch_utils.getCookie('user');
            if (user) {
                var userArray = JSON.parse(user);
                username = userArray.name;
                isAdmin = userArray.role === 1 ? true : false;
                ch_utils.isAdmin = isAdmin;
                go_on(sessionId, isAdmin, username);
            } else {
                url = '/ZAutomation/api/v1/profiles';
                ch_utils.ajax_get(url, success, fail);
            }
        }
        function fail(status, responseText) {
            ch_utils.displayString('checkLoggedIn: '+
                status+' '+responseText);

            ch_utils.isAdmin = isAdmin;
            go_on(sessionId, isAdmin, username);
        }
        function success(data) {
            var profileInput = data;
            if (profileInput.data.length > 1) {
                isAdmin = true;
            } else {
                username = profileInput.data[0].name;
                if (profileInput.data[0].role === 1) {
                    isAdmin = true;
                } else {
                    isAdmin = false;
                }
            }
            ch_utils.isAdmin = isAdmin;
            go_on(sessionId, isAdmin, username);
        }
    }, //checkLoggedIn

    ajax_post: function (url, data, success, fail, async) {
        var xhttp = new XMLHttpRequest();
        xhttp.onload = function(){
            if (xhttp.status === 200 || xhttp.status === 201) {
                if (!xhttp.responseText) {
                    success();
                } else {
                    var data = JSON.parse(xhttp.responseText);
                    //console.log(data);
                    if (!data) {
                        success();
                    } else
                    if (ch_utils.convertCharset) {
                        success(ch_utils.convertToUTF8(data));
                    } else {
                        success(data);
                    }
                }
            } else {
                var xht ={responseURL: xhttp.responseURL,
                          status: xhttp.status,
                          statusText: xhttp.statusText,
                          responseText: xhttp.responseText};
                //console.log(xht);
                _fail(xht);
            }
            function _fail(xht) {
                if (typeof fail === 'function') {
                    fail(xht.status, xht.responseText);
                } else
                if (typeof fail === 'string') {
                    alert(fail);
                } else
                if (typeof fail === 'number') {
                    ch_utils.alertMessage(fail);
                }
            }
        };
        xhttp.open('POST', url, async||true);
        var basic = "Basic " + ch_utils.userpass;
        //console.log('Authorization', basic);
        //xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        //xhttp.setRequestHeader("Content-type", "text/plain");
        //xhttp.setRequestHeader("Accept", "text/plain");
        xhttp.setRequestHeader("Authorization", basic);
        //xhttp.withCredentials = true;
        //console.log(xhttp);
        //contentType: "application/text; charset=utf-8",
        //    header['Access-Control-Allow-Origin'] = '*'

        //xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
        //xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
        xhttp.send(data);
    }, //ajax_post

    ajax_get: function (url, success, fail, no_data, async, timeout) {
        var xhttp = new XMLHttpRequest();
        xhttp.ontimeout = function(e){
            alert('timeout');
        };
        xhttp.onload = function(){
            //response:
            //xhttp.status statusText responseType response responseText responseURL
            //console.log(xhttp);
            //console.log(xhttp.getResponseHeader("Content-Type"));
            //console.log(xhttp.getAllResponseHeaders());

            if (xhttp.status === 204) {
                _no_data('no data');
            } else
            if (xhttp.status === 200) {
                if (!xhttp.responseText) {
                    _no_data('no data');
                } else {
                    var data;
                    try {
                        data = JSON.parse(xhttp.responseText);
                    } catch(err) {
                        data = xhttp.responseText;
                    }
                    //console.log(data);
                    if (!data) {
                        _no_data('no data');
                    } else
                    if (ch_utils.convertCharset) {
                        success(ch_utils.convertToUTF8(data));
                    } else {
                        success(data);
                    }
                }
            } else {
                var xht ={responseURL: xhttp.responseURL,
                          status: xhttp.status,
                          statusText: xhttp.statusText,
                          responseText: xhttp.responseText};
                //console.log(xht);
                _fail(xht);
            }
            function _fail(xht) {
                if (typeof fail === 'function') {
                    fail(xht.status, xht.responseText);
                } else
                if (typeof fail === 'string') {
                    alert(fail);
                } else
                if (typeof fail === 'number') {
                    ch_utils.alertMessage(fail);
                }
            }
            function _no_data() {
                if (typeof no_data === 'function') {
                    no_data('no data');
                } else
                if (typeof no_data === 'string') {
                    alert(no_data);
                } else
                if (typeof no_data === 'number') {
                    ch_utils.alertMessage(no_data);
                } else {
                    console.log('no (JSON-)data found!');
                }
            }
        };
        console.log(url);
        xhttp.open('GET', url, async||true);
        //xhttp.timeout = timeout || 5000; //time in milliseconds
        xhttp.send();
    }, //ajax_get

    ajax_put: function (url, data, success, fail, async) {
        var xhttp = new XMLHttpRequest();
        xhttp.onload = function(){
            if (xhttp.status === 200 || xhttp.status === 201) {
                if (!xhttp.responseText) {
                    success();
                } else {
                    var data = JSON.parse(xhttp.responseText);
                    //console.log(data);
                    if (!data) {
                        success();
                    } else
                    if (ch_utils.convertCharset) {
                        success(ch_utils.convertToUTF8(data));
                    } else {
                        success(data);
                    }
                }
            } else {
                var xht ={responseURL: xhttp.responseURL,
                          status: xhttp.status,
                          statusText: xhttp.statusText,
                          responseText: xhttp.responseText};
                //console.log(xht);
                _fail(xht);
            }
            function _fail(xht) {
                if (typeof fail === 'function') {
                    fail(xht.status, xht.responseText);
                } else
                if (typeof fail === 'string') {
                    alert(fail);
                } else
                if (typeof fail === 'number') {
                    ch_utils.alertMessage(fail);
                } else {
                    ch_utils.alertMessage(fail);
                }
            }
        };
        console.log(url);
        xhttp.open('PUT', url, async||true);
       
        xhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");

        xhttp.send(data);
    }, //ajax_put

    getParameter: function (key) {
        var query = window.location.search.substring(1);
        var pairs = query.split('&');

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (pair[0] === key) {
                if (pair[1].length > 0) {
                    if (pair[1] === 'true' || pair[1] === 'false') {
                        return JSON.parse(pair[1]);
                    } else {
                        return pair[1];
                    }
                }
            }
        }
        return undefined;
    }, //getParameter

    buildMessage: function () {
        var text = messageFormats[arguments[0]][this.lang];
        for (var i = 1; i < arguments.length; i++) {
            text = text.replace("{"+(i-1)+"}", arguments[i]);
        }
        return text;
    }, //buildMessage

    // usage:   ch_utils.displayMessage([<elemen>], <messNo>, <string1>, ...);
    displayMessage: function () {
        var text = messageFormats[arguments[0]][this.lang];
        for (var i = 1; i < arguments.length; i++) {
            text = text.replace("{"+(i-1)+"}", arguments[i]);
        }
        //console.log('displayMessage: '+arguments[0]+' '+text);
        document.getElementById('notification-message').innerHTML = text;

    }, //displayMessage

    displayString: function (str) {
        document.getElementById('notification-message').innerHTML = str;

    }, //displayString

    // usage:   ch_utils.displayMessageDiv(<target>, <messNo>, <string1>, ...);
    displayMessageDiv: function () {
        var text = messageFormats[arguments[1]][this.lang];
        for (var i = 2; i < arguments.length; i++) {
            text = text.replace("{"+(i-2)+"}", arguments[i]);
        }
        document.getElementById(arguments[0]).innerHTML = text;

    }, //displayMessageDiv

    alertMessage: function () {
        var text = messageFormats[arguments[0]][this.lang];
        for (var i = 1; i < arguments.length; i++) {
            text = text.replace(/<[^>]*>/ig,"");
            text = text.replace("{"+(i-1)+"}", arguments[i]);
        }
        alert(text);
    }, //alertMessage

    displayMessage2: function () {
        var text = messageFormats[arguments[0]][this.lang];
        for (var i = 1; i < arguments.length; i++) {
            text = text.replace("{"+(i-1)+"}", arguments[i]);
        }
        //console.log('displayMessage2: '+arguments[0]+' '+text);
        document.getElementById('notif2').innerHTML = text;

    }, //displayMessage2

    buttonText: function () {
        var tid = arguments[1] + ixButtonTextBase;
        var text = messageFormats[tid][this.lang];
        for (var i = 2; i < arguments.length; i++) {
            text = text.replace("{"+(i-2)+"}", arguments[i]);
        }
        var el = document.getElementById(arguments[0]);
        if (el) {
            el.firstChild.data = text;
        }
    }, //buttonText

    buttonTitle: function (button_id, text_id) {
        var tid = text_id + ixButtonTextBase;
        var text = messageFormats[tid][this.lang];
        for (var i = 1; i < arguments.length; i++) {
            text = text.replace("{"+(i-1)+"}", arguments[i]);
        }
        document.getElementById(button_id).title = text;
    }, //buttonTitle

    buttonVisible: function (button_id, isVisible) {
        var el = document.getElementById(arguments[0]);
        if (!el) {
            return;
        }
        if (isVisible) {
            el.style.display = "inline";
        } else {
            el.style.display = "none";
        }
    }, //buttonVisible

    buttonIdEvent: function (event) {
        var el = event.target;
        return el.id;
    }, //buttonIdEvent

    isVisible: function (id) {
        var el = document.getElementById(arguments[0]);
        var ret = true;
        if (!el) {
            ret = false;
        } else
        if (el.style.display === "none") {
            ret = false;
        } else
        if (el.style.visibility === "hidden") {
            ret = false;
        }
        //console.log(id+' visibility='+ ret);
        //console.log(id+' style.display='+el.style.display);
        //console.log(id+' style.visibility='+el.style.visibility);
        return ret;
    }, //isVisible

    isChecked: function (id) {
        var el = document.getElementById(arguments[0]);
        try {
            return el.checked;
        } catch(e) {
            return false;
        }
    }, //isChecked

    userTime: function (secs) {
        var msecs = secs;
        if (secs ==='now') {
            msecs = Date.now();
        } else {
            if (!secs) {return 'no time';}
            if (isNaN(secs)) {return 'wrong time '+secs;}
            if (secs < 1000000000) {return 'wrong time '+secs;}
            if (secs > 3000000000000) {return 'wrong time '+secs;}
        }
        if (msecs < 1000000000000) {
            msecs = secs * 1000;
        }
        try {
            var dt = new Date(msecs);
            var s = dt.getFullYear()+'-'+
                    ((dt.getMonth()+1)+'').padStart(2,"0")+'-'+
                    (dt.getDate()+'').padStart(2,"0")+' '+
                    (dt.getHours()+'').padStart(2,"0")+':'+
                    (dt.getMinutes()+'').padStart(2,"0")+':'+
                    (dt.getSeconds()+'').padStart(2,"0");
            return s;
        } catch (err) {
            alert(err);
            return 'wrong time '+secs;
        }
    }, //userTime

    isPageHidden: function (){
        return document.hidden || document.msHidden || document.webkitHidden || document.mozHidden;
    }, //isPageHidden
};
