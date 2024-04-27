// This script is used to create a simple audio spectrum visualizer using the Web Audio API.
// It creates a canvas element and draws the audio spectrum data on it in real-time.
// The script also includes a button to start and stop the audio sampling and toggle the frequency scale.

document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('toggle');
    const scaleBtn = document.getElementById('toggleScale');
    const windowBtn = document.getElementById('toggleWindow');
    const canvas = document.getElementById('spectrumCanvas');
    const ctx = canvas.getContext('2d');
    const spectrogramCanvas = document.getElementById('spectrogramCanvas');
    const spectrogramCtx = spectrogramCanvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    spectrogramCanvas.width = canvas.offsetWidth;
    spectrogramCanvas.height = canvas.offsetHeight;

    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let bufferLength = null;
    let spectrogramData = [];
    let isLogScale = false; // Initialize as linear scale
    let useHammingWindow = false;
    const maxFrames = 100; // Number of frames to store in the spectrogram
    scaleBtn.addEventListener('click', function () {
        isLogScale = !isLogScale; // Toggle between Log and Linear scale
        console.log("Frequency scale toggled. Log scale is now " + (isLogScale ? "ON" : "OFF"));
        scaleBtn.textContent = isLogScale ? "Switch to Linear Scale" : "Switch to Log Scale";
    });

    windowBtn.addEventListener('click', function () {
        useHammingWindow = !useHammingWindow;
        windowBtn.textContent = useHammingWindow ? "Switch to Rectangular Window" : "Switch to Hamming Window";
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

            // Request access to the microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                btn.textContent = 'Stop Sampling';
                updateSpectrum(); // Start the visualization
            }).catch(function (err) {
                console.error('Error accessing media devices:', err);
            });
        } else {
            // Toggle the state based on current state of the AudioContext
            if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                    btn.textContent = 'Start Sampling';
                    console.log("AudioContext suspended");
                });
            } else if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    btn.textContent = 'Stop Sampling';
                    console.log("AudioContext resumed");
                    updateSpectrum(); // Ensure that the visual update loop continues
                });
            }
        }
    });

    function applyWindowFunction(dataArray) {
        let windowedArray = new Uint8Array(dataArray.length);
        for (let i = 0; i < dataArray.length; i++) {
            windowedArray[i] = dataArray[i] * (useHammingWindow ? (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (dataArray.length - 1))) : 1);
        }
        return windowedArray;
    }

    function drawSpectrum() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        analyser.getByteFrequencyData(dataArray);
    
        let processedData = applyWindowFunction(dataArray);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
        let barWidth = WIDTH / bufferLength;
        let barHeight;
        for (let i = 0; i < bufferLength; i++) {
            barHeight = processedData[i];

            let x = isLogScale && i !== 0 ? (Math.log2(i + 1) / Math.log2(bufferLength) * WIDTH) : i * barWidth;

            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        }
        drawSpectrogram(processedData);
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
    
        // Draw each frame stored in the spectrogram data
        spectrogramData.forEach((frameData, index) => {
            for (let bin = 0; bin < bufferLength; bin++) {
                const value = frameData[bin];
                const brightness = value / 256;
                spectrogramCtx.fillStyle = `rgb(0, ${brightness * 255}, ${brightness * 255})`;
                // Calculate the correct y position for each frame
                spectrogramCtx.fillRect(bin * width, spectrogramCanvas.height - (index + 1) * height, width, height);
            }
        });
    }
    

    function updateSpectrum() {
        if (audioContext.state === 'running') {
            requestAnimationFrame(updateSpectrum);
            drawSpectrum();
        }
    }
});


