import { Plugin, Notice } from 'obsidian';

import { Settings } from './settings';
import { SettingsTab } from './ui/settingsWindow';
import { CodeMaps } from './mapper/codeMaps';

import ObsidianRenderer from './ui/obsidianRenderer';
import { CmRendererPlugin } from './ui/cmRenderer';
import { InputSuggester } from './ui/inputSuggester';
import { TextProcessor } from './mapper/textProcessor';

import * as Tone from 'tone';

export default class TimeControlPlugin extends Plugin
{
    synth: Tone.Synth | undefined;

    override async onload()
    {
        // load core plugin modules
        await this.loadSettings();
        const codeMaps = new CodeMaps(this);
        codeMaps.loadAll(this.app);
        this.addSettingTab(new SettingsTab(this.app, this, this.saveSettings.bind(this), Settings.instance));

        // load UI modules
        TextProcessor.instance.codeMaps = codeMaps;
        this.registerEditorExtension(CmRendererPlugin.build());
        this.registerMarkdownPostProcessor(ObsidianRenderer.processTokens);
        this.registerEditorSuggest(new InputSuggester(this, codeMaps));

        console.log('Time control loaded!');
        this.synth = new Tone.Synth().toDestination();
        this.synth.triggerAttackRelease('C4', '32n');
        new Notice('Time control loaded');

        	
    }

    override onunload(): void
    {
        this.synth?.triggerAttackRelease('E4', '8n');
        console.log('Time control unloaded!');
    }

    async loadSettings() {
        Settings.instance = { ...Settings.instance, ...await this.loadData() };
    }

    async saveSettings() {
        await this.saveData(Settings.instance);
    }
}
