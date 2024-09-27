import { Plugin } from 'obsidian';
import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";
import * as Tone from 'tone';

class Synth {
    synth: Tone.Synth | undefined;

    modalScales = {
        'dorian': ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']       
    };


    async initAudio() 
    {
        await Tone.start();
        this.synth = new Tone.Synth().toDestination();
        this.playSound('G6', '32n');
    }

    playSound(note : Tone.Unit.Frequency, time : Tone.Unit.Time) 
    {
        this.synth?.triggerAttackRelease(note, time);
    }

    playRandomDorianNote() {
        this.playSound(this.randomDorianNote(), '16n');
    }

    randomDorianNote() {
        const scale = this.modalScales.dorian;
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
        synth.playRandomDorianNote();
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


