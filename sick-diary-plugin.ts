import {
  Plugin,
  Notice,
  MarkdownPostProcessorContext
} from 'obsidian';

import moment from 'moment';
import * as d3 from 'd3';

function calculateDaysBetween(date1 : string, date2 : string) {
  const dateFormat = 'DD/MM/YYYY';
  const momentDate1 = moment(date1, dateFormat);
  const momentDate2 = moment(date2, dateFormat);
  const days = momentDate2.diff(momentDate1, 'days');
  return Math.abs(days); 
}

function parseSimpleYaml(input: string) {
  const lines = input.split('\n');
  const output: any = {};
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

  days() {
    return calculateDaysBetween(this.start, this.end);
  }

  static fromObject(obj : any) {
    const outObj = new SickValue();
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
    return outObj;    
  }
}

const things: Array<any> = [];
let id: number = 0;

export class SickDiaryPlugin {
  plugin: Plugin | null = null;
  values: Array<SickValue> = [];

  async onload(plugin: Plugin) {
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor('sick', this.processDataBlock);
    console.log('sick diary onload');
  }

  async onunload() {
    console.log('sick diary onunload');
  }

  processDataBlock(source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext) {
    const pre = el.createEl('pre');
    const code = pre.createEl('code');
    code.textContent = source;
    console.log('process1', source);
    const obj = parseSimpleYaml(source);
    const val = SickValue.fromObject(obj);
    if (val) {

      const i = things.findIndex(v => v.el == el);
      if (i < 0) {
        things.push({ id, el, val })
        console.log('new value', val);
        console.log('days between', val.days());
        id++;
      }
      else {
        console.log('found old value', things[i].id)
      }

    }

  }
}