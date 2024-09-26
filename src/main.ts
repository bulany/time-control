import { Plugin, Notice, MarkdownPostProcessor, MarkdownView, Editor } from 'obsidian';

import { Settings } from './settings';
import { SettingsTab } from './ui/settingsWindow';
import { CodeMaps } from './mapper/codeMaps';

import ObsidianRenderer from './ui/obsidianRenderer';
import { CmRendererPlugin } from './ui/cmRenderer';
import { InputSuggester } from './ui/inputSuggester';
import { TextProcessor } from './mapper/textProcessor';
import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

const addTimerDecoration = StateEffect.define<{ from: number; to: number; minutes: number }>();

function createTimerDecoration(from: number, to: number, minutes: number) {
    return Decoration.replace({
        widget: new class extends WidgetType {
            toDOM() {
                let button = document.createElement('button');
                button.textContent = `${minutes}m Timer`;
                button.addEventListener('click', () => {
                    // Implement timer start logic here
                    console.log(`Starting ${minutes}m timer`);
                });
                return button;
            }
        },
        inclusive: true
    }).range(from, to);
}

const timerField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(addTimerDecoration)) {
                decorations = decorations.update({
                    add: [createTimerDecoration(e.value.from, e.value.to, e.value.minutes)]
                });
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});


const timerViewPlugin = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
        this.checkForTimers(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            this.checkForTimers(update.view);
        }
    }

    checkForTimers(view: EditorView) {
        const timerRegex = /\[timer:\s*(\d+)m\]/g;
        let match;
        let decorations: { from: number; to: number; minutes: number }[] = [];

        view.state.doc.iterLines(line => {
            while ((match = timerRegex.exec(line)) !== null) {
                const from = view.state.doc.lineAt(line).from + match.index;
                const to = from + match[0].length;
                const minutes = parseInt(match[1]);
                decorations.push({ from, to, minutes });
            }
        });

        view.dispatch({
            effects: decorations.map(d => addTimerDecoration.of(d))
        });
    }
});

export default class TimeControlPlugin extends Plugin {

    override async onload() {
        // load core plugin modules
        await this.loadSettings();
        const codeMaps = new CodeMaps(this);
        codeMaps.loadAll(this.app);
        this.addSettingTab(new SettingsTab(this.app, this, this.saveSettings.bind(this), Settings.instance));

        // load UI modules
        TextProcessor.instance.codeMaps = codeMaps;
        console.log('onload: init synth');
        await TextProcessor.instance.initAudio();
        console.log('onload: synth init success');
        this.registerEditorExtension(CmRendererPlugin.build());
        this.registerMarkdownPostProcessor(ObsidianRenderer.processTokens);
        this.registerEditorSuggest(new InputSuggester(this, codeMaps));
        console.log('Time control loaded!');
        this.registerEditorExtension([timerField, timerViewPlugin]);
    }

    override onunload(): void {
        console.log('Time control unloaded!');
    }

    async loadSettings() {
        Settings.instance = { ...Settings.instance, ...await this.loadData() };
    }

    async saveSettings() {
        await this.saveData(Settings.instance);
    }
}
