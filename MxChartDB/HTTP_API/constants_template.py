'''
####
#### Parametrization for MxChartDB_API.py
#### restart API after every change !
####
'''

####
#### loglevel:
#### 20 = INFO, 30 = ERROR + WARNING
####
LOGLEVEL = 30       # default: 20

####
#### timeout (seconds):
#### increase this value to minimize 'database is locked' messages
####
#TIMEOUT = 10        # default: 5 seconds

####
#### Add warnings to the log for analysis:
#### - THRESHOLD_DURATION: threshold for duration of database inserts (seconds)
#### - THRESHOLD_THREADS:  threshold for count of running threads
#### a warning is issued in the log if the limit value is exceeded.
####
THRESHOLD_DURATION = 1.00   # seconds, default: None
#THRESHOLD_THREADS = 5       # default: None

####
#### authentication for write accesses
#### (read accesses don't need any authentication)
#### recommendation: don't disable authentication
####
#DISABLE_AUTHENTICATION = True   # default: False
USERNAME = 'username'
PASSWORD = 'secret'

####
#### accept GET method for write accesses
#### (per default only POST method has write access)
#### recommendation: only for testing purpose
####     only enable temporarily if really necessary
####     all remote client hosts in whitelist can use that
####
#ALLOW_WRITE_WITH_GET = True
# default: False, no write acces via GET command
# if True: you are asked to login with username/password, if not disabled

####
#### allow Cross-Origin Resource Sharing for clients writing to database
#### with POST command (used by Administrator)
#### commenting this line disables write access for remote clients
#### recommendation: restrict CORS_HOST to the ZWay server
#### Cross-Origin doesn't work with localhost, use the real ip instead!
####
CORS_HOST = ["http://192.168.178.22:8083"]
# default: no write access for MxChartDB browser pages

####
#### define whitlists for HTTP API clients
#### a server not in the whitelist has not the appropriate rights
#### WHITELIST_GET: whitelist for all client hosts (read access)
#### that are: MxChartDB Index + Admin + charts + SQLite HTTP API
#### WHITELIST_POST: whitelist for all client hosts (write access)
#### that is: MxChartDB Admin
#### only ip addresses are allowed, maybe with wildcards
#### recommendation: restrict WHITELIST_POST to trustworthy hosts
####     necessary to include the ZWay server too in both lists
####
WHITELIST_GET = ["127.0.0.1", "192.168.178.*"]
WHITELIST_POST = ["127.0.0.1", "192.168.178.22", "192.168.178.42"]

####
#### define the size of the modal window in Smarthome UI
####
MODAL_WIDTH = '100%'
MODAL_HEIGHT = '530px'
