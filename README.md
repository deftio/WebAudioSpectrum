# Web Audio Spectrum Analyzer

This project is a simple audio spectrum analyzer that visualizes real-time audio input from the microphone. It features two main visualizations:

1. A real-time frequency spectrum display.
2. A spectrogram showing the intensity of frequencies over time.

Additionally, it includes functionality to detect and log the top `z` peaks in the frequency spectrum.

See demo here: https://deftio.github.io/WebAudioSpectra

## Features

- **Real-Time Frequency Spectrum**: Visualizes frequencies in real-time as they are captured from the microphone.
- **Spectrogram Display**: Shows how the spectrum changes over time, plotting the last `m` frames vertically.
- **Peak Detection**: Identifies and logs the top `z` peaks in the spectrum for detailed analysis.

## How to Use

### Prerequisites
- A modern web browser that supports HTML5, JavaScript, and the Web Audio API.
- Microphone access on the device running the analyzer.

### Running the Analyzer
1. Open `index.html` in your browser to start the application.
2. Click the "Start Sampling" button to begin capturing audio from your microphone.
3. View the real-time spectrum and the developing spectrogram on the page.
4. Top peaks in the current spectrum snapshot are logged to the console.

## Technical Details

### Components
- `index.html`: The HTML file that hosts the application.
- `audioSpectrum.js`: The JavaScript file that handles audio processing and visualization.
- `styles.css`: Optional CSS file for custom styling (if separate from `index.html`).

### Functions
- `updateSpectrum()`: Handles the animation loop for real-time updates to the visualizations.
- `draw()`: Renders the real-time frequency spectrum.
- `drawSpectrogram()`: Updates the spectrogram visualization.
- `findTopZPeaks(data, z)`: Analyzes the frequency data array to find the top `z` peaks.

## Contributing

Contributions to the project are welcome! Please adhere to the following guidelines:
- Fork the repository and create your feature branch.
- Ensure your code adheres to the existing style to maintain consistency.
- Submit a pull request with a clear description of your changes.

## License

This project is released under the MIT License. See the `LICENSE` file for more information.
