
import { Plugin, Notice } from 'obsidian';
import * as net from 'net'
import { exec } from 'child_process'
import * as d3 from 'd3';
import { spawn } from 'child_process';
import { join } from 'path';

const MPV_PATH = '/opt/homebrew/bin/mpv';
const SOCKET_PATH = '/tmp/obsidian-mpv-socket';
const VIDEO_PATH = 'test.mp4'


interface VideoRegion {
  start: string;
  end: string;
}

interface VideoRow {
  label: string;
  color: string;
  regions: VideoRegion[];
}

interface VideoAnnotation {
  file: string;
  rows: VideoRow[];
}

interface MPVResponse {
  data: any;
  request_id: number;
}

class MPVController {
  private socket: net.Socket | null = null;
  private mpvProcess: any = null;
  private requestId = 1;
  private callbacks: Map<number, (response: any) => void> = new Map();

  async start(videoPath: string): Promise<void> {
    // Create a unique socket path for this instance
    const socketPath = join(
      process.platform === 'win32' ? '\\\\?\\pipe\\' : '/tmp/',
      `mpv-${Date.now()}.sock`
    );

    // Start MPV with IPC socket

    this.mpvProcess = spawn(MPV_PATH, [
      `--input-ipc-server=${socketPath}`,
      '--idle=yes',
      '--keep-open=yes',
      videoPath
    ]);


    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Connect to MPV's IPC socket
    this.socket = new net.Socket();
    await new Promise((resolve, reject) => {
      this.socket?.connect(socketPath, () => resolve(null));
    });

    // Handle responses from MPV
    this.socket.on('data', (data) => {
      const responses = data.toString().split('\n').filter(Boolean);
      for (const response of responses) {
        const parsed: MPVResponse = JSON.parse(response);
        const callback = this.callbacks.get(parsed.request_id);
        if (callback) {
          callback(parsed.data);
          this.callbacks.delete(parsed.request_id);
        }
      }
    });
  }

  async command(command: string[], ...args: any[]): Promise<any> {
    if (!this.socket) throw new Error('MPV not connected');

    const request = {
      command: command,
      request_id: this.requestId++,
      args: args
    };

    return new Promise((resolve) => {
      this.callbacks.set(request.request_id, resolve);
      this.socket?.write(JSON.stringify(request) + '\n');
    });
  }

  // Get current playback position in seconds (with millisecond precision)
  async getTimePosition(): Promise<number> {
    return this.command(['get_property', 'time-pos']);
  }

  // Get video duration in seconds
  async getDuration(): Promise<number> {
    return this.command(['get_property', 'duration']);
  }

  // Seek to specific timestamp in seconds
  async seek(timestamp: number): Promise<void> {
    await this.command(['seek', timestamp + '', 'absolute']);
  }

  // Format timestamp with millisecond precision
  static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const ms = Math.floor((remainingSeconds % 1) * 1000);
    return `${minutes}m${Math.floor(remainingSeconds)}s${ms}ms`;
  }

  // Parse timestamp with millisecond precision
  static parseTimestamp(timestamp: string): number {
    const match = timestamp.match(/^(\d+)m(\d+)s(\d+)ms$/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 1000;
  }
}




export class MpvPlugin {
  plugin: Plugin | null = null;
  socket: net.Socket | null = null;
  loopStart: number | null = null;
  loopEnd: number | null = null;
  isPlaying: boolean = false;
  isLooping: boolean = false;

  mpvController: MPVController | null = null;

  async onload(plugin: Plugin) {
    this.plugin = plugin;
    this.registerProcessor();
    this.addCommands();
    console.log('mpv onload');
  }

  async onunload() {
    if (this.mpvController) {
      // Clean up MPV process
      await this.mpvController.command(['quit']);
    }

    this.socket?.destroy();
    this.socket = null;
    console.log('mpv onunload');
  }

  registerProcessor() {
    this.plugin?.registerMarkdownCodeBlockProcessor('mpv', async (source, el, ctx) => {
      try {
        el.createEl('div', { text: 'placeholder' });

        const data: VideoAnnotation = JSON.parse(source.trim());

        // Start MPV if not already running
        try {
          if (!this.mpvController) {
            this.mpvController = new MPVController();
            await this.mpvController.start(data.file);
          }
        } catch (e) { 
          console.log('start error', e);
          
        }


        // Get video duration for scaling
        const duration = await this.mpvController?.getDuration();
        console.log('video duration', duration);

        const playButton = el.createEl('div', {text : 'restart video playback'});
        playButton.addEventListener('onclick', e => {
          console.log('try to restart player and make it full screen');
          //this.mpvController?.command(['']);
        });

        // Create visualization
        const width = 300;
        const row_height = 40;
        const height = data.rows.length * row_height;
        const svg = d3.select(el)
          .append('svg')
          .attr('width', width)
          .attr('height', height);

        // Create scale using actual video duration
        const timeScale = d3.scaleLinear()
          .domain([0, duration])
          .range([0, width]);

        let y = 0;

        // Convert timestamps to numbers for scaling
        data.rows.forEach((row, row_i) => {
          console.log('drawing row ', row_i);
          const regions = row.regions.map(r => ({
            ...r,
            startSeconds: MPVController.parseTimestamp(r.start),
            endSeconds: MPVController.parseTimestamp(r.end),
            color: row.color
          }));

          // Draw regions
          svg.selectAll('rect')
            .data(regions)
            .enter()
            .append('rect')
            .attr('x', d => timeScale(d.startSeconds))
            .attr('y', y + 5)
            .attr('width', d => timeScale(d.endSeconds) - timeScale(d.startSeconds))
            .attr('height', 30)
            .attr('fill', d => d.color)
            .attr('opacity', 0.7)
            .style('cursor', 'pointer')
            .on('click', async (event, d) => {
              await this.mpvController?.seek(d.startSeconds);
            });
          y += row_height;
        });



        // Add playhead indicator
        const playhead = svg.append('line')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        // Update playhead position periodically
        const updatePlayhead = async () => {
          if (this.mpvController) {
            const position = await this.mpvController.getTimePosition();
            playhead.attr('x1', timeScale(position))
              .attr('x2', timeScale(position));
          }
        };

        setInterval(updatePlayhead, 100);

      } catch (e) {
        console.log('error', e);
        el.createEl('div', { text: 'Error parsing video annotation data' });
      }
    });
  }

  addCommands() {

    this.plugin?.addCommand({
      id: 'mpv-init',
      name: 'Init player',
      callback: () => this.initPlayer()
    });

    this.plugin?.addCommand({
      id: 'mpv-play-pause',
      name: 'Play/Pause',
      callback: () => this.sendCommand('cycle', 'pause')
    });


    this.plugin?.addCommand({
      id: 'mpv-start-loop',
      name: 'Start Loop',
      callback: () => this.startLoop()
    });

    this.plugin?.addCommand({
      id: 'mpv-stop-loop',
      name: 'Stop Loop',
      callback: () => this.stopLoop()
    });
  }

  sendCommand(command: string, ...args: any[]) {
    const cmd = JSON.stringify({ command: [command, ...args] });
    this.socket?.write(cmd + '\n');
  }


  async initPlayer() {
    if (this.socket)
      return;
    exec(`${MPV_PATH} --input-ipc-server=${SOCKET_PATH} "${VIDEO_PATH}"`, error => {
      if (error) {
        console.error('Error starting mpv', error);
        new Notice('Failed to start mpv');
      }
    });
    setTimeout(() => {
      this.socket = new net.Socket();
      this.socket.connect(SOCKET_PATH);
      new Notice('Player initialised');
    }, 1000);
  }

  async startLoop() {
    this.loopStart = await this.getPropertyValue('time-pos');
    new Notice(`Loop start set to ${this.loopStart?.toFixed(2)} seconds`);
    if (!this.loopStart || !this.loopEnd || this.loopStart > this.loopEnd) {
      return;
    }
    this.sendCommand('set_property', 'ab-loop-a', this.loopStart);
    this.sendCommand('set_property', 'ab-loop-b', this.loopEnd);
    this.sendCommand('seek', this.loopStart, 'absolute');
    this.sendCommand('set_property', 'loop-file', 'inf');
    this.isLooping = true;

  }

  async stopLoop() {
    this.loopEnd = await this.getPropertyValue('time-pos');
    new Notice(`Loop end set to ${this.loopEnd.toFixed(2)} seconds`);
    if (!this.loopStart || !this.loopEnd || this.loopStart > this.loopEnd) {
      return;
    }
    this.sendCommand('set_property', 'ab-loop-a', this.loopStart);
    this.sendCommand('set_property', 'ab-loop-b', this.loopEnd);
    this.sendCommand('set_property', 'loop-file', 'inf');

    // Ensure we start from the beginning of the loop
    this.sendCommand('seek', this.loopStart, 'absolute');
  }

  async getPropertyValue(property: string): Promise<number> {
    return new Promise((resolve) => {
      this.sendCommand('get_property', property);
      this.socket.once('data', (data) => {
        const response = JSON.parse(data.toString());
        resolve(response.data);
      });
    });
  }
}