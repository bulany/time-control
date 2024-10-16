
import { Plugin, Notice, MarkdownPostProcessorContext } from 'obsidian';

export class SickDiaryPlugin {
  plugin : Plugin | null = null;

	async onload(plugin : Plugin) {
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor('sick', this.processCodeBlock);
		console.log('sick diary onload');
	}

	async onunload() {
		console.log('sick diary onunload');
	}

  processCodeBlock(source: string, 
    el: HTMLElement, 
    ctx: MarkdownPostProcessorContext)
  {
    console.log('process', el);
  }
}