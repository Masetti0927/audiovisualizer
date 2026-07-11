import * as THREE from 'three';

export function createAudioSystem(listener, params) {
	const sound = new THREE.Audio(listener);
	const analyser = new THREE.AudioAnalyser(sound, 32);

	let builtinBuffer = null;
	let mediaStream = null;
	let currentSource = 'builtin';
	let isPlaying = false;
	let smoothedFrequency = 0;

	function loadBuiltin(callback) {
		const audioLoader = new THREE.AudioLoader();
		audioLoader.load('./assets/Beats.mp3', function(buffer) {
			builtinBuffer = buffer;
			sound.setBuffer(buffer);
			if (callback) callback();
		});
	}

	function togglePlayback() {
		if (currentSource !== 'builtin') return;
		if (isPlaying) {
			sound.pause();
		} else {
			sound.play();
		}
		isPlaying = !isPlaying;
	}

	function switchToSystem() {
		navigator.mediaDevices.getDisplayMedia({
			audio: true,
			video: true
		}).then(function(stream) {
			stream.getVideoTracks().forEach(function(track) {
				track.enabled = false;
			});
			mediaStream = stream;
			sound.stop();
			sound.disconnect();
			sound.setMediaStreamSource(stream);
			sound.context.resume();
			if (!params.systemPlaythrough) {
				sound.gain.disconnect(listener.gain);
			}
			currentSource = 'system';
			isPlaying = false;
		}).catch(function(err) {
			console.error('System audio capture failed:', err);
		});
	}

	function switchToBuiltin() {
		if (mediaStream) {
			mediaStream.getTracks().forEach(function(track) { track.stop(); });
			mediaStream = null;
		}
		sound.stop();
		sound.disconnect();
		if (builtinBuffer) {
			sound.setBuffer(builtinBuffer);
			sound.hasPlaybackControl = true;
			sound.gain.connect(listener.gain);
			sound.play();
			isPlaying = true;
		}
		currentSource = 'builtin';
	}

	function togglePlaythrough(enabled) {
		if (currentSource !== 'system') return;
		if (enabled) {
			sound.gain.connect(listener.gain);
		} else {
			sound.gain.disconnect(listener.gain);
		}
	}

	function getFrequency() {
		const rawFrequency = analyser.getAverageFrequency();
		smoothedFrequency += (rawFrequency - smoothedFrequency) * (1 - params.smoothing);
		return smoothedFrequency;
	}

	return {
		sound,
		analyser,
		loadBuiltin,
		togglePlayback,
		switchToSystem,
		switchToBuiltin,
		togglePlaythrough,
		getFrequency
	};
}
