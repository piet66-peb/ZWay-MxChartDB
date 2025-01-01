function modulePostRender(control) {
    /*jshint strict: false */
    /*globals $ */

    console.log('postRender.js start');

    /* test part */
    /* ========= */

    /* onChange trigger */ /* 
    control.childrenByPropertyId.chartTitle.on("change", function() {
        console.log("The value of chartTitle was changed to: " + this.getValue());
    }); */    

    /* walk through all form inputs */
/*    
    $(":input").each(function(){
        var name = $(this).attr('name');
        var val = $(this).val();
        var id = $(this).attr('id');
        var type = $(this).attr('type');
        if (!type) {
            type = $(this).context.type;
        }
        if (type === 'checkbox') {
            val = $(this).context.checked;
        } else
        if (type === 'button') {
            name = $(this).context.title;
        } else
        if (type === 'submit') {
            name = $(this).context.title;
        }
        console.log(type+' '+id+': '+name+'='+val);
    });
*/

    /* determine os */
    /* ============ */

    function getOS() {
        var url = '/ZAutomation/api/v1/instances/ZWave';
        var os = 'Unknown';
        $.ajax({
            url: url,
            async: false,
            success: function (data) {
                /* console.log(data); */
                var port = data.data[0].params.port;
                console.log('port='+port);
                if (port.indexOf('/dev/') === 0) {
                    os = 'Linux';
                } else
                if (port.indexOf('COM') >= 0) {
                    os = 'Windows';
                }
            }
        })
        .fail(function(xhr, status, errMsg){
            if (xhr.status === 401) {   /* Unauthorized*/
                alert(xhr.responseJSON.error || xhr.responseText);
            } else
            if (xhr.status === 403) {   /* Forbidden*/
                alert(xhr.responseJSON.error || xhr.responseText);
            } else {
                alert(url+': '+JSON.stringify(xhr));
            }
        });
        console.log('os='+os);
        return os;
    } /* getOS */
    var os = getOS();

    /* set defaults  for input fields */
    /* ============================== */
    /* works only form simple input fields !! */

    var defaults = {nonnumericLabels_y3Labeling:    'on,off',
                    nonnumericLabels_y3Icons:       'switch-on,switch-off',
                    nonnumericLabels_y3IconsWidth:  2.5,
                    axes_time_label: 'null',
                    global_js_lines: 5,
                    axes_y1Label: 'null',
                    axes_y2Label: 'null',
    };  
    
    /* walk through all input fields: */
    var id, type, name, value, checked, positionYAxis_set, poll_method_set;
    var global_js_lines;
    $(":input").each(function(){
        type = $(this).attr('type');
        name = $(this).attr('name');

        id = $(this).attr('id');
        if (id) {
            value = $(this).val();
            console.log(id+': '+name+' == '+value);
            if (!value) {
                var new_value = defaults[name];
                if (new_value) {
                    console.log(id+': '+name+' > '+new_value);
                    $(this).val(new_value);
                    value = new_value;
                }
            }
            if (name === 'global_js_lines') {
                global_js_lines = value;
            }
            if (id === "global_js_code") {
                $(this).attr('rows', global_js_lines);
            }
        }
    });

    /* set background colors */
    /* ===================== */

    $(".objectClass").css( "background-color", "#f8f8f8" );
    $(".objectClass").css('border-width', '5');
    $(".objectClass").css('border-color', 'grey');

    $(".dataControl").css( "background-color", "#f8f8f8" );
    $(".dataControl").css('border-width', '5');
    $(".dataControl").css('border-color', 'grey');

    $(".nonnumericLabels").css( "background-color", "#e6e6ff" );
    $(".nonnumericLabels").css('border-width', '5');
    $(".nonnumericLabels").css('border-color', 'grey');

    $(".specials").css( "background-color", "#f8f8f8" );
    $(".specials").css('border-width', '5');
    $(".specials").css('border-color', 'grey');

    $(".store_value_set").css( "background-color", "#f8f8f8" );
    $(".store_value_set").css('border-width', '5');
    $(".store_value_set").css('border-color', 'grey');

    $(".axes").css( "background-color", "#e6e6ff" );
    $(".axes").css('border-width', '5');
    $(".axes").css('border-color', 'grey');

    $(".sensorsArray").css( "background-color", "#e6ffff" );
    $(".sensorsArray").css('border-width', '5');
    $(".sensorsArray").css('border-style', 'solid');
    $(".sensorsArray").css('border-color', 'grey');

    $(".sensorsFields").css('border-style', 'solid');
    $(".sensorsFields").css('border-color', 'blue');

    $(".post_calc").css( "background-color", "#e6ffbb" );
    $(".post_calc").css('border-width', '5');
    $(".post_calc").css('border-style', 'solid');
    $(".post_calc").css('border-color', 'grey');

    $(".post_calcFields").css('border-style', 'solid');
    $(".post_calcFields").css('border-color', 'blue');

    $(".global_js").css( "background-color", "#e6e6ff" );
    $(".global_js").css('border-width', '5');
    $(".global_js").css('border-color', 'grey');

    /* metric part */
    /* ============ */

    $.fn.textPicker = function(options) {
      /* console.log(this); */
      if (!this[0]) {return;}
      /* console.log('textPicker '+this[0].id+': name='+this[0].name); */

      /* Option defaults */
      options = $.extend({
        defaultColor:     '#FFF',
        boxWidth:         this.attr('boxWidth') || '200px',
        hideInput:        this.attr('hideInput') || true,
        displayCurrValue: this.attr('displayCurrValue') || true,
        clientHeight:     this[0].clientHeight || 10,
        offsetHeight:     this[0].offsetHeight || 10,
      }, options || {});

      /* Custom CSS for the chooser, which relies on previously defined options. */
      options.chooserCSS = $.extend({
        'border':           '1px solid #000',
        'margin':           '0 0 0 5px',
        'top':              0,
        'left':             options.boxWidth,
        'position':         'absolute',
        'background-color': '#fff'
      }, options.chooserCSS || {});
  
      /* Custom CSS for the display box, which relies on previously defined options. */
      options.displayCSS = $.extend({
        /* 'background-color': options.defaultColor, */
        'color':            'dimgrey',
        'border':           '1px solid lightgrey',
        /* 'width':            '100%', */
        'height':           options.offsetHeight,
        'line-height':      options.clientHeight + 'px',
        'padding-left':     '12px',
        'cursor':           'pointer'
      }, options.displayCSS || {});

      if (options.hideInput) {
        /* Hide the input unless configured otherwise. */
        this.hide();
      }

      /* This should probably do feature detection - I don't know why we need +2 for IE */
      /* but this works for jQuery 1.9.1 */
      if (navigator.userAgent.indexOf("MSIE")!==-1){
        options.totalWidth += 2;
      }
 
      /* Store these options so they'll be available to the other functions */
      /* TODO - must be a better way to do this, not sure what the 'official' */
      /* jQuery method is. Ideally i want to pass these as a parameter to the */
      /* each() function but i'm not sure how */
      $.textPickerOptions = options;

      function buildChooser() {
        options = $.textPickerOptions;
  
        /* Create a container to hold everything */
        var container = $("<div class='textPickerContainer' />");
  
        /* Absolutely positioned child elements now 'work'. */
        container.css('position', 'relative');
  
        var displayBox = $("<div class='textPickerDisplay' />");
        /* to display trigger field */
        displayBox.css(options.displayCSS);
        if (options.displayCurrValue === true) {
            displayBox.text(this.value);
        }
        container.append(displayBox);

        /* receive metrics list */
        var selectBoxArray;
        var selectBoxArrayRecv = function (event) {
            /*  console.log(event); */
            /*  console.log(this); */
            var eventData = event.data; /* cause it's destroyed by getJSON */
    
            var alpacaId = event.data.input.id;
            var val = $("#"+alpacaId).val();
            var name = $("#"+alpacaId).attr('name');

            /* take index from name */
            var ix = name.replace(/^sensors_/, '').replace(/_.*$/, '');
            console.log('ix='+ix+', '+alpacaId+': '+name+'='+val);
    
            /* get associated device */
            var dev = $('.device:eq('+(ix)+')');
            var devId = dev[0].attributes[1].nodeValue;
            var devName = $("#"+devId).attr('name');
            var devVal  = $("#"+devId).val();
            console.log('ix='+ix+', '+devId+': '+devName+'='+devVal);
   
            /* request device data */
            var url = '/ZAutomation/api/v1/devices/'+devVal;
            $.getJSON(url, function(resp) {
                /* console.log(resp.data.metrics); */
                var metricsObj = resp.data.metrics;
                selectBoxArray = selectBoxArrayBuild(metricsObj, name, alpacaId);
                /* console.log(JSON.stringify(selectBoxArray)); */
                selectCallback (selectBoxArray, eventData);
            });
        }; /* selectBoxArrayRecv */

        /* build up metrics list */
        function selectBoxArrayBuild(metricsObj, name, alpacaId) {
            var skipMetrics = [ "level",
                                "icon",
                                "title",
                                "probeTitle", 
                                "scaleTitle",
                                "sensors",
                                "multilineType",
                                "probeType",
                                "intchartUrl"
                              ];
            var optionsList = [['', ''],['level', 'level']];
            Object.keys(metricsObj).forEach(function(metric) {
                if (skipMetrics.indexOf(metric) < 0) {
                    optionsList.push([metric, metric]);
                }
            });
            /* alert(JSON.stringify(optionsList));*/
            optionsList.push(['updateTime', 'updateTime']);
            return optionsList;
        } /* selectBoxArrayBuild */

        /* display select box and accept selection */
        var selectCallback = function (selectBoxArray, eventData) {
          /* Bind and namespace the click listener only when the chooser is */
          /* displayed. Unbind when the chooser is closed. */
          $('html').bind("click.textPickerDisplay", function(e) {
            $('html').unbind("click.textPickerDisplay");
            $('.textPickerChooser').hide();
  
            /* If the user has not selected a new color, then revert the display. */
            /* Makes sure the selected cell is within the current color chooser. */
            var target = $(e.target);
          });
  
          /* Remove an existing chooser if there is one */
          if (eventData.container.chooser) {
            eventData.container.chooser.remove();
          }
  
          /* Build the chooser. */
          {
            /* Make a chooser div to hold the cells */
            var chooser = $("<div class='textPickerChooser' style='z-index: 2;'/>");
            /* to display contents in a box */
            chooser.css(options.chooserCSS);
  
            eventData.container.chooser = chooser; /* necessary to hide selectbox by click on displaybox */
            eventData.container.append(chooser);
          
            /* Create the cells */
            var func2 = function(event) {
                            var result = selectBoxArray[this.id][0];
                                eventData.input.value = result; /*metric field */
                                $(eventData.input).change();
                                event.data.chooser.hide();
  
                                /* If 'displayCurrValue' is turned on, display the currently 
                                 * selected text inside the button. */
                                if (options.displayCurrValue) {
                                    eventData.displayBox.text(result);
                                }
                        };
            for (var i = 0; i < selectBoxArray.length; i++) {
              var cell = $("<div class='textPickerCell' id='"+i+"'>&nbsp;&nbsp;"+selectBoxArray[i][1]+"&nbsp;&nbsp;</div>");
              chooser.append(cell);
                
              cell.bind('click', {input: eventData.input,
                                  chooser: chooser,
                                  displayBox: displayBox}, func2);
            } /* for */
          }
        }; /* selectCallback */
  
        /* Also bind the display box button to display the chooser. */
        var callbackParams = {
          input:      this, 
          container:  container,
          displayBox: displayBox,
        };
        displayBox.bind('click', callbackParams, selectBoxArrayRecv);
 
        $(this).after(container);
        $(this).data('container', container);
      } /* buildChooser */
  
      this.each(buildChooser);
  
      $('.textPickerDisplay').each(function() {
        $(this).click(function(e){
          e.stopPropagation();
        });
      });
  
      return this;
    }; /* textPicker */

    /* set textPicker callbacks for all existing fields */
    $('.metric').children('input').textPicker();
    $('.tooltip_metric').children('input').textPicker();
  
    /* sensor value index part */
    /* ======================= */

    /* initial counter for sensor value index */
    var sensorCount = $('.sensorsFields').length || 0;
    console.log('sensor value count='+sensorCount);

    /* callback for actionbar buttons */
    /* $('.sensorsArray').on('click', ':button', function(event) {
     * doesn't work properly */
    $('.sensorsArray').on('click', function(event) {
        var className = event.target.className;
        /* console.log(event.target); */
        if (!className) {return;}
        /* console.log('.sensorsArray'+className); */

        var action;
        switch(className) {
            case 'alpaca-array-toolbar-action btn btn-default btn-sm':
                action = 'add';
                ++sensorCount;
            break;
            case 'glyphicon glyphicon-plus-sign':
                action = 'add';
                ++sensorCount;
            break;
            case 'glyphicon glyphicon-minus-sign':
                action = 'remove';
                --sensorCount;
              break;
            case 'glyphicon glyphicon-chevron-down':
                action = 'down';
              break;
            case 'glyphicon glyphicon-chevron-up':
                action = 'up';
              break;
            default:
              return;
        }
        console.log(action+': sensor value count='+sensorCount);

        /* wait till action is completed */
        var toolbarTimer = setInterval(function() {
            if (sensorCount === $('.sensorsFields').length) {
                clearInterval(toolbarTimer);
                setIndexes();
            }
        }, 100);
    });

    /* renumber sensor value indexes */
    function setIndexes() {
        var indexFields = $('.index').children('input');
        /* indexFields.css( "background-color", "red" ); */
        /* console.log(indexFields); */
        var colorFields = $('.color').children('input');
        var metricFields = $('.metric').children('input');
        var tooltipFields = $('.tooltip_metric').children('input');
        var formulaFields = $('.formula').children('input');
        var fillFields = $('.fill').children('input');
        Object.keys(indexFields).forEach(function(ix) {
            if (ix && ! isNaN(ix)) {
                var htmlString = indexFields[ix];
                /* console.log(htmlString); */
                var alpacaId = htmlString.id;
                if (alpacaId) {
                    var oldVal = $("#"+alpacaId).val();

                    /* set callbacks for new fields
                     * cause we have no onCreate trigger */
                    if (!oldVal) {
                        var metricId = metricFields[ix].id;
                        $("#"+metricId).textPicker();
                        var tooltipId = tooltipFields[ix].id;
                        $("#"+tooltipId).textPicker();
                        console.log('('+ix+'): textPicker()');

                        var formulaId = formulaFields[ix].id;
                        $("#"+formulaId).on('change', formulaOnChange);
                        console.log('('+ix+'): formulaOnChange()');

                        var fillId = fillFields[ix].id;
                        $("#"+fillId).on('change', fillOnChange);
                        console.log('('+ix+'): fillOnChange()');

                        var colorId = colorFields[ix].id;
                        $("#"+colorId).simpleColor();
                        console.log('('+ix+'): simpleColor()');
                        $("#"+colorId).on('change', resetWhite);
                    }

                    /* (re)set index field */
                    var setVal = ix*1 + 1;
                    if (oldVal !== setVal) {
                        $("#"+alpacaId).prop("readonly", false);
                        $("#"+alpacaId).val(setVal);
                        $("#"+alpacaId).css( "background-color", "#f7f8f0");
                        $("#"+alpacaId).prop("readonly", true);
                    }
                    console.log(alpacaId+'='+oldVal+' >> '+setVal);
                }
            }
        });
    } /* setIndexes */

    /* number sensor value indexes if empty (for old charts) */
    function setIndexesInit() {
        var indexFields = $('.index').children('input');
        /* indexFields.css( "background-color", "red" ); */
        /* console.log(indexFields); */
        Object.keys(indexFields).forEach(function(ix) {
            if (ix && ! isNaN(ix)) {
                var htmlString = indexFields[ix];
                /* console.log(htmlString); */
                var alpacaId = htmlString.id;
                if (alpacaId) {
                    var oldVal = $("#"+alpacaId).val();

                    /* (re)set index field */
                    var setVal = ix*1 + 1;
                    if (oldVal !== setVal) {
                        $("#"+alpacaId).prop("readonly", false);
                        $("#"+alpacaId).val(setVal);
                        $("#"+alpacaId).css( "background-color", "#f7f8f0");
                        $("#"+alpacaId).prop("readonly", true);
                    }
                    console.log(alpacaId+'='+oldVal+' >> '+setVal);
                }
            }
        });
    } /* setIndexesInit */
    setIndexesInit();

    /* color picker part */
    /* ================= */
    /* source: Custom Color Picker With Predefined Colors */
    /* https://www.jqueryscript.net/other/color-picker-predefined-palette.html */

    /* --------------------- begin of SimpleColor() -------------------------- */
    /**
     * jQuery simple-color plugin
     * @requires jQuery v1.4.2 or later
     *
     * See https://github.com/recurser/jquery-simple-color
     *
     * Licensed under the MIT license:
     *   http://www.opensource.org/licenses/mit-license.php
     *
     * Version: 1.2.3 (Sat, 29 Aug 2020 11:55:25 GMT)
     */
    /**
     * simpleColor() provides a mechanism for displaying simple color-choosers.
     *
     * If an options Object is provided, the following attributes are supported:
     *
     *  defaultColor:       Default (initially selected) color.
     *                      Default value: '#FFF'
     *
     *  cellWidth:          Width of each individual color cell.
     *                      Default value: 20
     *
     *  cellHeight:         Height of each individual color cell.
     *                      Default value: 20
     *
     *  cellMargin:         Margin of each individual color cell.
     *                      Default value: 1
     *
     *  boxWidth:           Width of the color display box.
     *                      Default value: 115px
     *
     *  boxHeight:          Height of the color display box.
     *                      Default value: 20px
     *
     *  columns:            Number of columns to display. Color order may look strange if this is altered.
     *                      Default value: 16
     *
     *  insert:             The position to insert the color chooser. 'before' or 'after'.
     *                      Default value: 'after'
     *
     *  colors:             An array of colors to display, if you want to customize the default color set.
     *                      Default value: default color set - see 'defaultColors' below.
     *
     *  displayColorCode:   Display the color code (eg #333333) as text inside the button. true or false.
     *                      Default value: false
     *
     *  colorCodeAlign:     Text alignment used to display the color code inside the button. Only used if
     *                      'displayColorCode' is true. 'left', 'center' or 'right'
     *                      Default value: 'center'
     *
     *  colorCodeColor:     Text color of the color code inside the button. Only used if 'displayColorCode'
     *                      is true.
     *                      Default value: '#FFF' or '#000', decided based on the color selected in the chooser.
     *
     *  onSelect:           Callback function to call after a color has been chosen. The callback
     *                      function will be passed two arguments - the hex code of the selected color,
     *                      and the input element that triggered the chooser.
     *                      Default value: null
     *                      Returns:       hex value
     *
     *  onCellEnter:        Callback function that excecutes when the mouse enters a cell. The callback
     *                      function will be passed two arguments - the hex code of the current color,
     *                      and the input element that triggered the chooser.
     *                      Default value: null
     *                      Returns:       hex value
     *
     *  onClose:            Callback function that executes when the chooser is closed. The callback
     *                      function will be passed one argument - the input element that triggered
     *                      the chooser.
     *                      Default value: null
     *
     *  hideInput           If true, hides the original input when displaying the color picker.
     *                      Default: true
     *
     *  livePreview:        The color display will change to show the color of the hovered color cell.
     *                      The display will revert if no color is selected.
     *                      Default value: false
     *
     *  chooserCSS:         An associative array of CSS properties that will be applied to the pop-up
     *                      color chooser.
     *                      Default value: see options.chooserCSS in the source
     *
     *  displayCSS:         An associative array of CSS properties that will be applied to the color
     *                      display box.
     *                      Default value: see options.displayCSS in the source
     *
     *  inputCSS            An associative array of CSS properties that will be applied to the form input
     *                      ex. {   'float':'left' }
     */

    /**
     * Decides if the text should be white or black, based on the chooser's selected color.
     * @param {string} hexColor - The color selected in the chooser.
     * @return {string} - Either #FFF or #000.
     */
    function getAdaptiveTextColor(hexColor) {
      var matches = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
      if (!matches) {return '#FFF';}
      var r       = parseInt(matches[1], 16);
      var g       = parseInt(matches[2], 16);
      var b       = parseInt(matches[3], 16);
      var isWhite = (0.213 * r / 255) + (0.715 * g / 255) + (0.072 * b / 255) < 0.5;
      return isWhite ? '#FFF' : '#000';
    }
  
    /**
     * Sets the color of the given chooser, applying the given options.
     * @param {Object} displayBox - jQuery-enhanced color display box element.
     * @param {string} color      - The hex color that has been selected.
     * @param {Object} options    - The options specified by the user.
     */
    var setColor = function(displayBox, color, options) {
      var textColor = options.colorCodeColor || getAdaptiveTextColor(color);
      displayBox.data('color', color).css({
        color:           textColor,
        textAlign:       options.colorCodeAlign,
        backgroundColor: color
      });
      if (options.displayColorCode === true) {
        displayBox.text((color === '#ffffff' ? '' : color));
      }
    };
  
    $.fn.simpleColor = function(options) {
      if (!this[0]) {return;}
      /* console.log('simpleColor '+this[0].id+': name='+this[0].name); */

      var element = this;
      var defaultColors = [
        '990033', 'ff3366', 'cc0033', 'ff0033', 'ff9999', 'cc3366', 'ffccff', 'cc6699',
        '993366', '660033', 'cc3399', 'ff99cc', 'ff66cc', 'ff99ff', 'ff6699', 'cc0066',
        'ff0066', 'ff3399', 'ff0099', 'ff33cc', 'ff00cc', 'ff66ff', 'ff33ff', 'ff00ff',
        'cc0099', '990066', 'cc66cc', 'cc33cc', 'cc99ff', 'cc66ff', 'cc33ff', '993399',
        'cc00cc', 'cc00ff', '9900cc', '990099', 'cc99cc', '996699', '663366', '660099',
        '9933cc', '660066', '9900ff', '9933ff', '9966cc', '330033', '663399', '6633cc',
        '6600cc', '9966ff', '330066', '6600ff', '6633ff', 'ccccff', '9999ff', '9999cc',
        '6666cc', '6666ff', '666699', '333366', '333399', '330099', '3300cc', '3300ff',
        '3333ff', '3333cc', '0066ff', '0033ff', '3366ff', '3366cc', '000066', '000033',
        '0000ff', '000099', '0033cc', '0000cc', '336699', '0066cc', '99ccff', '6699ff',
        '003366', '6699cc', '006699', '3399cc', '0099cc', '66ccff', '3399ff', '003399',
        '0099ff', '33ccff', '00ccff', '99ffff', '66ffff', '33ffff', '00ffff', '00cccc',
        '009999', '669999', '99cccc', 'ccffff', '33cccc', '66cccc', '339999', '336666',
        '006666', '003333', '00ffcc', '33ffcc', '33cc99', '00cc99', '66ffcc', '99ffcc',
        '00ff99', '339966', '006633', '336633', '669966', '66cc66', '99ff99', '66ff66',
        '339933', '99cc99', '66ff99', '33ff99', '33cc66', '00cc66', '66cc99', '009966',
        '009933', '33ff66', '00ff66', 'ccffcc', 'ccff99', '99ff66', '99ff33', '00ff33',
        '33ff33', '00cc33', '33cc33', '66ff33', '00ff00', '66cc33', '006600', '003300',
        '009900', '33ff00', '66ff00', '99ff00', '66cc00', '00cc00', '33cc00', '339900',
        '99cc66', '669933', '99cc33', '336600', '669900', '99cc00', 'ccff66', 'ccff33',
        'ccff00', '999900', 'cccc00', 'cccc33', '333300', '666600', '999933', 'cccc66',
        '666633', '999966', 'cccc99', 'ffffcc', 'ffff99', 'ffff66', 'ffff33', 'ffff00',
        'ffcc00', 'ffcc66', 'ffcc33', 'cc9933', '996600', 'cc9900', 'ff9900', 'cc6600',
        '993300', 'cc6633', '663300', 'ff9966', 'ff6633', 'ff9933', 'ff6600', 'cc3300',
        '996633', '330000', '663333', '996666', 'cc9999', '993333', 'cc6666', 'ffcccc',
        'ff3333', 'cc3333', 'ff6666', '660000', '990000', 'cc0000', 'ff0000', 'ff3300',
        'cc9966', 'ffcc99', 'ffffff', 'cccccc', '999999', '666666', '333333', '000000',
        '000000', '000000', '000000', '000000', '000000', '000000', '000000', '000000'
      ];
  
      /* Option defaults */
      options = $.extend({
        defaultColor:     this.attr('defaultColor') || '#FFF',
        cellWidth:        this.attr('cellWidth') || 20,
        cellHeight:       this.attr('cellHeight') || 20,
        cellMargin:       this.attr('cellMargin') || 1,
        boxWidth:         this.attr('boxWidth') || '200px',
        boxHeight:        this.attr('boxHeight') || '20px',
        columns:          this.attr('columns') || 16,
        insert:           this.attr('insert') || 'after',
        colors:           this.attr('colors') || defaultColors,
        displayColorCode: this.attr('displayColorCode') || true,
        colorCodeAlign:   this.attr('colorCodeAlign') || 'left',
        colorCodeColor:   this.attr('colorCodeColor') || false,
        hideInput:        this.attr('hideInput') || true,
        clientHeight:     this[0].clientHeight || 10,
        onSelect:         null,
        onCellEnter:      null,
        onClose:          null,
        livePreview:      false
      }, options || {});
  
      /* Figure out the cell dimensions */
      options.totalWidth = options.columns * (options.cellWidth + (2 * options.cellMargin));
  
      /* Custom CSS for the chooser, which relies on previously defined options. */
      options.chooserCSS = $.extend({
        'border':           '1px solid #000',
        'margin':           '0 0 0 5px',
        'width':            options.totalWidth,
        'height':           options.totalHeight,
        'top':              0,
        'left':             options.boxWidth,
        'line-height':      options.boxHeight + 'px',
        'position':         'absolute',
        'background-color': '#fff'
      }, options.chooserCSS || {});
  
      /* Custom CSS for the display box, which relies on previously defined options. */
      options.displayCSS = $.extend({
        /* 'background-color': options.defaultColor, */
        'color':            'dimgrey',
        'border':           '1px solid lightgrey',
        /* 'width':            '100%', */
        'height':           options.clientHeight,
        'line-height':      options.clientHeight + 'px',
        'padding-left':     '12px',
        'cursor':           'pointer'
      }, options.displayCSS || {});
  
      /* Custom CSS for the input field. */
      options.inputCSS = $.extend({}, options.inputCSS || {});
  
      if (options.hideInput) {
        /* Hide the input unless configured otherwise. */
        this.hide();
      } else {
        /* Apply custom CSS to the input field if it is visible. */
        this.css(options.inputCSS);
      }
  
      /* This should probably do feature detection - I don't know why we need +2 for IE */
      /* but this works for jQuery 1.9.1 */
      if (navigator.userAgent.indexOf("MSIE")!==-1){
        options.totalWidth += 2;
      }
  
      options.totalHeight = Math.ceil(options.colors.length / options.columns) * (options.cellHeight + (2 * options.cellMargin));
  
      /* Store these options so they'll be available to the other functions */
      /* TODO - must be a better way to do this, not sure what the 'official' */
      /* jQuery method is. Ideally i want to pass these as a parameter to the */
      /* each() function but i'm not sure how */
      $.simpleColorOptions = options;
  
      function buildChooser(index) {
        options = $.simpleColorOptions;
  
        /* Create a container to hold everything */
        var container = $("<div class='simpleColorContainer' />");
  
        /* Absolutely positioned child elements now 'work'. */
        container.css('position', 'relative');
  
        /* Create the color display box */
        var defaultColor = (this.value && this.value !== '') ? this.value : options.defaultColor;
  
        var displayBox = $("<div class='simpleColorDisplay' />");
        displayBox.css(options.displayCSS);
        setColor(displayBox, defaultColor, options);
        container.append(displayBox);
  
        var selectCallback = function (event) {
          /* Bind and namespace the click listener only when the chooser is */
          /* displayed. Unbind when the chooser is closed. */
          $('html').bind("click.simpleColorDisplay", function(e) {
            $('html').unbind("click.simpleColorDisplay");
            $('.simpleColorChooser').hide();
  
            /* If the user has not selected a new color, then revert the display. */
            /* Makes sure the selected cell is within the current color chooser. */
            var target = $(e.target);
            if (target.is('.simpleColorCell') === false || $.contains( $(event.target).closest('.simpleColorContainer')[0], target[0]) === false) {
              setColor(displayBox, displayBox.data('color'), options);
            }
  
            /* Execute onClose callback whenever the color chooser is closed. */
            if (options.onClose) {
              options.onClose(element);
            }
          });
  
          /* Use an existing chooser if there is one */
          if (event.data.container.chooser) {
            event.data.container.chooser.toggle();
  
          /* Build the chooser. */
          } else {
            /* Make a chooser div to hold the cells */
            var chooser = $("<div class='simpleColorChooser'/>");
            chooser.css(options.chooserCSS);
  
            event.data.container.chooser = chooser;
            event.data.container.append(chooser);
  
            /* Create the cells */
            var func1 = function(event) {
                            if (options.onCellEnter) {
                                options.onCellEnter(this.id, element);
                            }
                            if (options.livePreview) {
                                setColor(displayBox, '#' + this.id, options);
                             }
                        };
            var func2 = function(event) {
                            var color = '#' + this.id;
                                event.data.input.value = color;
                                $(event.data.input).change();
                                setColor(displayBox, color, options);
                                event.data.chooser.hide();
  
                                /* If 'displayColorCode' is turned on, display the currently 
                                 * selected color code as text inside the button. */
                                if (options.displayColorCode) {
                                    event.data.displayBox.text((color === '#ffffff' ? '' : color));
                                }
  
                                /* If an onSelect callback function is defined then excecute it. */
                                if (options.onSelect) {
                                    options.onSelect(this.id, element);
                                }
                        };
            for (var i=0; i<options.colors.length; i++) {
              var cell = $("<div class='simpleColorCell' id='" + options.colors[i] + "'/>");
              cell.css({
                'width':            options.cellWidth + 'px',
                'height':           options.cellHeight + 'px',
                'margin':           options.cellMargin + 'px',
                'cursor':           'pointer',
                'lineHeight':       options.cellHeight + 'px',
                'fontSize':         '1px',
                'float':            'left',
                'background-color': '#'+options.colors[i]
              });
              chooser.append(cell);
              if (options.onCellEnter || options.livePreview) {
                cell.bind('mouseenter', func1);
              }
              cell.bind('click', {input: event.data.input,
                                  chooser: chooser,
                                  displayBox: displayBox}, func2);
            } /* for */
          }
        }; /* selectCallback */
  
        /* Also bind the display box button to display the chooser. */
        var callbackParams = {
          input:      this,
          container:  container,
          displayBox: displayBox
        };
        displayBox.bind('click', callbackParams, selectCallback);
  
        $(this).after(container);
        $(this).data('container', container);
      } /* buildChooser */
  
      this.each(buildChooser);
  
      $('.simpleColorDisplay').each(function() {
        $(this).click(function(e){
          e.stopPropagation();
        });
      });
  
      return this;
    }; /* simpleColor */

    /*
     * Close the given color choosers.
     */
    $.fn.closeChooser = function() {
      this.each( function(index) {
        $(this).data('container').find('.simpleColorChooser').hide();
      });
      return this;
    };
 
    /*
     * Set the color of the given color choosers.
     * @param {string} color - The hex color to select in the chooser.
     */
    $.fn.setColor = function(color) {
      this.each( function(index) {
        var displayBox = $(this).data('container').find('.simpleColorDisplay');
        setColor(displayBox, color, { displayColorCode: displayBox.data('displayColorCode') });
      });
      return this;
    };
    /* --------------------- end of SimpleColor() ---------------------------- */
 
    /* set colorpicker callbacks for all existing color fields */
    $('.color').children('input').simpleColor();
  
    /* white >> undefined */
    function resetWhite(event) {
        var alpacaId = event.target.id;
        var val = $("#"+alpacaId).val().replace(/ /g, '');
        var white = ['#ffffff', 'rgb(255,255,255)', 'white'];
        if (white.indexOf(val) >= 0) {
            $("#"+alpacaId).val(undefined);
        }
        console.log('color: '+val+' >> '+$("#"+alpacaId).val());
    }
    $('.color').on('change', resetWhite);

    /* formula part */
    /* ============ */

    /* check arithmetic for correct syntax */
    /* to test the formula with eval we must enter some values: */
    var colorInvalid ="rgba(255,0,0,0.2)";
    function checkFormula(alpacaId) {
        var val = $("#"+alpacaId).val();
        if (!val) {
            $("#"+alpacaId).css( "background-color", "white" );
            return;
        }

        function replace_Xi(f, len) {
            for (var ix = 0; ix < len; ix++) {
               var patt = new RegExp('\\bx'+ix+'\\b', "g");
               f = f.replace(patt, 'X['+ix+']');
            }
            return f;
        }

        function replace_Xprevi(f, len) {
            for (var ix = 0; ix < len; ix++) {
               var patt = new RegExp('\\bx'+ix+'\\b\\[-1\\]', "g");
               f = f.replace(patt, 'Xprev['+ix+']');
            }
            return f;
        }

        var X   = new Array(sensorCount).fill(1);
        var Xprev = new Array(sensorCount).fill(5);
        var ix = 1;

        var mess, f = val;
        f = replace_Xprevi(f, sensorCount);
        f = replace_Xi(f, sensorCount);
        f = f.replace(/\bx\b\[-1\]/g, 'Xprev[ix]');
        f = f.replace(/\bx\b/g, 'X[ix]');

        /* global variables and functions: */
        var g = { variable: 1,
                  function: function() {return 1;}
        };
        f = f.replace(/\bg\.\w+\b/g, 'g.variable'); 
        f = f.replace(/\bg\.\w+\s*\(/g, 'g.function('); 

        try {
            /*jshint evil: true */
            console.log(f);
            var testResult = eval(f);
            /*jshint evil: false */
            if (testResult === undefined) {
                mess = 'result is undefined';
            } else {
                $("#"+alpacaId).css( "background-color", "white" );
                return;
            }
        } catch (err) {
            mess = err.message;
        }

        $("#"+alpacaId).css( "background-color", colorInvalid );
        console.log(val+' // '+mess);
        return mess;
    } /* checkFormula */

    function formulaOnChange(event) {
        var alpacaId = event.target.id;
        var ret = checkFormula(alpacaId);
        if (ret) {alert(ret);}
    } /* formulaOnChange */
    $('.formula').on('change', formulaOnChange);

    /* set colors of all formula fields */
    var formulaFields = $('.formula').children('input');
    formulaFields.each(function() {
        checkFormula($(this)[0].id);
    });

    /* fill part */
    /* ========= */

    /* test fill input */
    function isColor(strColor){
        if (!strColor) {return true;}
        var s = new Option().style;
        s.color = strColor;
        console.log(strColor+' > '+s.color+', '+s.color.length);
        if (s.color.length === 0) {return false;}
        return true;
    } /* isColor */

    function checkFill(alpacaId) {
        var str = $("#"+alpacaId).val().replace(/ /g, '');
        var valArr = str.split(':');
        /* empty */
        if (valArr.length === 0) {return;}
        /* wrong format */
        if (valArr.length > 3) {
            return str+' has wrong wrong format!';
        }
        if (valArr.length === 3 && !valArr[1] && !valArr[2]) {
            return str+' is useless without color!';
        }
        /* check part 1 */
        var valid = true;
        if (valArr[0].charAt(0).toLowerCase() === 'y') {
            if (isNaN(valArr[0].substring(1))) {
                return valArr[0]+' is invalid!';
            }
            return;
        }
        if (valArr.length > 1 && !valArr[0].trim())    {valid = false;}
        if (!Number.isInteger(valArr[0]*1))            {valid = false;}
        if (valArr[0] < 0)                             {valid = false;}
        if (valArr[0] > 100)                           {valid = false;}
        if (valArr[0] > sensorCount && valArr[0] < 98) {valid = false;}
        if (!valid) {
            return valArr[0]+' is invalid!';
        }
        if (valArr.length === 1) {return;}
        /* check part 2 */
        if (!isColor(valArr[1])) {
            return valArr[1]+' is not a valid Color!';
        }
        if (valArr.length === 2) {return;}
        /* check part 3 */
        if (!isColor(valArr[2])) {
            return valArr[2]+' is not a valid color!';
        }
        return;
    } /* checkFill */

    function setFillColor(alpacaId) {
        var mess = checkFill(alpacaId);
        if (mess) {
            $("#"+alpacaId).css( "background-color", colorInvalid );
        } else {
            $("#"+alpacaId).css( "background-color", "white" );
        }
        return mess;
    } /* setFillColor */

    function fillOnChange(event) {
        var ret = setFillColor(event.target.id);
        if (ret) {alert(ret);}
    } /* fillOnChange */
    $('.fill').on('change', fillOnChange);

    /* set colors of all fill fields */
    var fillFields = $('.fill').children('input');
    fillFields.each(function() {
        setFillColor($(this)[0].id);
    });

    /* global_js part */
    /* ============== */

    /* react on code size change */
    function resizeCode(event) {
        var global_js_lines = $('#global_js_line').val();
        $('#global_js_code').attr('rows', global_js_lines);
    } /* resizeCode */
    $('#global_js_line').on('change', resizeCode);

    function checkJavascript(alpacaId) {
        $("#"+alpacaId).css( "background-color", "yellow" );
        var val = $("#"+alpacaId).val();
        if (!val) {
            $("#"+alpacaId).css( "background-color", "white" );
            return;
        } 
        
        var mess;
        try {
            var g = {};
            /*jshint evil: true */
            eval('g = '+val);
            /*jshint evil: false */
            $("#"+alpacaId).css( "background-color", "white" );
            return;
        } catch(err) {
            mess = err.message;
            $("#"+alpacaId).css( "background-color", colorInvalid );
            console.log(mess);
            return mess;
        }
    } /* checkJavascript */

    function javascriptOnChange(event) {
        var alpacaId = event.target.id;
        var ret = checkJavascript(alpacaId);
        if (ret) {alert(ret);}
    } /* javascriptOnChange */
    $('#global_js_code').on('change', javascriptOnChange);

    /* check color of global_js_code at start */
    checkJavascript('global_js_code');

    console.log('postRender.js end');
} /* modulePostRender */
