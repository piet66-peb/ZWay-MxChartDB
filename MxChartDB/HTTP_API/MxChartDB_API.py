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
#h Version:      V2.4.0 2025-07-18/peb
#v History:      V1.0.0 2022-03-14/peb first version
#v               V2.2.0 2024-12-13/peb [+]enable WAL mode at connect
#v               V2.3.0 2024-12-21/peb [+]treat_lock
#v               V2.3.1 2025-07-14/peb [x]threadsave = 'unknown'
#v               V2.4.0 2025-07-17/peb [+]select_last?count=
#v                                        select only last row in ADMIN page
#h Copyright:    (C) piet66 2022
#h License:      http://opensource.org/licenses/MIT
#h
#h Attention:    This program only supports http!
#h               Sending requests with https results in the error message
#h               'code 400, message Bad request version'.
#h               Some browsers may be parametrized to use always https!
#h
#h-------------------------------------------------------------------------------
#h
#h API interface:
#h ==============
#h index.html
#h
#h-------------------------------------------------------------------------------
'''

#pylint: disable=too-many-lines
#pylint: disable=inconsistent-return-statements, too-many-return-statements
#pylint: disable=too-many-branches, too-many-locals, too-many-statements

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
VERSION = 'V2.4.0'
WRITTEN = '2025-07-18/peb'
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
    threadsave = threadsave + ' ('+str(SQLITE_THREADSAVE)+')'
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
if hasattr(constants, 'MODAL_WIDTH'):
    MODAL_WIDTH = constants.MODAL_WIDTH
else:
    MODAL_WIDTH = '100%'
if hasattr(constants, 'MODAL_HEIGHT'):
    MODAL_HEIGHT = constants.MODAL_HEIGHT
else:
    MODAL_HEIGHT = '520px'
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

def treat_lock(newstate=False, text=None):
    '''for analysis of database locks:
       treat lock state of the database engine
       to get the first locked database statement'''

    #reset lock state
    if not newstate:
        return newstate

    #lock state true but not changed
    if LOCK_STATE:
        return newstate

    #lock state changed to true
    outtext = "### {}: database is locked".format(text)
    app.logger.warn(outtext)
    outtext = '### THREAD_LIST: {}'.format(THREAD_LIST)
    app.logger.warn(outtext)
    return newstate

LOCK_STATE = treat_lock(newstate=False)

def manage_thread_list(func, resetlockstate=False):
    '''for analysis of database locks:
        manage active thread list'''

    if func == 'create':
        app.logger.debug('create THREAD_LIST))')
        return []

    if func == 'append':
        THREAD_LOCK.acquire()
        self = request.args.get('self', '?')
        entry = self+' '+str(request.path)

        if entry in THREAD_LIST:
            app.logger.error('"{}" is already in THREAD_LIST'.format(entry))
            THREAD_LIST.remove(entry)

        app.logger.debug('append "{}" to THREAD_LIST'.format(entry))
        THREAD_LIST.append(entry)

        thread_act = threading.active_count()
        if THRESHOLD_THREADS is not None and thread_act >= THRESHOLD_THREADS:
            outtext = "*** active threads={} >= {}".format(thread_act, THRESHOLD_THREADS)
            app.logger.warn(outtext)
            outtext = '*** THREAD_LIST: {}'.format(THREAD_LIST)
            app.logger.warn(outtext)

        THREAD_LOCK.release()
        return THREAD_LIST

    if func == 'remove':
        THREAD_LOCK.acquire()
        if resetlockstate:
            treat_lock(newstate=False)

        self = request.args.get('self', '?')
        entry = self+' '+str(request.path)
        app.logger.debug('remove "{}" from THREAD_LIST'.format(entry))
        try:
            THREAD_LIST.remove(entry)
        except: #pylint: disable=bare-except
            app.logger.warn('*** entry "{}" not found in THREAD_LIST'.format(entry))

        THREAD_LOCK.release()
        return THREAD_LIST

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

    app.logger.debug('requesting host: '+''.join(request.remote_addr))
    app.logger.debug('requesting method: '+request.method)
    app.logger.debug('requested host: '+request.host)
    app.logger.debug('requested path: '+request.path)
    app.logger.debug('requested query_string: '+str(request.query_string))

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
    app.logger.debug('wild_search: '+string_in)
    try:
        in_list = list_in.index(string_in)
        if in_list >= 0:
            app.logger.debug(string_in+' found')
            return True
    except: #pylint: disable=bare-except
        for string_i in list_in:
            pattern = string_i.replace(".", r"\.").replace("*", ".*")
            app.logger.debug('check '+pattern+' for '+string_in)
            regex = re.compile("^"+pattern+"$")
            if bool(regex.match(string_in)):
                return True
    return False

# Basic Authentication
def auth_required(func):
    '''decorator to check authentication'''
    app.logger.debug('*** auth_required')
    @wraps(func)
    def decorator(*args, **kwargs):
        #skip authorization for /SQL/ GET selects
        if request.endpoint == 'route_sql_get':
            app.logger.debug('checking for SELECT...')
            sql = request.args.get('command')
            if sql is None:
                return func(*args, **kwargs)
            app.logger.debug(sql)
            pos = sql.upper().lstrip().find('SELECT ')
            if pos == 0:
                app.logger.debug('SELECT: skipping authorization')
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
    global LOGLEVEL #pylint: disable=global-statement
    if new_loglevel != LOGLEVEL:
        LOGLEVEL = new_loglevel
        app.logger.setLevel(LOGLEVEL)
        app.logger.warn('new loglevel='+str(LOGLEVEL))

def usersize(size, detailed=True):
    '''auxiliary function: convert byte size to user readable size string'''

    stringsize = str(size)+' Bytes'
    detailsize = stringsize
    if size >= 1024 * 1024 * 1024:
        stringsize = str(round(size/1024/1024/1024, 1)) + ' GiB'
        detailsize = detailsize + ' = ' + stringsize
    elif size >= 1024 * 1024:
        stringsize = str(round(size/1024/1024, 1)) + ' MiB'
        detailsize = detailsize + ' = ' + stringsize
    elif size >= 1024:
        stringsize = str(round(size/1024, 1)) + ' KiB'
        detailsize = detailsize + ' = ' + stringsize
    if detailed:
        return detailsize
    return stringsize

def convert_db_sizes(dbase, sizes):
    '''auxiliary function: convert db sizes into json structure'''
    sizes_json = {"database name": dbase,
                  "page count": sizes[0],
                  "unused pages": sizes[1],
                  "page size": usersize(sizes[2]),
                  "size complete": usersize(sizes[0]*sizes[2]),
                  "size used": usersize((sizes[0] - sizes[1]) *sizes[2]),
                  "size free": usersize(sizes[1] *sizes[2])
                  }
    return sizes_json

def get_db_sizes(dbase):
    '''auxiliary function: get sizes of given db'''
    try:
        sql = "SELECT page_count, freelist_count, page_size "
        sql += "FROM pragma_page_count(), pragma_freelist_count(), pragma_page_size();"
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall'
        sizes = conn.execute(sql).fetchall()[0]
        command = 'conn.close()'
        conn.close()
        return sizes
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        return errtext

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
#    app.logger.debug(text)
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

    # V2.2.0: check/enable wal mode for the database
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode;')
    journal_mode = cursor.fetchone()[0]
    app.logger.debug("current journal mode for {}: {}".format(dbase, journal_mode))
    if journal_mode != 'wal':
        conn.execute('PRAGMA journal_mode=WAL')
        app.logger.debug("wal mode enabled for {}".format(dbase))
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
    app.logger.debug(sql)

    try:
        command = 'connect'
        conn = get_db_connection(dbase)
        command = 'fetchall '+dbase
        rows = conn.execute(sql).fetchall()
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error on '+command+': '+(' '.join(error.args))
        conn.close()
        if "file is not a database" in errtext:
            return []
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
    #app.logger.debug(sql)
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
    #app.logger.debug(sql)
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
def count_entries(dbase, table, condition):
    '''auxiliary function: count rows in table'''
    if condition:
        sql = "SELECT COUNT(*) FROM "+table+" WHERE "+condition+";"
    else:
        sql = "SELECT COUNT(*) FROM "+table+";"
        #sql = 'sp_spaceused '+table+';'
    #app.logger.warn(sql)
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

# get count entry in table
def count_entries_local(dbase, table, condition=None):
    '''local function: count rows in table'''
    if condition:
        sql = "SELECT COUNT(ts) FROM "+table+" WHERE "+condition+";"
    else:
        sql = "SELECT COUNT(ts) FROM "+table+";"
    #app.logger.debug(sql)
    try:
        conn = get_db_connection(dbase)
        count = conn.execute(sql).fetchall()[0]
        conn.close()
        return str(count[0])
    except sqlite3.Error as error:
        errtext = 'sqlite3.Error : '+(' '.join(error.args))
        app.logger.error(errtext)
        app.logger.error('at: '+sql)
        return 'error'

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
    app.logger.debug('url='+url)
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
          style="border:none; height: MODAL_HEIGHT; width:MODAL_WIDTH"></iframe>
   </body>
</html>
"""
    src = "/ZAutomation/api/v1/load/modulemedia/"
    src += module+'/HTML/draw-chartjs.html?chartId='+chart_id
    html = html.replace('XSRCX', src)
    html = html.replace('MODAL_HEIGHT', MODAL_HEIGHT)
    html = html.replace('MODAL_WIDTH', MODAL_WIDTH)
    return html

#----- API ------------------------------------------------------------------

@app.route('/', methods=["GET"])
def route_api_commands():
    '''route: show api commands in an html page'''
    app.logger.info(request)
    try:
        with open("index.html", "r") as fopen:
            inhalt = fopen.read()
        return inhalt
    except Exception as error: #pylint: disable=broad-except
        fehlertext = str(error)
        return response_text_err(fehlertext), NOT_FOUND, ''

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
                  <th><center> Row<br>Count </center></th>
                  <th><center> Row Count<br>Latest Hour </center></th>
                  <th><center> First<br>Timestamp </center></th>
                  <th><center> Last<br>Timestamp </center></th>
              </tr>\n"""
    dbs = get_database_list()

    if dbs != []:
        #for all databases:
        for dbs_i in dbs:
            #for all tables in database:
            objects = get_object_list(dbs_i, 'table')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR
            first = True
            for table_i in objects:
                if first:
                    db_name = dbs_i
                    db_drop = "<a href='../"+dbs_i+ \
                    "/drop_db'><u><font color=blue>drop database</font></u></a>"
                    obj_type = "table"
                else:
                    db_name = ''
                    db_drop = ''
                    obj_type = ''

                select = "<a href='../"+dbs_i+"/"+table_i+ \
                "/select_last?count=1'><u><font color=blue>select last row</font></u></a>"
                #select = "<a href='../"+dbs_i+"/"+table_i+ \
                #"/select_next'><u><font color=blue>select values</font></u></a>"
                count = count_entries_local(dbs_i, table_i)
                first = select_first_ts(dbs_i, table_i)[0]
                last = select_last_ts(dbs_i, table_i)[0]
                count_hour = '0'
                if last:
                    last_ts = select_last_ts(dbs_i, table_i, 'yes')[0]
                    last_hour = last_ts - 1000*60*60
                    if last_hour > 0:
                        condition = 'ts>'+str(last_hour)
                        count_hour = count_entries_local(dbs_i, table_i, condition)
                html += \
                "<tr><td>"+db_name+"</td>" + \
                "<td>"+db_drop+"</td>" + \
                "<td>"+table_i+"</td>" + \
                "<td><center>"+obj_type+"</td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/describe'><u><font color=blue>describe</font></u></a></td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/drop'><u><font color=blue>drop</font></u></a></td>" + \
                "<td>"+select+"</td>" + \
                "<td><center> "+count+" </center></td>" + \
                "<td><center> "+count_hour+" </center></td>" + \
                "<td><center> "+first+" </center></td>" + \
                "<td><center> "+last+" </center></td>" + \
                "</tr>\n"
                first = False

            #for all views in database:
            objects = get_object_list(dbs_i, 'view')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR
            obj_first = True
            for table_i in objects:
                if first:
                    db_name = dbs_i
                    db_drop = "<a href='../"+dbs_i+ \
                    "/drop_db'><u><font color=blue>drop database</font></u></a>"
                else:
                    db_name = ''
                    db_drop = ''
                if obj_first:
                    obj_type = "view"
                else:
                    obj_type = ''

                select = "<a href=../"+dbs_i+"/sql?select%20*%20from%20"+table_i+";>" + \
                        "<u><font color=blue>select values</font></u></a>"
                count = count_entries_local(dbs_i, table_i)
                first = ''
                last = ''
                html += \
                "<tr><td>"+db_name+"</td>" + \
                "<td>"+db_drop+"</td>" + \
                "<td>"+table_i+"</td>" + \
                "<td><center>"+obj_type+"</td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/describe'><u><font color=blue>describe</font></u></a></td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/drop'><u><font color=blue>drop</font></u></a></td>" + \
                "<td>"+select+"</td>" + \
                "<td><center>"+count+"</td>" + \
                "<td><center>"+""+"</td>" + \
                "<td><center>"+first+"</td>" + \
                "<td><center>"+last+"</td>" + \
                "</tr>\n"
                first = False
                obj_first = False

            #for all indexes:
            objects = get_object_list(dbs_i, 'index')
            if isinstance(objects, str):
                return response_text_err(objects), DB_ERROR
            obj_first = True
            for table_i in objects:
                if first:
                    db_name = dbs_i
                    db_drop = "<a href='../"+dbs_i+ \
                    "/drop_db'><u><font color=blue>drop database</font></u></a>"
                else:
                    db_name = ''
                    db_drop = ''
                if obj_first:
                    obj_type = "index"
                else:
                    obj_type = ''
                select = ''
                count = ''
                first = ''
                last = ''
                html += \
                "<tr><td>"+db_name+"</td>" + \
                "<td>"+db_drop+"</td>" + \
                "<td>"+table_i+"</td>" + \
                "<td><center>"+obj_type+"</td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/describe'><u><font color=blue>describe</font></u></a></td>" + \
                "<td><a href='../"+dbs_i+"/"+table_i+ \
                "/drop'><u><font color=blue>drop</font></u></a></td>" + \
                "<td>"+select+"</td>" + \
                "<td><center>"+count+"</td>" + \
                "<td><center>"+first+"</td>" + \
                "<td><center>"+last+"</td>" + \
                "</tr>\n"
                first = False
                obj_first = False

            #if database is empty
            if first:
                html += \
                "<tr><td>"+dbs_i+"</td>" + \
                "<td><a href='../"+dbs_i+ \
                "/drop_db'><u><font color=blue>drop database</font></u></a></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "<td></td>" + \
                "</tr>\n"
    else:
        html += \
        "<tr><td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "<td></td>" + \
        "</tr>\n"

    html += '</table>'

    #html = html.replace("%lines%", tab_lines)
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
        sizes = get_db_sizes(dbase)
        if isinstance(sizes, tuple):
            dbs[rownum] += ', ' + 'free: ' + usersize(sizes[1] *sizes[2], False)
        else:
            dbs[rownum] += ',' + sizes.split(':')[1]
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

    sizes = get_db_sizes(dbase)

    if isinstance(sizes, str):
        return sizes
    sizes_json = convert_db_sizes(dbase, sizes)
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
    app.logger.debug(sql)
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
    app.logger.debug(sql)
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
    app.logger.debug(sql)
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
    app.logger.debug(sql)
    command = 'select'
    row = conn.execute(sql).fetchone()
    app.logger.debug(row)
    if row is None:
        return response_text(db_object+" doesn't exist"), OK

    try:
        sql = 'DROP '+row[0]+' '+db_object+';'
        app.logger.debug(sql)
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
    app.logger.debug('clone table '+dbase+'.'+table+' to '+new)

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
            app.logger.debug(sql)
            command = 'attach '+dbase_new
            conn.execute(sql)
            table_new = dbase_new+'.'+table_new
        #sql = 'CREATE TABLE '+table_new+' AS SELECT * FROM '+table+' WHERE ts IS NOT NULL;'
        sql = 'CREATE TABLE '+table_new+' AS SELECT * FROM '+table+where
        app.logger.debug(sql)
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
    manage_thread_list('append')

    if not os.path.isfile(dbase+'.db'):
        manage_thread_list(func='remove')
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    # first delete öld rows:
    conn = None
    ts_del = request.args.get('ts_del')
    if ts_del is not None:
        if not ts_del.isnumeric():
            manage_thread_list(func='remove')
            return response_text_err('ts_del = '+ts_del+' is invalid'), BAD_REQUEST
        if int(ts_del) < 0:
            manage_thread_list(func='remove')
            return response_text_err('ts_del = '+ts_del+' is invalid'), BAD_REQUEST
        sql_del = 'DELETE FROM '+table+' WHERE ts < '+ts_del+';'
        app.logger.debug(sql_del)

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
            if errtext.find('database is locked') > 0:
                treat_lock(newstate=True, text=commtext)
            manage_thread_list(func='remove', resetlockstate=False)
            return response_text_err(errtext), DB_ERROR

        app.logger.info(str(rowcount)+' entries deleted')
        command = 'curs.close'
        curs.close()

    #now we do new inserts:
    if request.method == 'GET':
        ts_new = request.args.get('ts')
        if ts_new is None:
            manage_thread_list(func='remove')
            return response_text_err('ts is not defined'), BAD_REQUEST
        if not ts_new.isnumeric():
            manage_thread_list(func='remove')
            return response_text_err('ts = '+ts_new+' is invalid'), BAD_REQUEST
        ts_int = int(ts_new)
        if ts_int < 0:
            manage_thread_list(func='remove')
            return response_text_err('ts = '+ts_new+' is invalid'), BAD_REQUEST

        val = request.args.get('val')
        if val is None:
            manage_thread_list(func='remove')
            return response_text_err('val is not defined'), BAD_REQUEST
        try:
            val_json = json.loads(val)
        except json.JSONDecodeError as error:
            manage_thread_list(func='remove')
            return response_text_err('val='+val+' is no JSON object:  '+error.args[0]), BAD_REQUEST
        #printF('add row '+ts_new+' to '+table+ ':\nval ='+ val)

        sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
        app.logger.debug(sql)
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
            if errtext.find('database is locked') > 0:
                treat_lock(newstate=True, text=command)
            manage_thread_list(func='remove', resetlockstate=False)
            return response_text_err(errtext), DB_ERROR
        check_threshold(now, dbase, table)
        manage_thread_list(func='remove')
        return response_text('1 of 1 rows stored')

    if request.method == 'POST':
        # since ZWay sends data serialized in special way
        # we convert javascript objects with JSON.stringify before sending

        #raw data (application/x-www-form-urlencoded):
        raw_data = request.get_data().decode('UTF-8')   # JSON.strigified
        app.logger.debug(raw_data)

        jdata = json.loads(raw_data)                        # json object

        #single insert
        if isinstance(jdata, dict):
            app.logger.debug('single insert')
            ts_int = jdata['ts']
            #printF('ts_int', ts_int)
            if ts_int is None:
                manage_thread_list(func='remove')
                return response_text_err('ts is not defined'), BAD_REQUEST
            if ts_int < 0:
                manage_thread_list(func='remove')
                return response_text_err('ts = '+str(ts_int)+' is invalid'), BAD_REQUEST

            val_json = jdata['val']                         # val as object
            val = json.dumps(val_json)                      # val as string
            #printF('val_json', val_json)
            if val_json is None:
                manage_thread_list(func='remove')
                return response_text_err('val is not defined'), BAD_REQUEST

            sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
            app.logger.debug(sql)
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
                if errtext.find('database is locked') > 0:
                    treat_lock(newstate=True, text=commtext)
                manage_thread_list(func='remove', resetlockstate=False)
                return response_text_err(errtext), DB_ERROR
            check_threshold(now, dbase, table)
            manage_thread_list(func='remove')
            return response_text('1 of 1 rows stored')

        # bulk inserts
        if isinstance(jdata, list):
            app.logger.debug('bulk insert')

            ret = select_last_ts(dbase, table, 'yes')
            app.logger.debug(ret)
            if ret[1] == OK:
                ts_last = ret[0]
            if ret[1] is None:
                ts_last = 0
            else:
                ts_last = 0
            app.logger.debug('ts_last='+str(ts_last))

            sql = 'INSERT INTO '+table+ ' VALUES (?, ?);'
            app.logger.debug(sql)
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
                    manage_thread_list(func='remove')
                    return response_text_err('line '+str(i)+': ts is not defined'), BAD_REQUEST
                if ts_int <= ts_last:
                    app.logger.debug(str(ts_int)+' <= '+str(ts_last))
                    continue

                val_json = jdata_i['val']                    # val as object
                val = json.dumps(val_json)                   # val as string
                #printF('val_json', val_json)
                if val_json is None:
                    conn.close()
                    manage_thread_list(func='remove')
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
                    if errtext.find('database is locked') > 0:
                        treat_lock(newstate=True, text=commtext)
                    manage_thread_list(func='remove', resetlockstate=False)
                    return response_text_err(errtext), DB_ERROR

            if ji_stored > 0:
                command = 'commit'
                conn.commit()
            conn.close()
            check_threshold(now, dbase, table)
            manage_thread_list(func='remove')
            return response_text(str(ji_stored)+' of '+str(i)+' rows stored')

@app.route('/<dbase>/<table>/select_last', methods=["GET"])
def route_api_select_last(dbase, table):
    '''route: response last rows from table'''
    app.logger.info(request)
    #app.logger.info(request.headers)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    count = request.args.get('count', '1')
    if not count.isnumeric():
        return response_text_err('count = '+count+' is invalid'), BAD_REQUEST
    if int(count) < 1:
        return response_text_err('ts = '+count+' is invalid'), BAD_REQUEST
    app.logger.debug('read last '+count+' entries from '+table)

    sql = "SELECT * FROM "+table+" ORDER BY ts DESC LIMIT "+count+";"
    app.logger.debug(sql)
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
    for row in rows:
        rowcount = rowcount + 1
        try:
            result.append(json.loads(row[1]))
        except ValueError:
            result.append(row[1])
    conn.close()
    if result == []:
        return response_text_err('no data found'), NOT_FOUND
    return jsonify(result), OK
# select_last

@app.route('/<dbase>/<table>/select_next', methods=["GET"])
def route_api_select_next(dbase, table):
    '''route: response (next) rows from table'''
    app.logger.info(request)
    if not os.path.isfile(dbase+'.db'):
        return response_text_err('database '+dbase+' not found'), NOT_FOUND

    ts_last = request.args.get('ts', '0')
    if not ts_last.isnumeric():
        return response_text_err('ts = '+ts_last+' is invalid'), BAD_REQUEST
    app.logger.debug('read all next entries from '+table+ ' beginning after ' +ts_last)

    sql = "SELECT * FROM "+table+" WHERE ts > "+ts_last+";"
    app.logger.debug(sql)
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
    app.logger.debug('read all entries from '+table+ ' between '+ts_from+' and '+ts_to)

    if ts_to == '0':
        sql = "SELECT * FROM "+table+" WHERE ts >= "+ts_from+";"
    else:
        sql = "SELECT * FROM "+table+" WHERE ts >= "+ts_from+" AND ts <= "+ts_to+";"
    app.logger.debug(sql)
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
def route_api_select_first_ts(dbase, table):
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
def route_api_select_last_ts(dbase, table):
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

    condition = urllib.parse.unquote(str(request.query_string, "utf-8"))
    count = count_entries(dbase, table, condition)
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
    app.logger.debug(sql)
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
    app.logger.debug('delete row '+ts_del+' from '+table)

    sql = 'DELETE FROM '+table+' WHERE ts = '+ts_del+';'
    app.logger.debug(sql)
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
    app.logger.debug(sql)
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

    app.logger.debug(request.form)
    for key in request.form.to_dict():
        app.logger.debug(key)
        sql = key
    app.logger.debug(sql)
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
