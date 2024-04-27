// This script is used to create a simple audio spectrum visualizer using the Web Audio API.
// It creates a canvas element and draws the audio spectrum data on it in real-time.
// The script also includes a button to start and stop the audio sampling and toggle the frequency scale.

document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('toggle');
    const scaleBtn = document.getElementById('toggleScale');  // Button to toggle frequency scale
    const windowBtn = document.getElementById('toggleWindow');
    const canvas = document.getElementById('spectrumCanvas');
    const spectrogramCanvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const spectrogramCtx = spectrogramCanvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    spectrogramCanvas.width = canvas.offsetWidth;
    spectrogramCanvas.height = canvas.offsetHeight;  // You can adjust this if needed

    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let bufferLength = null;
    let spectrogramData = [];
    let isLogScale = false; // State to keep track of current scale
    let useHammingWindow = false;  // State to track which window function is in use

    const maxFrames = 100; // default m frames

    windowBtn.addEventListener('click', function () {
        useHammingWindow = !useHammingWindow; // Toggle window function
        windowBtn.textContent = useHammingWindow ? "Switch to Rectangular Window" : "Switch to Hamming Window";
    });

    // Remaining event listeners and setup as before...

    function applyWindowFunction(dataArray) {
        if (useHammingWindow) {
            for (let i = 0; i < dataArray.length; i++) {
                // Apply the Hamming window function
                dataArray[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (dataArray.length - 1));
            }
        }
    }
    scaleBtn.addEventListener('click', function () {
        isLogScale = !isLogScale; // Toggle between Log and Linear scale
        console.log("Frequency scale toggled. Log scale is now " + (isLogScale ? "ON" : "OFF"));
    });

    btn.addEventListener('click', function () {
        if (!audioContext) {
            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                btn.textContent = 'Stop Sampling';
                updateSpectrum();
            }).catch(function (err) {
                console.error('Error accessing media devices:', err);
            });
        } else {
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    btn.textContent = 'Stop Sampling';
                    updateSpectrum();
                });
            } else if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                    btn.textContent = 'Start Sampling';
                });
            }
        }
    });

    function drawSpectrum() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        analyser.getByteFrequencyData(dataArray);
    
        applyWindowFunction(dataArray);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
        let barWidth = (WIDTH / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            if (barHeight > 0) {
                console.log("Non-zero frequency data detected at index ", i, " with height ", barHeight);
            }
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    function drawSpectrogram() {
        spectrogramData.push(new Uint8Array(dataArray)); // Copy current frame data
        if (spectrogramData.length > maxFrames) {
            spectrogramData.shift(); // Remove oldest data frame if over maxFrames
        }

        const width = spectrogramCanvas.width / bufferLength;
        const height = spectrogramCanvas.height / maxFrames; // Fixed height based on maxFrames

        spectrogramCtx.fillStyle = 'rgb(0, 0, 0)'; // Set background fill color
        spectrogramCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height); // Clear the entire canvas

        spectrogramData.forEach((frameData, index) => {
            for (let bin = 0; bin < bufferLength; bin++) {
                const value = frameData[bin];
                const brightness = value / 256;
                spectrogramCtx.fillStyle = `rgb(0, ${brightness * 255}, ${brightness * 255})`;
                spectrogramCtx.fillRect(bin * width, spectrogramCanvas.height - (index + 1) * height, width, height);
            }
        });
    }


    function updateSpectrum() {
        requestAnimationFrame(updateSpectrum);
        drawSpectrum();
        drawSpectrogram();
    }
});
