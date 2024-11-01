import {
  Plugin,
  Notice,
  MarkdownPostProcessorContext,
  MarkdownView
} from 'obsidian';

import {
  getAPI
} from 'obsidian-dataview'

const api = getAPI();

import { syntaxTree } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

import moment from 'moment';
import * as d3 from 'd3';

function toMoment(date: string) {
  const dateFormat = 'DD/MM/YYYY';
  const momentDate = moment(date, dateFormat);
  return momentDate;
}

function calculateDaysBetween(date1: string, date2: string) {
  const momentDate1 = toMoment(date1);
  const momentDate2 = toMoment(date2);
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
  id: string = ''
  start: string = ''
  end: string = ''
  sickness: number = 0
  summary: string = ''
  seenCount: number = 0

  days() {
    return calculateDaysBetween(this.start, this.end);
  }

  progressSvg() {

    // Convert dates to day of year
    const startDayOfYear = toMoment(this.start).dayOfYear();
    const endDayOfYear = toMoment(this.end).dayOfYear();
    const daysInYear = toMoment(this.start).isLeapYear() ? 366 : 365;

    // SVG dimensions
    const width = 400;
    const height = 60;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const barHeight = 20;

    // Create SVG
    const svg = d3.create('svg')
      .attr('width', width)
      .attr('height', height);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([1, daysInYear])
      .range([margin.left, width - margin.right]);

    // Draw background bar
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', barHeight)
      .attr('fill', '#eee');

    // Draw progress bar
    svg.append('rect')
      .attr('x', xScale(startDayOfYear))
      .attr('y', margin.top)
      .attr('width', xScale(endDayOfYear) - xScale(startDayOfYear))
      .attr('height', barHeight)
      .attr('fill', '#ee98db');

    return svg;

  }



  static fromObject(obj: any) {
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

/*
Might be able to abandon this whole plugin with a dataviewjs code block like this:

```dataviewjs
console.log(dv.current());
dv.list(dv.current().sick);
```
*/

export class SickDiaryPlugin {
  plugin: Plugin | null = null;
  codeBlocks: Map<string, SickValue> = new Map();

  async onload(plugin: Plugin) {
    this.plugin = plugin;

    this.plugin.registerEvent(plugin.app.metadataCache.on("dataview:index-ready",
      () => { console.log('data index ready'); })
    );

    this.plugin.registerEvent(plugin.app.metadataCache.on("dataview:metadata-change",
      (type, file, cache) => { console.log('metadata changed'); })
    );

    // Follow dataviews example...
    const priority = 200; // dataviews one is 100, so we want to run after that
    const p = this.plugin.registerMarkdownPostProcessor(async (el, ctx) => {
      console.log('hey', el.tagName.toLowerCase(), el.className, el.textContent);
      for (let p of el.findAllSelf("p,h1,h2,h3,h4,h5,h6,li,span,th,td")) {
        
        console.log('hey there', p.nodeName, p.className, p.innerText);
        const inlineFields = el.querySelectorAll('inline-field')
        inlineFields.forEach(field => {
          const text = field.textContent;
          console.log('field:', text);
        })
      }

    }, priority);


    this.plugin.registerMarkdownCodeBlockProcessor('sick', (source: string,
      el: HTMLElement,
      ctx: MarkdownPostProcessorContext) => {
      const blockId = `${ctx.sourcePath}-${ctx.getSectionInfo(el)?.lineStart}`;
      const block = this.codeBlocks.get(blockId);
      if (block) {
        block.seenCount++;
        console.log('block: ', block.id, 'seenCount: ', block.seenCount);

      } else {
        const pre = el.createEl('pre');
        const obj = parseSimpleYaml(source);
        const val = SickValue.fromObject(obj);
        if (val) {
          pre.appendChild(val.progressSvg().node()!);
          pre.addEventListener('click', () => {
            const parentCodeBlock = pre.closest('.cm-preview-code-block');
            if (parentCodeBlock) {
              const editButton = parentCodeBlock.querySelector('.edit-block-button');
              if (editButton) {
                (editButton as HTMLElement).click();
              }
            }
          });
          val.id = blockId;
          this.codeBlocks.set(blockId, val);
          console.log('added block: ', blockId);
        } else {
          const code = pre.createEl('code');
          code.textContent = source;
        }
      }
    });

    this.scanCurrentFile();
    console.log('sick diary onload!');
  }

  scanCurrentFile() {
    const view = this.plugin?.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    const content = view.editor.getValue();

    // Regex to match ```sick code blocks
    // This handles both ```sick and ``` sick (with space)
    const codeBlockRegex = /```\s*sick\s*\n([\s\S]*?)```/g;

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const blockContent = match[1].trim();
      const blockPosition = match.index;

      console.log('Found sick code block:', {
        content: blockContent,
        position: blockPosition,
        fullMatch: match[0]
      });

      // Process the block content here
    }
  }

  async onunload() {
    this.codeBlocks.clear();
    console.log('sick diary onunload');
  }

}