import { Plugin } from 'obsidian';
import * as d3 from 'd3';
import WaveSurfer from 'wavesurfer.js';
import { ChildProcess, spawn } from 'child_process';
import * as http from 'http';


interface WaveShaperConfig {
  file: string;
  markerGrid: {
    startTime: string;  // Format: "0m23s342"
    bpm: number;
    numMarks: number;
  };
}

export class WaveshaperPlugin {
  plugin: Plugin | null = null;
  server: http.Server | null = null;
  serverPort: number = 0;

  async onload(plugin: Plugin) {
    console.log('waveshaper onload');
    this.plugin = plugin;
    await this.startFFmpegServer();
    this.plugin.registerMarkdownCodeBlockProcessor("waveshaper", async (source, el) => {
      el.createDiv({ text: "Placeholder" });
      try {
        const config = JSON.parse(source) as WaveShaperConfig;
        await this.createWaveformView(config, el);
      } catch (error) {
        el.createEl("p", { text: "Invalid JSON format." });
        return;
      }

    });
  }

  async onunload() {
    console.log('waveshaper onunload');
  }

  private async startFFmpegServer() {
    return new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS for WaveSurfer
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const filePath = decodeURIComponent(req.url.slice(1));
        const range = req.headers.range;

        // First, get the file duration and size using ffprobe
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          filePath
        ]);

        let probeData = '';
        ffprobe.stdout.on('data', (data) => {
          probeData += data;
        });

        ffprobe.on('close', () => {
          try {
            const format = JSON.parse(probeData).format;
            const fileSize = parseInt(format.size);
            const duration = parseFloat(format.duration);

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0]);
              const end = parts[1] ? parseInt(parts[1]) : fileSize - 1;
              const chunkSize = end - start + 1;

              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'audio/mpeg'
              });

              // Calculate time range for ffmpeg
              const startTime = (start / fileSize) * duration;
              const duration = (chunkSize / fileSize) * duration;

              // Use ffmpeg to stream the specific portion of the audio
              const ffmpeg = spawn('ffmpeg', [
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-i', filePath,
                '-c', 'copy',  // Stream copy without re-encoding
                '-f', 'mp3',
                'pipe:1'
              ]);

              ffmpeg.stdout.pipe(res);

              ffmpeg.stderr.on('data', (data) => {
                console.debug('FFmpeg:', data.toString());
              });

              req.on('close', () => {
                ffmpeg.kill();
              });
            } else {
              res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg'
              });

              const ffmpeg = spawn('ffmpeg', [
                '-i', filePath,
                '-c', 'copy',  // Stream copy without re-encoding
                '-f', 'mp3',
                'pipe:1'
              ]);

              ffmpeg.stdout.pipe(res);

              ffmpeg.stderr.on('data', (data) => {
                console.debug('FFmpeg:', data.toString());
              });

              req.on('close', () => {
                ffmpeg.kill();
              });
            }
          } catch (error) {
            console.error('Error parsing probe data:', error);
            res.writeHead(500);
            res.end('Error processing audio file');
          }
        });
      });

      // Find an available port
      const findPort = (port: number): Promise<number> => {
        return new Promise((resolve) => {
          this.server.listen(port, '127.0.0.1', () => {
            resolve(port);
          }).on('error', () => {
            resolve(findPort(port + 1));
          });
        });
      };

      findPort(45654).then((port) => {
        this.serverPort = port;
        console.log(`WaveShaper FFmpeg server started on port ${port}`);
        resolve();
      }).catch(reject);
    });
  }


  private parseTimestamp(timestamp: string): number {
    // Parse timestamp format "0m23s342"
    const regex = /(\d+)m(\d+)s(\d+)/;
    const matches = timestamp.match(regex);
    if (!matches) return 0;

    const [_, minutes, seconds, milliseconds] = matches;
    return (parseInt(minutes) * 60 + parseInt(seconds)) * 1000 + parseInt(milliseconds);
  }

  private async createWaveformView(config: WaveShaperConfig, container: HTMLElement) {
    // Create container for the visualization
    const waveformContainer = container.createEl('div', {
      cls: 'waveshaper-container',
    });

    // Add basic styling
    waveformContainer.style.width = '100%';
    waveformContainer.style.height = '200px';
    waveformContainer.style.marginBottom = '20px';

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformContainer,
      waveColor: 'violet',
      progressColor: 'purple',
      cursorColor: 'navy',
      hideScrollbar: false,
      normalize: true,
      responsive: true,
      height: 200,
    });

    try {
      // Generate waveform image using FFmpeg first
      const waveformData = await new Promise<string>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', config.file,
          '-filter_complex', 'showwavespic=s=800x200:colors=violet',
          '-frames:v', '1',
          '-f', 'image2pipe',
          '-vcodec', 'png',
          'pipe:1'
        ]);

        const chunks: Buffer[] = [];
        ffmpeg.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        ffmpeg.stdout.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(`data:image/png;base64,${base64}`);
        });
        ffmpeg.on('error', reject);
      });

      // Create waveform background with the pre-generated image
      const waveformImg = container.createEl('img', {
        cls: 'waveshaper-waveform-bg'
      });
      waveformImg.src = waveformData;
      waveformImg.style.width = '100%';
      waveformImg.style.height = '200px';
      waveformImg.style.position = 'absolute';
      waveformContainer.style.position = 'relative';

      const wavesurfer = WaveSurfer.create({
        container: waveformContainer,
        waveColor: 'transparent', // Make WaveSurfer's waveform invisible
        progressColor: 'rgba(violet, 0.4)', // Show progress as a semi-transparent overlay
        cursorColor: 'navy',
        hideScrollbar: false,
        responsive: true,
        height: 200,
      });

      // Load audio through our FFmpeg server
      const serverUrl = `http://localhost:${this.serverPort}/${encodeURIComponent(config.file)}`;
      await wavesurfer.load(serverUrl);

      // Calculate and add markers
      const startTime = this.parseTimestamp(config.markerGrid.startTime);
      const msPerBeat = (60 / config.markerGrid.bpm) * 1000;

      for (let i = 0; i < config.markerGrid.numMarks; i++) {
        const markerTime = startTime + (i * msPerBeat);
        const markerPosition = markerTime / 1000; // Convert to seconds

        wavesurfer.addMarker({
          time: markerPosition,
          label: `${i + 1}`,
          color: '#ff990055',
          position: 'top'
        });
      }

      // Add play/pause button
      const controls = container.createEl('div', {
        cls: 'waveshaper-controls',
      });

      const playButton = controls.createEl('button', {
        text: 'Play/Pause',
      });

      playButton.onclick = () => {
        wavesurfer.playPause();
      };

      // Add zoom controls
      const zoomRange = controls.createEl('input', {
        type: 'range',
        min: '1',
        max: '100',
        value: '50',
      });

      zoomRange.oninput = (e) => {
        const target = e.target as HTMLInputElement;
        const zoomLevel = Number(target.value);
        wavesurfer.zoom(zoomLevel);
      };

    } catch (error) {
      console.error('Error loading audio file:', error);
      container.empty();
      container.createEl('div', {
        text: `Error loading audio file: ${error.message}`,
      });
    }
  }
}