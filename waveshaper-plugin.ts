import { Plugin } from 'obsidian';
import * as d3 from 'd3';

export class WaveshaperPlugin {
  plugin: Plugin | null = null;
  
  async onload(plugin: Plugin) {
    console.log('waveshaper onload');
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor("waveshaper", (source, el) => {
      el.createDiv({text: "Placeholder"});
      // Parse project data from the code block
      let project;
      try {
        project = JSON.parse(source);
      } catch (error) {
        el.createEl("p", { text: "Invalid JSON format." });
        return;
      }

      // Extract and process data
     
    });
  }

  async onunload() {
    console.log('waveshaper onunload');
  }
}