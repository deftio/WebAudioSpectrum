// This script is used to create a simple audio spectrum visualizer using the Web Audio API.
// It creates a canvas element and draws the audio spectrum data on it in real-time.
// The script also includes a button to start and stop the audio sampling and toggle the frequency scale.

document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('toggle');
    const scaleBtn = document.getElementById('toggleScale');
    const windowBtn = document.getElementById('toggleWindow');
    const oscilloscopeBtn = document.getElementById('toggleOscilloscope');
    const oscilloscopeScaleBtn = document.getElementById('toggleOscilloscopeScale');
    const canvas = document.getElementById('spectrumCanvas');
    const ctx = canvas.getContext('2d');
    const spectrogramCanvas = document.getElementById('spectrogramCanvas');
    const spectrogramCtx = spectrogramCanvas.getContext('2d');
    const oscilloscopeCanvas = document.getElementById('oscilloscopeCanvas');
    const oscilloscopeCtx = oscilloscopeCanvas.getContext('2d');
    const oscilloscopeContainer = document.getElementById('oscilloscopeContainer');
    const oscilloscopeLabel = document.getElementById('oscilloscopeLabel');
    const spectrumLabel = document.getElementById('spectrumLabel');
    const spectrogramLabel = document.getElementById('spectrogramLabel');
	const smoothBtn = document.getElementById('toggleSmooth');
    
    function resizeCanvases() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        spectrogramCanvas.width = spectrogramCanvas.offsetWidth;
        spectrogramCanvas.height = spectrogramCanvas.offsetHeight;
        oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth;
        oscilloscopeCanvas.height = oscilloscopeCanvas.offsetHeight;
    }
    
    resizeCanvases();

    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let timeDataArray = null;
    let bufferLength = null;
    let spectrogramData = [];
    let isLogScale = false; // Initialize as linear scale
	let useHammingWindow = false;
    let showOscilloscope = false;
    let oscilloscopeScaleMode = 'linear'; // 'linear', 'log', 'compand'
	let useSmoothing = false;
    const maxFrames = 100; // Number of frames to store in the spectrogram
    const OSCILLOSCOPE_SAMPLES = 4096; // Double the FFT size for longer time window
	let hammingTimeWeights = null; // Precomputed, gain-compensated Hamming window for time-domain samples
	let fftWorkRe = null;
	let fftWorkIm = null;
	const CUSTOM_SMOOTH_ALPHA = 0.8; // For custom FFT path smoothing
	let customSmoothPrev = null; // Uint8Array for EMA smoothing on custom path
    scaleBtn.addEventListener('click', function () {
        isLogScale = !isLogScale; // Toggle between Log and Linear scale
        console.log("Frequency scale toggled. Log scale is now " + (isLogScale ? "ON" : "OFF"));
        scaleBtn.textContent = isLogScale ? "Scale: Log" : "Scale: Linear";
        scaleBtn.classList.toggle('active', isLogScale);
        
        // Update labels
        const scaleText = isLogScale ? "Log" : "Linear";
        spectrumLabel.textContent = `Frequency Spectrum - ${scaleText}`;
        spectrogramLabel.textContent = `Spectrogram (Time-Frequency) - ${scaleText}`;
    });

    windowBtn.addEventListener('click', function () {
        useHammingWindow = !useHammingWindow;
        windowBtn.textContent = useHammingWindow ? "Window: Hamming" : "Window: Rectangular";
        windowBtn.classList.toggle('active', useHammingWindow);
    });

	smoothBtn.addEventListener('click', function () {
		useSmoothing = !useSmoothing;
		smoothBtn.textContent = useSmoothing ? 'Smooth: On' : 'Smooth: Off';
		smoothBtn.classList.toggle('active', useSmoothing);
	});

    oscilloscopeBtn.addEventListener('click', function () {
        showOscilloscope = !showOscilloscope;
        oscilloscopeBtn.textContent = showOscilloscope ? "Hide Oscilloscope" : "Show Oscilloscope";
        oscilloscopeBtn.classList.toggle('active', showOscilloscope);
        oscilloscopeContainer.classList.toggle('show', showOscilloscope);
        oscilloscopeScaleBtn.style.display = showOscilloscope ? 'inline-block' : 'none';
        if (showOscilloscope) {
            // Resize the oscilloscope canvas when it becomes visible
            setTimeout(() => {
                oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth;
                oscilloscopeCanvas.height = oscilloscopeCanvas.offsetHeight;
            }, 10);
        }
    });
    
    oscilloscopeScaleBtn.addEventListener('click', function () {
        if (oscilloscopeScaleMode === 'linear') {
            oscilloscopeScaleMode = 'log';
            oscilloscopeScaleBtn.textContent = 'Scope: Log';
        } else if (oscilloscopeScaleMode === 'log') {
            oscilloscopeScaleMode = 'compand';
            oscilloscopeScaleBtn.textContent = 'Scope: Compand';
        } else {
            oscilloscopeScaleMode = 'linear';
            oscilloscopeScaleBtn.textContent = 'Scope: Linear';
        }
        oscilloscopeScaleBtn.classList.toggle('active', oscilloscopeScaleMode !== 'linear');
        
        // Update oscilloscope label
        const modeText = oscilloscopeScaleMode.charAt(0).toUpperCase() + oscilloscopeScaleMode.slice(1);
        oscilloscopeLabel.textContent = `Oscilloscope (Time Domain) - ${modeText}`;
    });

    btn.addEventListener('click', function () {
        // Check if the AudioContext has been initialized
        if (!audioContext) {
            // Initialize AudioContext and other related setups
            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.85; // keep buttery-smooth when using built-in spectrum
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            timeDataArray = new Uint8Array(OSCILLOSCOPE_SAMPLES);

			// Precompute Hamming window for time-domain samples with coherent gain compensation (mean=1)
			precomputeHammingTimeWindow(analyser.fftSize);
			fftWorkRe = new Float32Array(analyser.fftSize);
			fftWorkIm = new Float32Array(analyser.fftSize);

            // Request access to the microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                btn.textContent = 'Stop Sampling';
                btn.classList.add('stop');
                updateSpectrum(); // Start the visualization
            }).catch(function (err) {
                console.error('Error accessing media devices:', err);
            });
        } else {
            // Toggle the state based on current state of the AudioContext
            if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                    btn.textContent = 'Start Sampling';
                    btn.classList.remove('stop');
                    console.log("AudioContext suspended");
                });
            } else if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    btn.textContent = 'Stop Sampling';
                    btn.classList.add('stop');
                    console.log("AudioContext resumed");
                    updateSpectrum(); // Ensure that the visual update loop continues
                });
            }
        }
    });

	function applyScaling(bufferLength, width, sampleRate, mode) {
        const xs = new Array(bufferLength);
        const ws = new Array(bufferLength);
        if (mode === 'log') {
            const nyquist = sampleRate / 2;
            const fMin = nyquist / bufferLength; // avoid 0 Hz
            const logMin = Math.log10(fMin);
            const logMax = Math.log10(nyquist);
            for (let i = 0; i < bufferLength; i++) {
                const fLo = Math.max(i, 1) * nyquist / bufferLength;
                const fHi = Math.max(i + 1, 1) * nyquist / bufferLength;
                const xLo = (Math.log10(fLo) - logMin) / (logMax - logMin) * width;
                const xHi = (Math.log10(fHi) - logMin) / (logMax - logMin) * width;
                xs[i] = xLo;
                ws[i] = Math.max(1, xHi - xLo);
            }
        } else {
            const step = width / bufferLength;
            for (let i = 0; i < bufferLength; i++) {
                xs[i] = i * step;
                ws[i] = step;
            }
        }
        return { xs, ws };
    }

	function smoothArray(input, windowSize) {
		const n = input.length;
		const output = new Float32Array(n);
		const half = Math.floor(windowSize / 2);
		for (let i = 0; i < n; i++) {
			let sum = 0;
			let count = 0;
			const start = Math.max(0, i - half);
			const end = Math.min(n - 1, i + half);
			for (let j = start; j <= end; j++) {
				sum += input[j];
				count++;
			}
			output[i] = count > 0 ? (sum / count) : input[i];
		}
		return output;
	}

	function precomputeHammingTimeWindow(size) {
		const w = new Float32Array(size);
		let sum = 0;
		for (let n = 0; n < size; n++) {
			const wn = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (size - 1));
			w[n] = wn;
			sum += wn;
		}
		// Coherent gain compensation: normalize by mean value of window
		const mean = sum / size;
		const gain = mean > 0 ? (1 / mean) : 1;
		for (let n = 0; n < size; n++) {
			w[n] *= gain;
		}
		hammingTimeWeights = w;
	}

	function bitReverseIndex(index, bits) {
		let reversed = 0;
		for (let i = 0; i < bits; i++) {
			reversed = (reversed << 1) | (index & 1);
			index >>= 1;
		}
		return reversed;
	}

	function fftRadix2InPlace(real, imag) {
		const n = real.length;
		const levels = Math.floor(Math.log2(n));
		// Bit-reversal permutation
		for (let i = 0; i < n; i++) {
			const j = bitReverseIndex(i, levels);
			if (j > i) {
				const tr = real[i]; real[i] = real[j]; real[j] = tr;
				const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
			}
		}
		// Cooley–Tukey
		for (let size = 2; size <= n; size <<= 1) {
			const halfSize = size >> 1;
			const tableStep = (2 * Math.PI) / size;
			for (let i = 0; i < n; i += size) {
				for (let j = 0; j < halfSize; j++) {
					const angle = j * tableStep;
					const wr = Math.cos(angle);
					const wi = -Math.sin(angle);
					const k = i + j;
					const l = k + halfSize;
					const tr = wr * real[l] - wi * imag[l];
					const ti = wr * imag[l] + wi * real[l];
					real[l] = real[k] - tr;
					imag[l] = imag[k] - ti;
					real[k] = real[k] + tr;
					imag[k] = imag[k] + ti;
				}
			}
		}
	}

	function computeSpectrumBytes(useWindow) {
		const n = analyser.fftSize;
		if (!fftWorkRe || fftWorkRe.length !== n) {
			fftWorkRe = new Float32Array(n);
			fftWorkIm = new Float32Array(n);
		}
		// Grab float time-domain data in [-1,1]
		const time = new Float32Array(n);
		analyser.getFloatTimeDomainData(time);
		// Apply window if requested
		if (useWindow && hammingTimeWeights && hammingTimeWeights.length === n) {
			for (let i = 0; i < n; i++) fftWorkRe[i] = time[i] * hammingTimeWeights[i];
		} else {
			for (let i = 0; i < n; i++) fftWorkRe[i] = time[i];
		}
		for (let i = 0; i < n; i++) fftWorkIm[i] = 0;
		// Run FFT
		fftRadix2InPlace(fftWorkRe, fftWorkIm);
		// Compute magnitudes for first N/2 bins
		const half = n >> 1;
		const mags = new Float32Array(half);
		for (let k = 0; k < half; k++) {
			const re = fftWorkRe[k];
			const im = fftWorkIm[k];
			const mag = Math.hypot(re, im);
			mags[k] = mag;
		}
		// Convert to dBFS-like scale using N/2 normalization so 1.0 sine ≈ 0 dB
		const out = new Uint8Array(half);
		const ref = n / 2;
		const minDb = -90;
		for (let k = 0; k < half; k++) {
			const magNorm = mags[k] / ref;
			let db = 20 * Math.log10(magNorm + 1e-12);
			if (db < minDb) db = minDb;
			if (db > 0) db = 0;
			const lin = (db - minDb) / (0 - minDb);
			let v = Math.round(lin * 255);
			if (v < 0) v = 0; else if (v > 255) v = 255;
			out[k] = v;
		}
		// Apply simple EMA smoothing to stabilize display
		if (!customSmoothPrev || customSmoothPrev.length !== half) {
			customSmoothPrev = new Uint8Array(half);
		}
		for (let k = 0; k < half; k++) {
			customSmoothPrev[k] = Math.round(CUSTOM_SMOOTH_ALPHA * customSmoothPrev[k] + (1 - CUSTOM_SMOOTH_ALPHA) * out[k]);
			out[k] = customSmoothPrev[k];
		}
		return out;
	}

	function frequencyToX(f, width, sampleRate, mode) {
		const nyquist = sampleRate / 2;
		if (mode === 'log') {
			const fMin = nyquist / bufferLength;
			const clamped = Math.max(fMin, Math.min(f, nyquist));
			const logMin = Math.log10(fMin);
			const logMax = Math.log10(nyquist);
			return (Math.log10(clamped) - logMin) / (logMax - logMin) * width;
		}
		return Math.max(0, Math.min(width, (f / nyquist) * width));
	}

	function formatHz(f) {
		if (f >= 1000) {
			const k = f / 1000;
			return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + 'k';
		}
		return String(Math.round(f));
	}

	function chooseLinearStep(nyquist, width) {
		// Aim ~80-120 px between ticks
		const targetPx = 90;
		const hzPerPx = nyquist / width;
		const targetHz = hzPerPx * targetPx;
		const pow10 = Math.pow(10, Math.floor(Math.log10(targetHz)));
		const candidates = [1, 2, 5].map(m => m * pow10);
		let best = candidates[0];
		let bestDiff = Math.abs(candidates[0] - targetHz);
		for (let i = 1; i < candidates.length; i++) {
			const d = Math.abs(candidates[i] - targetHz);
			if (d < bestDiff) { best = candidates[i]; bestDiff = d; }
		}
		return best;
	}

	function drawFrequencyAxis(context, width, height, sampleRate, bufferLength, mode, phase) {
		const nyquist = sampleRate / 2;
		context.save();
		context.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
		context.textAlign = 'center';
		context.textBaseline = 'bottom';
		const gridColor = 'rgba(255,255,255,0.08)';
		const tickColor = 'rgba(255,255,255,0.25)';
		const labelColor = 'rgba(255,255,255,0.7)';

		let freqs = [];
		let minor = [];
		if (mode === 'log') {
			// Major decades and 2/5 multiples
			const majors = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
			for (let i = 0; i < majors.length; i++) {
				const f = majors[i];
				if (f <= nyquist) freqs.push(f);
			}
			// Minor ticks: within each decade: 2x, 3x, 5x
			const decades = [10, 100, 1000, 10000];
			for (let d = 0; d < decades.length; d++) {
				const base = decades[d];
				[2, 3, 5].forEach(m => {
					const f = base * m;
					if (f <= nyquist) minor.push(f);
				});
			}
		} else {
			const step = chooseLinearStep(nyquist, width);
			for (let f = step; f <= nyquist; f += step) freqs.push(f);
		}

		// Grid lines
		if (phase === 'grid') {
			context.strokeStyle = gridColor;
			context.lineWidth = 1;
			context.beginPath();
			for (let i = 0; i < freqs.length; i++) {
				const x = Math.round(frequencyToX(freqs[i], width, sampleRate, mode)) + 0.5;
				context.moveTo(x, 0);
				context.lineTo(x, height);
			}
			// Minor grid for log only
			if (mode === 'log') {
				for (let i = 0; i < minor.length; i++) {
					const x = Math.round(frequencyToX(minor[i], width, sampleRate, mode)) + 0.5;
					context.moveTo(x, 0);
					context.lineTo(x, height);
				}
			}
			context.stroke();
		}

		// Ticks and labels (draw on top)
		if (phase === 'labels') {
			// Ticks
			context.strokeStyle = tickColor;
			context.lineWidth = 1;
			for (let i = 0; i < freqs.length; i++) {
				const x = Math.round(frequencyToX(freqs[i], width, sampleRate, mode)) + 0.5;
				context.beginPath();
				context.moveTo(x, height);
				context.lineTo(x, height - 6);
				context.stroke();
			}
			// Labels
			context.fillStyle = labelColor;
			for (let i = 0; i < freqs.length; i++) {
				const x = Math.round(frequencyToX(freqs[i], width, sampleRate, mode));
				context.fillText(formatHz(freqs[i]), x, height - 7);
			}
		}

		context.restore();
	}

function drawYAxis(context, width, height, type, phase = 'both', options = {}) {
    // type: 'amplitude' for spectrum, 'time' for spectrogram
		context.save();
		context.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
		context.textAlign = 'right';
		context.textBaseline = 'middle';
		const gridColor = 'rgba(255,255,255,0.08)';
		const tickColor = 'rgba(255,255,255,0.25)';
		const labelColor = 'rgba(255,255,255,0.7)';

    if (type === 'amplitude') {
			// 0..255 maps bottom..top visually; place ticks at 0, 64, 128, 192, 255
			const ticks = [0, 64, 128, 192, 255];
        if (phase === 'grid' || phase === 'both') {
            context.strokeStyle = gridColor;
            context.lineWidth = 1;
            context.beginPath();
            for (let i = 0; i < ticks.length; i++) {
                const y = Math.round(height - (ticks[i] / 255) * height) + 0.5;
                context.moveTo(0, y);
                context.lineTo(width, y);
            }
            context.stroke();

            // Axis
            context.strokeStyle = tickColor;
            context.beginPath();
            context.moveTo(0.5, 0);
            context.lineTo(0.5, height);
            context.stroke();
        }

        if (phase === 'labels' || phase === 'both') {
            // Labels
            context.fillStyle = labelColor;
            for (let i = 0; i < ticks.length; i++) {
                const y = height - (ticks[i] / 255) * height;
                context.fillText(String(ticks[i]), 28, y);
            }
        }
		} else if (type === 'time') {
        // Show time from top(old) to bottom(new). Use seconds if provided
        const rows = 5;
        const totalSpanSec = options.totalSpanSec;
        if (phase === 'grid' || phase === 'both') {
            context.strokeStyle = gridColor;
            context.lineWidth = 1;
            context.beginPath();
            for (let i = 0; i <= rows; i++) {
                const y = Math.round((i / rows) * height) + 0.5;
                context.moveTo(0, y);
                context.lineTo(width, y);
            }
            context.stroke();

            // Axis
            context.strokeStyle = tickColor;
            context.beginPath();
            context.moveTo(0.5, 0);
            context.lineTo(0.5, height);
            context.stroke();
        }

        if (phase === 'labels' || phase === 'both') {
            context.fillStyle = labelColor;
            for (let i = 0; i <= rows; i++) {
                const y = (i / rows) * height;
                let label;
                if (typeof totalSpanSec === 'number') {
                    const t = (1 - i / rows) * totalSpanSec;
                    label = t >= 1 ? (Math.round(t * 10) / 10) + 's' : Math.round(t * 1000) + 'ms';
                } else {
                    const rel = Math.round((1 - i / rows) * 100);
                    label = rel + '%';
                }
                context.fillText(label, 28, y);
            }
        }
		}

		context.restore();
	}

	function drawSpectrum() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
		let processedData;
		if (useHammingWindow) {
			// Build spectrum from time-domain with proper windowing and custom smoothing
			processedData = computeSpectrumBytes(true);
		} else {
			// Use analyzer's built-in smoothing path for buttery visuals
			analyser.getByteFrequencyData(dataArray);
			processedData = dataArray;
		}
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
		// Draw grid underlay and Y axis
		drawFrequencyAxis(ctx, WIDTH, HEIGHT, audioContext.sampleRate, bufferLength, isLogScale ? 'log' : 'linear', 'grid');
		drawYAxis(ctx, WIDTH, HEIGHT, 'amplitude');

		const { xs, ws } = applyScaling(bufferLength, WIDTH, audioContext.sampleRate, isLogScale ? 'log' : 'linear');

		// Prepare values array and optionally apply a simple moving average smoothing
		let values = new Float32Array(bufferLength);
		for (let i = 0; i < bufferLength; i++) {
			let v = processedData[i];
			values[i] = v;
		}
		if (useSmoothing) {
			const windowSize = isLogScale ? 5 : 3;
			values = smoothArray(values, windowSize);
		}

		if (useSmoothing) {
			// Draw filled area under the smoothed curve
			ctx.fillStyle = 'rgba(0, 200, 255, 0.25)';
			ctx.beginPath();
			ctx.moveTo(xs[0], HEIGHT);
			for (let i = 0; i < bufferLength; i++) {
				ctx.lineTo(xs[i], HEIGHT - values[i]);
			}
			ctx.lineTo(xs[bufferLength - 1], HEIGHT);
			ctx.closePath();
			ctx.fill();
			// Outline
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'rgb(0, 200, 255)';
			ctx.beginPath();
			ctx.moveTo(xs[0], HEIGHT - values[0]);
			for (let i = 1; i < bufferLength; i++) {
				ctx.lineTo(xs[i], HEIGHT - values[i]);
			}
			ctx.stroke();
		} else {
			// Default: draw bars
			for (let i = 0; i < bufferLength; i++) {
				const barHeight = values[i];
				ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
				ctx.fillRect(xs[i], HEIGHT - barHeight, ws[i], barHeight);
			}
		}
		// Draw ticks and labels on top
		drawFrequencyAxis(ctx, WIDTH, HEIGHT, audioContext.sampleRate, bufferLength, isLogScale ? 'log' : 'linear', 'labels');
		drawSpectrogram(processedData);
    }
    

    function drawSpectrogram(processedData) {
        // Push a copy of processed data to maintain original data integrity
        spectrogramData.push(new Uint8Array(processedData));
        if (spectrogramData.length > maxFrames) {
            spectrogramData.shift(); // Maintain a fixed number of frames
        }

        const W = spectrogramCanvas.width;
        const H = spectrogramCanvas.height;
        const rowHeight = H / maxFrames; // Fixed height for each frame

        // Clear the spectrogram canvas before redrawing it
        spectrogramCtx.fillStyle = 'rgb(0, 0, 0)';
        spectrogramCtx.fillRect(0, 0, W, H);

    const { xs, ws } = applyScaling(bufferLength, W, audioContext.sampleRate, isLogScale ? 'log' : 'linear');
    // Underlay grid and Y-axis (time) and X-axis grid for spectrogram
    drawFrequencyAxis(spectrogramCtx, W, H, audioContext.sampleRate, bufferLength, isLogScale ? 'log' : 'linear', 'grid');
    // Estimate total visible time span for y labels: maxFrames frames, each roughly fftSize/sampleRate seconds
    const secondsPerFrame = analyser.fftSize / audioContext.sampleRate;
    const totalSpanSec = maxFrames * secondsPerFrame;
    drawYAxis(spectrogramCtx, W, H, 'time', 'grid', { totalSpanSec });
    // Draw each frame stored in the spectrogram data
		spectrogramData.forEach((frameData, index) => {
            const y = H - (index + 1) * rowHeight;
            for (let bin = 0; bin < bufferLength; bin++) {
				let value = frameData[bin];
                const brightness = value / 256;
                spectrogramCtx.fillStyle = `rgb(0, ${brightness * 255}, ${brightness * 255})`;
                // Calculate the correct y position for each frame
                spectrogramCtx.fillRect(xs[bin], y, ws[bin], rowHeight);
            }
        });
    // Top overlay ticks and labels for frequency axis and y-axis labels
    drawFrequencyAxis(spectrogramCtx, W, H, audioContext.sampleRate, bufferLength, isLogScale ? 'log' : 'linear', 'labels');
    drawYAxis(spectrogramCtx, W, H, 'time', 'labels', { totalSpanSec });
    }
    

    function drawOscilloscope() {
        if (!showOscilloscope || !audioContext) return;
        
        // Get time domain data - use only the first 2048 samples from analyser
        const tempData = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(tempData);
        
        // Copy to our larger array, filling the rest with center value (128)
        for (let i = 0; i < OSCILLOSCOPE_SAMPLES; i++) {
            if (i < analyser.fftSize) {
                timeDataArray[i] = tempData[i];
            } else {
                timeDataArray[i] = 128; // Center line
            }
        }
        
        const WIDTH = oscilloscopeCanvas.width;
        const HEIGHT = oscilloscopeCanvas.height;
        
        // Clear the canvas
        oscilloscopeCtx.fillStyle = 'rgb(0, 0, 0)';
        oscilloscopeCtx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Set up the line style
        oscilloscopeCtx.lineWidth = 2;
        oscilloscopeCtx.strokeStyle = 'rgb(0, 255, 0)';
        oscilloscopeCtx.beginPath();
        
        // Calculate the width of each sample - show only half the samples for longer time window
        const samplesToShow = analyser.fftSize; // Show the original FFT size worth of samples
        const sliceWidth = WIDTH / samplesToShow;
        let x = 0;
        
        // Draw the waveform
        for (let i = 0; i < samplesToShow; i++) {
            let v = timeDataArray[i] / 128.0; // Convert to 0-2 range
            
            // Apply scaling based on mode
            if (oscilloscopeScaleMode === 'log') {
                // Log scale: amplify small signals
                const normalized = Math.abs(v - 1); // 0 to 1 range
                const scaled = normalized > 0 ? Math.log10(normalized * 9 + 1) : 0; // log10(1) to log10(10)
                v = 1 + (v > 1 ? scaled : -scaled);
            } else if (oscilloscopeScaleMode === 'compand') {
                // Companding: amplify small signals, compress large ones
                const normalized = v - 1; // -1 to 1 range
                const abs = Math.abs(normalized);
                const sign = normalized < 0 ? -1 : 1;
                // Use a sigmoid-like function for companding
                const scaled = sign * (1 - Math.exp(-3 * abs)) / (1 + Math.exp(-3 * (abs - 0.5)));
                v = 1 + scaled;
            }
            
            const y = (v - 1) * (HEIGHT / 2) + HEIGHT / 2; // Center the waveform
            
            if (i === 0) {
                oscilloscopeCtx.moveTo(x, y);
            } else {
                oscilloscopeCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        oscilloscopeCtx.stroke();
    }

    function updateSpectrum() {
        if (audioContext.state === 'running') {
            requestAnimationFrame(updateSpectrum);
            drawOscilloscope();
            drawSpectrum();
        }
    }
});


