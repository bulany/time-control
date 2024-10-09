import { Plugin, Notice } from 'obsidian';

import { syntaxTree } from "@codemirror/language";

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
		this.playSound('G6', '32n');
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
		const decoration = Decoration.replace({widget: new TimerWidget(minutes)});
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

	constructor(view : EditorView) {
		console.log('plugin constructor')
		this.decorations = new RangeSetBuilder<Decoration>().finish();
		this.decorations.update({add: createTimerDecorationRanges(view.state.doc.toString())});
	}

	update(update: ViewUpdate) {
		if (update.focusChanged) {
			synth.playSound('C3', '8n');
		}
		if (!update.docChanged)
			return this.decorations;


		synth.playNextScaleNote();
		this.decorations = this.decorations.map(update.changes);

		const changedRanges : {from: number, to: number}[] = [];
		update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
			changedRanges.push({from: fromA, to: toA});
			changedRanges.push({from: fromB, to: toB});
			console.log('change', fromA, toA, fromB, toB, inserted);
		});
		this.decorations = this.buildDecorations(update.view, changedRanges);
	
		return this.decorations;
	}

	destroy() {
		console.log('destroy called');
	}

	buildDecorations(view: EditorView, ranges : typeof view.visibleRanges ): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const that = this;
		for (let { from, to } of ranges) {
			syntaxTree(view.state).iterate({
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

export default class TimeControlPlugin extends Plugin {

	override async onload() {
		await synth.initAudio();
		this.registerEditorExtension(
			ViewPlugin.fromClass(TimerPluginValue, { decorations: v => v.decorations } )
		);

		this.addCommand({
			id: 'reveal-and-rerandomise-scale-mode',
			name: 'Reveal and re-randomise scale mode',
			callback: () => {
				new Notice(`Mode was ${synth.mode}`);
				synth.randomiseMode();
			}
		});
		console.log("Time control loaded!");
	}

	override onunload(): void {
		console.log('Time control unloaded!');
	}

}


