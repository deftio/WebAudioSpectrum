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
    const maxFrames = 100; // Number of frames to store in the spectrogram
    const OSCILLOSCOPE_SAMPLES = 4096; // Double the FFT size for longer time window
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
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            timeDataArray = new Uint8Array(OSCILLOSCOPE_SAMPLES);

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

    function applyScaling(bufferLength, width) {
        let list = Array.from({length: bufferLength}, (item, index) => index);
        if (isLogScale) {
            // Apply logarithmic scaling - adjust this formula as needed
            x = list.map(num => Math.log(num) / Math.log(bufferLength) * width);
            x[0] = 0; // Avoid log(0) which is undefined
        } else {
            x = list.map(num => num / bufferLength * width); // Linear scale
        }
        return x;
    }

    function drawSpectrum() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        analyser.getByteFrequencyData(dataArray);
    
        let processedData = dataArray.slice(); // Create a copy of the data array
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
        let barWidth = WIDTH / bufferLength;
        let barHeight;
        let list = applyScaling(bufferLength, WIDTH);
        for (let i = 0; i < bufferLength; i++) {
            barHeight = processedData[i];
            if (useHammingWindow) {
                barHeight *= (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (bufferLength - 1))); // Apply Hamming window
            }
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            ctx.fillRect(list[i], HEIGHT - barHeight, barWidth, barHeight);
        }
        drawSpectrogram(dataArray);
    }
    

    function drawSpectrogram(processedData) {
        // Push a copy of processed data to maintain original data integrity
        spectrogramData.push(new Uint8Array(processedData));
        if (spectrogramData.length > maxFrames) {
            spectrogramData.shift(); // Maintain a fixed number of frames
        }
    
        const width = spectrogramCanvas.width / bufferLength;
        const height = spectrogramCanvas.height / maxFrames; // Fixed height for each frame
    
        // Clear the spectrogram canvas before redrawing it
        spectrogramCtx.fillStyle = 'rgb(0, 0, 0)';
        spectrogramCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
    
        list = applyScaling(bufferLength, spectrogramCanvas.width);
        // Draw each frame stored in the spectrogram data
        spectrogramData.forEach((frameData, index) => {
            for (let bin = 0; bin < bufferLength; bin++) {
                let value = frameData[bin];
                if (useHammingWindow) {
                    value *= (0.54 - 0.46 * Math.cos((2 * Math.PI * bin) / (bufferLength - 1))); // Apply Hamming window
                }
                const brightness = value / 256;
                spectrogramCtx.fillStyle = `rgb(0, ${brightness * 255}, ${brightness * 255})`;
                // Calculate the correct y position for each frame
                spectrogramCtx.fillRect(list[bin], spectrogramCanvas.height - (index + 1) * height, width, height);
            }
        });
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


