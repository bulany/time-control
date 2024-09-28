import { Plugin } from 'obsidian';
import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";
import * as Tone from 'tone';

const majorScale = 'C-D-E-F-G-A-B'.split('-');
const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

function buildScale(startIndex) {
    const out = [];
    let octave = 4;
    for (let i = 0; i <= majorScale.length; ++i) {
        let j = i + startIndex;
        if (j >= majorScale.length) {
            j = j - majorScale.length;
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

const modalScales = buildModes();
console.log('modes', modalScales);

class Synth {
    synth: Tone.PolySynth | undefined;
    mode: String = 'ionian';

    async initAudio() {
        await Tone.start();
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.playSound('G6', '32n');
    }

    playSound(note: Tone.Unit.Frequency, time: Tone.Unit.Time) {
        this.synth?.triggerAttackRelease(note, time);
    }

    playRandomScaleNote() {
        this.playSound(this.randomScaleNote(), '16n');
    }

    randomScaleNote() {
        const scale = modalScales[this.mode];
        const i = Math.floor(Math.random() * scale.length);
        return scale[i];
    }

}

const synth = new Synth();

class MyViewPlugin implements PluginValue {
    constructor(view: EditorView) {
        // ...
    }

    update(update: ViewUpdate) {
        // ...
        synth.playRandomScaleNote();
    }

    destroy() {
        // ...
    }
}

const myViewPlugin = ViewPlugin.fromClass(MyViewPlugin);

export default class TimeControlPlugin extends Plugin {

    override async onload() {
        await synth.initAudio();
        this.registerEditorExtension(myViewPlugin);
        console.log("Time control loaded!");
    }

    override onunload(): void {
        console.log('Time control unloaded!');
    }

}


