// audioSpectrum.js
// This script is used to create a simple audio spectrum visualizer using the Web Audio API.
// It creates a canvas element and draws the audio spectrum data on it in real-time.
// The script also includes a button to start and stop the audio sampling.



document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('toggle');
    const canvas = document.getElementById('spectrumCanvas');
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

    const maxFrames = 100; // default m frames

    btn.addEventListener('click', function () {
        console.log("Button clicked");  // Log when the button is clicked
        if (!audioContext) {
            console.log("Initializing AudioContext");  // Log the initialization
            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                btn.textContent = 'Stop Sampling';  // Change text after successful connection
                console.log("Media stream connected and audio context running");
                updateSpectrum();
            }).catch(function (err) {
                console.error('Error accessing media devices:', err);
            });
        } else {
            // Check and log current state before attempting to change it
            console.log("Current AudioContext state before toggle:", audioContext.state);
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    btn.textContent = 'Stop Sampling';
                    console.log("AudioContext resumed");
                    updateSpectrum();
                });
            } else if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                    btn.textContent = 'Start Sampling';
                    console.log("AudioContext suspended");
                });
            }
        }
    });

    function draw() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        let barWidth = (WIDTH / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            ctx.fillStyle = `rgb(140, 140, ${barHeight + 100})`;
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
        const height = spectrogramCanvas.height / spectrogramData.length;

        spectrogramData.forEach((frameData, index) => {
            frameData.forEach((value, bin) => {
                const brightness = value / 256;
                spectrogramCtx.fillStyle = `rgb(0, ${brightness * 255}, ${brightness * 255})`;
                spectrogramCtx.fillRect(bin * width, index * height, width, height);
            });
        });
    }
    function updateSpectrum() {
        requestAnimationFrame(updateSpectrum);
        drawSpectrogram();
        draw();
    }
});


function drawSpectrum() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    analyser.getByteFrequencyData(dataArray);


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


function updateSpectrum() {
    requestAnimationFrame(updateSpectrum);
    drawSpectrum();
    drawSpectrogram();

}

/**
 * Finds the top z peaks in the spectrum.
 * @param {Uint8Array} data The spectrum data array.
 * @param {number} z The number of top peaks to find.
 * @return {Array} An array of objects where each object represents a peak with properties for frequency (index) and amplitude.
 */
function findTopZPeaks(data, z) {
    const peaks = [];

    // Iterate through the frequency data to find peaks
    for (let i = 1; i < data.length - 1; i++) {
        // Check if the current point is greater than its neighbors
        if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
            peaks.push({ frequency: i, amplitude: data[i] });
        }
    }

    // Sort peaks by amplitude in descending order
    peaks.sort((a, b) => b.amplitude - a.amplitude);

    // Return the top z peaks
    return peaks.slice(0, z);
}
