import { Plugin, Notice, MarkdownView } from 'obsidian';

import { syntaxTree } from "@codemirror/language";

import { SyntaxTreeDebugger } from 'syntax-tree-debugger';
import { ParseDebugger } from './parse-debugger';

import { MpvPlugin } from './mpv-plugin';
import { SickDiaryPlugin } from './sick-diary-plugin';
import { ProjectPlugin } from './project-plugin';
import { WaveshaperPlugin } from './waveshaper-plugin';



import {
	Range,
	RangeSet,
	RangeSetBuilder,
} from "@codemirror/state";

import {
	ViewUpdate,
	PluginSpec,
	PluginValue,
	EditorView,
	ViewPlugin,
	Decoration,
	DecorationSet,
	WidgetType
} from "@codemirror/view";

import * as Tone from 'tone';

const majorScale = 'C-D-E-F-G-A-B'.split('-');

const majorSemiToneSequence: Array<number> = [2, 2, 1, 2, 2, 2, 1];
const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

function transcriptionToSemiToneSequence(transcription: string) {
	const output: Array<number> = [];

	return output;
}


class Song {
	name: string;
	transcription: string;
	semiToneSequence: Array<number>;

	constructor(name: string, transcription: string) {
		this.name = name;
		this.transcription = transcription;
		this.semiToneSequence = transcriptionToSemiToneSequence(this.transcription);
	}
}

const happyBirthday = new Song('Happy Birthday', 'Sol.Sol-^La..-vSol..^Do..-vSi..-...');
console.log('hb', happyBirthday);

function semiToneJump(i: number, modeIndex: number = 0) {
	const j = (i + modeIndex) % majorSemiToneSequence.length;
	return majorSemiToneSequence[j];
}

function buildScaleFrom(startNote: string, numNotes: number, modeIndex: number = 0) {
	const fStart = Tone.Frequency(startNote);
	let totalJumps = 0;
	const out = [fStart.toNote()];
	for (let i = 0; out.length < numNotes; ++i) {
		const semiJump = semiToneJump(i, modeIndex);
		totalJumps += semiJump;
		const note = fStart.transpose(totalJumps);
		out.push(note.toNote());
	}
	return out;
}

function buildTranposedModes() {
	const out: Object = {};
	modes.forEach((mode, i) => {
		out[mode] = buildScaleFrom('C4', 8, i);
	})
	return out;
}

function buildScale(startIndex: number) {
	const out = [];
	let octave = 4;
	for (let i = 0; i <= majorScale.length; ++i) {
		let j = i + startIndex;
		if (j >= majorScale.length) {
			j = j - majorScale.length;
			if (j == 0)
				octave++;
		}
		out.push(majorScale[j] + octave);
	}
	return out;
}

function buildModes() {
	const out: Object = {};
	modes.forEach((mode, i) => {
		out[mode] = buildScale(i);
	})
	return out;
}

function randomMode() {
	const i = Math.floor(Math.random() * modes.length);
	return modes[i];
}

const modalScales = buildModes();
console.log('modes', modalScales);

const transposedModalScales = buildTranposedModes();
console.log('transposed', transposedModalScales);

class Synth {
	synth: Tone.PolySynth | undefined;
	mode: String = randomMode();
	nextIndex: number = 0;
	direction: number = 1;

	async initAudio() {
		await Tone.start();
		this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
		this.playSound('C5', '32n');
	}

	randomiseMode() {
		this.mode = randomMode();
		this.nextIndex = 0;
	}

	playSound(note: Tone.Unit.Frequency, time: Tone.Unit.Time) {
		this.synth?.triggerAttackRelease(note, time);
	}

	nextScaleNote() {
		const scale = transposedModalScales[this.mode];
		const note = scale[this.nextIndex];
		this.nextIndex += this.direction;
		if (this.nextIndex >= scale.length) {
			this.direction = -1;
			this.nextIndex += this.direction;
			this.nextIndex += this.direction;
		}
		if (this.nextIndex < 0) {
			this.direction = 1;
			this.nextIndex += this.direction;
		}
		return note;
	}

	playNextScaleNote() {
		this.playSound(this.nextScaleNote(), '16n');
	}

	randomScaleNote() {
		const scale = transposedModalScales[this.mode];
		const i = Math.floor(Math.random() * scale.length);
		return scale[i];
	}

	playRandomScaleNote() {
		this.playSound(this.randomScaleNote(), '16n');
	}


}

const synth = new Synth();


//const extendedMarkdown = markdown({extensions:})

let next_timer_id = 0;

class TimerWidget extends WidgetType {

	id: number = -1;
	minutes: number = -1;

	constructor(minutes: number) {
		super();
		this.id = next_timer_id++;
		this.minutes = minutes;
	}

	toDOM(view: EditorView): HTMLElement {
		const span = document.createElement("span");
		span.innerText = `⏰ ${this.minutes} minutes`;
		return span;
	}
}


function createTimerDecorationRanges(text: string, offset: number = 0) {
	const regex = /^\[timer:\s*(\d+)m\]$/g;
	let match;
	let ranges = [];
	while (match = regex.exec(text)) {
		const from = offset + match.index;
		const to = offset + match.index + match[0].length;
		const minutes = parseInt(match[1]);
		const decoration = Decoration.replace({ widget: new TimerWidget(minutes) });
		const range = decoration.range(from, to);
		ranges.push(range);
		console.log('found timer', from, to);
	}
	return ranges;
}


class TimerPluginValue implements PluginValue {
	decorations: DecorationSet;
	pendingUpdate: ViewUpdate | null = null;
	delay: number = 150;

	constructor(view: EditorView) {
		console.log('plugin constructor')
		this.decorations = new RangeSetBuilder<Decoration>().finish();
		this.decorations.update({ add: createTimerDecorationRanges(view.state.doc.toString()) });
	}

	update(update: ViewUpdate) {
		if (update.focusChanged) {
			synth.playSound('C3', '8n');
		}
		if (!update.docChanged)
			return this.decorations;


		synth.playNextScaleNote();
		this.decorations = this.decorations.map(update.changes);

		const changedRanges: { from: number, to: number }[] = [];
		update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
			changedRanges.push({ from: fromA, to: toA });
			changedRanges.push({ from: fromB, to: toB });
			//console.log('change', fromA, toA, fromB, toB, inserted);
		});
		this.decorations = this.buildDecorations(update.view, changedRanges);

		return this.decorations;
	}

	destroy() {
		console.log('destroy called');
	}

	buildDecorations(view: EditorView, ranges: typeof view.visibleRanges): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const tree = syntaxTree(view.state);
		const that = this;
		for (let { from, to } of ranges) {
			tree.iterate({
				from, to, enter(node) {

					if (that.nodeTypeIs(node.type.name, 'link') && !that.nodeTypeIs(node.type.name, 'formatting')) {
						const text = view.state.doc.sliceString(node.from, node.to);
						const match = /^timer:\s*(\d+)m$/.exec(text);
						if (match) {
							console.log('node', node.from, node.to, node.type.name, text);
							const minutes = parseInt(match[1]);
							builder.add(node.from, node.to, Decoration.replace({ widget: new TimerWidget(minutes) }))
						}

					}

				}
			});
		}
		return builder.finish();

	}

	nodeTypeIs(name: string, type: string): boolean {
		const types = name.split('_')
		const found = types.find(val => val == type)
		return found != undefined
	}
}

const mpvPlugin = new MpvPlugin();
const sickDiaryPlugin = new SickDiaryPlugin();
const projectPlugin = new ProjectPlugin();
const waveshaperPlugin = new WaveshaperPlugin();

export default class TimeControlPlugin extends Plugin {



	uninstallDebugger: (() => void) | null = null;

	override async onload() {
		//await mpvPlugin.onload(this);
		//await sickDiaryPlugin.onload(this);
		await projectPlugin.onload(this);
		//await waveshaperPlugin.onload(this);
		await synth.initAudio();

		Tone.getTransport().bpm.value = 60;
		Tone.getTransport().scheduleRepeat((time) => {
			console.log('hi');
			synth.synth?.triggerAttackRelease("C7", "16n", time);
		}, "4n", Tone.now(), 10);
		Tone.getTransport().start();

		this.registerEditorExtension(
			ViewPlugin.fromClass(TimerPluginValue, { decorations: v => v.decorations })
		);

		this.addCommand({
			id: 'create-timer',
			name: 'Create Timer',
			callback: () => this.createTimer()
		});

		this.addCommand({
			id: 'reveal-and-rerandomise-scale-mode',
			name: 'Reveal and re-randomise scale mode',
			callback: () => {
				new Notice(`Mode was ${synth.mode}`);
				synth.randomiseMode();
			}
		});

		this.addCommand({
			id: 'console-log-syntax-tree',
			name: 'Console log syntax tree',
			editorCallback(editor, ctx) {
				const cmEditor = (ctx.editor as any).cm as EditorView;
				if (cmEditor) {
					console.log('hi')
					const tree = syntaxTree(cmEditor.state);
					console.log(tree.toString());
					SyntaxTreeDebugger.printTreeAscii(cmEditor);
					console.log(tree);
				}
			},
		});


		this.addCommand({
			id: 'toggle-parse-debug',
			name: 'Toggle Parse Debugging',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;

				const editorView = (view.editor as any).cm as EditorView;
				if (!editorView) return;

				if (this.uninstallDebugger) {
					this.uninstallDebugger();
					this.uninstallDebugger = null;
					console.log('Parse debugging disabled');
				} else {
					this.uninstallDebugger = ParseDebugger.installParseLogger(editorView);
					console.log('Parse debugging enabled');
				}
			}
		});

		// Command to show current parse info
		this.addCommand({
			id: 'show-parse-info',
			name: 'Show Parse Info',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const editorView = (editor as any).cm as EditorView;
				if (editorView) {
					ParseDebugger.debugParseInfo(editorView);
				}
			}
		});

		console.log("Time control loaded!");
	}

	override async onunload() {
		//await mpvPlugin.onunload();
		//await sickDiaryPlugin.onunload();
		await projectPlugin.onunload();
		if (this.uninstallDebugger) {
			this.uninstallDebugger();
		}
		console.log('Time control unloaded!');
	}

	createTimer() {
		console.log('create timer');
		const regex = /^\[timer:\s*(\d+)m\]$/;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		console.log(line)

	}

	

}


