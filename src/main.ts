import { Plugin, Notice } from 'obsidian';
import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";
import * as Tone from 'tone';

const majorScale = 'C-D-E-F-G-A-B'.split('-');

const majorSemiToneSequence : Array<number> = [2, 2, 1, 2, 2, 2, 1];
const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

function semiToneJump(i: number, modeIndex: number = 0) {
    const j = (i + modeIndex) % majorSemiToneSequence.length;
    return majorSemiToneSequence[j];
}

function buildScaleFrom(startNote : string, numNotes : number, modeIndex : number = 0) {
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

function buildScale(startIndex : number) {
    const out = [];
    let octave = 4;
    for (let i = 0; i <= majorScale.length; ++i) {
        let j = i + startIndex;
        if (j >= majorScale.length) {
            j = j - majorScale.length;
            if (j==0)
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

class MyViewPlugin implements PluginValue {
    constructor(view: EditorView) {
        // ...
    }

    update(update: ViewUpdate) {
        // ...
        synth.playNextScaleNote();
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


