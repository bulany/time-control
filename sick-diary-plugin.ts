
import { Plugin, Notice, MarkdownPostProcessorContext } from 'obsidian';


function parseSimpleYaml(input : string) {
  const lines = input.split('\n');
  const output : any = {};
  lines.forEach(line => {
    const [key, value] = line.split(': ');
    if (key && value)
      output[key] = value;
  })
  return output;
}

class SickValue {
  start: string = ''
  end: string = ''
  sickness: number = 0
  summary: string = ''
}

function validateSickValue(obj:any) {

  const outObj : any = {};
  if (!obj.start)
    return null
  outObj.start = obj.start;
  if (!obj.end)
    return null
  outObj.end = obj.end;
  if (!obj.sickness)
    return null
  outObj.sickness = obj.sickness;
  outObj.summary = obj.summary ? obj.summary : ''
  const output = outObj as SickValue;
  return output;
}

const things : Array<any> = [];
let id : number = 0;

export class SickDiaryPlugin {
  plugin : Plugin | null = null;
  values : Array<SickValue> = [];

	async onload(plugin : Plugin) {
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor('sick', this.processDataBlock);
		console.log('sick diary onload');
	}

	async onunload() {
		console.log('sick diary onunload');
	}

  processDataBlock(source: string, 
    el: HTMLElement, 
    ctx: MarkdownPostProcessorContext)
  {
    const pre = el.createEl('pre');
    const code = pre.createEl('code');
    code.textContent = source;
    console.log('process1', source);
    const obj = parseSimpleYaml(source);
    const val = validateSickValue(obj);
    if (val) {
      
      const i = things.findIndex(obj => obj.el == el);
      if (i < 0) {
        things.push({id, el, val})
        console.log('new value', id);
        id++;
      }
      else {
        console.log('found old value', things[i].id)
      }
      
    }

  }
}