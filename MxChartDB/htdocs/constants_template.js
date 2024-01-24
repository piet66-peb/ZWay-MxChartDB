/*** MxChartDB constants.js */

//
// constants for HTTP_API access
// copy this file to htdocs/constants.js and do your parametrization
//

var constants = {
    // 1. globals for HTTP_API access:
    port: 5000,
    username: 'username',
    password: 'secret',

    // 2. for the Z-Way MxChartDB apps:
    zway_app: {
        //ip address respectively hostname of the db server system,
        //seen from the zway_server system
        //ip: '127.0.0.1',    
        hostname: "localhost",      //localhost: if db server system = zway server system

        //reaction on communication fault:
        retry_init_min: 5,          //retry initialization after n minutes
        buffer_max_rows: 20,        //buffer sensor data
    },

    // 3. for the browser clients:
    browser_client: {
        //ip address respectively hostname of the db server system,
        //seen from the client pc (localhost not possible)
        //ip: '192.168.178.22',    
        hostname: "db_server",

        //behavior of the Chart Index page;
        index: {
            open_chart_in_new_tab: false,
            open_data_in_new_tab: false,
        },

        //behavior of the Chart Administration page:
        admin: {
            open_chart_in_new_tab: true,
            open_data_in_new_tab: true,
        },

        //create snapshots for charts:
        snapshots: {
            database_name: 'Snapshots',
            admin_required: true,
        },
    }
};
