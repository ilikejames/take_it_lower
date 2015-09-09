!(function(undefined) {


	const DEBUG = false,
		CAPTURE = 'audio';

	var ilj = {};


	(function() {
		// shim the getUserMedia
		var usersMedias = ['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia', 'msGetUserMedia'];
		var method = _.find(usersMedias, function(itm) { 
			return itm in navigator;
		});
		navigator.getUserMedia = navigator[method];
	})();



	ilj.AudioController = function AudioController(capture) {

		this.callbacks = [];

		var context = new (window.AudioContext || window.webkitAudioContext)();

		if(!context) {
			throw new "Not Supported.";
			return;
		}

		var analyser = context.createAnalyser();
		analyser.fftSize = 32; // sample size
		var frequencyData = new Uint8Array(analyser.frequencyBinCount);


	    var source = capture.tagName ?  
	    		context.createMediaElementSource(capture) : 
	    		context.createMediaStreamSource(capture);
	    	
		source.connect(analyser);
	    analyser.connect(context.destination);

	    var boundUpdate = _.bind(update,  this);

	    requestAnimationFrame(boundUpdate);

		function update() {
			analyser.getByteFrequencyData(frequencyData);

			requestAnimationFrame(boundUpdate);

			_.each(this.callbacks, function(callback) {
				callback(frequencyData);
			})
		}

		this.registerNotifier = function(callback) {
			this.callbacks.push(callback);
		}

		this.unregisterNotifier = function(callback) {
			_.remove(this.callbacks, callback);
		}

	};


	ilj.VideoController = function VideoController(video, canvas) {

		var seriously = new Seriously(),
			source = seriously.source(video),
			target = seriously.target(canvas);



		var effects = {
			invert : seriously.effect('invert'), 
			tvglitch : seriously.effect('tvglitch'),
			kaleidoscope : seriously.effect('kaleidoscope'),
			hueSaturation : seriously.effect('hue-saturation'),
			invert : seriously.effect('invert')
		}

		effects.tvglitch.distortion=0;
		effects.tvglitch.verticalSync=0;
		effects.tvglitch.lineSync=0;

		effects.kaleidoscope.segments = 1;

		effects.hueSaturation.saturation = -1;
		effects.hueSaturation.hue = -1;


		// wire it up in sequence. 
		effects.invert.source = video;
		effects.hueSaturation.source = effects.invert;
		effects.tvglitch.source = effects.hueSaturation;
		effects.kaleidoscope.source = effects.tvglitch;
		target.source = effects.kaleidoscope;

		seriously.go();

		this.setEffect = function setEffect(effect, prop, val) {
			effects[effect][prop] = val;
		}
		
	};



	ilj.Logger = function Logger($el) {
		this.log = function(data) {
			var list = _.map(data, function(itm) {
				var s = "000" + itm;
				return s.substr(s.length - 3); // pad leading zeros e.g. 001
			});
			$el.text(list.join('\t'));
		}
	};



	(function(ilj, undefined) {

		var audioController;
		var logger = new ilj.Logger($('#analyser'));
		var audioElement = $('#audioPlayer')[0]

		var canvas = $('#canvas')[0];
		var video = $('#video')[0];
		var videoController = new ilj.VideoController(video, canvas);


		video.addEventListener('loadedmetadata', function() {
		  this.currentTime = 62;
		}, false);

		video.play();


		$(window).on('keypress', onKeyPress);

		function onKeyPress(e) {
			var isNumber = e.which >= 48 && e.which < 59;
			if(!isNumber) return;
			videoController.setEffect('kaleidoscope', 'segments', e.which - 48);
		}


		function onStreamSuccess(stream) {
			audioController = new ilj.AudioController(stream);
			audioController.registerNotifier(logger.log);

			audioController.registerNotifier(function(data) {
				var glitch =  data[13]/1000;
				glitch = glitch>0.04 ? glitch : 0;
				videoController.setEffect('tvglitch', 'distortion', glitch );
			});
		}

		function onStreamFail() {
			console.error('Failed to initialize a stream', arguments);
		}

		if(CAPTURE == 'audio') {
			// audo element e.g. mp3
			audioElement.addEventListener('canplay', onStreamSuccess.bind(this, audioElement));
		}
		else {
			// microphone/linein 
			navigator.getUserMedia( {audio : true},   onStreamSuccess, onStreamFail);
		}	
	

	})(ilj);


})();