## Audio Spectra: A Practical Intro to Time and Frequency Domains

This guide explains how time-domain signals relate to frequency-domain spectra, what FFTs do, why windowing matters, and how common waveforms (square, triangle, sawtooth) are built from sinusoidal components.

### Time vs Frequency Domain

- **Time domain**: Signal amplitude versus time. An oscilloscope view shows the waveform shape (peaks, cycles, transients).
- **Frequency domain**: Signal amplitude versus frequency. A spectrum view shows what frequencies are present and their strengths.

They are two views of the same signal. The Fourier transform maps between them.

### The FFT (Fast Fourier Transform)

- **What it does**: Efficiently computes the Discrete Fourier Transform (DFT), converting N time samples into N complex frequency bins.
- **Bin frequencies**: With sample rate `Fs`, FFT size `N`, and Nyquist `Fs/2`, the k-th bin represents frequency `f_k = k * (Fs / N)` for `k = 0..N/2` (for real signals you typically use half the bins).
- **Magnitude**: The amplitude per frequency bin is the magnitude of the complex FFT output for that bin. Visualizers often show the magnitude as a bar height.

### Why Windowing Matters

When you take a finite slice of a signal and FFT it, you implicitly multiply by a rectangular window. If the waveform doesn’t contain an integer number of cycles in that slice, you get spectral leakage (energy spreading into nearby bins).

- **Windows** (Hamming, Hann, Blackman…) taper the edges of the time slice to reduce leakage.
- **Trade-offs**: Windows reduce leakage at the cost of widening main lobes (poorer frequency resolution) and sometimes reducing peak amplitude. Choose a window based on your use case (e.g., Hamming for general purpose).

### Linear vs Log Frequency Scales

- **Linear**: Equal spacing in Hz. Good for narrowband inspection or technical analysis.
- **Log**: Equal spacing in octaves (or decades). Matches human pitch perception, packs wide frequency ranges nicely, and is common in audio UIs.

### Dynamic Range Shaping (Companding)

Visualizing both quiet and loud content can be hard. Companding can make small features more visible while keeping loud peaks under control. See the companion repo `companders` for techniques.

### Common Waveforms as Sums of Sines (Fourier Series)

Any periodic signal can be expressed as a sum of sinusoids at harmonic frequencies. A few classic examples (assuming fundamental frequency `f0`):

- **Square wave**: Only odd harmonics with amplitudes ∝ 1/n
  - `x(t) = Σ_{k=0}^{∞} (1/(2k+1)) * sin(2π(2k+1)f0 t)`
- **Triangle wave**: Only odd harmonics, amplitudes ∝ 1/n², alternating signs
  - `x(t) = Σ_{k=0}^{∞} ((-1)^k / (2k+1)^2) * sin(2π(2k+1)f0 t)`
- **Sawtooth wave**: All harmonics, amplitudes ∝ 1/n
  - `x(t) = Σ_{n=1}^{∞} (1/n) * sin(2π n f0 t)` (or cosine series with phase)

These harmonic patterns explain why the spectra of these waves have characteristic roll-offs and line structures.

### Quick Listening Snippets (Web Audio)

Paste these in your browser console to hear each waveform for 2 seconds at 440 Hz (A4). Lower your volume first.

```javascript
// Square
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const o = ctx.createOscillator();
o.type = 'square';
o.frequency.value = 440;
o.connect(ctx.destination);
o.start();
setTimeout(() => { o.stop(); ctx.close(); }, 2000);
```

```javascript
// Triangle
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const o = ctx.createOscillator();
o.type = 'triangle';
o.frequency.value = 440;
o.connect(ctx.destination);
o.start();
setTimeout(() => { o.stop(); ctx.close(); }, 2000);
```

```javascript
// Sawtooth
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const o = ctx.createOscillator();
o.type = 'sawtooth';
o.frequency.value = 440;
o.connect(ctx.destination);
o.start();
setTimeout(() => { o.stop(); ctx.close(); }, 2000);
```

### Tips for Practical Spectrum Analysis

- **FFT size**: Larger N gives finer frequency spacing but more latency and heavier CPU. Common choices: 1024–8192 for real-time visuals.
- **Averaging/smoothing**:
  - Across frequency: moving average or Savitzky–Golay can reduce jaggedness.
  - Across time: exponential averaging stabilizes visuals while tracking changes.
- **Window choice**: Hamming or Hann are good default windows; Blackman for stronger leakage suppression.
- **Scaling**: Consider dB scaling for magnitude and log scaling for frequency when presenting wide dynamic range.


