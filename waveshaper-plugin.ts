import { Plugin } from 'obsidian';
import * as d3 from 'd3';
import WaveSurfer from 'wavesurfer.js';

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
  
  async onload(plugin: Plugin) {
    console.log('waveshaper onload');
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor("waveshaper", async (source, el) => {
      el.createDiv({text: "Placeholder"});
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
        // Load audio file
        await wavesurfer.load(config.file);

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