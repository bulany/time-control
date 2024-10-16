
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
    const pre = el.createEl('pre');
    const code = pre.createEl('code');
    code.textContent = source;
    console.log('process1', source);

  }
}