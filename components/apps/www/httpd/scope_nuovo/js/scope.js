/*
 * Red Pitaya Oscilloscope client
 *
 * Author: Dakus <info@eskala.eu>
 *
 * (c) Red Pitaya  http://www.redpitaya.com
 *
*/

(function(){
    var originalAddClassMethod = jQuery.fn.addClass;
    var originalRemoveClassMethod = jQuery.fn.removeClass;
    $.fn.addClass = function(clss){
        var result = originalAddClassMethod.apply(this, arguments);
        $(this).trigger('activeChanged', 'add');
        return result;
    };
    $.fn.removeClass = function(clss){
        var result = originalRemoveClassMethod.apply(this, arguments);
        $(this).trigger('activeChanged', 'remove');
        return result;
    }
})();

(function(OSC, $, undefined) {

  // App configuration
  OSC.config = {};
  OSC.config.app_id = 'scopegenpro';
  OSC.config.server_ip = '';  // Leave empty on production, it is used for testing only
  OSC.config.start_app_url = (OSC.config.server_ip.length ? 'http://' + OSC.config.server_ip : '') + '/bazaar?start=' + OSC.config.app_id + '?' + location.search.substr(1);
  OSC.config.stop_app_url = (OSC.config.server_ip.length ? 'http://' + OSC.config.server_ip : '') + '/bazaar?stop=' + OSC.config.app_id;
  OSC.config.socket_url = 'ws://' + (OSC.config.server_ip.length ? OSC.config.server_ip : window.location.hostname) + ':9002';  // WebSocket server URI
  OSC.config.graph_colors = {
    'ch1' : '#f3ec1a',
    'ch2' : '#31b44b',
    'output1': '#9595ca',
    'output2': '#ee3739',
    'math': '#ab4d9d',
    'trig': '#75cede'
  };

  // Time scale steps in millisecods
  OSC.time_steps = [
    // Nanoseconds
    100/1000000, 200/1000000, 500/1000000,
    // Microseconds
    1/1000, 2/1000, 5/1000, 10/1000, 20/1000, 50/1000, 100/1000, 200/1000, 500/1000,
    // Millisecods
    1, 2, 5, 10, 20, 50, 100, 200, 500,
    // Seconds
    1*1000, 2*1000, 5*1000, 10*1000, 20*1000, 50*1000
  ];

  // Voltage scale steps in volts
  OSC.voltage_steps = [
    // Millivolts
    1/1000, 2/1000, 5/1000, 10/1000, 20/1000, 50/1000, 100/1000, 200/1000, 500/1000,
    // Volts
    1, 2, 5
  ];

  // Sampling rates
  OSC.sample_rates = ['125M', '15.625M', '1.953M', '122.070k', '15.258k', '1.907k'];

  // App state
  OSC.state = {
    socket_opened: false,
    processing: false,
    editing: false,
    trig_dragging: false,
    cursor_dragging: false,
    resized: false,
    sel_sig_name: null,
    fine: false,
	graph_grid_height: null,
	graph_grid_width: null,
	calib: 0
  };

  // Params cache
  OSC.params = {
    orig: {},
    local: {}
  };

  // Other global variables
  OSC.ws = null;
  OSC.graphs = {};
  OSC.touch = {};

  OSC.connect_time;

  // Starts the oscilloscope application on server
  OSC.startApp = function() {
    $.get(
      OSC.config.start_app_url
    )
    .done(function(dresult) {
      if(dresult.status == 'OK') {
		 OSC.connectWebSocket();
      }
      else if(dresult.status == 'ERROR') {
        console.log(dresult.reason ? dresult.reason : 'Could not start the application (ERR1)');
      }
      else {
        console.log('Could not start the application (ERR2)');
      }
    })
    .fail(function() {
      console.log('Could not start the application (ERR3)');
    });
  };

  // Creates a WebSocket connection with the web server
  OSC.connectWebSocket = function() {

    if(window.WebSocket) {
      OSC.ws = new WebSocket(OSC.config.socket_url);
    }
    else if(window.MozWebSocket) {
      OSC.ws = new MozWebSocket(OSC.config.socket_url);
    }
    else {
      console.log('Browser does not support WebSocket');
    }

    // Define WebSocket event listeners
    if(OSC.ws) {

      OSC.ws.onopen = function() {
        OSC.state.socket_opened = true;
        console.log('Socket opened');

		OSC.params.local['in_command'] = { value: 'send_all_params' };
		OSC.ws.send(JSON.stringify({ parameters: OSC.params.local }));
		OSC.params.local = {};
      };

      OSC.ws.onclose = function() {
        OSC.state.socket_opened = false;
        $('#graphs .plot').hide();  // Hide all graphs
        console.log('Socket closed');
      };

      OSC.ws.onerror = function(ev) {
        console.log('Websocket error: ', ev);
      };

      OSC.ws.onmessage = function(ev) {
        if(OSC.state.processing) {
          return;
        }
        OSC.state.processing = true;

        var receive = JSON.parse(ev.data);

        if(receive.parameters) {
          if((Object.keys(OSC.params.orig).length == 0) && (Object.keys(receive.parameters).length == 0)) {
            OSC.params.local['in_command'] = { value: 'send_all_params' };
            OSC.ws.send(JSON.stringify({ parameters: OSC.params.local }));
            OSC.params.local = {};
          } else {
            OSC.processParameters(receive.parameters);
          }
        }

        if(receive.signals) {
          OSC.processSignals(receive.signals);
        }

        OSC.state.processing = false;
      };
    }
  };

  // Processes newly received values for parameters
  OSC.processParameters = function(new_params) {
    var old_params = $.extend(true, {}, OSC.params.orig);

    var send_all_params = Object.keys(new_params).indexOf('send_all_params') != -1;
    for(var param_name in new_params) {

      // Save new parameter value
      OSC.params.orig[param_name] = new_params[param_name];

	  if (param_name.indexOf('OSC_MEAS_VAL') == 0) {
		  var orig_units = $("#"+param_name).parent().children("#OSC_MEAS_ORIG_UNITS").text();
		  var orig_function = $("#"+param_name).parent().children("#OSC_MEAS_ORIG_FOO").text();
		  var orig_source = $("#"+param_name).parent().children("#OSC_MEAS_ORIG_SIGNAME").text();
		  var y = new_params[param_name].value;
		  var z = y;
		  var factor = '';

		  if (orig_function == "PERIOD")
		  {
			  y /= 1000; // Now in seconds and not ms
			  z = y;
			  orig_units = 's';
			  if (y < 0.000000010)
				new_params[param_name].value = 'OVER RANGE';
			  else if (y >= 0.000000010 && y <= 0.00000099990)
			  {
				  z*=1e9; factor = 'n';
				  new_params[param_name].value = z.toFixed(0);
			  }
			  else if (y > 0.00000099990 && y <= 0.00099990)
			  {
				  z*=1e6; factor = 'µ';
				  new_params[param_name].value = z.toFixed(1);
			  }
			  else if (y > 0.00099990 && y <= 0.99990)
			  {
				  z*=1e3; factor = 'm';
				  new_params[param_name].value = z.toFixed(2);
			  }
			  else if (y > 0.99990 && y <= 8.5901)
			  {
				  new_params[param_name].value = z.toFixed(3);
			  } else
				  new_params[param_name].value = 'NO EDGES';

		  } else if (orig_function == "FREQ")
		  {
			  if (y < 0.12)
				new_params[param_name].value = 'NO EDGES';
			  else if (y >= 0.12 && y <= 0.99990)
			  {
				  z*=1e3; factor = 'm';
				  new_params[param_name].value = z.toFixed(0);
			  }
			  else if (y > 0.99990 && y <= 999.990)
			  {
				  new_params[param_name].value = z.toFixed(2);
			  } else if (y > 999.990 && y <= 999900.0)
			  {
				  z/=1e3; factor = 'k';
				  new_params[param_name].value = z.toFixed(2);
			  } else if (y > 999900.0 && y <= 9999900.0)
			  {
				  z/=1e6; factor = 'M';
				  new_params[param_name].value = z.toFixed(3);
			  } else if (y > 9999900.0 && y <= 50000000.0)
			  {
				  z/=1e6; factor = 'M';
				  new_params[param_name].value = z.toFixed(2);
			  } else
				  new_params[param_name].value = 'OVER RANGE';
		  } else if (orig_function == "DUTY CYCLE")
		  {
			  if (y < 0 || y > 100)
				new_params[param_name].value = 'ERROR';
			  else
				new_params[param_name].value = z.toFixed(1);

		  } else // P2P, MEAN, MAX, MIN, RMS
		  {
			  y = Math.abs(y);
			  if(orig_source == "MATH")
			  {
				  if(y < 0.00000000000010)
						new_params[param_name].value = 'No signal';
				  else if(y > 0.00000000000010 && y <= 0.000000999990)
				  {
					  z*=1e9; factor = 'n';
					  if(y > 0.00000000000010 && y <= 0.00000000999990)
						new_params[param_name].value = z.toFixed(4);
					  else if(y > 0.00000000999990 && y <= 0.0000000999990)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 0.0000000999990 && y <= 0.000000999990)
						new_params[param_name].value = z.toFixed(2);
				  }
				  else if(y > 0.000000999990 && y <= 0.000999990)
				  {
					  z*=1e6; factor = 'u';
					  if(y > 0.000000999990 && y <= 0.00000999990)
						new_params[param_name].value = z.toFixed(4);
					  else if(y > 0.00000999990 && y <= 0.0000999990)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 0.0000999990 && y <= 0.000999990)
						new_params[param_name].value = z.toFixed(2);
				  }
				  else if(y > 0.000999990 && y <= 0.999990)
				  {
					  z*=1e3; factor = 'm';
					  if(y > 0.000999990 && y <= 0.00999990)
						new_params[param_name].value = z.toFixed(4);
					  else if(y > 0.00999990 && y <= 0.0999990)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 0.0999990 && y <= 0.999990)
						new_params[param_name].value = z.toFixed(2);
				  }
				  else if(y > 0.999990 && y <= 9999.90)
				  {
					  if(y > 0.999990 && y <= 9.99990)
						new_params[param_name].value = z.toFixed(4);
					  else if(y > 9.99990 && y <= 99.9990)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 99.9990 && y <= 999.990)
						new_params[param_name].value = z.toFixed(2);
					  else if(y > 999.990 && y <= 9999.90)
						new_params[param_name].value = z.toFixed(1);
				  }
				  else if(y > 9999.90 && y <= 999990.0)
				  {
					  z/=1e3;  factor = 'k';
					  if(y > 9999.90 && y <= 99999.0)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 99999.0 && y <= 999990.0)
						new_params[param_name].value = z.toFixed(2);
				  }
				  else if(y > 999990.0 && y <= 999990000.0)
				  {
					  z/=1e6; factor = 'M';
					  if(y > 999990.0 && y <= 9999900.0)
						new_params[param_name].value = z.toFixed(4);
					  else if(y > 9999900.0 && y <= 99999000.0)
						new_params[param_name].value = z.toFixed(3);
					  else if(y > 99999000.0 && y <= 999990000.0)
						new_params[param_name].value = z.toFixed(2);
				  }
			  } else { // CH1 or CH2
				  if (y < 0.00010)
					new_params[param_name].value = 'LOW SIGNAL';
				  else if (y >= 0.00010 && y <= 0.99990)
				  {
					  z*=1e3; factor = 'm';
					  new_params[param_name].value = z.toFixed(1);
				  } else if (y > 0.99990 && y <= 9.9990)
				  {
					  new_params[param_name].value = z.toFixed(3);
				  } else if (y > 9.9990 && y <= 99.990)
				  {
					  new_params[param_name].value = z.toFixed(2);
				  } else if (y > 99.990 && y <= 999.90)
				  {
					  new_params[param_name].value = z.toFixed(1);
				  } else if (y > 999.90 && y <= 4000.0)
				  {
					  z/=1e3; factor = 'k';
					  new_params[param_name].value = z.toFixed(1);
				  } else
				  {
					  new_params[param_name].value = "OVER RANGE";
				  }
			  }
		  }
		  $("#"+param_name).parent().children("#OSC_MEAS_UNITS").text(factor + orig_units);
	  }

      // Run/Stop button
      if(param_name == 'OSC_RUN') {
        if(new_params[param_name].value === true) {
          $('#OSC_RUN').hide();
          $('#OSC_STOP').css('display','block');
        }
        else {
          $('#OSC_STOP').hide();
          $('#OSC_RUN').show();
        }
      }
      // Buffer size parameter
      else if(param_name == 'OSC_VIEV_PART') {
        var full_width = $('#buffer').width() - 4;
        var visible_width = full_width * new_params['OSC_VIEV_PART'].value;

        $('#buffer .buf-red-line').width(visible_width).show();
        $('#buffer .buf-red-line-holder').css('left', full_width / 2 - visible_width / 2);
      }
      // Sampling rate
      else if(param_name == 'OSC_SAMPL_RATE') {
        $('#' + param_name).html(OSC.sample_rates[new_params[param_name].value] + 'S/s');
      }
      // All other parameters
      else {
		if (['CALIB_RESET', 'CALIB_FE_OFF', 'CALIB_FE_SCALE_LV', 'CALIB_FE_SCALE_HV', 'CALIB_BE'].indexOf(param_name) != -1 && !send_all_params) {
			if (new_params[param_name].value == -1) {
				++OSC.state.calib;
				OSC.setCalibState(OSC.state.calib);

				$('#calib-2').children().removeAttr('disabled');
				$('#calib-3').children().removeAttr('disabled');
			} else if (new_params[param_name].value == 0) {
				$('#modal-warning').show();
				$('#calib-4').show();
				$('#calib-5').show();
				$('#calib-2').children().removeAttr('disabled');
				$('#calib-3').children().removeAttr('disabled');
			}

			new_params[param_name].value = -2;
		}
		if (param_name == 'is_demo' && new_params['is_demo'].value && OSC.state.calib == 0) {
			OSC.setCalibState(OSC.state.calib);
			$('#calib-2').children().attr('disabled', 'true');
			$('#calib-3').children().attr('disabled', 'true');
			$('#calib-text').html('Calibration is not available in demo mode');
		} else if (param_name == 'is_demo' && !new_params['is_demo'].value && OSC.state.calib == 0) {
			$('#calib-text').html('Calibration of fast analog inputs and outputs is started. To proceed with calibration press CONTINUE. For factory calibration settings press DEFAULT.');
		}

        if (param_name == 'OSC_TRIG_INFO') {
			var idx = new_params['OSC_TRIG_INFO'].value;
			var states = ['STOPPED', 'AUTO', 'TRIG\'D', 'WAITING'];
			var colors = ['red', 'green', 'green', 'yellow'];

			$('#triginfo').html(states[idx]);
			$('#triginfo').css('color', colors[idx]);
			$('#triginfo').css('display', '');
		}
        // Show/hide Y offset arrows
        if(param_name == 'OSC_CH1_OFFSET' && new_params['CH1_SHOW']) {
          if(new_params['CH1_SHOW'].value) {

            // Change arrow position only if arrow is hidden or old/new values are not the same
            if(!$('#ch1_offset_arrow').is(':visible')
                || old_params[param_name].value != new_params[param_name].value
                || old_params['OSC_CH1_SCALE'].value != new_params['OSC_CH1_SCALE'].value
				|| (OSC.state.graph_grid_height && OSC.state.graph_grid_height !== $('#graph_grid').outerHeight())) {
              var volt_per_px = (new_params['OSC_CH1_SCALE'].value * 10) / $('#graph_grid').outerHeight();
              var px_offset = -(new_params['OSC_CH1_OFFSET'].value / volt_per_px - parseInt($('#ch1_offset_arrow').css('margin-top')) / 2);
			  OSC.state.graph_grid_height = $('#graph_grid').outerHeight();
              $('#ch1_offset_arrow').css('top', ($('#graph_grid').outerHeight() + 7) / 2 + px_offset).show();
            }
          }
          else {
            $('#ch1_offset_arrow').hide();
          }
        }
        else if(param_name == 'OSC_CH2_OFFSET' && new_params['CH2_SHOW']) {
          if(new_params['CH2_SHOW'].value) {

            // Change arrow position only if arrow is hidden or old/new values are not the same
            if(!$('#ch2_offset_arrow').is(':visible')
				|| old_params[param_name].value != new_params[param_name].value
				|| (OSC.state.graph_grid_height && OSC.state.graph_grid_height !== $('#graph_grid').outerHeight())) {
              var volt_per_px = (new_params['OSC_CH2_SCALE'].value * 10) / $('#graph_grid').outerHeight();
              var px_offset = -(new_params['OSC_CH2_OFFSET'].value / volt_per_px - parseInt($('#ch2_offset_arrow').css('margin-top')) / 2);
			  OSC.state.graph_grid_height = $('#graph_grid').outerHeight();
              $('#ch2_offset_arrow').css('top', ($('#graph_grid').outerHeight() + 7) / 2 + px_offset).show();
            }
          }
          else {
            $('#ch2_offset_arrow').hide();
          }
        }
		else if(param_name == 'SOUR1_VOLT_OFFS') {
			if((!OSC.state.editing && (old_params[param_name] !== undefined && old_params[param_name].value == new_params[param_name].value))){
				var value = $('#SOUR1_VOLT_OFFS').val();
				if(value !== new_params[param_name].value){
					//$('#SOUR1_VOLT_OFFS').val(new_params[param_name].value);
					OSC.setValue($('#SOUR1_VOLT_OFFS'), new_params[param_name].value);
				}
			}
		}
		else if(param_name == 'SOUR2_VOLT_OFFS') {
			if((!OSC.state.editing && (old_params[param_name] !== undefined && old_params[param_name].value == new_params[param_name].value))){
				var value = $('#SOUR2_VOLT_OFFS').val();
				if(value !== new_params[param_name].value){
					//$('#SOUR2_VOLT_OFFS').val(new_params[param_name].value);
					OSC.setValue($('#SOUR2_VOLT_OFFS'), new_params[param_name].value);
				}
			}
		}
	    else if(param_name == 'OUTPUT1_SHOW_OFF') {
          if(new_params['OUTPUT1_SHOW'].value && new_params['OUTPUT1_STATE'].value) {

            // Change arrow position only if arrow is hidden or old/new values are not the same
            if(!$('#output1_offset_arrow').is(':visible')
				|| old_params[param_name].value != new_params[param_name].value
				|| (OSC.state.graph_grid_height && OSC.state.graph_grid_height !== $('#graph_grid').outerHeight())) {
              var graph_height = $('#graph_grid').outerHeight();
              var volt_per_px = 10 / graph_height;
              var px_offset = -(new_params['OUTPUT1_SHOW_OFF'].value / volt_per_px - parseInt($('#output1_offset_arrow').css('margin-top')) / 2);
			  OSC.state.graph_grid_height = $('#graph_grid').outerHeight();
              $('#output1_offset_arrow').css('top', (graph_height + 7) / 2 + px_offset).show();
            }
          }
          else {
            $('#output1_offset_arrow').hide();
          }
        }
        else if(param_name == 'OUTPUT2_SHOW_OFF') {
          if(new_params['OUTPUT2_SHOW'].value && new_params['OUTPUT2_STATE'].value) {

            // Change arrow position only if arrow is hidden or old/new values are not the same
            if(!$('#output2_offset_arrow').is(':visible')
				|| old_params[param_name].value != new_params[param_name].value
				|| (OSC.state.graph_grid_height && OSC.state.graph_grid_height !== $('#graph_grid').outerHeight())) {
              var graph_height = $('#graph_grid').outerHeight();
              var volt_per_px = 10 / graph_height;
              var px_offset = -(new_params['OUTPUT2_SHOW_OFF'].value / volt_per_px - parseInt($('#output2_offset_arrow').css('margin-top')) / 2);
			  OSC.state.graph_grid_height = $('#graph_grid').outerHeight();
              $('#output2_offset_arrow').css('top', (graph_height + 7) / 2 + px_offset).show();
            }
          }
          else {
            $('#output2_offset_arrow').hide();
          }
        }
        else if(param_name == 'OSC_MATH_OFFSET') {
          if(new_params['MATH_SHOW'].value) {

            // Change arrow position only if arrow is hidden or old/new values are not the same
            if(!$('#math_offset_arrow').is(':visible')
                || old_params[param_name].value != new_params[param_name].value
                || old_params['OSC_MATH_SCALE'].value != new_params['OSC_MATH_SCALE'].value
				|| (OSC.state.graph_grid_height && OSC.state.graph_grid_height !== $('#graph_grid').outerHeight())) {
              var volt_per_px = (new_params['OSC_MATH_SCALE'].value * 10) / $('#graph_grid').outerHeight();
              var px_offset = -(new_params['OSC_MATH_OFFSET'].value / volt_per_px - parseInt($('#math_offset_arrow').css('margin-top')) / 2);
			  OSC.state.graph_grid_height = $('#graph_grid').outerHeight();
              $('#math_offset_arrow').css('top', ($('#graph_grid').outerHeight() + 7) / 2 + px_offset).show();
            }
          }
          else {
            $('#math_offset_arrow').hide();
          }
        }
        // Time offset arrow
        else if(param_name == 'OSC_TIME_OFFSET') {

          // Change arrow position only if arrow is hidden or old/new values are not the same
          if(!$('#time_offset_arrow').is(':visible')
			  || old_params[param_name].value != new_params[param_name].value
			  || (OSC.state.graph_grid_width && OSC.state.graph_grid_width !== $('#graph_grid').outerWidth())) {
            var graph_width = $('#graph_grid').outerWidth();
            var ms_per_px = (new_params['OSC_TIME_SCALE'].value * 10) / graph_width;
            var px_offset = -(new_params['OSC_TIME_OFFSET'].value / ms_per_px + $('#time_offset_arrow').width()/2 + 1);
            var arrow_left = (graph_width + 2) / 2 + px_offset;
            var buf_width = graph_width - 2;
            var ratio = buf_width / (buf_width * new_params['OSC_VIEV_PART'].value);
            OSC.state.graph_grid_width = graph_width;
            $('#time_offset_arrow').css('left', arrow_left).show();
            $('#buf_time_offset').css('left', buf_width / 2 - buf_width * new_params['OSC_VIEV_PART'].value / 2 + arrow_left / ratio - 4).show();
          }
        }
        // Trigger level
        else if(param_name == 'OSC_TRIG_LEVEL' || param_name == 'OSC_TRIG_SOURCE') {
          if(! OSC.state.trig_dragging) {

            // Trigger button is blured out and trigger level is hidden for source 'EXT'
            if(new_params['OSC_TRIG_SOURCE'].value > 1) {
              $('#trigger_level, #trig_level_arrow').hide();
              $('#right_menu .menu-btn.trig').prop('disabled', true);
              $('#osc_trig_level_info').html('-');
            }
            else {
              var ref_scale = (new_params['OSC_TRIG_SOURCE'].value == 0 ? 'OSC_CH1_SCALE' : 'OSC_CH2_SCALE');
              var source_offset = (new_params['OSC_TRIG_SOURCE'].value == 0 ? new_params['OSC_CH1_OFFSET'].value : new_params['OSC_CH2_OFFSET'].value);
              var graph_height = $('#graph_grid').outerHeight();
              var volt_per_px = (new_params[ref_scale].value * 10) / graph_height;
              var px_offset = -((new_params['OSC_TRIG_LEVEL'].value + source_offset) / volt_per_px - parseInt($('#trig_level_arrow').css('margin-top')) / 2);

              $('#trig_level_arrow, #trigger_level').css('top', (graph_height + 7) / 2 + px_offset).show();
              if(param_name == 'OSC_TRIG_LEVEL') {
				$('#right_menu .menu-btn.trig').prop('disabled', false);
				$('#osc_trig_level_info').html(OSC.convertVoltage(new_params['OSC_TRIG_LEVEL'].value));

				if((!OSC.state.editing && (old_params[param_name] !== undefined && old_params[param_name].value == new_params[param_name].value))){
					var value = $('#OSC_TRIG_LEVEL').val();
					if(value !== new_params[param_name].value){

						var probeAttenuation = 1;
						var jumperSettings = 1;
						var ch="";
						if($("#OSC_TRIG_SOURCE").parent().hasClass("active"))
							ch="CH1";
						else if ($("OSC_TRIG_SOURCE2").parent().hasClass("actie"))
							ch="CH2";
						else
						{
							probeAttenuation = 1;
						}

						if (ch == "CH1" || ch == "CH2")
						{
							probeAttenuation = parseInt($("#OSC_"+ch+"_PROBE option:selected").text());
							jumperSettings = $("#OSC_"+ch+"_IN_GAIN").parent().hasClass("active") ? 1 : 20;
						}
						//$('#OSC_TRIG_LEVEL').val(new_params[param_name].value);
						OSC.setValue($('#OSC_TRIG_LEVEL'), OSC.formatInputValue(new_params[param_name].value, probeAttenuation, false, jumperSettings == 20));
					}
				}
			  }
            }
          }
		   // Trigger source
		  if(param_name == 'OSC_TRIG_SOURCE') {
			  var source = new_params['OSC_TRIG_SOURCE'].value == 0 ? 'IN1' : (new_params['OSC_TRIG_SOURCE'].value == 1 ? 'IN2' : 'EXT');
			$('#osc_trig_source_ch').html(source);
		  }
        }
        // Trigger edge/slope
        else if(param_name == 'OSC_TRIG_SLOPE') {
          $('#osc_trig_edge_img').attr('src', (new_params[param_name].value == 1 ? 'img/trig-edge-up.png' : 'img/trig-edge-down.png'));
        }
        // Y cursors
        else if(param_name == 'OSC_CURSOR_Y1' || param_name == 'OSC_CURSOR_Y2') {
          if(! OSC.state.cursor_dragging) {
            var y = (param_name == 'OSC_CURSOR_Y1' ? 'y1' : 'y2');

            if(new_params[param_name].value) {
              var new_value = new_params[y == 'y1' ? 'OSC_CUR1_V' : 'OSC_CUR2_V'].value;
              var ref_scale = (new_params['OSC_CURSOR_SRC'].value == 0 ? 'OSC_CH1_SCALE' : (new_params['OSC_CURSOR_SRC'].value == 1 ? 'OSC_CH2_SCALE' : 'OSC_MATH_SCALE'));
              var source_offset = new_params[new_params['OSC_CURSOR_SRC'].value == 0 ? 'OSC_CH1_OFFSET' : (new_params['OSC_CURSOR_SRC'].value == 1 ? 'OSC_CH2_OFFSET' : 'OSC_MATH_OFFSET')].value;
              var graph_height = $('#graph_grid').height();
              var volt_per_px = (new_params[ref_scale].value * 10) / graph_height;
              var px_offset = -((new_params[y == 'y1' ? 'OSC_CUR1_V' : 'OSC_CUR2_V'].value + source_offset) / volt_per_px - parseInt($('#cur_' + y + '_arrow').css('margin-top')) / 2);
              var top = (graph_height + 7) / 2 + px_offset;
              var overflow = false;

              if (top < 0)
			  {
				top = 0;
				overflow = true;
			  }
			  if (top > graph_height)
			  {
				top = graph_height;
				overflow = true;
			  }

              $('#cur_' + y + '_arrow, #cur_' + y + ', #cur_' + y + '_info').css('top', top).show();
              $('#cur_' + y + '_info')
                .html(OSC.convertVoltage(+new_value))
                .data('cleanval', +new_value)
                .css('margin-top', (top < 16 ? 3 : ''));
              if(overflow)
				$('#cur_' + y + '_info').hide();
            }
            else {
              $('#cur_' + y + '_arrow, #cur_' + y + ', #cur_' + y + '_info').hide();
            }
          }
        }
        // X cursors
        else if(param_name == 'OSC_CURSOR_X1' || param_name == 'OSC_CURSOR_X2') {
          if(! OSC.state.cursor_dragging) {
            var x = (param_name == 'OSC_CURSOR_X1' ? 'x1' : 'x2');

            if(new_params[param_name].value) {
              var new_value = new_params[x == 'x1' ? 'OSC_CUR1_T' : 'OSC_CUR2_T'].value;
              var graph_width = $('#graph_grid').width();
              var ms_per_px = (new_params['OSC_TIME_SCALE'].value * 10) / graph_width;
              var px_offset = -((new_value + new_params['OSC_TIME_OFFSET'].value) / ms_per_px - parseInt($('#cur_' + x + '_arrow').css('margin-left')) / 2 - 2.5);
              var msg_width = $('#cur_' + x + '_info').outerWidth();
              var left = (graph_width + 2) / 2 + px_offset;

              var overflow = false;
              if (left < 0)
			  {
				left = 0;
				overflow = true;
			  }
			  if (left > graph_width)
			  {
				left = graph_width;
				overflow = true;
			  }

              $('#cur_' + x + '_arrow, #cur_' + x + ', #cur_' + x + '_info').css('left', left).show();
              $('#cur_' + x + '_info')
                .html(OSC.convertTime(-new_value))
                .data('cleanval', -new_value)
                .css('margin-left', (left + msg_width > graph_width - 2 ? -msg_width - 1 : ''));

              if (overflow)
				$('#cur_' + x + '_info').hide();
            }
            else {
              $('#cur_' + x + '_arrow, #cur_' + x + ', #cur_' + x + '_info').hide();
            }
          }
        }
        else if(param_name == 'SOUR1_VOLT') {
          $('#' + param_name + '_info').html(OSC.convertVoltage(new_params['OSC_OUTPUT1_SCALE'].value));
        }
        else if(param_name == 'SOUR2_VOLT') {
          $('#' + param_name + '_info').html(OSC.convertVoltage(new_params['OSC_OUTPUT2_SCALE'].value));
        }

        // Find the field having ID equal to current parameter name
        // TODO: Use classes instead of ids, to be able to use a param name in multiple fields and to loop through all fields to set new values
        var field = $('#' + param_name);

        // Do not change fields from dialogs when user is editing something or new parameter value is the same as the old one
        if(field.closest('.menu-content').length == 0
            || (!OSC.state.editing && (old_params[param_name] === undefined || old_params[param_name].value !== new_params[param_name].value))) {

          if(field.is('select') || (field.is('input') && !field.is('input:radio')) || field.is('input:text')) {
				if(param_name == "OSC_CH1_OFFSET")
				{
					var units;
					if (new_params["OSC_CH1_SCALE"] != undefined)
					{
						if(Math.abs(new_params["OSC_CH1_SCALE"].value) >= 1) {
							units = 'V';
						}
						else if(Math.abs(new_params["OSC_CH1_SCALE"].value) >= 0.001) {
							units = 'mV';
						}
					}
					else
						units = $('#OSC_CH1_OFFSET_UNIT').html();
					var multiplier = units == "mV" ? 1000 : 1;
					field.val(OSC.formatValue(new_params[param_name].value * multiplier));
				} else if (param_name == "OSC_CH2_OFFSET")
				{
					var units;
					if (new_params["OSC_CH2_SCALE"] != undefined)
					{
						if(Math.abs(new_params["OSC_CH2_SCALE"].value) >= 1) {
							units = 'V';
						}
						else if(Math.abs(new_params["OSC_CH2_SCALE"].value) >= 0.001) {
							units = 'mV';
						}
					}
					else
						units = $('#OSC_CH2_OFFSET_UNIT').html();
					var multiplier = units == "mV" ? 1000 : 1;
					field.val(OSC.formatValue(new_params[param_name].value * multiplier));
				} else if (param_name == "OSC_MATH_OFFSET")
				{
					field.val(OSC.formatMathValue(new_params[param_name].value));
				}
				else if (param_name == "OSC_TRIG_LEVEL")
				{
					var probeAttenuation = 1;
					var jumperSettings = 1;
					var ch="";
					if($("#OSC_TRIG_SOURCE").parent().hasClass("active"))
						ch="CH1";
					else if ($("OSC_TRIG_SOURCE2").parent().hasClass("actie"))
						ch="CH2";
					else
					{
						probeAttenuation = 1;
					}

					if (ch == "CH1" || ch == "CH2")
					{
						probeAttenuation = parseInt($("#OSC_"+ch+"_PROBE option:selected").text());
						jumperSettings = $("#OSC_"+ch+"_IN_GAIN").parent().hasClass("active") ? 1 : 20;
					}
					field.val(formatInputValue(new_params[param_name].value, probeAttenuation, false, jumperSettings == 20));
				}
				else if(['SOUR1_DCYC', 'SOUR2_DCYC'].indexOf(param_name) != -1)
				{
					field.val(new_params[param_name].value.toFixed(1));
				}
				else if(['SOUR1_PHAS', 'SOUR2_PHAS'].indexOf(param_name) != -1)
				{
					field.val(new_params[param_name].value.toFixed(0));
				} else
					field.val(new_params[param_name].value);
          }
          else if(field.is('button')) {
            field[new_params[param_name].value === true ? 'addClass' : 'removeClass' ]('active');
			//switch green light for output signals
			if(param_name == "OUTPUT1_STATE" || param_name == "OUTPUT2_STATE")
			{
				var sig_name = param_name == "OUTPUT1_STATE" ? 'output1' : 'output2';
				if(new_params[param_name].value === true)
				{
					if (OSC.state.sel_sig_name)
						$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).removeClass('active');
					OSC.state.sel_sig_name = sig_name;

					$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).addClass('active');
					$('.y-offset-arrow').css('z-index', 10);
					$('#' + OSC.state.sel_sig_name + '_offset_arrow').css('z-index', 11);
				} else
				{
					if (OSC.state.sel_sig_name == sig_name)
					{
						$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).removeClass('active');
						OSC.state.sel_sig_name = null;
					}
				}

				var value = new_params[param_name].value === true ? 1 : 0;
				if(value == 1)
				{
					$('#'+param_name+'_ON').show();
					$('#'+param_name+'_ON').closest('.menu-btn').addClass('state-on');
				}
				else{
					$('#'+param_name+'_ON').hide();
					$('#'+param_name+'_ON').closest('.menu-btn').removeClass('state-on');
				}
			} else if (param_name == "MATH_SHOW")
			{
				var sig_name = "math";
				if(new_params[param_name].value === true)
				{
					if (OSC.state.sel_sig_name)
						$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).removeClass('active');
					OSC.state.sel_sig_name = sig_name;

					$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).addClass('active');
					$('.y-offset-arrow').css('z-index', 10);
					$('#' + OSC.state.sel_sig_name + '_offset_arrow').css('z-index', 11);
				} else
				{
					if (OSC.state.sel_sig_name == sig_name)
					{
						$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).removeClass('active');
						OSC.state.sel_sig_name = null;
					}
				}
			}
          }
          else if(field.is('input:radio')) {
            var radios = $('input[name="' + param_name + '"]');

            radios.closest('.btn-group').children('.btn.active').removeClass('active');

            if(param_name == 'OSC_TRIG_SLOPE') {
              if(new_params[param_name].value == 0) {
                $('#edge1').find('img').attr('src','img/edge1.png');
                $('#edge2').addClass('active').find('img').attr('src','img/edge2_active.png').end().find('#OSC_TRIG_SLOPE1').prop('checked', true);
              }
              else {
                $('#edge1').addClass('active').find('img').attr('src','img/edge1_active.png').end().find('#OSC_TRIG_SLOPE').prop('checked', true);
                $('#edge2').find('img').attr('src','img/edge2.png');
              }
            }
            else {
              radios.eq([+new_params[param_name].value]).prop('checked', true).parent().addClass('active');
            }
          }
          else if(field.is('span')) {
            if($.inArray(param_name, ['OSC_TIME_OFFSET', 'OSC_TIME_SCALE']) > -1) {
              field.html(OSC.convertTime(new_params[param_name].value));
            }
            else if($.inArray(param_name, ['OSC_CH1_SCALE', 'OSC_CH2_SCALE', 'OSC_MATH_SCALE', 'OSC_OUTPUT1_SCALE', 'OSC_OUTPUT2_SCALE']) > -1) {
				if (param_name == 'OSC_MATH_SCALE' && new_params['OSC_MATH_OP'] && $('#munit')) {
					var value = new_params[param_name].value;
					var unit = 'V';
					OSC.div = 1;
					if(Math.abs(value) <= 0.1) {
						value *= 1000;
						OSC.div = 0.001;
						unit = 'mV';
					} else if (Math.abs(value) >= 1000000) {
						value /= 1000000;
						OSC.div = 1000000;
						unit = 'MV';
					} else if (Math.abs(value) >= 1000) {
						value /= 1000;
						OSC.div = 1000;
						unit = 'kV';
					}
					field.html(value);
					var units = ['', unit, unit, unit + '^2', '', unit, unit + '/s', unit + 's'];
					$('#munit').html(units[new_params['OSC_MATH_OP'].value] + '/div');

					$('#OSC_MATH_OFFSET_UNIT').html(units[new_params['OSC_MATH_OP'].value]);
					$('#OSC_MATH_OFFSET').val(OSC.formatMathValue(OSC.params.orig['OSC_MATH_OFFSET'].value/OSC.div));
				}
				else
				{
					var inp_units;
				    if(Math.abs(new_params[param_name].value) >= 1) {
						inp_units = 'V';
					}
					else if(Math.abs(new_params[param_name].value) >= 0.001) {
						inp_units = 'mV';
					}
					field.html(OSC.convertVoltage(new_params[param_name].value));
					if (param_name == "OSC_CH1_SCALE")
						$("#OSC_CH1_OFFSET_UNIT").html(inp_units)
					else if (param_name == "OSC_CH2_SCALE")
						$("#OSC_CH2_OFFSET_UNIT").html(inp_units);
				}
            }
            else {
              field.html(new_params[param_name].value);
            }
          }
        } else {
			if(param_name == "OSC_CH1_OFFSET" || param_name == "OSC_CH2_OFFSET")
			{
				var ch = (param_name == "OSC_CH1_OFFSET") ? "CH1" : "CH2";
				var units = $('#OSC_'+ch+'_OFFSET_UNIT').html();
				var multiplier = units == "mV" ? 1000 : 1;

				var probeAttenuation = parseInt($("#OSC_"+ch+"_PROBE option:selected").text());
				var jumperSettings = $("#OSC_"+ch+"_IN_GAIN").parent().hasClass("active") ? 1 : 20;

				field.val(OSC.formatInputValue(new_params[param_name].value * multiplier, probeAttenuation, units == "mV", jumperSettings == 20));
			}
			if (param_name == "OSC_MATH_OFFSET")
				field.val(OSC.formatMathValue(new_params[param_name].value));
		}
      }
    }

    // Resize double-headed arrows showing the difference between cursors
    OSC.updateYCursorDiff();
    OSC.updateXCursorDiff();
  };

  // Processes newly received data for signals
  OSC.iterCnt = 0;
  OSC.processSignals = function(new_signals) {
    var visible_btns = [];
    var visible_plots = [];
    var visible_info = '';
    var start = +new Date();

    // Do nothing if no parameters received yet
    if($.isEmptyObject(OSC.params.orig)) {
      return;
    }

    // (Re)Draw every signal
    for(sig_name in new_signals) {

      // Ignore empty signals
      if(new_signals[sig_name].size == 0) {
        continue;
      }

      // Ignore disabled signals
      if(OSC.params.orig[sig_name.toUpperCase() + '_SHOW'] && OSC.params.orig[sig_name.toUpperCase() + '_SHOW'].value == false) {
        continue;
      }

      // Ignore math signal if no operator defined
      if(sig_name == 'math' && (!OSC.params.orig['MATH_SHOW'] || OSC.params.orig['MATH_SHOW'].value == false)) {
        continue;
      }

      var points = [];
      var sig_btn = $('#right_menu .menu-btn.' + sig_name);
      var color = OSC.config.graph_colors[sig_name];


      if(OSC.params.orig['OSC_VIEW_START_POS'] && OSC.params.orig['OSC_VIEW_END_POS']) {
          if ((((sig_name == 'output1') || (sig_name == 'output2')) && OSC.params.orig['OSC_VIEW_END_POS'].value != 0) || !OSC.graphs[sig_name]) {
              for(var i=0; i<new_signals[sig_name].size; i++) {
                  points.push([i, new_signals[sig_name].value[i]]);
              }
          } else {
              for(var i=OSC.params.orig['OSC_VIEW_START_POS'].value; i<OSC.params.orig['OSC_VIEW_END_POS'].value; i++) {
                points.push([i, new_signals[sig_name].value[i]]);
              }
          }
      } else {
          for(var i=0; i<new_signals[sig_name].size; i++) {
              points.push([i, new_signals[sig_name].value[i]]);
          }
      }

      if(OSC.graphs[sig_name]) {
        OSC.graphs[sig_name].elem.show();

        if(OSC.state.resized) {
          OSC.graphs[sig_name].plot.resize();
          OSC.graphs[sig_name].plot.setupGrid();
        }

        OSC.graphs[sig_name].plot.setData([points]);
        OSC.graphs[sig_name].plot.draw();
      }
      else {
        OSC.graphs[sig_name] = {};
        OSC.graphs[sig_name].elem = $('<div class="plot" />').css($('#graph_grid').css(['height','width'])).appendTo('#graphs');
        OSC.graphs[sig_name].plot = $.plot(OSC.graphs[sig_name].elem, [points], {
          series: {
            shadowSize: 0,  // Drawing is faster without shadows
            color: color
          },
          yaxis: {
            min: -5,
            max: 5
          },
          xaxis: {
            min: 0
          },
          grid: {
            show: false
          }
        });
      }

      sig_btn.prop('disabled', false);
      visible_btns.push(sig_btn[0]);
      visible_plots.push(OSC.graphs[sig_name].elem[0]);
      visible_info += (visible_info.length ? ',' : '') + '.' + sig_name;

      // By default first signal is selected
      if(! OSC.state.sel_sig_name && !$('#right_menu .not-signal').hasClass('active')) {
        //OSC.state.sel_sig_name = sig_name;
        $('#right_menu .menu-btn.' + OSC.state.sel_sig_name).addClass('active');
      }
    }

    // Hide plots without signal
    $('#graphs .plot').not(visible_plots).hide();

    // Disable buttons related to inactive signals
    $('#right_menu .menu-btn').not(visible_btns).not('.not-signal').prop('disabled', true);

    // Show only information about active signals
    $('#info .info-title > div, #info .info-value > div').not(visible_info).hide();
    $('#info').find(visible_info).show();

    // Reset resize flag
    OSC.state.resized = false;

    // Check if selected signal is still visible
    if(OSC.state.sel_sig_name && OSC.graphs[OSC.state.sel_sig_name] && !OSC.graphs[OSC.state.sel_sig_name].elem.is(':visible')) {
      $('#right_menu .menu-btn.active.' + OSC.state.sel_sig_name).removeClass('active');
      //OSC.state.sel_sig_name = null;
    }

    var fps = 1000/(+new Date() - start);

    if (OSC.iterCnt++ >= 20 && OSC.params.orig['DEBUG_SIGNAL_PERIOD']) {
		var new_period = 1100/fps < 25 ? 25 : 1100/fps;
		var period = {};
		period['DEBUG_SIGNAL_PERIOD'] = { value: new_period };
		OSC.ws.send(JSON.stringify({ parameters: period }));
		OSC.iterCnt = 0;
    }
  };

  // Exits from editing mode
  OSC.exitEditing = function(noclose) {

	if($('#math_dialog').is(':visible')) {
		//for values == abs, dy/dt, ydt (5, 6, 7) deselect and disable signal2 buttons
		var radios = $('input[name="OSC_MATH_SRC2"]');
		var field = $('#OSC_MATH_OP');
		var value = field.val();
		if(value >= 5)
		{
			radios.closest('.btn-group').children('.btn').addClass('disabled');
		}
		else{
			radios.closest('.btn-group').children('.btn').removeClass('disabled');
		}
	}

   for(var key in OSC.params.orig) {
      var field = $('#' + key);
      var value = undefined;

      if(key == 'OSC_RUN'){
        value = (field.is(':visible') ? 0 : 1);
      }
      else if(field.is('select') || (field.is('input') && !field.is('input:radio')) || field.is('input:text')) {
value = field.val();
      }
      else if(field.is('button')) {
        value = (field.hasClass('active') ? 1 : 0);
      }
      else if(field.is('input:radio')) {
        value = $('input[name="' + key + '"]:checked').val();
      }

	  if (key == "OSC_CH1_OFFSET")
	  {
		var units = $('#OSC_CH1_OFFSET_UNIT').html();
		var divider = units == "mV" ? 1000 : 1;
		value /= divider;
	  }

	  if (key == "OSC_CH2_OFFSET")
	  {
		var units = $('#OSC_CH2_OFFSET_UNIT').html();
		var divider = units == "mV" ? 1000 : 1;
		value /= divider;
	  }

	  if (key == "OSC_MATH_OFFSET")
	  {
		value = OSC.convertMathUnitToValue();
	  }

      if(value !== undefined && value != OSC.params.orig[key].value) {
        console.log(key + ' changed from ' + OSC.params.orig[key].value + ' to ' + ($.type(OSC.params.orig[key].value) == 'boolean' ? !!value : value));
        OSC.params.local[key] = { value: ($.type(OSC.params.orig[key].value) == 'boolean' ? !!value : value) };
      }
    }

    // Check changes in measurement list
    var mi_count = 0;
    $('#info-meas').empty();
//    $($('#meas_list .meas-item').get().reverse()).each(function(index, elem) {
    $('#meas_list .meas-item').each(function(index, elem) {
      var $elem = $(elem);
      var item_val = $elem.data('value');

      if(item_val !== null) {
		++mi_count;
		var units = {'P2P': 'V', 'MEAN': 'V', 'MAX': 'V', 'MIN': 'V', 'RMS': 'V', 'DUTY CYCLE': '%', 'PERIOD': 'ms', 'FREQ': 'Hz'};
        OSC.params.local['OSC_MEAS_SEL' + mi_count] = { value: item_val };
		var sig_name = 'MATH';
		if ($elem.data('signal')[2] == '1')
			sig_name = 'IN1';
		else if ($elem.data('signal')[2] == '2')
			sig_name = 'IN2';

		// V/s or Vs unit for dy/dt and ydt
		if (sig_name == 'MATH') {
			if ($('#OSC_MATH_OP').find(":selected").text() == 'dy/dt') {
				units['P2P'] = 'V/s';
				units['MEAN'] = 'V/s';
				units['MAX'] = 'V/s';
				units['MIN'] = 'V/s';
				units['RMS'] = 'V/s';
			} else if ($('#OSC_MATH_OP').find(":selected").text() == 'ydt') {
				units['P2P'] = 'Vs';
				units['MEAN'] = 'Vs';
				units['MAX'] = 'Vs';
				units['MIN'] = 'Vs';
				units['RMS'] = 'Vs';
			} else if ($('#OSC_MATH_OP').find(":selected").text() == '*') {
				units['P2P'] = 'V^2';
				units['MEAN'] = 'V^2';
				units['MAX'] = 'V^2';
				units['MIN'] = 'V^2';
				units['RMS'] = 'V^2';
			}
		}

		var u = '';
		if (OSC.params.orig['OSC_MEAS_VAL' + mi_count])
			u = OSC.params.orig['OSC_MEAS_VAL' + mi_count].value == 'No signal' ? '' : units[$elem.data('operator')];
        $('#info-meas').append(
          '<div>' + $elem.data('operator') + '(<span class="' + $elem.data('signal').toLowerCase() + '">' + sig_name + '</span>) <span id="OSC_MEAS_VAL' + mi_count + '">-</span>&nbsp;<span id="OSC_MEAS_UNITS">' + u + '</span><span id="OSC_MEAS_ORIG_UNITS" style="display:none;">' + u + '</span><span id="OSC_MEAS_ORIG_FOO" style="display:none;">' + $elem.data('operator') + '</span><span id="OSC_MEAS_ORIG_SIGNAME" style="display:none;">' + sig_name + '</span></div>'
        );
      }
    });

    // Send params then reset editing state and hide dialog
    OSC.sendParams();
    OSC.state.editing = false;
    if (noclose) return;
    $('.dialog:visible').hide();
    $('#right_menu').show();
  };

  // Sends to server modified parameters
  OSC.sendParams = function() {
    if($.isEmptyObject(OSC.params.local)) {
      return false;
    }

    if(! OSC.state.socket_opened) {
      console.log('ERROR: Cannot save changes, socket not opened');
      return false;
    }

    OSC.setDefCursorVals();

    // TEMP TEST
    // TODO: Set the update period depending on device type
    //OSC.params.local['DEBUG_PARAM_PERIOD'] = { value: 200 };
    //OSC.params.local['DEBUG_SIGNAL_PERIOD'] = { value: 100 };

    OSC.params.local['in_command'] = { value: 'send_all_params' };
    // Send new values and reset the local params object
//    if (OSC.params.local['OSC_MATH_OFFSET'])
//		OSC.params.local['OSC_MATH_OFFSET'].value *= OSC.div;
    OSC.ws.send(JSON.stringify({ parameters: OSC.params.local }));
    OSC.params.local = {};

    return true;
  };

  // Draws the grid on the lowest canvas layer
  OSC.drawGraphGrid = function() {
    var canvas_width = $('#graphs').width() - 2;
    var canvas_height = Math.round(canvas_width / 2);

    var center_x = canvas_width / 2;
    var center_y = canvas_height / 2;

    var ctx = $('#graph_grid')[0].getContext('2d');

    var x_offset = 0;
    var y_offset = 0;

    // Set canvas size
    ctx.canvas.width = canvas_width;
    ctx.canvas.height = canvas_height;

    // Set draw options
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#5d5d5c';

    // Draw ticks
    for(var i = 1; i < 50; i++) {
      x_offset = x_offset + (canvas_width / 50);
      y_offset = y_offset + (canvas_height / 50);

      if(i == 25) {
        continue;
      }

      ctx.moveTo(x_offset, canvas_height - 3);
      ctx.lineTo(x_offset, canvas_height);

      ctx.moveTo(0, y_offset);
      ctx.lineTo(3, y_offset);
    }

    // Draw lines
    x_offset = 0;
    y_offset = 0;

    for(var i = 1; i < 10; i++){
      x_offset = x_offset + (canvas_height / 10);
      y_offset = y_offset + (canvas_width / 10);

      if(i == 5) {
        continue;
      }

      ctx.moveTo(y_offset, 0);
      ctx.lineTo(y_offset, canvas_height);

      ctx.moveTo(0, x_offset);
      ctx.lineTo(canvas_width, x_offset);
    }

    ctx.stroke();

    // Draw central cross
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';

    ctx.moveTo(center_x, 0);
    ctx.lineTo(center_x, canvas_height);

    ctx.moveTo(0, center_y);
    ctx.lineTo(canvas_width, center_y);

    ctx.stroke();
  };

  // Changes Y zoom/scale for the selected signal
  OSC.changeYZoom = function(direction, curr_scale, send_changes) {

    // Output 1/2 signals do not have zoom
    if($.inArray(OSC.state.sel_sig_name, ['ch1', 'ch2', 'math', 'output1', 'output2']) < 0) {
      return;
    }

    var mult = 1;
    if(OSC.state.sel_sig_name.toUpperCase() === 'MATH') {
        mult = OSC.params.orig['OSC_MATH_SCALE_MULT'].value;
    }
    if(OSC.state.sel_sig_name.toUpperCase() === 'CH1')
    {
		var probeAttenuation = parseInt($("#OSC_CH1_PROBE option:selected").text());
		var jumperSettings = $("#OSC_CH1_IN_GAIN").parent().hasClass("active") ? 1 : 10;
		mult = probeAttenuation * jumperSettings;
	}

    if(OSC.state.sel_sig_name.toUpperCase() === 'CH2')
    {
		var probeAttenuation = parseInt($("#OSC_CH2_PROBE option:selected").text());
		var jumperSettings = $("#OSC_CH2_IN_GAIN").parent().hasClass("active") ? 1 : 10;
		mult = probeAttenuation * jumperSettings;
	}


    var curr_scale = (curr_scale === undefined ? OSC.params.orig['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_SCALE'].value : curr_scale) / mult;
    var new_scale;

    for(var i=0; i < OSC.voltage_steps.length - 1; i++) {

      if(OSC.state.fine && (curr_scale == OSC.voltage_steps[i]
          || (curr_scale > OSC.voltage_steps[i] && curr_scale < OSC.voltage_steps[i + 1])
          || (curr_scale == OSC.voltage_steps[i + 1] && direction == '-'))) {

        new_scale = curr_scale + (OSC.voltage_steps[i + 1] / 100) * (direction == '-' ? -1 : 1);

        // Do not allow values smaller than the lowest possible one
        if(new_scale < OSC.voltage_steps[0]) {
          new_scale = OSC.voltage_steps[0];
        }

        break;
      }

      if(!OSC.state.fine && curr_scale == OSC.voltage_steps[i]) {
        new_scale = OSC.voltage_steps[direction == '-' ? (i > 0 ? i - 1 : 0) : i + 1];
        break;
      }
      else if(!OSC.state.fine && ((curr_scale > OSC.voltage_steps[i] && curr_scale < OSC.voltage_steps[i + 1]) || (curr_scale == OSC.voltage_steps[i + 1] && i == OSC.voltage_steps.length - 2))) {
        new_scale = OSC.voltage_steps[direction == '-' ? i : i + 1];
        break;
      }
    }

    if(new_scale !== undefined && new_scale > 0 && new_scale != curr_scale) {
      new_scale *= mult;
      // Fix float length
//      new_scale = parseFloat(new_scale.toFixed(OSC.state.fine ? 5 : 3));
      if(send_changes !== false) {
        OSC.params.local['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_SCALE'] = { value: new_scale };
        if (OSC.params.orig['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_OFFSET']!=undefined)
        {
			var cur_offset = OSC.params.orig['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_OFFSET'].value;
			var new_offset = (cur_offset / curr_scale) * (new_scale / mult);
			OSC.params.local['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_OFFSET'] = {value: new_offset};
		}
        OSC.sendParams();
      }
      return new_scale;
    }

    return null;
  };

  // Changes X zoom/scale for all signals
  OSC.changeXZoom = function(direction, curr_scale, send_changes) {
    var curr_scale = (curr_scale === undefined ? OSC.params.orig['OSC_TIME_SCALE'].value : curr_scale);
    var new_scale;

    for(var i=0; i < OSC.time_steps.length - 1; i++) {

      if(OSC.state.fine && (curr_scale == OSC.time_steps[i]
          || (curr_scale > OSC.time_steps[i] && curr_scale < OSC.time_steps[i + 1])
          || (curr_scale == OSC.time_steps[i + 1] && direction == '-'))) {

        new_scale = curr_scale + (OSC.time_steps[i + 1] / 100) * (direction == '-' ? -1 : 1);

        // Do not allow values smaller than the lowest possible one
        if(new_scale < OSC.time_steps[0]) {
          new_scale = OSC.time_steps[0];
        }

        break;
      }

      if(!OSC.state.fine && curr_scale == OSC.time_steps[i]) {
        new_scale = OSC.time_steps[direction == '-' ? (i > 0 ? i - 1 : 0) : i + 1];
        break;
      }
      else if(!OSC.state.fine && ((curr_scale > OSC.time_steps[i] && curr_scale < OSC.time_steps[i + 1]) || (curr_scale == OSC.time_steps[i + 1] && i == OSC.time_steps.length - 2))) {
        new_scale = OSC.time_steps[direction == '-' ? i : i + 1]
        break;
      }
    }

    if(new_scale !== undefined && new_scale > 0 && new_scale != curr_scale) {

      // Fix float length
      new_scale = parseFloat(new_scale.toFixed(OSC.state.fine ? 8 : 6));

      if(send_changes !== false) {
        var new_offset = OSC.params.orig['OSC_TIME_OFFSET'].value * new_scale / OSC.params.orig['OSC_TIME_SCALE'].value;
        OSC.params.local['OSC_TIME_OFFSET'] = { value: new_offset };
        OSC.params.local['OSC_TIME_SCALE'] = { value: new_scale };
        OSC.sendParams();
      }
      return new_scale;
    }

    return null;
  };

  // Sets default values for cursors, if values not yet defined
  OSC.setDefCursorVals = function() {
    var graph_height = $('#graph_grid').height();
    var graph_width = $('#graph_grid').width();

    var source = (OSC.params.local['OSC_CURSOR_SRC'] ? OSC.params.local['OSC_CURSOR_SRC'].value : OSC.params.orig['OSC_CURSOR_SRC'].value);
    var ref_scale = (source == 0 ? 'OSC_CH1_SCALE' : (source == 1 ? 'OSC_CH2_SCALE' : 'OSC_MATH_SCALE'));
    var volt_per_px = (OSC.params.orig[ref_scale].value * 10) / graph_height;

    // Default value for Y1 cursor is 1/4 from graph height
    if(OSC.params.local['OSC_CURSOR_Y1'] && OSC.params.local['OSC_CURSOR_Y1'].value && OSC.params.local['OSC_CUR1_V'] === undefined && $('#cur_y1').data('init') === undefined) {
      var cur_arrow = $('#cur_y1_arrow');
      var top = (graph_height + 7) * 0.25;

      OSC.params.local['OSC_CUR1_V'] = { value: (graph_height / 2 - top - (cur_arrow.height() - 2) / 2 - parseInt(cur_arrow.css('margin-top'))) * volt_per_px };

      $('#cur_y1_arrow, #cur_y1').css('top', top).show();
      $('#cur_y1').data('init', true);
    }

    // Default value for Y2 cursor is 1/3 from graph height
    if(OSC.params.local['OSC_CURSOR_Y2'] && OSC.params.local['OSC_CURSOR_Y2'].value && OSC.params.local['OSC_CUR2_V'] === undefined && $('#cur_y2').data('init') === undefined) {
      var cur_arrow = $('#cur_y2_arrow');
      var top = (graph_height + 7) * 0.33;

      OSC.params.local['OSC_CUR2_V'] = { value: (graph_height / 2 - top - (cur_arrow.height() - 2) / 2 - parseInt(cur_arrow.css('margin-top'))) * volt_per_px };

      $('#cur_y2_arrow, #cur_y2').css('top', top).show();
      $('#cur_y2').data('init', true);
    }

    // Default value for X1 cursor is 1/4 from graph width
    if(OSC.params.local['OSC_CURSOR_X1'] && OSC.params.local['OSC_CURSOR_X1'].value && OSC.params.local['OSC_CUR1_T'] === undefined && $('#cur_x1').data('init') === undefined) {
      var cur_arrow = $('#cur_x1_arrow');
      var left = graph_width * 0.25;
      var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / graph_width;

      OSC.params.local['OSC_CUR1_T'] = { value: (graph_width / 2 - left - (cur_arrow.width() - 2) / 2 - parseInt(cur_arrow.css('margin-left'))) * ms_per_px };

      $('#cur_x1_arrow, #cur_x1').css('left', left).show();
      $('#cur_x1').data('init', true);
    }

    // Default value for X2 cursor is 1/3 from graph width
    if(OSC.params.local['OSC_CURSOR_X2'] && OSC.params.local['OSC_CURSOR_X2'].value && OSC.params.local['OSC_CUR2_T'] === undefined && $('#cur_x2').data('init') === undefined) {
      var cur_arrow = $('#cur_x2_arrow');
      var left = graph_width * 0.33;
      var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / graph_width;

      OSC.params.local['OSC_CUR2_T'] = { value: (graph_width / 2 - left - (cur_arrow.width() - 2) / 2 - parseInt(cur_arrow.css('margin-left'))) * ms_per_px };

      $('#cur_x2_arrow, #cur_x2').css('left', left).show();
      $('#cur_x2').data('init', true);
    }
  };

  // Updates all elements related to a Y cursor
  OSC.updateYCursorElems = function(ui, save) {
    var y = (ui.helper[0].id == 'cur_y1_arrow' ? 'y1' : 'y2');
    var ref_scale = (OSC.params.orig['OSC_CURSOR_SRC'].value == 0 ? 'OSC_CH1_SCALE' : (OSC.params.orig['OSC_CURSOR_SRC'].value == 1 ? 'OSC_CH2_SCALE' : 'OSC_MATH_SCALE'));
    var source_offset = OSC.params.orig[OSC.params.orig['OSC_CURSOR_SRC'].value == 0 ? 'OSC_CH1_OFFSET' : (OSC.params.orig['OSC_CURSOR_SRC'].value == 1 ? 'OSC_CH2_OFFSET' : 'OSC_MATH_OFFSET')].value;
    var graph_height = $('#graph_grid').height();
    var volt_per_px = (OSC.params.orig[ref_scale].value * 10) / graph_height;
    var new_value = (graph_height / 2 - ui.position.top - (ui.helper.height() - 2) / 2 - parseInt(ui.helper.css('margin-top'))) * volt_per_px - source_offset;

	$('#cur_' + y + '_arrow, #cur_' + y + ', #cur_' + y + '_info').show();
    $('#cur_' + y + ', #cur_' + y + '_info').css('top', ui.position.top);
    $('#cur_' + y + '_info')
      .html(OSC.convertVoltage(+new_value))
      .data('cleanval', +new_value)
      .css('margin-top', (ui.position.top < 16 ? 3 : ''));

    OSC.updateYCursorDiff();

    if(save) {
      OSC.params.local[y == 'y1' ? 'OSC_CUR1_V' : 'OSC_CUR2_V'] = { value: new_value };
      OSC.sendParams();
    }
  };

  // Updates all elements related to a X cursor
  OSC.updateXCursorElems = function(ui, save) {
    var x = (ui.helper[0].id == 'cur_x1_arrow' ? 'x1' : 'x2');
    var graph_width = $('#graph_grid').width();
    var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / graph_width;
    var msg_width = $('#cur_' + x + '_info').outerWidth();
    var new_value = (graph_width / 2 - ui.position.left - (ui.helper.width() - 2) / 2 - parseInt(ui.helper.css('margin-left'))) * ms_per_px - OSC.params.orig['OSC_TIME_OFFSET'].value;

	$('#cur_' + x + '_arrow, #cur_' + x + ', #cur_' + x + '_info').show();
    $('#cur_' + x + ', #cur_' + x + '_info').css('left', ui.position.left);
    $('#cur_' + x + '_info')
      .html(OSC.convertTime(-new_value))
      .data('cleanval', -new_value)
      .css('margin-left', (ui.position.left + msg_width > graph_width - 2 ? -msg_width - 1 : ''));

    OSC.updateXCursorDiff();

    if(save) {
      OSC.params.local[x == 'x1' ? 'OSC_CUR1_T' : 'OSC_CUR2_T'] = { value: new_value };
      OSC.sendParams();
    }
  };

  // Resizes double-headed arrow showing the difference between Y cursors
  OSC.updateYCursorDiff = function() {
    var y1 = $('#cur_y1_info');
    var y2 = $('#cur_y2_info');
    var y1_top = parseInt(y1.css('top'));
    var y2_top = parseInt(y2.css('top'));
    var diff_px = Math.abs(y1_top - y2_top) - 6;

    if(y1.is(':visible') && y2.is(':visible') && diff_px > 12) {
      var top = Math.min(y1_top, y2_top);
      var value = $('#cur_y1_info').data('cleanval') - $('#cur_y2_info').data('cleanval');

      $('#cur_y_diff')
        .css('top', top + 5)
        .height(diff_px)
        .show();
      $('#cur_y_diff_info')
        .html(OSC.convertVoltage(Math.abs(value)))
        .css('top', top + diff_px/2 - 2)
        .show();
    }
    else {
      $('#cur_y_diff, #cur_y_diff_info').hide();
    }
  };

  // Resizes double-headed arrow showing the difference between X cursors
  OSC.updateXCursorDiff = function() {
    var x1 = $('#cur_x1_info');
    var x2 = $('#cur_x2_info');
    var x1_left = parseInt(x1.css('left'));
    var x2_left = parseInt(x2.css('left'));
    var diff_px = Math.abs(x1_left - x2_left) - 9;

    if(x1.is(':visible') && x2.is(':visible') && diff_px > 12) {
      var left = Math.min(x1_left, x2_left);
      var value = $('#cur_x1_info').data('cleanval') - $('#cur_x2_info').data('cleanval');

      $('#cur_x_diff')
        .css('left', left + 1)
        .width(diff_px)
        .show();
      $('#cur_x_diff_info')
        .html(OSC.convertTime(Math.abs(value)))
        .show()
        .css('left', left + diff_px/2 - $('#cur_x_diff_info').width()/2 + 3);
    }
    else {
      $('#cur_x_diff, #cur_x_diff_info').hide();
    }
  };

  // Updates Y offset in the signal config dialog, if opened, or saves new value
  OSC.updateYOffset = function(ui, save) {
    var graph_height = $('#graph_grid').outerHeight();
    var zero_pos = (graph_height + 7) / 2;
    var new_value;

    if(ui.helper[0].id == 'ch1_offset_arrow') {
      var volt_per_px = (OSC.params.orig['OSC_CH1_SCALE'].value * 10) / graph_height;

      new_value = (zero_pos - ui.position.top + parseInt(ui.helper.css('margin-top')) / 2) * volt_per_px;
      $('#info_box').html('IN1 zero offset ' + OSC.convertVoltage(new_value));

      if($('#in1_dialog').is(':visible')) {
        //$('#OSC_CH1_OFFSET').val(+(new_value));
		//$('#OSC_CH1_OFFSET').change();
		var units = $('#OSC_CH1_OFFSET_UNIT').html();
		var multiplier = units == "mV" ? 1000 : 1;

		var probeAttenuation = parseInt($("#OSC_CH1_PROBE option:selected").text());
		var jumperSettings = $("#OSC_CH1_IN_GAIN").parent().hasClass("active") ? 1 : 20;
		OSC.setValue($('#OSC_CH1_OFFSET'), OSC.formatInputValue(new_value * multiplier, probeAttenuation, units == "mV", jumperSettings == 20));
      }

      //else if(save) {
        OSC.params.local['OSC_CH1_OFFSET'] = { value: new_value };
      //}
    }
    else if(ui.helper[0].id == 'ch2_offset_arrow') {
      var volt_per_px = (OSC.params.orig['OSC_CH2_SCALE'].value * 10) / graph_height;

      new_value = (zero_pos - ui.position.top + parseInt(ui.helper.css('margin-top')) / 2) * volt_per_px;
      $('#info_box').html('IN2 zero offset ' + OSC.convertVoltage(new_value));

      if($('#in2_dialog').is(':visible')) {
        //$('#OSC_CH2_OFFSET').val(+(new_value));
		//$('#OSC_CH2_OFFSET').change();
		var units = $('#OSC_CH2_OFFSET_UNIT').html();
		var multiplier = units == "mV" ? 1000 : 1;

		var probeAttenuation = parseInt($("#OSC_CH2_PROBE option:selected").text());
		var jumperSettings = $("#OSC_CH2_IN_GAIN").parent().hasClass("active") ? 1 : 20;
		OSC.setValue($('#OSC_CH2_OFFSET'), OSC.formatInputValue(new_value * multiplier, probeAttenuation, units == "mV", jumperSettings == 20));
      }
      //else if(save) {
        OSC.params.local['OSC_CH2_OFFSET'] = { value: new_value };
      //}
    }
    else if(ui.helper[0].id == 'output1_offset_arrow') {
      var volt_per_px =  10 / graph_height;

      new_value = (zero_pos - ui.position.top + parseInt(ui.helper.css('margin-top')) / 2) * volt_per_px;
      $('#info_box').html('OUT1 zero offset ' + OSC.convertVoltage(new_value));
      if(save) {
        OSC.params.local['OUTPUT1_SHOW_OFF'] = { value: new_value };
      }
    }
    else if(ui.helper[0].id == 'output2_offset_arrow') {
      var volt_per_px =  10 / graph_height;

      new_value = (zero_pos - ui.position.top + parseInt(ui.helper.css('margin-top')) / 2) * volt_per_px;
      $('#info_box').html('OUT2 zero offset ' + OSC.convertVoltage(new_value));
      if(save) {
        OSC.params.local['OUTPUT2_SHOW_OFF'] = { value: new_value };
      }
    }
    else if(ui.helper[0].id == 'math_offset_arrow') {
      var volt_per_px = (OSC.params.orig['OSC_MATH_SCALE'].value * 10) / graph_height;

      new_value = (zero_pos - ui.position.top + parseInt(ui.helper.css('margin-top')) / 2) * volt_per_px;
      $('#info_box').html('MATH zero offset ' + OSC.convertVoltage(new_value));

      if($('#math_dialog').is(':visible')) {
        OSC.convertValueToMathUnit(new_value);
      }
      //else if(save) {
        OSC.params.local['OSC_MATH_OFFSET'] = { value: new_value };
      //}
    }

    if(new_value !== undefined && save) {
      OSC.sendParams();
    }
  };


  	OSC.formatInputValue = function(oldValue, attenuation, is_milis, is_hv){
		var z = oldValue;
		if (is_milis)
			return z.toFixed(0);
		if(is_hv)
		{
			switch(attenuation)
			{
				case 1:
					return z.toFixed(2);
					break;
				case 10:
					return z.toFixed(1);
					break;
				case 100:
					return z.toFixed(0);
					break;
			}
		} else
		{
			switch(attenuation)
			{
				case 1:
					return z.toFixed(3);
					break;
				case 10:
					return z.toFixed(2);
					break;
				case 100:
					return z.toFixed(1);
					break;
			}
		}
		return z;
	}

   OSC.formatValue = function (oldValue){
		var z = oldValue;
/*
		if (z > 0)
		{
			if(z < 9.99990)
				return z.toFixed(3);
			else if(z < 99.9990)
				return z.toFixed(2);
			else if(z < 999.990)
				return z.toFixed(1);
			else
				return z.toFixed(0);
		} else
		{
			if(z > -9.99990)
				return z.toFixed(3);
			else if(z > -99.9990)
				return z.toFixed(2);
			else if(z > -999.990)
				return z.toFixed(1);
			else
				return z.toFixed(0);
		}
*/
		return z;
   };

  // Updates trigger level in the trigger config dialog, if opened, or saves new value
  OSC.updateTrigLevel = function(ui, save) {

    $('#trigger_level').css('top', ui.position.top);

    if(OSC.params.orig['OSC_TRIG_SOURCE'] !== undefined) {

      if(OSC.params.orig['OSC_TRIG_SOURCE'].value < 2) {
        var ref_scale = (OSC.params.orig['OSC_TRIG_SOURCE'].value == 0 ? 'OSC_CH1_SCALE' : 'OSC_CH2_SCALE');
        var source_offset = (OSC.params.orig['OSC_TRIG_SOURCE'].value == 0 ? OSC.params.orig['OSC_CH1_OFFSET'].value : OSC.params.orig['OSC_CH2_OFFSET'].value);

        if(OSC.params.orig[ref_scale] !== undefined) {
          var graph_height = $('#graph_grid').height();
          var volt_per_px = (OSC.params.orig[ref_scale].value * 10) / graph_height;
          var new_value = (graph_height / 2 - ui.position.top - (ui.helper.height() - 2) / 2 - parseInt(ui.helper.css('margin-top'))) * volt_per_px - source_offset;

		  if(OSC.params.orig['OSC_TRIG_LIMIT'] !== undefined && (new_value > OSC.params.orig['OSC_TRIG_LIMIT'].value || new_value < -OSC.params.orig['OSC_TRIG_LIMIT'].value)) {
			$('#info_box').html('Trigger at its limit');
			if(new_value > OSC.params.orig['OSC_TRIG_LIMIT'].value)
				new_value = OSC.params.orig['OSC_TRIG_LIMIT'].value
			if(new_value < -OSC.params.orig['OSC_TRIG_LIMIT'].value)
				new_value = -OSC.params.orig['OSC_TRIG_LIMIT'].value
		  }
		  else{
			$('#info_box').html('Trigger level ' + OSC.convertVoltage(new_value));
		  }

          if($('#trig_dialog').is(':visible')) {
            //$('#OSC_TRIG_LEVEL').val(+(new_value));
			//$('#OSC_TRIG_LEVEL').change();
			var probeAttenuation = 1;
			var jumperSettings = 1;
			var ch="";
			if($("#OSC_TRIG_SOURCE").parent().hasClass("active"))
				ch="CH1";
			else if ($("OSC_TRIG_SOURCE2").parent().hasClass("actie"))
				ch="CH2";
			else
			{
				probeAttenuation = 1;
			}

			if (ch == "CH1" || ch == "CH2")
			{
				probeAttenuation = parseInt($("#OSC_"+ch+"_PROBE option:selected").text());
				jumperSettings = $("#OSC_"+ch+"_IN_GAIN").parent().hasClass("active") ? 1 : 20;
			}

			OSC.setValue($('#OSC_TRIG_LEVEL'), OSC.formatInputValue(new_value, probeAttenuation, false, jumperSettings == 20));
			$('#OSC_TRIG_LEVEL').change();
          }
          if(save) {
            OSC.params.local['OSC_TRIG_LEVEL'] = { value: new_value };
            OSC.sendParams();
          }
        }
      }
      else {
        console.log('Trigger level for source ' + OSC.params.orig['OSC_TRIG_SOURCE'].value + ' not yet supported');
      }
    }
  };

  // Converts time from milliseconds to a more 'user friendly' time unit; returned value includes units
  OSC.convertTime = function(t) {
    var abs_t = Math.abs(t);
    var unit = 'ms';

    if(abs_t >= 1000) {
      t = t / 1000;
      unit = 's';
    }
    else if(abs_t >= 1) {
      t = t * 1;
      unit = 'ms';
    }
    else if(abs_t >= 0.001) {
      t = t * 1000;
      unit = 'μs';
    }
    else if(abs_t >= 0.000001) {
      t = t * 1000000;
      unit = ' ns';
    }

    return +(t.toFixed(2)) + ' ' + unit;
  };

  // Converts voltage from volts to a more 'user friendly' unit; returned value includes units
  OSC.convertVoltage = function(v) {
    var abs_v = Math.abs(v);
    var unit = 'V';

    if(abs_v >= 1) {
      v = v * 1;
      unit = 'V';
    }
    else if(abs_v >= 0.001) {
      v = v * 1000;
      unit = 'mV';
    }

    return +(v.toFixed(2)) + ' ' + unit;
  };

   	OSC.formatMathValue = function(oldValue){
		var z = oldValue;
		var precision = 2;
		var munit = $('#munit').html().charAt(0);
		var scale_val = $("#OSC_MATH_SCALE").text();
		var math_vdiv = parseFloat(scale_val);
		if(munit == 'm')
			precision = 0;
		if (math_vdiv < 1)
			precision = 3;

		return z.toFixed(precision);
	}

  OSC.convertValueToMathUnit = function(v) {
    var value = v;
	var unit = 'V';
	var precision = 2;
	var munit = $('#munit').html().charAt(0);
	var scale_val = $("#OSC_MATH_SCALE").text();
	var math_vdiv = parseFloat(scale_val);

	if(OSC.params.orig['OSC_MATH_OP']){
		if(munit == 'm') {
			value *= 1000;
			unit = 'mV';
			precision = 0;
		} else if (munit == 'M') {
			value /= 1000000;
			unit = 'MV';
		} else if (munit == 'k') {
			value /= 1000;
			unit = 'kV';
		}
		if (math_vdiv < 1)
			precision = 3;

		var units = ['', unit, unit, unit + '^2', '', unit, unit + '/s', unit + 's'];
		$('#OSC_MATH_OFFSET_UNIT').html(units[OSC.params.orig['OSC_MATH_OP'].value]);
	}
	var value_holder = $('#OSC_MATH_OFFSET');
	value_holder.val(OSC.formatMathValue(value));
	value_holder.change();
  };

  OSC.convertMathUnitToValue = function() {
    var value = parseFloat($('#OSC_MATH_OFFSET').val());
	var unit = $('#OSC_MATH_OFFSET_UNIT').html().charAt(0);
	var precision = 3;
	if(unit === 'm') {
		value /= 1000;

	} else if (unit === 'M') {
		value *= 1000000;

	} else if (unit === 'k') {
		value *= 1000;
	}

	value = OSC.formatValue(value);
	return value;
  };

  OSC.setValue = function(input, value) {
    input.val(value);
	//input.change();
  };


}(window.OSC = window.OSC || {}, jQuery));

// Page onload event handler
$(function() {
	$('#calib-input').hide();
	$('#calib-input-text').hide();
	$('#modal-warning').hide();

    $('button').bind('activeChanged', function(){
        OSC.exitEditing(true);
    });
    $('select, input').on('change', function(){OSC.exitEditing(true);});

  // Initialize FastClick to remove the 300ms delay between a physical tap and the firing of a click event on mobile browsers
  //new FastClick(document.body);

	$(".dbl").on('dblclick', function() {
	  var cls = $(this).attr('class');
	  if (cls.indexOf('ch1') != -1)
		$('#OSC_CH1_OFFSET').val(0);
	  if (cls.indexOf('ch2') != -1)
		$('#OSC_CH2_OFFSET').val(0);
	  if (cls.indexOf('math') != -1)
		$('#OSC_MATH_OFFSET').val(0);
	  if (cls.indexOf('trig') != -1)
		$('#OSC_TRIG_LEVEL').val(0);
	  OSC.exitEditing(true);
	});

  // Process clicks on top menu buttons
//  $('#OSC_RUN').on('click touchstart', function(ev) {
  $('#OSC_RUN').on('click', function(ev) {
    ev.preventDefault();
    $('#OSC_RUN').hide();
    $('#OSC_STOP').css('display','block');
    OSC.params.local['OSC_RUN'] = { value: true };
    OSC.sendParams();
  });

//  $('#OSC_STOP').on('click touchstart', function(ev) {
  $('#OSC_STOP').on('click', function(ev) {
    ev.preventDefault();
    $('#OSC_STOP').hide();
    $('#OSC_RUN').show();
    OSC.params.local['OSC_RUN'] = { value: false };
    OSC.sendParams();
  });

//  $('#OSC_SINGLE').on('click touchstart', function(ev) {
  $('#OSC_SINGLE').on('click', function(ev) {
    ev.preventDefault();
    OSC.params.local['OSC_SINGLE'] = { value: true };
    OSC.sendParams();
  });

//  $('#OSC_AUTOSCALE').on('click touchstart', function(ev) {
  $('#OSC_AUTOSCALE').on('click', function(ev) {
    ev.preventDefault();
    OSC.params.local['OSC_AUTOSCALE'] = { value: true };
    OSC.sendParams();
  });

  // Selecting active signal
//  $('.menu-btn').on('click touchstart', function() {
  $('.menu-btn').on('click', function() {
    $('#right_menu .menu-btn').not(this).removeClass('active');
    if (!$(this).hasClass('active'))
		OSC.state.sel_sig_name = $(this).data('signal');
	else
		OSC.state.sel_sig_name = null;
    $('.y-offset-arrow').css('z-index', 10);
    $('#' + OSC.state.sel_sig_name + '_offset_arrow').css('z-index', 11);
  });

  // Opening a dialog for changing parameters
//  $('.edit-mode').on('click touchstart', function() {
  $('.edit-mode').on('click', function() {
    OSC.state.editing = true;
    $('#right_menu').hide();
    $('#' + $(this).attr('id') + '_dialog').show();

    if($.inArray($(this).data('signal'), ['ch1', 'ch2', 'math', 'output1', 'output2']) >= 0) {
		if (OSC.state.sel_sig_name)
			$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).removeClass('active');
		if ($(this).data('signal') == 'output1' || $(this).data('signal') == 'output2' || $(this).data('signal') == 'math')
		{
			var out_enabled = $(this).data('signal') == 'output1' ? OSC.params.orig["OUTPUT1_STATE"].value
							: $(this).data('signal') == 'output2' ? OSC.params.orig["OUTPUT2_STATE"].value : OSC.params.orig["MATH_SHOW"].value;
			if (out_enabled)
			{
				OSC.state.sel_sig_name = $(this).data('signal');
				$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).addClass('active');
				$('.y-offset-arrow').css('z-index', 10);
				$('#' + OSC.state.sel_sig_name + '_offset_arrow').css('z-index', 11);
			} else
				OSC.state.sel_sig_name = null;
		} else
		{
			OSC.state.sel_sig_name = $(this).data('signal');

			$('#right_menu .menu-btn.' + OSC.state.sel_sig_name).addClass('active');
			$('.y-offset-arrow').css('z-index', 10);
			$('#' + OSC.state.sel_sig_name + '_offset_arrow').css('z-index', 11);
		}
    }
  });

  // Close parameters dialog after Enter key is pressed
  $('input').keyup(function(event){
    if(event.keyCode == 13){
      OSC.exitEditing(true);
    }
  });

  // Close parameters dialog on close button click
//  $('.close-dialog').on('click touchstart', function() {
  $('.close-dialog').on('click', function() {
    OSC.exitEditing();
  });

  // Measurement dialog
  $('#meas_done').on('click', function() {
    var meas_signal = $('#meas_dialog input[name="meas_signal"]:checked');

    if(meas_signal.length) {
      var operator_name = $('#meas_operator option:selected').html();
      var operator_val = parseInt($('#meas_operator').val());
      var signal_name = meas_signal.val();
      var item_id = 'meas_' + operator_name + '_' + signal_name;

      // Check if the item already exists
      if($('#' + item_id).length > 0) {
        return;
      }

	var sig_text = 'MATH';
	if (signal_name == 'CH1')
		sig_text = 'IN1';
	else if (signal_name == 'CH2')
		sig_text = 'IN2';

      // Add new item
      $('<div id="' + item_id + '" class="meas-item">' + operator_name + ' (' + sig_text + ')</div>').data({
        value: (signal_name == 'CH1' ? operator_val : (signal_name == 'CH2' ? operator_val + 1 : operator_val + 2)),
        operator: operator_name,
        signal: signal_name
      }).appendTo('#meas_list');
    }
	OSC.exitEditing(true);
  });

  $(document).on('click', '.meas-item', function() {
    $(this).remove();
	OSC.exitEditing(true);
  });

  // Process events from other controls in parameters dialogs
//  $('#edge1').on('click touchstart', function() {
  $('#edge1').on('click', function() {
    $('#edge1').find('img').attr('src','img/edge1_active.png');
    $('#edge2').find('img').attr('src','img/edge2.png');
  });

//  $('#edge2').on('click touchstart', function() {
  $('#edge2').on('click', function() {
    $('#edge2').find('img').attr('src','img/edge2_active.png');
    $('#edge1').find('img').attr('src','img/edge1.png');
  });

  // Joystick events
  $('#jtk_up').on('mousedown touchstart', function() { $('#jtk_btns').attr('src','img/node_up.png'); });
  $('#jtk_left').on('mousedown touchstart', function() { $('#jtk_btns').attr('src','img/node_left.png'); });
  $('#jtk_right').on('mousedown touchstart', function() { $('#jtk_btns').attr('src','img/node_right.png'); });
  $('#jtk_down').on('mousedown touchstart', function() { $('#jtk_btns').attr('src','img/node_down.png'); });

//  $('#jtk_fine').on('click touchstart', function(ev){
  $('#jtk_fine').on('click', function(ev){
    var img = $('#jtk_fine');

    if(img.attr('src') == 'img/fine.png') {
      img.attr('src', 'img/fine_active.png');
      OSC.state.fine = true;
    }
    else {
      img.attr('src', 'img/fine.png');
      OSC.state.fine = false;
    }

    ev.preventDefault();
    ev.stopPropagation();
  });

  $(document).on('mouseup touchend', function(){
    $('#jtk_btns').attr('src','img/node_fine.png');
  });

//  $('#jtk_up, #jtk_down').on('click touchstart', function(ev) {
  $('#jtk_up, #jtk_down').on('click', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    OSC.changeYZoom(ev.target.id == 'jtk_down' ? '+' : '-');
  });

//  $('#jtk_left, #jtk_right').on('click touchstart', function(ev) {
  $('#jtk_left, #jtk_right').on('click', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    OSC.changeXZoom(ev.target.id == 'jtk_left' ? '+' : '-');
  });

  // Voltage offset arrow dragging
  $('.y-offset-arrow').draggable({
    axis: 'y',
    containment: 'parent',
    drag: function(ev, ui) {
      var margin_top = parseInt(ui.helper.css('marginTop'));
      var min_top = ((ui.helper.height() / 2) + margin_top) * -1;
      var max_top = $('#graphs').height() - margin_top;

      if(ui.position.top < min_top) {
        ui.position.top = min_top;
      }
      else if(ui.position.top > max_top) {
        ui.position.top = max_top;
      }

      OSC.updateYOffset(ui, false);
    },
    stop: function(ev, ui) {
      if(! OSC.state.simulated_drag) {
        OSC.updateYOffset(ui, true);
        $('#info_box').empty();
      }
    }
  });

  // Time offset arrow dragging
  $('#time_offset_arrow').draggable({
    axis: 'x',
    containment: 'parent',
    drag: function(ev, ui) {
      var graph_width = $('#graph_grid').outerWidth();
      var zero_pos = (graph_width + 2) / 2;
      var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / graph_width;
      var new_value = +(((zero_pos - ui.position.left - ui.helper.width() / 2 - 1) * ms_per_px).toFixed(6));
      var buf_width = graph_width - 2;
      var ratio = buf_width / (buf_width * OSC.params.orig['OSC_VIEV_PART'].value);

      $('#info_box').html('Time offset ' + OSC.convertTime(new_value));
      $('#buf_time_offset').css('left', buf_width / 2 - buf_width * OSC.params.orig['OSC_VIEV_PART'].value / 2 + ui.position.left / ratio - 4).show();
    },
    stop: function(ev, ui) {
      if(! OSC.state.simulated_drag) {
        var graph_width = $('#graph_grid').outerWidth();
        var zero_pos = (graph_width + 2) / 2;
        var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / graph_width;

        OSC.params.local['OSC_TIME_OFFSET'] = { value: (zero_pos - ui.position.left - ui.helper.width() / 2 - 1) * ms_per_px };
        OSC.sendParams();
        $('#info_box').empty();
      }
    }
  });

  // Time offset rectangle dragging
  $('#buf_time_offset').draggable({
    axis: 'x',
    containment: 'parent',
    drag: function(ev, ui) {
      var buf_width = $('#buffer').width();
      var zero_pos = (buf_width + 2) / 2;
      var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / buf_width;
      var ratio = buf_width / (buf_width * OSC.params.orig['OSC_VIEV_PART'].value);
      var new_value = +(((zero_pos - ui.position.left - ui.helper.width() / 2 - 1) * ms_per_px * ratio).toFixed(2));
      var px_offset = -(new_value / ms_per_px + $('#time_offset_arrow').width() / 2 + 1);

      $('#info_box').html('Time offset ' + OSC.convertTime(new_value));
      $('#time_offset_arrow').css('left', (buf_width + 2) / 2 + px_offset);
    },
    stop: function(ev, ui) {
      if(! OSC.state.simulated_drag) {
        var buf_width = $('#buffer').width();
        var zero_pos = (buf_width + 2) / 2;
        var ms_per_px = (OSC.params.orig['OSC_TIME_SCALE'].value * 10) / buf_width;
        var ratio = buf_width / (buf_width * OSC.params.orig['OSC_VIEV_PART'].value);

        OSC.params.local['OSC_TIME_OFFSET'] = { value: (zero_pos - ui.position.left - ui.helper.width() / 2 - 1) * ms_per_px * ratio };
        OSC.sendParams();
        $('#info_box').empty();
      }
    }
  });

  // Trigger level arrow dragging
  $('#trig_level_arrow').draggable({
    axis: 'y',
    containment: 'parent',
    start: function(ev, ui) {
      OSC.state.trig_dragging = true;
    },
    drag: function(ev, ui) {
      OSC.updateTrigLevel(ui, false);
    },
    stop: function(ev, ui) {
      OSC.updateTrigLevel(ui, true);
      OSC.state.trig_dragging = false;
      $('#info_box').empty();
    }
  });

  // Y cursor arrows dragging
  $('#cur_y1_arrow, #cur_y2_arrow').draggable({
    axis: 'y',
    containment: 'parent',
    start: function(ev, ui) {
      OSC.state.cursor_dragging = true;
    },
    drag: function(ev, ui) {
      OSC.updateYCursorElems(ui, false);
    },
    stop: function(ev, ui) {
      OSC.updateYCursorElems(ui, true);
      OSC.state.cursor_dragging = false;
    }
  });

  // X cursor arrows dragging
  $('#cur_x1_arrow, #cur_x2_arrow').draggable({
    axis: 'x',
    containment: 'parent',
    start: function(ev, ui) {
      OSC.state.cursor_dragging = true;
    },
    drag: function(ev, ui) {
      OSC.updateXCursorElems(ui, false);
    },
    stop: function(ev, ui) {
      OSC.updateXCursorElems(ui, true);
      OSC.state.cursor_dragging = false;
    }
  });

  // Touch events
  $(document).on('touchstart', '.plot', function(ev) {
    ev.preventDefault();

    // Multi-touch is used for zooming
    if(!OSC.touch.start && ev.originalEvent.touches.length > 1) {
      OSC.touch.zoom_axis = null;
      OSC.touch.start = [
        { clientX: ev.originalEvent.touches[0].clientX, clientY: ev.originalEvent.touches[0].clientY },
        { clientX: ev.originalEvent.touches[1].clientX, clientY: ev.originalEvent.touches[1].clientY }
      ];
    }
    // Single touch is used for changing offset
    else if(! OSC.state.simulated_drag) {
      OSC.state.simulated_drag = true;
      OSC.touch.offset_axis = null;
      OSC.touch.start = [
        { clientX: ev.originalEvent.touches[0].clientX, clientY: ev.originalEvent.touches[0].clientY }
      ];
    }
  });

  $(document).on('touchmove', '.plot', function(ev) {
    ev.preventDefault();

    // Multi-touch is used for zooming
    if(ev.originalEvent.touches.length > 1) {

      OSC.touch.curr = [
        { clientX: ev.originalEvent.touches[0].clientX, clientY: ev.originalEvent.touches[0].clientY },
        { clientX: ev.originalEvent.touches[1].clientX, clientY: ev.originalEvent.touches[1].clientY }
      ];

      // Find zoom axis
      if(! OSC.touch.zoom_axis) {
        var delta_x = Math.abs(OSC.touch.curr[0].clientX - OSC.touch.curr[1].clientX);
        var delta_y = Math.abs(OSC.touch.curr[0].clientY - OSC.touch.curr[1].clientY);

        if(Math.abs(delta_x - delta_y) > 10) {
          if(delta_x > delta_y) {
            OSC.touch.zoom_axis = 'x';
          }
          else if(delta_y > delta_x) {
            OSC.touch.zoom_axis = 'y';
          }
        }
      }

      // Skip first touch event
      if(OSC.touch.prev) {

        // Time zoom
        if(OSC.touch.zoom_axis == 'x') {
          var prev_delta_x = Math.abs(OSC.touch.prev[0].clientX - OSC.touch.prev[1].clientX);
          var curr_delta_x = Math.abs(OSC.touch.curr[0].clientX - OSC.touch.curr[1].clientX);

          if(OSC.state.fine || Math.abs(curr_delta_x - prev_delta_x) > $(this).width() * 0.9 / OSC.time_steps.length) {
            var new_scale = OSC.changeXZoom((curr_delta_x < prev_delta_x ? '+' : '-'), OSC.touch.new_scale_x, true);

            if(new_scale !== null) {
              OSC.touch.new_scale_x = new_scale;
              $('#info_box').html('Time scale ' + OSC.convertTime(new_scale) + '/div');
            }

            OSC.touch.prev = OSC.touch.curr;
          }
        }
        // Voltage zoom
        else if(OSC.touch.zoom_axis == 'y' && OSC.state.sel_sig_name) {
          var prev_delta_y = Math.abs(OSC.touch.prev[0].clientY - OSC.touch.prev[1].clientY);
          var curr_delta_y = Math.abs(OSC.touch.curr[0].clientY - OSC.touch.curr[1].clientY);

          if(OSC.state.fine || Math.abs(curr_delta_y - prev_delta_y) > $(this).height() * 0.9 / OSC.voltage_steps.length) {
            var new_scale = OSC.changeYZoom((curr_delta_y < prev_delta_y ? '+' : '-'), OSC.touch.new_scale_y, true);

            if(new_scale !== null) {
              OSC.touch.new_scale_y = new_scale;
              $('#info_box').html('Vertical scale ' + OSC.convertVoltage(new_scale) + '/div');
            }

            OSC.touch.prev = OSC.touch.curr;
          }
        }
      }
      else if(OSC.touch.prev === undefined) {
        OSC.touch.prev = OSC.touch.curr;
      }
    }
    // Single touch is used for changing offset
    else if(OSC.state.simulated_drag) {

      // Find offset axis
      if(! OSC.touch.offset_axis) {
        var delta_x = Math.abs(OSC.touch.start[0].clientX - ev.originalEvent.touches[0].clientX);
        var delta_y = Math.abs(OSC.touch.start[0].clientY - ev.originalEvent.touches[0].clientY);

        if(delta_x > 5 || delta_y > 5) {
          if(delta_x > delta_y) {
            OSC.touch.offset_axis = 'x';
          }
          else if(delta_y > delta_x) {
            OSC.touch.offset_axis = 'y';
          }
        }
      }

      if(OSC.touch.prev) {

        // Time offset
        if(OSC.touch.offset_axis == 'x') {
          var delta_x = ev.originalEvent.touches[0].clientX - OSC.touch.prev[0].clientX;

          if(delta_x != 0) {
            //$('#time_offset_arrow').simulate('drag', { dx: delta_x, dy: 0 });
  			$('#time_offset_arrow').simulate('drag',{ dx: delta_x, dy: 0 });
          }
        }
        // Voltage offset
        else if(OSC.touch.offset_axis == 'y' && OSC.state.sel_sig_name) {
          var delta_y = ev.originalEvent.touches[0].clientY - OSC.touch.prev[0].clientY;

          if(delta_y != 0) {
            $('#' + OSC.state.sel_sig_name + '_offset_arrow').simulate('drag', { dx: 0, dy: delta_y });
          }
        }

      }

      OSC.touch.prev = [
        { clientX: ev.originalEvent.touches[0].clientX, clientY: ev.originalEvent.touches[0].clientY }
      ];
    }
  });

  $(document).on('touchend', '.plot', function(ev) {
    ev.preventDefault();

    if(OSC.state.simulated_drag) {
      OSC.state.simulated_drag = false;

      if(OSC.touch.offset_axis == 'x') {
        //$('#time_offset_arrow').simulate('drag', { dx: 0, dy: 0 });
        $('#buf_time_offset').simulate('drag', { dx: 0, dy: 0 });
      }
      else if(OSC.touch.offset_axis == 'y' && OSC.state.sel_sig_name) {
        $('#' + OSC.state.sel_sig_name + '_offset_arrow').simulate('drag', { dx: 0, dy: 0 });
      }

      delete OSC.touch.start;
      delete OSC.touch.prev;
    }
    else {
      // Send new scale
      if(OSC.touch.new_scale_y !== undefined) {
        OSC.params.local['OSC_' + OSC.state.sel_sig_name.toUpperCase() + '_SCALE'] = { value: OSC.touch.new_scale_y };
        OSC.sendParams();
      }
      else if(OSC.touch.new_scale_x !== undefined) {
        OSC.params.local['OSC_TIME_SCALE'] = { value: OSC.touch.new_scale_x };
        OSC.sendParams();
      }
    }

    // Reset touch information
    OSC.touch = {};
    $('#info_box').empty();
  });

  // Prevent native touch activity like scrolling
/*
  $('html, body').on('touchstart touchmove', function(ev) {
    ev.preventDefault();
  });
  */

  // Preload images which are not visible at the beginning
  $.preloadImages = function() {
    for(var i = 0; i < arguments.length; i++) {
      $('<img />').attr('src', 'img/' + arguments[i]);
    }
  }
  $.preloadImages(
    'edge1_active.png',
    'edge2_active.png',
    'node_up.png',
    'node_left.png',
    'node_right.png',
    'node_down.png',
    'fine_active.png',
    'trig-edge-up.png',
    'trig-edge-down.png'
  );
  OSC.drawGraphGrid();
  // Bind to the window resize event to redraw the graph; trigger that event to do the first drawing
  $(window).resize(function() {

    // Redraw the grid (it is important to do this before resizing graph holders)
    //$('#global_container').css('width',  ($(window).height() - 135)*($(window).width()/$(window).height()));
    //$('#global_container').css('height',  $(window).height() - 135);


    var window_width = window.innerWidth;
    var window_height = window.innerHeight;
    if (window_width > 768 && window_height > 580)
    {
		var global_width = window_width - 30, global_height = global_width/ 1.77885 ;
		if(window_height < global_height)
		{
			global_height = window_height - 70* 1.77885;
			global_width = global_height * 1.77885;
		}
	 /*   if(((window_width*0.95)/1.7788) > window_height)
	    {
	    	global_height = window_height * 0.95;
	    	global_width = global_height * 1.7788;
	    } else
	    {
	    	global_width = window_width * 0.95;
	    	global_height = global_width / 1.7788;
	    }*/
	    $('#global_container').css('width',  global_width);
	    $('#global_container').css('height', global_height);


	    OSC.drawGraphGrid();
	    var main_width = $('#main').outerWidth(true);
	    var main_height = $('#main').outerHeight(true);
	    $('#global_container').css('width',  main_width);
	    $('#global_container').css('height', main_height);

	    OSC.drawGraphGrid();
	    main_width = $('#main').outerWidth(true);
	    main_height = $('#main').outerHeight(true);
	    window_width = window.innerWidth;
	    window_height = window.innerHeight;
	    console.log("window_width = " + window_width);
	    console.log("window_height = " + window_height);
	    if(main_height > (window_height - 80))
		{
			/*
			global_height = window_height - 80;
			global_width = global_height * 1.77885;
			*/
			$('#global_container').css('height', window_height - 80);
			$('#global_container').css('width', 1.82 *(window_height - 80));
			OSC.drawGraphGrid();
			$('#global_container').css('width', $('#main').outerWidth(true)-2);
			$('#global_container').css('height', $('#main').outerHeight(true)-2);
			OSC.drawGraphGrid();
		}

	    //$('#global_container').css('width',  global_width);
	    //$('#global_container').css('height', global_height);
    }

    $('#global_container').offset({ left:  (window_width - $('#global_container').width()) / 2});

    // Resize the graph holders
    $('.plot').css($('#graph_grid').css(['height','width']));

    // Hide all graphs, they will be shown next time signal data is received
    $('#graphs .plot').hide();

    // Hide offset arrows, trigger level line and arrow
    $('.y-offset-arrow, #time_offset_arrow, #buf_time_offset, #trig_level_arrow, #trigger_level').hide();

	if (OSC.ws) {
            OSC.params.local['in_command'] = { value: 'send_all_params' };
            OSC.ws.send(JSON.stringify({ parameters: OSC.params.local }));
            OSC.params.local = {};
    }

    // Reset left position for trigger level arrow, it is added by jQ UI draggable
    $('#trig_level_arrow').css('left', '');
	//$('#graphs').height($('#graph_grid').height() - 5);
    // Set the resized flag
    OSC.state.resized = true;

  }).resize();

  // Stop the application when page is unloaded
  window.onbeforeunload = function() {
    $.ajax({
      url: OSC.config.stop_app_url,
      async: false
    });
  };

  // Everything prepared, start application
  OSC.startApp();

	OSC.calib_texts =  	['Calibration of fast analog inputs and outputs is started. To proceed with calibration press CONTINUE. For factory calibration settings press DEFAULT.',
						'To calibrate inputs DC offset, <b>shortcut</b> IN1 and IN2 and press CALIBRATE.',
						'DC offset calibration is done. For finishing DC offset calibration press DONE. To continue with gains calibration press CONTINUE.',
						'To calibrate inputs low gains set the jumpers to LV settings and connect IN1 and IN2 to the reference voltage source. Notice: <p>Max.</p> reference voltage on LV ' + 'jumper settings is <b>1 V</b> ! To continue, input reference voltage value and press CALIBRATE.',
						'LOW gains calibration is done. To finish press DONE to continue with high gain calibration press CONTINUE.',
						'To calibrate inputs high gains set the jumpers to HV settings and connect IN1 and IN2 to the reference voltage source. Notice: <p>Max.</p> reference voltage ' +
						'on HV jumper settings is <b>20 V</b> ! To continue, input reference voltage value and press CALIBRATE.',
						'High gains calibration is done. To finish press DONE, to continue with outputs calibration connect OUT1 to IN1 OUT2 to IN2 and set the jumpers to LV settings and press CONTINUE.',
						'Calibration of outputs is done. For finishing press DONE',
						'Something went wrong, try again!'];

	OSC.calib_buttons = [['CANCEL', 'DEFAULT',	'CONTINUE'],
						 ['CANCEL', null, 		'CALIBRATE'],
						 [null,		'DONE', 	'CONTINUE'],
						 ['CANCEL', 'input', 	'CALIBRATE'],
						 ['CANCEL', 'DONE', 	'CONTINUE'],
						 ['CANCEL', 'input', 	'CALIBRATE'],
						 ['CANCEL', 'DONE', 	'CALIBRATE'],
						 ['CANCEL', 'DONE', 	null],
						 ['EXIT', 	null, 		null]];

	OSC.calib_params =	['CALIB_RESET', 'CALIB_FE_OFF', null, 'CALIB_FE_SCALE_LV', null, 'CALIB_FE_SCALE_HV', 'CALIB_BE', null, null];

	OSC.setCalibState = function(state) {
		var i = 0;
		var with_input = false;
		$('.calib-button').each(function() {
			if (OSC.calib_buttons[state][i] && OSC.calib_buttons[state][i] != 'input') { // button
				$(this).children().html(OSC.calib_buttons[state][i]);
				$(this).show();
			}
			else if (OSC.calib_buttons[state][i] && OSC.calib_buttons[state][i] == 'input') { // input
				$('#calib-input').show();
				$('#calib-input-text').show();
				$(this).hide();
				with_input = true;
			} else if (OSC.calib_buttons[state][i] == null) { // null
				$(this).hide();
			}
			++i;
		});

		if (!with_input) {
			$('#calib-input').hide();
			$('#calib-input-text').hide();
		}

		// text
		if (OSC.calib_texts[state])
			$('#calib-text').html(OSC.calib_texts[state]);

		if (state > 3) {
			$('#calib-input').attr('max', '19');
			$('#calib-input').attr('min', '9');
			$('#calib-input').val(9);
		} else {
			$('#calib-input').attr('max', '0.9');
			$('#calib-input').attr('min', '0.1');
		}
	}

	$('#calib-1').click(function() {
		if (OSC.params.orig['is_demo'] && OSC.params.orig['is_demo'].value == false) {
			$('#calib-2').children().removeAttr('disabled');
			$('#calib-3').children().removeAttr('disabled');
		}
		if (OSC.state.calib == 0) {
			return;
		}

		OSC.state.calib = 0;
		OSC.setCalibState(OSC.state.calib);

		var local = {};
		local['CALIB_CANCEL'] = {value: 1};
		OSC.ws.send(JSON.stringify({ parameters: local }));
		location.reload();
	});

	$('#calib-2').click(function() {
		if (OSC.params.orig['is_demo'] && OSC.params.orig['is_demo'].value)
			return;

		if (OSC.state.calib == 0 && OSC.calib_params[OSC.state.calib]) {
			var local = {};
			local[OSC.calib_params[OSC.state.calib]] = {value: 1};
			OSC.ws.send(JSON.stringify({ parameters: local }));
		}

		OSC.state.calib = 0;
		OSC.setCalibState(OSC.state.calib);

		$('#myModal').modal('hide');
		location.reload();
	});

	$('#calib-3').click(function() {
		if (OSC.params.orig['is_demo'] && OSC.params.orig['is_demo'].value)
			return;

		if (OSC.calib_params[OSC.state.calib]) {
			var local = {};
			local[OSC.calib_params[OSC.state.calib]] = {value: 1};
			if ($('#calib-input'))
				local['CALIB_VALUE'] = {value: $('#calib-input').val()};
			OSC.ws.send(JSON.stringify({ parameters: local }));
		}

		if ($('#calib-3').children().html() != 'CALIBRATE') {
			++OSC.state.calib;
			OSC.setCalibState(OSC.state.calib);
		} else {
			$('#calib-2').children().attr('disabled', 'true');
			$('#calib-3').children().attr('disabled', 'true');
		}
	});

	$('#calib-4').click(function() {
		$('#modal-warning').hide();
	});
	$('#calib-5').click(function() {
		var local = {};
		local['CALIB_WRITE'] = {value: true};
		OSC.ws.send(JSON.stringify({ parameters: local }));
		$('#modal-warning').hide();
		++OSC.state.calib;
		OSC.setCalibState(OSC.state.calib);
	});

});
