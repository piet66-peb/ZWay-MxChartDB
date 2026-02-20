/*** MxChartDB constants.js */

//
// constants for HTTP_API access
// copy this file to htdocs/constants.js and do your parametrization
//

var constants = {
    // 1. globals for HTTP_API access:
    ip: '192.168.178.22',    
    //hostname: "db_server",
    port: 8082,
    username: 'username',
    password: 'secret',

    // 2. for the Z-Way MxChartDB apps:
    zway_app: {
        //reaction on communication fault:
        retry_init_min: 5,          //retry initialization after n minutes
        buffer_max_rows: 20,        //buffer sensor data in case of database busy
    },

    // 3. for the browser clients:
    browser_client: {
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

        //location coordinates necessary for coloring of the night background:
        night: {
            longitude: undefined,
            latitude:  undefined,
            tz:        undefined,       //default: system timezone
            backColor: undefined,       //default: '#cccccc60'
        },

/*        
        //optional: 
        //The output consists of the graphic part plus the additional texts and 
        //buttons below.The size of the graphic can be changed with these settings.
        //
        //default aspect ratio of the graphic: width/height ≈ 1.46, dpending on the font size
        // - define main_width to change the output size
        // - define chart_height to change the aspect ratio
        // - define both to change size and aspect ratio
        
        //standard settings, if nothing else is defined:
        standard_display: {
            html_fontSize: 'medium',
            chart_fontSize: 14,                         //in px, number without unit

            //main_width: '100%',                       //maximum width
            //main_width: '99vw',                       //maximum width
            //main_width: window.innerWidth-10,         //maximum width
            //main_width: window.innerHeight*1.46,      //max width with fitting height
            //main_width: 1150,                         //fixed width

            //chart_height: '800',                      //fixed chart height
            //chart_height: '70vh',                     //fixed chart height
            chart_height: window.innerHeight/1.46,      //fixed chart height 
            //chart_height: 100/1.46+'vh',              //fixed chart height 

            //border: 'thin solid #000000', 
            //margin: 'auto', 
        },

        //for output in a frame:
        frame: {
            html_fontSize: 'medium',
            chart_fontSize: 14,                         //in px, number without unit

            main_width: '100%',                         //maximum width
            chart_height: window.innerHeight/1.46,      //fixed chart height 

            frame_width: 980,
            frame_height: 670,
        },

        //for modal subwindows in Smarthome UI:
        modal: {
            html_fontSize: 'small',
            chart_fontSize: 12,                          //in px, number without unit

            main_width: '100%',
            chart_height: window.innerHeight/1.46,      //fixed chart height 
        },

        //for mobile devices:
        mobile: {
            html_fontSize: 'medium',
            chart_fontSize: 14,                         //in px, number without unit

            main_width: window.innerWidth-50,           //maximum width - margin

            //landscape mode: only the graphics part is visible
            chart_height: window.innerWidth > window.innerHeight ?
                          window.innerHeight : undefined,
            border: 'thin solid #000000', 
            margin: 'auto', 
        },
*/        
    }
};
