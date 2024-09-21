import { Plugin, Notice } from 'obsidian';

import { Settings } from './settings';
import { SettingsTab } from './ui/settingsWindow';
import { CodeMaps } from './mapper/codeMaps';

import ObsidianRenderer from './ui/obsidianRenderer';
import { CmRendererPlugin } from './ui/cmRenderer';
import { InputSuggester } from './ui/inputSuggester';
import { TextProcessor } from './mapper/textProcessor';

export default class TimeControlPlugin extends Plugin
{

    override async onload()
    {
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
    }

    override onunload(): void
    {
        console.log('Time control unloaded!');
    }

    async loadSettings() {
        Settings.instance = { ...Settings.instance, ...await this.loadData() };
    }

    async saveSettings() {
        await this.saveData(Settings.instance);
    }
}
