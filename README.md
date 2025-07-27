# Web Audio Spectrum Analyzer

A audio spectrum analyzer that visualizes real-time audio input from your microphone using the Web Audio API. This page provides three distinct visualizations to see audio signals in both time and frequency domains.

See demo here: https://deftio.github.io/WebAudioSpectrum

## Features

- **Oscilloscope (Time Domain)**: Shows the waveform of the audio signal over time
  - Linear, logarithmic, and companding amplitude scaling modes
  - Uses "classic" green phosphor display style
- **Real-Time Frequency Spectrum**: Visualizes the frequency content of the audio signal
  - Linear and logarithmic frequency scaling
  - Optional Hamming window for improved frequency resolution
- **Spectrogram (Time-Frequency)**: Shows how the spectrum evolves over time
  - Waterfall-style display with color-coded intensity
  - Displays the last 100 frames of spectral data

## How to Use

### Prerequisites
- A modern web browser that supports HTML5, JavaScript, and the Web Audio API.
- Microphone access on the device running the analyzer.

### Running the Analyzer
1. Open `index.html` in your browser (or visit the demo link above)
2. Click the "Start Sampling" button to begin capturing audio from your microphone
3. Toggle visualizations and settings using the control buttons:
   - **Show/Hide Oscilloscope**: Toggle the time-domain waveform display
   - **Scope Scale**: Cycle through Linear/Log/Compand amplitude scaling (when oscilloscope is visible)
   - **Scale**: Switch between Linear/Log frequency scaling for spectrum and spectrogram
   - **Window**: Toggle between Rectangular/Hamming windowing functions

## Technical Details

### Components
- `index.html`: The HTML file that hosts the application.
- `audioSpectrum.js`: The JavaScript file that handles audio processing and visualization.
- `styles.css`: Optional CSS file for custom styling (if separate from `index.html`).

### Key Functions
- `updateSpectrum()`: Main animation loop coordinating all visualizations
- `drawOscilloscope()`: Renders the time-domain waveform with configurable scaling
- `drawSpectrum()`: Renders the frequency spectrum using FFT data
- `drawSpectrogram()`: Updates the time-frequency waterfall display
- `applyScaling()`: Handles linear/logarithmic frequency axis scaling

## Understanding the Visualizations

### Oscilloscope (Time Domain)

The oscilloscope displays the audio waveform as it varies over time, showing the instantaneous amplitude of the signal. This is the most direct representation of what your microphone "hears."

- **X-axis**: Time (approximately 46 milliseconds of audio at 44.1kHz sampling rate)
- **Y-axis**: Amplitude (air pressure variations)
- **Scaling modes**:
  - **Linear**: Direct representation of the signal amplitude
  - **Log**: Enhances small signals using logarithmic scaling, useful for viewing quiet sounds
  - **Compand**: Compresses large amplitudes while expanding small ones, allowing both loud and quiet signals to be visible simultaneously.  For more on companding, visit the companion repo here [companders](https://github.com/deftio/companders)

### Frequency Spectrum (Frequency Domain)

The spectrum analyzer shows which frequencies are present in the audio signal and their relative strengths. This is computed using the Fast Fourier Transform (FFT), which decomposes the time-domain signal into its constituent frequencies.

- **X-axis**: Frequency (0 Hz to ~22 kHz, half the sampling rate)
- **Y-axis**: Magnitude (strength of each frequency component)
- **Scaling modes**:
  - **Linear frequency**: Equal spacing between frequencies (e.g., 100Hz, 200Hz, 300Hz...)
  - **Log frequency**: Logarithmic spacing that better represents how we perceive pitch (each octave gets equal space)

### Spectrogram (Time-Frequency Domain)

The spectrogram combines time and frequency information, showing how the frequency content evolves over time. Think of it as a "musical score" of the audio, where you can see both what frequencies are present and when they occur.

- **X-axis**: Frequency (same as the spectrum analyzer)
- **Y-axis**: Time (newest data at bottom, scrolling upward)
- **Color**: Intensity (darker = stronger frequency component)

## Windowing and Signal Processing

### Why Windowing?

When we take a chunk of audio for FFT analysis, we're essentially "cutting out" a piece of a continuous signal. This abrupt cutting creates artificial high-frequency components (spectral leakage) that weren't in the original signal. Windowing functions taper the signal smoothly to zero at the edges, reducing these artifacts.

### Window Functions

- **Rectangular Window**: No windowing - the signal is cut abruptly. This preserves the best frequency resolution but has the most spectral leakage.
- **Hamming Window**: Applies a raised cosine taper to the signal edges. This reduces spectral leakage at the cost of slightly reduced frequency resolution. The Hamming window follows the formula: `w(n) = 0.54 - 0.46 * cos(2πn/(N-1))`

### FFT Size and Resolution

The analyzer uses an FFT size of 2048 samples, which provides:
- **Frequency resolution**: ~21.5 Hz bins at 44.1kHz sampling rate (44100/2048)
- **Time resolution**: ~46 ms window duration (2048/44100)

There's always a trade-off: larger FFT sizes give better frequency resolution but poorer time resolution, while smaller FFT sizes do the opposite.

### Amplitude Scaling

Different scaling modes help visualize different aspects of the signal:
- **Linear amplitude**: Shows true relative strengths but can make quiet signals invisible
- **Logarithmic amplitude**: Compresses the dynamic range, making quiet signals more visible (useful for audio work where we care about signals across many orders of magnitude)
- **Companding**: A hybrid approach that provides good visibility for both loud and quiet signals

## Contributing

Contributions to the project are welcome! Please adhere to the following guidelines:
- Fork the repository and create your feature branch.
- Ensure your code adheres to the existing style to maintain consistency.
- Submit a pull request with a clear description of your changes.

## License

This project is released under the MIT License. See the `LICENSE` file for more information.
