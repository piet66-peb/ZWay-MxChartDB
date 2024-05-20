#!/usr/bin/env python3
#pylint: disable=invalid-name
'''
#h-------------------------------------------------------------------------------
#h
#h Name:         MxChartDB_API.py
#h Type:         python program
#h Purpose:      HTTP API for client MxChartDB_API and database SQlite3
#h Project:
#h Usage:        Start API:
#h                  cd ...
#h                  source rest_api/bin/activate
#h                  export FLASK_APP=MxChartDB_API
#h                  flask run --host=0.0.0.0        #for remote access, port=5000
#h               Call via URL:
#h                  http://nnn.nnn.nnn.nn:5000/...
#h Result:
#h Examples:
#h Outline:
#h Resources:    python3, flask, sqlite3
#h Manuals:      https://palletsprojects.com/p/flask/
#h               https://www.python.org/
#h               https://www.w3schools.com/python/default.asp
#h               https://www.sqlite.org/index.html
#h Platforms:    Linux
#h Authors:      peb piet66
#h Version:      V2.1.0 2024-05-20/peb
#v History:      V1.0.0 2022-03-14/peb first version
#h Copyright:    (C) piet66 2022
#h License:      http://opensource.org/licenses/MIT
#h
#h-------------------------------------------------------------------------------
#h
#h API interface:
#h ==============
#h MxChartDB_API version:
#h      GET /version[?loglevel=20|30]
#h list databases:
#h      GET /list_databases
#h create database:
#h      POST /<db>/create_db
#h check database:
#h      GET /<db>/check_db
#h get database size:
#h      GET /<db>/size
#h shrink the database:
#h      GET /<db>/rebuild_db
#h drop database:
#h      POST /<db>/drop_db
#h list all objects in database:
#h      GET /<db>/list_tables
#h      GET /<db>/list_views
#h      GET /<db>/list_indexes
#h      GET /<db>/list
#h
#h create table:
#h      POST /<db>/<table>/create_table
#h check table/ view/ index:
#h      GET /<db>/<db_object>/check
#h describe table/ view/ index:
#h      POST /<db>/<db_object>/describe
#h drop table/ view/ index:
#h      POST /<db>/<db_object>/drop
#h clone table:
#h      POST /<db>/<table>/clone?new=[<new db>.]<new table>[&where=<where statement>]
#h
#h add row, delete old ows:
#h      POST /<db>/<table>/insert?ts=<timestamp>&val=<values>[&ts_del=<timestamp>]
#h read next rows with ts > timestamp:
#h      GET /<db>/<table>/select_next[?ts=<timestamp>]
#h read all rows between from > timestamp and to <= timestamp:
#h      GET /<db>/<table>/select_range[?from=<timestamp>][&to=<timestamp>]
#h read first ts:
#h      GET /<db>/<table>/select_first_ts
#h read last ts:
#h      GET /<db>/<table>/select_last_ts
#h count entries:
#h      GET /<db>/<table>/count
#h delete previous rows with ts < timestamp:
#h      POST /<db>/<table>/delete_prev?ts=<timestamp>
#h delete row:
#h      POST /<db>/<table>/delete?ts=<timestamp>
#h
#h SQL interface:
#h ==============
#h invoke SQL command
#h      GET  /<db>/sql?<sql command>
#h      POST /<db>/sql
#h-------------------------------------------------------------------------------
'''

#pylint: disable=too-many-lines
#pylint: disable=inconsistent-return-statements, too-many-return-statements
#pylint: disable=too-many-branches, too-many-locals, too-many-statements

import collections
import time
import platform
import sqlite3
import threading
import os
import glob
import json
from datetime import datetime
import urllib.parse
import re
from functools import wraps     #only for correct module documentation
from markupsafe import escape
#pylint: disable=import-error
import flask
from flask import Flask, request, jsonify, redirect
#from flask import make_response
from flask_cors import CORS

import constants

MODULE = 'MxChartDB_API.py'
VERSION = 'V2.1.0'
WRITTEN = '2024-05-20/peb'
SQLITE = sqlite3.sqlite_version
PYTHON = platform.python_version()
FLASK = flask.__version__
SQLITE_THREADSAVE = sqlite3.threadsafety
if SQLITE_THREADSAVE:
    if SQLITE_THREADSAVE == 0:
        threadsave = 'single-thread'
    elif  SQLITE_THREADSAVE == 1:
        threadsave = 'multi-thread'
    elif  SQLITE_THREADSAVE == 2:
        threadsave = 'serialized'
else:
    threadsave = 'unknown'

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
#pylint: enable=invalid-name

#----------------------------------------------------------------------------

# http status codes
OK = 200
CREATED = 201
NO_CONTENT = 204
NOT_MODIFIED = 304
BAD_REQUEST = 400
FORBIDDEN = 403
NOT_FOUND = 404
DB_ERROR = 900
REDIRECTED = 302
REDIRECT_PRESERVE = 307
UNAUTHORIZED = 401
NOT_ALLOWED = 405
INTERNAL_ERROR = 500

# hello
app.logger.setLevel(20)
app.logger.info('------- '+MODULE+':'+VERSION+' '+WRITTEN+' sqlite:'+SQLITE)
STARTED = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

#----------------------------------------------------------------------------

# constants
#pylint: disable=no-member
if hasattr(constants, 'LOGLEVEL'):
    LOGLEVEL = constants.LOGLEVEL
else:
    LOGLEVEL = 20
app.logger.setLevel(LOGLEVEL)
if hasattr(constants, 'TIMEOUT'):
    TIMEOUT = constants.TIMEOUT
else:
    TIMEOUT = 5
if hasattr(constants, 'THRESHOLD_DURATION'):
    THRESHOLD_DURATION = constants.THRESHOLD_DURATION
else:
    THRESHOLD_DURATION = None
if hasattr(constants, 'THRESHOLD_THREADS'):
    THRESHOLD_THREADS = constants.THRESHOLD_THREADS
else:
    THRESHOLD_THREADS = None
if hasattr(constants, 'DISABLE_AUTHENTICATION'):
    DISABLE_AUTHENTICATION = constants.DISABLE_AUTHENTICATION
else:
    DISABLE_AUTHENTICATION = False
if hasattr(constants, 'USERNAME'):
    USERNAME = constants.USERNAME
else:
    raise RuntimeError('no USERNAME defined in constants.py!')
if hasattr(constants, 'PASSWORD'):
    PASSWORD = constants.PASSWORD
else:
    raise RuntimeError('no PASSWORD defined in constants.py!')
if hasattr(constants, 'ALLOW_WRITE_WITH_GET'):
    ALLOW_WRITE_WITH_GET = constants.ALLOW_WRITE_WITH_GET
else:
    ALLOW_WRITE_WITH_GET = False
if hasattr(constants, 'CORS_HOST'):
    CORS_HOST = constants.CORS_HOST
else:
    CORS_HOST = None
    app.logger.warning('no CORS_HOST defined in constants.py!')
if hasattr(constants, 'WHITELIST_GET'):
    WHITELIST_GET = constants.WHITELIST_GET
else:
    WHITELIST_GET = []
if hasattr(constants, 'WHITELIST_POST'):
    WHITELIST_POST = constants.WHITELIST_POST
else:
    WHITELIST_POST = []
#pylint: enable=no-member

if DISABLE_AUTHENTICATION:
    app.logger.warning('authentication for write access is disabled for everybody')
if ALLOW_WRITE_WITH_GET:
    app.logger.warning('write acces via GET method is enabled for everybody')

# allow CORS for GET access for all hosts:
CORS(app, methods={"GET": {"origins": "*"}})

# set CORS for POST access:
if not CORS_HOST is None:
    # allow POST access for ZWay MxChartDB Admin clients:
    CORS(app, origins=CORS_HOST)
    app.logger.info('POST method is enabled for: '+''.join(CORS_HOST))

#----------------------------------------------------------------------------

def manage_thread_list(func):
    '''manage active thread list'''

    def remove_el(element, queue):
        # Helper queue to store the elements temporarily.
        queue_tmp = collections.deque()
        queue_length = len(queue)
        cnt = 0
        # Finding the value to be removed
        while queue and queue[0] != element:
            queue_tmp.append(queue.popleft())
            cnt += 1

        # If element is not found
        if len(queue) == 0:
            print("element not found!!")
            while queue_tmp:
                queue.append(queue_tmp.popleft())
        # If element is found
        else:
            queue.popleft()
            while queue_tmp:
                # Pushing all the elements back into q
                queue.append(queue_tmp.popleft())
            k = queue_length-cnt-1
            while k:
                # Pushing elements from front of q to its back
                queue.append(queue.popleft())
                k -= 1

    def buildlist():
        tmp = THREAD_LIST.copy()
        ret = ''
        while tmp:
            ret += str(tmp.popleft())+','
        return ret

    if func == 'create':
        app.logger.info('create THREAD_LIST))')
        return collections.deque()

    if func == 'append':
        THREAD_LOCK.acquire()
        self = request.args.get('self', '?')
        app.logger.info('append '+self+' '+str(request.path)+' to THREAD_LIST')
        THREAD_LIST.append(self+' '+request.path)
        buildlist = buildlist()

        thread_act = threading.active_count()
        if THRESHOLD_THREADS is not None and thread_act >= THRESHOLD_THREADS:
            queuetext = '*** insert queue: '+buildlist
            app.logger.warn(queuetext)

        THREAD_LOCK.release()
        return buildlist
    if func == 'remove_el':
        THREAD_LOCK.acquire()
        self = request.args.get('self', '?')
        app.logger.info('remove '+self+' '+str(request.path)+' from THREAD_LIST')
        remove_el(self+' '+request.path, THREAD_LIST)
        THREAD_LOCK.release()

THREAD_LIST = manage_thread_list('create')
THREAD_LOCK = threading.Lock()

# filter whitelists
@app.before_request
def before_request():
    '''decorator: check whitelist before every request'''

    thread_act = threading.active_count()
    if THRESHOLD_THREADS is not None and thread_act >= THRESHOLD_THREADS:
        infotext = '*** '+str(thread_act)+' threads, request='+request.path
        app.logger.warn(infotext)

    app.logger.info('requesting host: '+''.join(request.remote_addr))
    app.logger.info('requesting method: '+request.method)
    app.logger.info('requested host: '+request.host)
    app.logger.info('requested path: '+request.path)
    app.logger.info('requested query_string: '+str(request.query_string))

    host = ''.join(request.remote_addr)
    if request.method == 'GET':
        if not wild_search(WHITELIST_GET, host):
            return response_text_err('GET not allowed for '+host), FORBIDDEN
    if request.method == 'POST':
        if not wild_search(WHITELIST_POST, host):
            return response_text_err('POST not allowed for '+host), FORBIDDEN
    if request.path != escape(request.path):
        return response_text_err('invalid character'), BAD_REQUEST

def wild_search(list_in, string_in):
    '''auxiliary function: search with wildcards'''
    app.logger.info('wild_search: '+string_in)
    try:
        in_list = list_in.index(string_in)
        if in_list >= 0:
            app.logger.info(string_in+' found')
            return True
#pylint: disable=bare-except
    except:
        for string_i in list_in:
            pattern = string_i.replace(".", r"\.").replace("*", ".*")
            app.logger.info('check '+pattern+' for '+string_in)
            regex = re.compile("^"+pattern+"$")
            if bool(regex.match(string_in)):
                return True
    return False

# Basic Authentication
def auth_required(func):
    '''decorator to check authentication'''
    app.logger.info('*** auth_required')
    @wraps(func)
    def decorator(*args, **kwargs):
        #skip authorization for /SQL/ GET selects
        if request.endpoint == 'route_sql_get':
            app.logger.info('checking for SELECT...')
            sql = request.args.get('command')
            if sql is None:
                return func(*args, **kwargs)
            app.logger.info(sql)
            pos = sql.upper().lstrip().find('SELECT ')
            if pos == 0:
                app.logger.info('SELECT: skipping authorization')
                return func(*args, **kwargs)

        if DISABLE_AUTHENTICATION:
            app.logger.info('authorization switched off')
            return func(*args, **kwargs)
        if request.method == 'GET' and not ALLOW_WRITE_WITH_GET:
            error_text = 'method GET not allowed for this command per default, '
            error_text += 'for change set ALLOW_WRITE_WITH_GET = True'
            response = response_text_err(error_text)
            header = response.headers
            header['Access-Control-Allow-Methods'] = 'POST'
            return response, NOT_ALLOWED
        auth = request.authorization
        #auth = {'username': 'username', 'password': 'secret'}
        error_text = None
        if auth is None:
            if request.method == 'GET':
                error_text = "requesting authentication..."
            else:
                error_text = "Authentication missing"
        elif 'username' not in auth:
            error_text = "Authentication: username missing"
        elif auth.username is None:
            error_text = "Authentication: username missing"
        elif 'password' not in auth:
            error_text = "Authentication: password missing"
        elif auth.password is None:
            error_text = "Authentication: password missing"
        elif auth.username != USERNAME:
            error_text = "Authentication: username/password wrong"
        elif auth.password != PASSWORD:
            error_text = "Authentication: username/password wrong"
        if error_text is not None:
            response = response_text_err(error_text)
            header = response.headers
            header['WWW-Authenticate'] = 'Basic realm="MxChartDB_API.py", charset="UTF-8"'
            return response, UNAUTHORIZED
        app.logger.info('user authenticated')
        return func(*args, **kwargs)
    return decorator

#----------------------------------------------------------------------------

def check_threshold(now, dbase, table):
    '''check_threshold(now, dbase, table)'''
    duration = round(time.time() - now, 2)
    if THRESHOLD_DURATION is not None and duration >= THRESHOLD_DURATION:
        app.logger.warn('*** '+dbase+'.'+table+' insert duration='+str(duration)+' seconds')

def change_loglevel(new_loglevel):
    '''dynamically change the loglevel'''
    if new_loglevel is None:
        return
    if new_loglevel not in ('10', '20', '30', '40', '50'):
        return
    new_loglevel = int(new_loglevel)
#pylint: disable=global-statement
    global LOGLEVEL
    if new_loglevel != LOGLEVEL:
        LOGLEVEL = new_loglevel
        app.logger.setLevel(LOGLEVEL)
        app.logger.warn('new loglevel='+str(LOGLEVEL))

def usersize(size):
    '''auxiliary function: convert byte size to user readable size string'''
    stringsize = str(size)+' Byte'
    if size >= 1024 * 1024 * 1024:
        stringsize = stringsize + ' = ' + str(round(size/1024/1024/1024, 1)) + ' GiB'
    elif size >= 1024 * 1024:
        stringsize = stringsize + ' = ' + str(round(size/1024/1024, 1)) + ' MiB'
    elif size >= 1024:
        stringsize = stringsize + ' = ' + str(round(size/1024, 1)) + ' KiB'
    return stringsize

def db_sizes(sizes):
    '''auxiliary function: convert db sizes into json structure'''
    sizes_json = {"page count": sizes[0],
                  "unused pages": sizes[1],
                  "page size": usersize(sizes[2]),
                  "size complete": usersize(sizes[0]*sizes[2]),
                  "size used": usersize((sizes[0] - sizes[1]) *sizes[2]),
                  "size free": usersize(sizes[1] *sizes[2])
                  }
    return sizes_json

def file_size(dbase):
    '''auxiliary function: get os size of a database file'''
    file_stats = os.stat(dbase+'.db')
    size_bytes = str(file_stats.st_size)+' Bytes'
    size_mb = str(round(file_stats.st_size / (1024 * 1024), 3))+' MiB'
    return size_bytes.ljust(17)+' = '+size_mb

def usertime(ts_in):
    '''auxiliary function: convert unix time to user readable time string'''
    if ts_in is None:
        return ''
    try:
        datetime.fromtimestamp(ts_in/1000)
        return datetime.fromtimestamp(ts_in/1000).strftime('%Y-%m-%d %H:%M:%S')
    except: # pylint: disable=bare-except
        return ''

# build text response
def response_text_err(text):
    '''auxiliary function: log error text + jsonify'''
    text = text.replace('database is locked', 'database is locked/busy')
    app.logger.error(text)
    return jsonify(text)

def response_text(text):
    '''auxiliary function: log info text + jsonify'''
    app.logger.info(text)
    return jsonify(text)

#def response_text_plain(text):
#    '''auxiliary function: log info text + set mimetype=text/plain'''
#    app.logger.info(text)
#    response = make_response(text, 200)
#    response.mimetype = "text/plain"
#    return response

# connect db
def get_db_connection(dbase):
    '''auxiliary function: connect to database'''
    ## V1.9.1: autocommit off
    ## conn = sqlite3.connect(dbase+'.db', timeout=TIMEOUT, isolation_level=None)
    ## #isolation_level=None: autocommit on
    conn = sqlite3.connect(dbase+'.db', timeout=TIMEOUT)
    return conn

# get database list
def get_database_list():
    '''auxiliary function: get database list'''
    files = glob.glob('*.db')
    dbs = []
    for file_i in files:
        dbs.append(os.path.splitext(file_i)[0])
    dbs.sort()
    return dbs

# get table list
def get_object_list(dbase, object_type="table"):
    '''auxiliary function: get table list in database'''
    if object_type is None:
        sql = "SELECT name||' ('||type||')' FROM sqlite_master "\
            "WHERE name NOT LIKE 'sqlite_%';"
    else:
        sql = "SELECT name FROM sqlite_master "\
            "WHERE type ='"+object_type+"' AND name NOT LIKE 'sqlite_%';"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall'
        rows = conn.execute(sql).fetchall()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext

    table_list = []
    for row in rows:
        table_list.append(row[0])
    conn.close()
    table_list.sort()
    return table_list

# get first ts in table
def select_first_ts(dbase, table, raw='no'):
    '''auxiliary function: select the first timestamp in table'''
    sql = "SELECT MIN(ts) FROM "+table
    #app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'select'
        rows = conn.execute(sql)
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext, DB_ERROR
    ts_first = 'null'
    for row in rows:
        ts_first = row[0]
    conn.close()
    if ts_first == 'null':
        return ts_first, NOT_FOUND
    if raw != 'yes':
        return usertime(ts_first), OK
    return ts_first, OK

# get last ts in table
def select_last_ts(dbase, table, raw='no'):
    '''auxiliary function: select the last timestamp in table'''
    sql = "SELECT MAX(ts) FROM "+table
    #app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'select'
        rows = conn.execute(sql)
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext, DB_ERROR
    ts_last = 'null'
    for row in rows:
        ts_last = row[0]
    conn.close()
    if ts_last == 'null':
        return ts_last, NOT_FOUND
    if raw != 'yes':
        return usertime(ts_last), OK
    return ts_last, OK

# get count entry in table
def count_entries(dbase, table):
    '''auxiliary function: count rows in table'''
    sql = "SELECT COUNT(ts) FROM "+table+";"
    #app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'select count'
        count = conn.execute(sql).fetchall()[0]
        command = 'conn.close()'
        conn.close()
        return count
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext

#----- HTML -----------------------------------------------------------------

# We may need this redirection cause html can't read parameters when invoked
# within a modal window
@app.route('/HTML/<module>/<chart_id>', methods=["GET"])
def route_html(module, chart_id):
    '''route: redirect html page'''
    app.logger.info(request)
    if not os.path.isfile(module+'.db'):
        return response_text_err('database '+module+' not found'), NOT_FOUND

    host = request.host
    if host is None:
        return response_text_err('host is not defined'), BAD_REQUEST
    referrer = request.referrer
    if referrer is None:
        app.logger.error('referrer is not defined')
        referrer = 'http://'+host.split(':')[0]+':8083/'    #default: ZWay url
    url = referrer+'ZAutomation/api/v1/load/modulemedia/'+module+'/HTML/'
    if chart_id.upper() == 'INDEX':
        url += 'index.html?'
    elif chart_id.upper() == 'ADMIN':
        url += 'admin.html?ADMIN=YES&'
    else:
        url += 'draw-chartjs.html?chartId='+chart_id
    app.logger.info('url='+url)
    return redirect(url, code=REDIRECT_PRESERVE)
    #return redirect(url, code=REDIRECTED)

# We need this redirection cause html can't read parameters when invoked within
# a modal window
@app.route('/HTML_MODAL/<module>/<chart_id>', methods=["GET"])
def route_html_modal(module, chart_id):
    '''route: construct start html page for modal window'''
    app.logger.info(request)
    if not os.path.isfile(module+'.db'):
        return response_text_err('database '+module+' not found'), NOT_FOUND

    html = """
<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml">
   <head>
      <meta charset="utf-8">
   </head>
   <body>
      <script>
        console.log('iframe MxChartDB: '+window.location);

        function getCookie(cname) {
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
        } //getCookie

        function isAdministrator() {
            var isAdmin;
            var user = getCookie('user');
            if (user) {
                var userJ = JSON.parse(user);
                if (userJ.role === 1) {
                    isAdmin =  true;   //is administrator
                } else {
                    isAdmin = false;   //logged in, but no administrator
                }
            }
            console.log('isAdmin detected: '+isAdmin);
            return isAdmin;
        } //isAdministrator
        var isAdmin = isAdministrator();

        //var isAdmin = 'true';
        document.getElementById('myIframe').src = "XSRCX&isModal=true&isAdmin="+isAdmin;
        <!--$('#myIframe').attr('src', "XSRCX&isAdmin="+isAdmin);-->
      </script>
      <iframe id="myIframe" src=""
          style="border:none;height:520px;width:110% !important">
      </iframe>
   </body>
</html>
"""
    src = "/ZAutomation/api/v1/load/modulemedia/"
    src += module+'/HTML/draw-chartjs.html?chartId='+chart_id
    html = html.replace('XSRCX', src)
    return html

#----- API ------------------------------------------------------------------

@app.route('/', methods=["GET"])
def route_api_commands():
    '''route: show api commands in a html page'''
    app.logger.info(request)
    html = """<title>HTTP API</title>
              <style>
                 {
                 border-collapse: collapse;
                 width: 100%;
                 }
                 td, th {
                 border: 1px solid black;
                 }
                 tr:hover {background-color: #ddd;}
                 th {
                 padding-top: 12px;
                 padding-bottom: 12px;
                 text-align: left;
                 background-color: #d3d3d3;
                 color: black;
                 }
              </style>

              <br>
              <h2>HTTP API for SQLite and MxChartDB</h2>
              <table>
              <tr><th>Action</th><th>Method</th><th>URL-Path + Query-String</th><th>success</th><th>failed/not found</th></tr>

              <tr><td colspan=6 style="background-color: #f2f2f2;"><br>*** HTML ***<br><br></td></tr>

              <tr><td>functional survey</td><td>
                   </td><td>/</td><td></td><td></td></tr>
              <tr><td>database administration</td><td>
                   </td><td>
                   <a href='../ADMIN'><u><font color=blue>/ADMIN</font></u></a>
                   </td><td></td><td></td></tr>
              <tr><td>call chart index </td><td>
                   </td><td>/HTML/&lt;module&gt;/Index</td><td></td><td></td></tr>
              <tr><td>call chart administration </td><td>
                   </td><td>/HTML/&lt;module&gt;/Admin</td><td></td><td></td></tr>
              <tr><td>call chart html </td><td>
                   </td><td>/HTML/&lt;module&gt;/&lt;chartId&gt;</td><td></td><td></td></tr>

              <tr><td>invoke chart html in a Smarthome modal window</td><td>
                   </td><td>/HTML_MODAL/&lt;module&gt;/&lt;chartId&gt;</td><td></td><td></td></tr>

              <tr><td colspan=6 style="background-color: #f2f2f2;"><br>*** API *** (responds with JSON structure)<br><br></td></tr>

              <tr><td>API version, set loglevel<br>20=info<br>30=error+warning</td><td>
                   GET</td><td>
                   <a href='../version'><u><font color=blue>/version</font>[?loglevel=20|30]</u></a>
                   </td><td></td><td></td></tr>
              <tr><td>list all databases</td><td>
                   GET</td><td>
                   <a href='../list_databases'><u><font color=blue>/list_databases</font></u></a>
                   </td><td>200</td><td>404</td></tr>
              <tr><td>create a database</td><td>
                   POST</td><td>/&lt;db&gt;/create_db</td><td>201</td><td></td></tr>
              <tr><td>check the database for existence</td><td>
                   GET</td><td>/&lt;db&gt;/check_db</td><td>200</td><td>404</td></tr>
              <tr><td>get sizes of database (bytes)</td><td>
                   GET</td><td>/&lt;db&gt;/size</td><td>200</td><td>404</td></tr>
              <tr><td>rebuild the database (defragment, remove free space)<br>
                   This command has not been tested yet!!!!!</td><td>
                   GET</td><td>/&lt;db&gt;/rebuild_db</td><td>200</td><td>200</td></tr>
              <tr><td>drop the database</td><td>
                   POST</td><td>/&lt;db&gt;/drop_db</td><td>200</td><td>200</td></tr>
              <tr><td>list all user tables in the database</td><td>
                   GET</td><td>/&lt;db&gt;/list_tables</td><td>200</td><td>404</td></tr>
              <tr><td>list all user views in the database</td><td>
                   GET</td><td>/&lt;db&gt;/list_views</td><td>200</td><td>404</td></tr>
              <tr><td>list all user indexes in the database</td><td>
                   GET</td><td>/&lt;db&gt;/list_indexes</td><td>200</td><td>404</td></tr>

              <tr><td>check an object (table, view, index) for existence</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;object&gt;/check</td><td>200</td><td>404</td></tr>
              <tr><td>describe an object (table, view, index)</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;object&gt;/describe</td><td>200</td><td>404</td></tr>
              <tr><td>drop an object (table, view, index)</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;object&gt;/drop</td><td>200</td><td>200</td></tr>
              <tr><td>clone a table with all it's contents</td><td>
                   POST</td>
                   <td>/&lt;db&gt;/&lt;table&gt;/clone?new=[&lt;new db&gt;.]&lt;new table&gt;
                   [&amp;where=&lt;where statement&gt;]
                   </td>
                   <td>200</td><td>900 (db error)</td></tr>
              <tr><td>count entries in an object (table, view)</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;object&gt;/count</td><td>200</td><td>900 (db error)</td></tr>

              <tr><td colspan=6 style="background-color: #f2f2f2;"><br>*** MxChartDB specific API functions *** 
              <br><br></td></tr>

              <tr><td>create a table<br>(ts INTEGER PRIMARY KEY, val TEXT),
                                    <br>ts: timestamp in ms
                                    <br>val: stringified JSON array of values</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;table&gt;/create_table</td><td>201</td><td>900 (db error)</td></tr>
              <tr><td>add a new row [, delete old rows with ts < timestamp]</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;table&gt;/insert[?ts_del=&lt;timestamp&gt;],<br>data:{ts=&lt;timestamp&gt;,val=&lt;values&gt;}</td><td>200</td><td>900 (db error)</td></tr>
              <tr><td>bulk insert rows [, delete old rows with ts < timestamp]</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;table&gt;/insert[?ts_del=&lt;timestamp&gt;],<br>data:[{ts=&lt;timestamp&gt;,val=&lt;values&gt;}, ...]</td><td>200</td><td>900 (db error)</td></tr>

              <tr><td>read all next rows with ts > timestamp till end</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;table&gt;/select_next[?ts=&lt;timestamp&gt;]</td><td>200</td><td>ts=0: 404<br>ts>0: 304 (not modified)</td></tr>
              <tr><td>read all rows &gt;= from_timestamp and &lt;= to_timestamp</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;table&gt;/select_range[?from=&lt;timestamp&gt;]
                                                                     [&amp;to=&lt;timestamp&gt;]</td>
                   <td>200</td><td>404</td></tr>
              <tr><td>read first ts in table</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;table&gt;/select_first_ts[?raw=yes]</td><td>200</td><td>404</td></tr>
              <tr><td>read last ts in table</td><td>
                   GET</td><td>/&lt;db&gt;/&lt;table&gt;/select_last_ts[?raw=yes]</td><td>200</td><td>404</td></tr>
              <tr><td>delete all previous rows with ts < timestamp from beginning</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;table&gt;/delete_prev?ts=&lt;timestamp&gt;</td><td>200</td><td>200</td></tr>
              <tr><td>delete a row</td><td>
                   POST</td><td>/&lt;db&gt;/&lt;table&gt;/delete?ts=&lt;timestamp&gt;</td><td>200</td><td>200</td></tr>

              <tr><td colspan=6 style="background-color: #f2f2f2;"><br>*** SQL: invoke any sql command *** 
               <br><br></td></tr>

              <tr><td>invoke a sql command<br> in select use val(n) for nth value of MxChartDB's JSON array val</td><td>
                   POST</td><td>/&lt;db&gt;/sql,<br>data:&lt;sql command&gt;</td><td>200</td><td>900 (db error)</td></tr>
              <tr><td>invoke a sql select command<br> in select use val(n) for nth value of MxChartDB's JSON array val</td><td>
                   GET</td><td>/&lt;db&gt;/sql?&lt;sql command&gt;</td><td>200</td><td>900 (db error)</td></tr>

              </table>
              """
    return html

@app.route('/ADMIN', methods=["GET"])
def route_api_admin():
    '''route: call ADMIN page in browser'''
    app.logger.info(request)
    html = """<style>
                 {
                 border-collapse: collapse;
                 width: 100%;
                 }
                 td, th {
                 border: 1px solid black;
                 }
                 tr:hover {background-color: #ddd;}
                 th {
                 padding-top: 12px;
                 padding-bottom: 12px;
                 text-align: left;
                 background-color: #d3d3d3;
                 color: black;
                 }
              </style>

              <br>
              <h2>Databases and Database Objects</h2>
              <table>
              <tr><th> Database Name </th>
                  <th><font color=#d3d3d3>Drop Database</font></th>
                  <th> Object Name </th>
                  <th>Type&nbsp;</th>
                  <th><font color=#d3d3d3>Describe&nbsp;</font></th>
                  <th><font color=#d3d3d3>Drop&nbsp;</font></th>
                  <th><font color=#d3d3d3>Select Values</font></th>
                  <th> Entry Count </th>
                  <th> First Timestamp </th>
                  <th> Last Timestamp </th>
              </tr>
              %lines%
              </table>
              """
    dbs = get_database_list()
    tab_lines = ''

    line_template1 = """
              <tr><td>%d%</td>
                  <td><a href='../%d%/drop_db'><u><font color=blue>drop database</font></u></a></td>
                  <td>%t%</td>
                  <td><center>%typ%</td>
                  <td><a href='../%d%/%t%/describe'><u><font color=blue>describe</font></u></a></td>
                  <td><a href='../%d%/%t%/drop'><u><font color=blue>drop</font></u></a></td>
                  <td><a href=
                  '../%d%/%t%/select_next'
                  ><u><font color=blue>select values</font></u></a></td>
                  <td><center>%c%</td>
                  <td><center>%f%</td>
                  <td><center>%l%</td>
              </tr>"""
    line_template2 = """
              <tr><td>%d%</td>
                  <td><a href='../%d%/drop_db'><u><font color=blue>drop database</font></u></a></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
              </tr>"""
    line_template3 = """
              <tr><td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
              </tr>"""
    line_template4 = """
              <tr><td></td>
                  <td></td>
                  <td>%t%</td>
                  <td><center>%typ%</td>
                  <td><a href='../%d%/%t%/describe'><u><font color=blue>describe</font></u></a></td>
                  <td><a href='../%d%/%t%/drop'><u><font color=blue>drop</font></u></a></td>
                  <td><a href=
                  '../%d%/%t%/select_next'
                  ><u><font color=blue>select values</font></u></a></td>
                  <td><center>%c%</td>
                  <td><center>%f%</td>
                  <td><center>%l%</td>
              </tr>"""
    line_template5 = """
              <tr><td>%d%</td>
                  <td><a href='../%d%/drop_db'><u><font color=blue>drop database</font></u></a></td>
                  <td>%t%</td>
                  <td><center>%typ%</td>
                  <td><a href='../%d%/%t%/describe'><u><font color=blue>describe</font></u></a></td>
                  <td><a href='../%d%/%t%/drop'><u><font color=blue>drop</font></u></a></td>
                  <td><a href=
                  '../%d%/sql?select * from %t%;'
                  ><u><font color=blue>select values</font></u></a></td>
                  <td><center>%c%</td>
                  <td><center>%f%</td>
                  <td><center>%l%</td>
              </tr>"""
    if dbs != []:
        for dbs_i in dbs:
            objects = get_object_list(dbs_i, 'table')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR

            if objects == []:
                tab_lines = tab_lines + \
                            line_template2.replace('%d%', dbs_i)
            else:
                first = True
                for table_i in objects:
                    if first:
                        tab_lines = tab_lines + \
                                    line_template1.replace('%d%', dbs_i).replace('%t%', table_i)\
                                    .replace('%c%', str(count_entries(dbs_i, table_i)[0]))\
                                    .replace('%f%', select_first_ts(dbs_i, table_i)[0])\
                                    .replace('%l%', select_last_ts(dbs_i, table_i)[0])\
                                    .replace('%typ%', 'table')
                    else:
                        tab_lines = tab_lines + \
                                    line_template4.replace('%d%', dbs_i).replace('%t%', table_i)\
                                    .replace('%c%', str(count_entries(dbs_i, table_i)[0]))\
                                    .replace('%f%', select_first_ts(dbs_i, table_i)[0])\
                                    .replace('%l%', select_last_ts(dbs_i, table_i)[0])\
                                    .replace('%typ%', 'table')
                    first = False

            objects = get_object_list(dbs_i, 'view')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR

            if objects:
                if not first:
                    tab_lines = tab_lines + line_template3
                first = True
                for table_i in objects:
                    tab_lines = tab_lines + \
                                    line_template5.replace('%d%', dbs_i).replace('%t%', table_i)\
                                    .replace('%c%', '')\
                                    .replace('%f%', '')\
                                    .replace('%l%', '')\
                                    .replace('%typ%', 'view')
                    first = False

            objects = get_object_list(dbs_i, 'index')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR

            if objects:
                if not first:
                    tab_lines = tab_lines + line_template3
                first = True
                for table_i in objects:
                    tab_lines = tab_lines + \
                                    line_template5.replace('%d%', dbs_i).replace('%t%', table_i)\
                                    .replace('%c%', '')\
                                    .replace('%f%', '')\
                                    .replace('%l%', '')\
                                    .replace('%typ%', 'index')
                    first = False

    else:
        tab_lines = line_template3
    html = html.replace("%lines%", tab_lines)
    return html

@app.route('/version', methods=["GET"])
def route_api_version():
    '''route: response version information'''
    app.logger.info(request)
    change_loglevel(request.args.get('loglevel'))

    if LOGLEVEL == 10:
        logtext = ': Debug'
    elif LOGLEVEL == 20:
        logtext = ': Info'
    elif LOGLEVEL == 30:
        logtext = ': Warning'
    elif LOGLEVEL == 40:
        logtext = ': Error'
    elif LOGLEVEL == 50:
        logtext = ': Critical'
    else:
        logtext = ''
    info = {"MODULE": MODULE,
            "VERSION": VERSION,
            "WRITTEN": WRITTEN,
            "PYTHON": PYTHON,
            "FLASK": FLASK,
            "SQLITE": SQLITE,
            "SQLITE_THREADSAVE": threadsave,
            "STARTED": STARTED,
            "LOGLEVEL": str(LOGLEVEL)+logtext
            }
    return response_text(info)

@app.route('/list_databases', methods=["GET"])
def route_api_list_databases():
    '''route: response database list'''
    app.logger.info(request)
    dbs = get_database_list()
    if dbs == []:
        return response_text_err('no databases found'), NOT_FOUND
    rownum = 0
    for dbase in dbs:
        dbs[rownum] = dbase.ljust(17)+file_size(dbase)
        rownum = rownum + 1
    return response_text(dbs)

@app.route('/<dbase>/create_db', methods=["POST", "GET"], endpoint='route_api_create_db')
@auth_required
def route_api_create_db(dbase):
    '''route: create database'''
    app.logger.info(request)

    regex = re.compile('^([0-9a-zA-Z]+\\.)?[0-9a-zA-Z_]+$')
    if not bool(regex.match(dbase)):
        err_mess = "invalid target tablename format: "+dbase
        return response_text_err(err_mess), BAD_REQUEST
    conn = get_db_connection(dbase)
    conn.commit()
    conn.close()
    return response_text('database '+dbase+' created'), CREATED

@app.route('/<dbase>/check_db', methods=["GET"])
def route_api_check_db(dbase):
    '''route: check database for existence'''
    app.logger.info(request)
    if os.path.isfile(dbase+'.db'):
        return response_text('database '+dbase+' is existent'), OK
    return response_text_err('database '+dbase+' not found'), NOT_FOUND

@app.route('/<dbase>/size', methods=["GET"])
def route_api_size(dbase):
    '''route: get size of database'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text('database '+dbase+" doesn't exist"), OK

    sql = "SELECT page_count, freelist_count, page_size "
    sql += "FROM pragma_page_count(), pragma_freelist_count(), pragma_page_size();"
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall'
        sizes = conn.execute(sql).fetchall()[0]
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext
    sizes_json = db_sizes(sizes)
    return jsonify(sizes_json), OK

@app.route('/<dbase>/rebuild_db', methods=["GET"], endpoint='route_api_rebuild_db')
def route_api_rebuild_db(dbase):
    '''route: rebuild database'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text('database '+dbase+" doesn't exist"), OK
    sql = "VACUUM;"
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'vacuum'
        conn.execute(sql)
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext
    return response_text('database '+dbase+' shrinked'), OK

@app.route('/<dbase>/drop_db', methods=["POST", "GET"], endpoint='route_api_drop_db')
@auth_required
def route_api_drop_db(dbase):
    '''route: drop database'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text('database '+dbase+" doesn't exist"), OK
    if os.path.isfile(dbase+'.db'):
        os.remove(dbase+'.db')
        return response_text('database '+dbase+' dropped'), OK
    return response_text('database '+dbase+' dropped'), OK

@app.route('/<dbase>/list_tables', methods=["GET"], endpoint='route_api_list_objects')
@app.route('/<dbase>/list_views', methods=["GET"], endpoint='route_api_list_objects')
@app.route('/<dbase>/list_indexes', methods=["GET"], endpoint='route_api_list_objects')
@app.route('/<dbase>/list', methods=["GET"], endpoint='route_api_list_objects')
def route_api_list_objects(dbase):
    '''route: list all objects in database'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    path_string = request.path.lower()
    object_type = None
    if path_string.find("/list_tables") > 0:
        object_type = 'table'
    if path_string.find("/list_views") > 0:
        object_type = 'view'
    if path_string.find("/list_indexes") > 0:
        object_type = 'index'
    objects = get_object_list(dbase, object_type)
    if isinstance(objects, str):
        return response_text_err(objects), DB_ERROR

    if objects == []:
        return response_text_err('no '+object_type+' found'), NOT_FOUND
    return response_text(objects)

#----------------------------------------------------------------------------

@app.route('/<dbase>/<table>/create_table', \
        methods=["POST", "GET"], endpoint='route_api_create_table')
@auth_required
def route_api_create_table(dbase, table):
    '''route: create table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    sql = "CREATE TABLE "+table+" (ts INTEGER PRIMARY KEY , val TEXT);"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'create table'
        conn.execute(sql)
        command = 'commit'
        conn.commit()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR
    return response_text('table '+table+' created'), CREATED

@app.route('/<dbase>/<db_object>/check_table', methods=["GET"], endpoint='route_api_check')
@app.route('/<dbase>/<db_object>/check', methods=["GET"], endpoint='route_api_check')
def route_api_check(dbase, db_object):
    '''route: check table/ view/ index for existence'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    sql = "SELECT type, name FROM sqlite_master WHERE name = '"+db_object+"';"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'select'
        row = conn.execute(sql).fetchone()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    if row is None:
        return response_text_err(db_object+' not found'), NOT_FOUND
    return response_text(row)

@app.route('/<dbase>/<db_object>/describe', methods=["GET"])
def route_api_describe(dbase, db_object):
    '''route: describe table/ view'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    sql = "SELECT type, name, sql FROM sqlite_master WHERE name = '"+db_object+"';"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'select'
        row = conn.execute(sql).fetchone()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR
    if row is None:
        return response_text_err(db_object+' not found'), NOT_FOUND
    return response_text(row)

@app.route('/<dbase>/<db_object>/drop_table', methods=["POST", "GET"], endpoint='route_api_drop')
@app.route('/<dbase>/<db_object>/drop', methods=["POST", "GET"], endpoint='route_api_drop')
@auth_required
def route_api_drop(dbase, db_object):
    '''route: drop table/ view/ index'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    command = 'connect'
    conn = get_db_connection(dbase)
    sql = "SELECT type FROM sqlite_master WHERE name = '"+db_object+"';"
    app.logger.info(sql)
    command = 'select'
    row = conn.execute(sql).fetchone()
    app.logger.info(row)
    if row is None:
        return response_text(db_object+" doesn't exist"), OK

    try:
        sql = 'DROP '+row[0]+' '+db_object+';'
        app.logger.info(sql)
        command = 'drop '+db_object
        conn.execute(sql)
        command = 'commit'
        conn.commit()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR
    return response_text(row[0]+' '+dbase+'.'+db_object+' dropped')

@app.route('/<dbase>/<table>/clone', methods=["POST", "GET"], endpoint='route_api_clone')
@auth_required
def route_api_clone(dbase, table):
    '''route: clone table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    new = request.args.get('new')
    if new is None:
        return response_text_err('no new tablename defined'), BAD_REQUEST

    regex = re.compile('^([0-9a-zA-Z]+\\.)?[0-9a-zA-Z_]+$')
    if not bool(regex.match(new)):
        err_mess = "invalid target tablename format: "+new
        return response_text_err(err_mess), BAD_REQUEST
    app.logger.info('clone table '+dbase+'.'+table+' to '+new)

    newsplit = new.split('.')
    if newsplit[0] == new:
        dbase_new = dbase
        table_new = new
    else:
        dbase_new = newsplit[0]
        table_new = newsplit[1]

    where = request.args.get('where')
    if where:
        where = ' WHERE '+where+';'
    else:
        where = ';'

    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        if dbase_new != dbase:
            sql = 'ATTACH DATABASE "'+dbase_new+'.db" AS '+dbase_new
            app.logger.info(sql)
            command = 'attach '+dbase_new
            conn.execute(sql)
            table_new = dbase_new+'.'+table_new
        #sql = 'CREATE TABLE '+table_new+' AS SELECT * FROM '+table+' WHERE ts IS NOT NULL;'
        sql = 'CREATE TABLE '+table_new+' AS SELECT * FROM '+table+where
        app.logger.info(sql)
        command = 'create table '+table_new
        conn.execute(sql)
        command = 'commit'
        conn.commit()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    return response_text('table '+new+' cloned from '+table)

#----------------------------------------------------------------------------

@app.route('/<dbase>/<table>/insert', methods=["POST", "GET"], endpoint='route_api_insert')
@auth_required
def route_api_insert(dbase, table):
    '''route: insert new row(s) into table'''
    now = time.time()
    app.logger.info(request)
    buildlist = manage_thread_list('append')

    if not os.path.isfile(dbase+'.db'):
        manage_thread_list('remove_el')
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    # first delete öld rows:
    conn = None
    ts_del = request.args.get('ts_del')
    if ts_del is not None:
        if not ts_del.isnumeric():
            manage_thread_list('remove_el')
            return response_text_err('ts_del = '+ts_del+' is invalid'), BAD_REQUEST
        if int(ts_del) < 0:
            manage_thread_list('remove_el')
            return response_text_err('ts_del = '+ts_del+' is invalid'), BAD_REQUEST
        sql_del = 'DELETE FROM '+table+' WHERE ts < '+ts_del+';'
        app.logger.info(sql_del)

        rowcount = 0
        try:
            command = 'connect'
            conn = get_db_connection(dbase)
            command = 'delete'
            curs = conn.execute(sql_del)
            command = 'rowcount'
            rowcount = curs.rowcount
        except sqlite3.Error as error:
            commtext = command+'(delete '+dbase+'.'+table+')'
            errtext = 'sqlite3.Error on '+commtext+': '+(' '.join(error.args))
            conn.close()
            manage_thread_list('remove_el')
            if errtext.find('database is locked') > 0:
                app.logger.error('*** insert queue: '+buildlist)
            return response_text_err(errtext), DB_ERROR

        app.logger.info(str(rowcount)+' entries deleted')
        command = 'curs.close'
        curs.close()

    #now we do new inserts:
    if request.method == 'GET':
        ts_new = request.args.get('ts')
        if ts_new is None:
            manage_thread_list('remove_el')
            return response_text_err('ts is not defined'), BAD_REQUEST
        if not ts_new.isnumeric():
            manage_thread_list('remove_el')
            return response_text_err('ts = '+ts_new+' is invalid'), BAD_REQUEST
        ts_int = int(ts_new)
        if ts_int < 0:
            manage_thread_list('remove_el')
            return response_text_err('ts = '+ts_new+' is invalid'), BAD_REQUEST

        val = request.args.get('val')
        if val is None:
            manage_thread_list('remove_el')
            return response_text_err('val is not defined'), BAD_REQUEST
        try:
            val_json = json.loads(val)
        except json.JSONDecodeError as error:
            manage_thread_list('remove_el')
            return response_text_err('val='+val+' is no JSON object:  '+error.args[0]), BAD_REQUEST
        #printF('add row '+ts_new+' to '+table+ ':\nval ='+ val)

        sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
        app.logger.info(sql)
        try:
            if not conn:
                command = 'connect'
                conn = get_db_connection(dbase)
            command = 'insert'
            conn.execute(sql, (ts_int, val))
            command = 'commit'
            conn.commit()
            command = 'conn.close()'
            conn.close()
        except sqlite3.Error as error:
            commtext = command+'(insert GET '+dbase+'.'+table+')'
            errtext = 'sqlite3.Error on '+commtext+': '+(' '.join(error.args))
            conn.close()
            manage_thread_list('remove_el')
            if errtext.find('database is locked') > 0:
                app.logger.error('*** insert queue: '+buildlist)
            return response_text_err(errtext), DB_ERROR
        check_threshold(now, dbase, table)
        manage_thread_list('remove_el')
        return response_text('1 of 1 rows stored')

    if request.method == 'POST':
        # since ZWay sends data serialized in special way
        # we convert javascript objects with JSON.stringify before sending

        #raw data (application/x-www-form-urlencoded):
        raw_data = request.get_data().decode('UTF-8')   # JSON.strigified

        jdata = json.loads(raw_data)                        # json object

        #single insert
        if isinstance(jdata, dict):
            app.logger.info('single insert')
            ts_int = jdata['ts']
            #printF('ts_int', ts_int)
            if ts_int is None:
                manage_thread_list('remove_el')
                return response_text_err('ts is not defined'), BAD_REQUEST
            if ts_int < 0:
                manage_thread_list('remove_el')
                return response_text_err('ts = '+str(ts_int)+' is invalid'), BAD_REQUEST

            val_json = jdata['val']                         # val as object
            val = json.dumps(val_json)                      # val as string
            #printF('val_json', val_json)
            if val_json is None:
                manage_thread_list('remove_el')
                return response_text_err('val is not defined'), BAD_REQUEST

            sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
            app.logger.info(sql)
            try:
                if not conn:
                    command = 'connect'
                    conn = get_db_connection(dbase)
                command = 'insert'
                conn.execute(sql, (ts_int, val))
                command = 'commit1'
                conn.commit()
                command = 'conn.close()'
                conn.close()
            except sqlite3.Error as error:
                commtext = command+'(insert POST '+dbase+'.'+table+')'
                errtext = 'sqlite3.Error on '+commtext+': '+(' '.join(error.args))
                conn.close()
                manage_thread_list('remove_el')
                if errtext.find('database is locked') > 0:
                    app.logger.error('*** insert queue: '+buildlist)
                return response_text_err(errtext), DB_ERROR
            check_threshold(now, dbase, table)
            manage_thread_list('remove_el')
            return response_text('1 of 1 rows stored')

        # bulk inserts
        if isinstance(jdata, list):
            app.logger.info('bulk insert')

            ret = select_last_ts(dbase, table, 'yes')
            app.logger.info(ret)
            if ret[1] == OK:
                ts_last = ret[0]
            if ret[1] is None:
                ts_last = 0
            else:
                ts_last = 0
            app.logger.info('ts_last='+str(ts_last))

            sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
            app.logger.info(sql)
            i = 0
            ji_stored = 0
            if not conn:
                conn = get_db_connection(dbase)
            for jdata_i in jdata:
                i += 1
                ts_int = jdata_i['ts']
                #printF('ts_int', ts_int)
                if ts_int is None:
                    conn.close()
                    manage_thread_list('remove_el')
                    return response_text_err('line '+str(i)+': ts is not defined'), BAD_REQUEST
                if ts_int <= ts_last:
                    app.logger.info(str(ts_int)+' <= '+str(ts_last))
                    continue

                val_json = jdata_i['val']                    # val as object
                val = json.dumps(val_json)                   # val as string
                #printF('val_json', val_json)
                if val_json is None:
                    conn.close()
                    manage_thread_list('remove_el')
                    return response_text_err('line '+str(i)+': val is not defined'), BAD_REQUEST

                try:
                    command = 'insert'
                    conn.execute(sql, (ts_int, val))
                    ji_stored += 1
                except sqlite3.Error as error:
                    commtext = command+'(insert bulk, line '+str(i)+' '+dbase+'.'+table+')'
                    errtext = 'sqlite3.Error on '+commtext+': '+(' '.join(error.args))
                    if 'UNIQUE constraint failed' in errtext:
                        app.logger.warning(errtext)
                        continue
                    conn.close()
                    manage_thread_list('remove_el')
                    if errtext.find('database is locked') > 0:
                        app.logger.error('*** insert queue: '+buildlist)
                    return response_text_err(errtext), DB_ERROR

            if ji_stored > 0:
                command = 'commit'
                conn.commit()
            conn.close()
            check_threshold(now, dbase, table)
            manage_thread_list('remove_el')
            return response_text(str(ji_stored)+' of '+str(i)+' rows stored')

@app.route('/<dbase>/<table>/select_next', methods=["GET"])
def route_api_select_next(dbase, table):
    '''route: response (next) rows from table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    ts_last = request.args.get('ts', '0')
    if not ts_last.isnumeric():
        return response_text_err('ts = '+ts_last+' is invalid'), BAD_REQUEST
    app.logger.info('read all next entries from '+table+ ' beginning after ' +ts_last)

    sql = "SELECT * FROM "+table+" WHERE ts > "+ts_last+";"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall'
        rows = conn.execute(sql).fetchall()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    result = []
    rowcount = 0
    #ts_i = 0
    for row in rows:
        rowcount = rowcount + 1
        try:
            result.append(json.loads(row[1]))
            #ts_i = row[0]
        except ValueError:
            result.append(row[1])
    conn.close()
    if int(ts_last) > 0 and result == []:
        return response_text('no more data found'), NOT_MODIFIED

    if result == []:
        return response_text_err('no data found'), NOT_FOUND
    app.logger.info(str(rowcount)+' entries read from table '+table)
    return jsonify(result), OK
# select_next

@app.route('/<dbase>/<table>/select_range', methods=["GET"])
def route_api_select_range(dbase, table):
    '''route: response (range) rows from table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    ts_from = request.args.get('from', '0')
    if not ts_from.isnumeric():
        return response_text_err('from = '+ts_from+' is invalid'), BAD_REQUEST
    ts_to = request.args.get('to', '0')
    if not ts_to.isnumeric():
        return response_text_err('to = '+ts_to+' is invalid'), BAD_REQUEST
    app.logger.info('read all entries from '+table+ ' between '+ts_from+' and '+ts_to)

    if ts_to == '0':
        sql = "SELECT * FROM "+table+" WHERE ts >= "+ts_from+";"
    else:
        sql = "SELECT * FROM "+table+" WHERE ts >= "+ts_from+" AND ts <= "+ts_to+";"
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall'
        rows = conn.execute(sql).fetchall()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    result = []
    rowcount = 0
    #ts_i = 0
    for row in rows:
        rowcount = rowcount + 1
        try:
            result.append(json.loads(row[1]))
            #ts_i = row[0]
        except ValueError:
            result.append(row[1])
    conn.close()

    if result == []:
        return response_text_err('no data found'), NOT_FOUND
    app.logger.info(str(rowcount)+' entries read from table '+table)
    return jsonify(result), OK
# select_range

@app.route('/<dbase>/<table>/select_first_ts', methods=["GET"])
def route_api_select_first(dbase, table):
    '''route: select first row from table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    raw = request.args.get('raw', 'no')
    if raw != 'yes':
        raw = 'no'

    ret = select_first_ts(dbase, table, raw)
    if ret[1] == OK:
        return response_text(ret[0]), ret[1]
    return response_text_err(ret[0]), ret[1]

@app.route('/<dbase>/<table>/select_last_ts', methods=["GET"])
def route_api_select_last(dbase, table):
    '''route: select last row from table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    raw = request.args.get('raw', 'no')
    if raw != 'yes':
        raw = 'no'

    ret = select_last_ts(dbase, table, raw)
    if ret[1] == OK:
        return response_text(ret[0]), ret[1]
    return response_text_err(ret[0]), ret[1]

@app.route('/<dbase>/<table>/count', methods=["GET"])
def route_api_count(dbase, table):
    '''route: response row count in table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    count = count_entries(dbase, table)
    if isinstance(count, str):
        return response_text_err(count), DB_ERROR
    return jsonify(count), OK

@app.route('/<dbase>/<table>/delete_prev', \
        methods=["POST", "GET"], endpoint='route_api_delete_prev')
@auth_required
def route_api_delete_prev(dbase, table):
    '''route: delete all rows in table prior to timestamp'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    ts_next = request.args.get('ts')
    if ts_next is None:
        return response_text_err('ts is not defined'), BAD_REQUEST
    if not ts_next.isnumeric():
        return response_text_err('ts = '+ts_next+' is invalid'), BAD_REQUEST
    if int(ts_next) < 0:
        return response_text_err('ts = '+ts_next+' is invalid'), BAD_REQUEST

    sql = 'DELETE FROM '+table+' WHERE ts < '+ts_next+';'
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'delete'
        conn.execute(sql)
        command = 'commit'
        conn.commit()
        rowcount = conn.total_changes
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    if rowcount == 0:
        return response_text('no data deleted')
    return response_text(str(rowcount)+' entries deleted')

@app.route('/<dbase>/<table>/delete', methods=["POST", "GET"], endpoint='route_api_delete')
@auth_required
def route_api_delete(dbase, table):
    '''route: delete row in table with special timestamp'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    ts_del = request.args.get('ts')
    if ts_del is None:
        return response_text_err('ts is not defined'), BAD_REQUEST
    if not ts_del.isnumeric():
        return response_text_err('ts = '+ts_del+' is invalid'), BAD_REQUEST
    if int(ts_del) < 0:
        return response_text_err('ts = '+ts_del+' is invalid'), BAD_REQUEST
    app.logger.info('delete row '+ts_del+' from '+table)

    sql = 'DELETE FROM '+table+' WHERE ts = '+ts_del+';'
    app.logger.info(sql)
    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'delete'
        conn.execute(sql)
        command = 'commit'
        conn.commit()
        rowcount = conn.total_changes
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR

    if rowcount == 0:
        return response_text('no data deleted')
    return response_text(str(rowcount)+' entries deleted')

#----- SQL ------------------------------------------------------------------

def strip_one_value(val, index):
    '''auxiliary function: strip one value from stringified JSON value
       usage: http://db_server:5000/MxChartDB/sql?
              select ts/1000, val(1), val(2), ... from MxChartDBnnn;'''
    val_str = val.replace('"', "'").replace(', ', ',')
    val_str = re.sub(r"^\[|\]$", "", val_str)
    if val_str.find("tooltip") > 0:
        val_str = re.sub("{'value': ", "", val_str)
        val_str = re.sub(",'tooltip':[^}]*}", "", val_str)
    val_arr = val_str.split(',')
    if index >= len(val_arr):
        return
    val_item = val_arr[index]
    if val_item.find("'") >= 0:
        val_item = val_item.replace("'", "")
    else:
        if val_item.find(".") >= 0:
            val_item = float(val_item)
        else:
            val_item = int(val_item)
    return val_item

    #val_arr = json.loads(val)
    #return  val_arr[index]

@app.route('/<dbase>/sql', methods=["GET"], endpoint='route_sql_get')
@auth_required
def route_sql_get(dbase):
    '''route: execute SQL command'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    sql = request.args.get('command')   #only for backward compatibility
    if sql is None:
        sql = urllib.parse.unquote(str(request.query_string, "utf-8"))
    if sql is None:
        return response_text_err('no sql command given'), OK    #BAD_REQUEST
    app.logger.info(sql)
    command = 'connect'
    conn = get_db_connection(dbase)
    if sql.find("val(") > 0:
        sql = sql.replace('val(', 'value(val,')
    if sql.find("value(") > 0:
        command = 'create_function'
        conn.create_function("value", 2, strip_one_value)
    try:
        command = 'cursor'
        curs = conn.cursor()
        command = 'sql'
        curs.execute(sql)
        command = 'fetchall'
        resp = curs.fetchall()
        command = 'commit'
        conn.commit()
        command = 'curs.close()'
        curs.close()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR
    return response_text(resp)
#    return response_text_plain(str(resp).replace("'", ""))

@app.route('/<dbase>/sql', methods=["POST"], endpoint='route_sql_post')
@auth_required
def route_sql_post(dbase):
    '''route: execute SQL command'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    app.logger.info(request.form)
    for key in request.form.to_dict():
        app.logger.info(key)
        sql = key
    app.logger.info(sql)
    if not sql:
        return response_text_err('sql command missing'), BAD_REQUEST

    command = 'connect'
    conn = get_db_connection(dbase)
    if sql.find("val(") > 0:
        sql = sql.replace('val(', 'value(val,')
    if sql.find("value(") > 0:
        command = 'create_function'
        conn.create_function("value", 2, strip_one_value)
    try:
        command = 'cursor'
        curs = conn.cursor()
        command = 'sql'
        curs.execute(sql)
        command = 'fetchall'
        resp = curs.fetchall()
        command = 'commit'
        conn.commit()
        command = 'curs.close()'
        curs.close()
        command = 'conn.close()'
        conn.close()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return response_text_err(errtext), DB_ERROR
    return response_text(resp)
#    return response_text_plain(str(resp))

#----------------------------------------------------------------------------
