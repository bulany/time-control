import {
  Plugin,
  Notice,
  MarkdownPostProcessorContext
} from 'obsidian';

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
  start: string = ''
  end: string = ''
  sickness: number = 0
  summary: string = ''

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

    } else {
      const code = pre.createEl('code');
      code.textContent = source;
    }

  }
}