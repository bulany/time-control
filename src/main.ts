import { Plugin, Notice, MarkdownPostProcessor, MarkdownView, Editor } from 'obsidian';

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
        this.registerMarkdownPostProcessor(this.markDownPostProcessor);
        this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange));
    }

    override onunload(): void
    {
        console.log('Time control unloaded!');
    }

    handleEditorChange = (editor: Editor, view: MarkdownView) => {
        view.previewMode.rerender(true);
        console.log('hey there');
    }

    markDownPostProcessor: MarkdownPostProcessor = (el) => {
        console.log('post proccing');
        const timerRegex = /\[timer:\s*(\d+)m\]/g;
        el.innerHTML.replace(timerRegex, (match, minutes)=>{
            return `<button class="timer-button" data-minutes="${minutes}">${minutes}m Timer</button>`;
        })

        el.querySelectorAll('.timer-button').forEach(button => {
            this.registerDomEvent(button, 'click', (evt) => {
              // Implement timer start logic here
              console.log(`Starting ${button.getAttribute('data-minutes')}m timer`);
            });
          });
    }

    async loadSettings() {
        Settings.instance = { ...Settings.instance, ...await this.loadData() };
    }

    async saveSettings() {
        await this.saveData(Settings.instance);
    }
}
