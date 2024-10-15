
import { Plugin, Notice } from 'obsidian';
import * as net from 'net'
import { exec } from 'child_process'

const MPV_PATH = '/opt/homebrew/bin/mpv';
const SOCKET_PATH = '/tmp/obsidian-mpv-socket';
const VIDEO_PATH = 'test.mp4'

export class MpvPlugin {
  plugin : Plugin | null = null;
  socket: net.Socket | null = null;
	loopStart: number | null = null;
	loopEnd: number | null = null;
	isPlaying: boolean = false;
	isLooping: boolean = false;

	async onload(plugin : Plugin) {
    this.plugin = plugin;
    this.addCommands();
		console.log('mpv onload');
	}

	async onunload() {
    this.socket?.destroy();
    this.socket = null;
		console.log('mpv onunload');
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