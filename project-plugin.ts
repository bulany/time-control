import { Plugin } from 'obsidian';
import * as d3 from 'd3'
import calendarHeatmap from './calendar-heatmap';
import moment from 'moment';

interface HeatmapData {
  date: Date;
  count: number;
}

class Svg {
  x: string | number = 0;
  y: string | number = 0;
  width: string | number = '100%';
  height: string | number = '100%';

  constructor() {
  }

  appendTo(g : any) {
    return g.append('svg')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('width', this.width)
      .attr('height', this.height);
  }
}

class Rect {
  x: string | number = 0;
  y: string | number = 0;
  width: string | number = '100%';
  height: string | number = 40;
  fill: string | number = '#E0E0E0';

  constructor() {
  }

  appendTo(g : any) {
    return g.append('rect')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', this.fill);
  }
}





export class ProjectPlugin {
  plugin: Plugin | null = null;

  async onload(plugin: Plugin) {
    console.log('project onload');
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor("project", async (source, el) => {
      // Parse project data from the code block
      let project;
      try {
        project = JSON.parse(source);
      } catch (error) {
        el.createEl("p", { text: "Invalid JSON format." });
        return;
      }

      // Extract and process data

      const startDate = d3.timeParse("%d/%m/%Y")(project.started);
      if (!startDate) {
        el.createEl("p", { text: "Invalid start date." });
        return;
      }

      const durationMonths = project.duration.months || 0;
      const missedDates = project.days_missed.map(date => d3.timeParse("%d/%m/%Y")(date));
      const currentDate = new Date();

      const endDate = d3.timeMonth.offset(startDate, durationMonths);
      const durationDays = d3.timeDay.count(startDate, endDate);
      const completedDays = d3.timeDay.count(startDate, currentDate);
      const completedPercent = Math.round((completedDays / durationDays) * 100);
      const remainingDays = d3.timeDay.count(currentDate, endDate);
      const remainingPercent = 100 - completedPercent;

      const tFormat = d3.timeFormat('%a %e %b %Y (day of year: %j)');

      el.createDiv({ text: `Start date is: ${tFormat(startDate)}` });
      el.createDiv({ text: `End date is: ${tFormat(endDate)}` });
      el.createDiv({ text: `Project will take ${durationDays} days to complete` });
      el.createDiv({ text: `Currently have completed ${completedDays} days (${completedPercent}%)` });
      el.createDiv({ text: `There are ${remainingDays} days remaining (${remainingPercent}%)` });

      this.drawBasicProgress(el, completedDays, remainingDays);
      this.drawSurroundingProgress(el, startDate, endDate);

      // Find the first day of the year of the start date
      const startYear = d3.timeYear.floor(startDate);
      const endYear = d3.timeYear.ceil(d3.timeYear.offset(endDate, 1))
      const years = d3.timeYear.range(startYear, endYear);
      const displayedDays = d3.timeDay.count(startYear, endYear);
      const yFormat = d3.timeFormat('%e %b %Y');
      const yearStrings = years.map(y => yFormat(y));
      el.createDiv({ text: `Displayed days: ${displayedDays}, [${yearStrings.join(', ')}]` });
      /*
            const container = el.createDiv();
      
            (function () {
              // Initialize random data for the demo
              var now = moment().endOf('day').toDate();
              var time_ago = moment().startOf('day').subtract(10, 'year').toDate();
              var example_data = d3.timeDays(time_ago, now).map(function (dateElement, index) {
                return {
                  date: dateElement,
                  details: Array.apply(null, new Array(Math.floor(Math.random() * 15))).map(function (e, i, arr) {
                    return {
                      'name': 'Project ' + Math.ceil(Math.random() * 10),
                      'date': function () {
                        var projectDate = new Date(dateElement.getTime());
                        projectDate.setHours(Math.floor(Math.random() * 24));
                        projectDate.setMinutes(Math.floor(Math.random() * 60));
                        return projectDate;
                      }(),
                      'value': 3600 * ((arr.length - i) / 5) + Math.floor(Math.random() * 3600) * Math.round(Math.random() * (index / 365))
                    }
                  }),
                  init: function () {
                    this.total = this.details.reduce(function (prev, e) {
                      return prev + e.value;
                    }, 0);
                    return this;
                  }
                }.init();
              });
      
              // Set custom color for the calendar heatmap
              //var color = '#cd2327';
              var color = '#fd8312';
      
              // Set overview type (choices are year, month and day)
              var overview = 'year';
      
              // Handler function
              var print = function (val) {
                console.log(val);
              };
      
              // Initialize calendar heatmap
              calendarHeatmap.init(example_data, container, color, overview, print);
            })();
      
      */
      // Generate date range for heatmap
      const days = d3.timeDays(startDate, endDate);

      // Create D3 SVG container
      const width = 750;
      const height = 100;
      const cellSize = 10;

      const svg = d3.select(el)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("class", "heatmap");

      // Create cells
      const color = (date) => {
        if (missedDates.some(d => +d === +date)) return "#cccccc";
        if (+date < +currentDate) return "#00ff00";
        return "#f0f0f0";
      };

      svg.selectAll("rect")
        .data(days)
        .enter()
        .append("rect")
        .attr("x", (d, i) => (i % 30) * (cellSize + 2))
        .attr("y", (d, i) => Math.floor(i / 30) * (cellSize + 2))
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", color);

      // Mark current day, start, and end dates
      svg.append("rect")
        .attr("x", (days.findIndex(d => +d === +currentDate) % 30) * (cellSize + 2))
        .attr("y", Math.floor(days.findIndex(d => +d === +currentDate) / 30) * (cellSize + 2))
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "orange");

      svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "blue");

      svg.append("rect")
        .attr("x", (days.length % 30) * (cellSize + 2))
        .attr("y", Math.floor(days.length / 30) * (cellSize + 2))
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "red");
    });
  }

  async onunload() {
    console.log('project onunload');
  }

  drawBasicProgress(el: HTMLElement, completedDays: number, remainingDays: number) {

    const totalDays = completedDays + remainingDays;

    const margin = { left: 10, right: 10 };
    const clientWidth = el.clientWidth;
    const boundingClientWidth = clientWidth == 0 ? el.getBoundingClientRect().width : clientWidth;
    const fallbackWidth = boundingClientWidth == 0 ? 450 : boundingClientWidth;
    const width = fallbackWidth;
    const barWidth = fallbackWidth - margin.left - margin.right;
    const height = 40;

    const xScale = d3.scaleLinear([0, totalDays], [0, barWidth]);

    const completed = { x: xScale(0), width: xScale(completedDays), color: "#4CAF50", textColor: "white" };
    const remaining = { x: xScale(completedDays), width: xScale(remainingDays), color: "#E0E0E0", textColor: "#666" };


    const svg = d3.select(el)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "heatmap");

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`);

    g.append("rect")
      .attr("x", completed.x)
      .attr("y", 0)
      .attr("width", completed.width)
      .attr("height", height)
      .attr("fill", completed.color);

    if (completed.width > 40) {  // Only show text if there's enough space
      g.append('text')
        .attr('x', completed.width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', completed.textColor)
        .text(completedDays);
    }

    g.append("rect")
      .attr("x", remaining.x)
      .attr("y", 0)
      .attr("width", remaining.width)
      .attr("height", height)
      .attr("fill", remaining.color);

    if (remaining.width > 40) {  // Only show text if there's enough space
      g.append('text')
        .attr('x', remaining.x + remaining.width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', remaining.textColor)
        .text(remainingDays);
    }



  }

  drawSurroundingProgress(el: HTMLElement, startDate: Date, endDate: Date) {

    const width = 100; // percent
    const height = 40;
    const margin = { left: 2, right: 2 };

    const startYear = d3.timeYear.floor(startDate);
    const endYear = d3.timeYear.ceil(endDate);
    const x = d3.scaleLinear([startYear, endYear], [0, width]);
    const pc = (n : number) => n + '%';
    const xp = (d : Date) => pc(x(d));
    const w = (d1: Date, d2 : Date) => { return x(d2) - x(d1); };
    const wp = (d1: Date, d2 : Date) => pc(w(d1, d2));

    // debugging
    const f = d3.timeFormat("%d/%m/%Y");
    const p = d3.timeParse("%d/%m/%Y");
    const testDate = d => {
      console.log('date', f(d), x(d).toFixed(2));
    };

    testDate(startYear);
    testDate(endYear);
    testDate(startDate);
    testDate(endDate);
    testDate(p("01/07/2024"));
    testDate(p("01/01/2025"));
    testDate(p("01/07/2025"));
    testDate(p("31/12/2025"));
    testDate(p("01/01/2027"));



    const nowDate = new Date();
  
    // svg outer container
    const s = new Svg();
    s.width = pc(width);
    s.height = height;
    const svg = s.appendTo(d3.select(el));

    // svg inner container
    s.height = pc(100);
    s.x = pc(margin.left);
    s.width = pc(width - (margin.left + margin.right));
    const cont = s.appendTo(svg);

    // whole period
    const r = new Rect();
    r.appendTo(cont);

    // whole project
    r.x = xp(startDate);
    r.width = wp(startDate, endDate);
    r.fill = 'grey';
    r.appendTo(cont);

    // completed part
    r.x = xp(startDate);
    r.width = wp(startDate, nowDate);
    r.fill = 'blue'
    r.appendTo(cont);

  }


  async getActivityData(): Promise<HeatmapData[]> {
    const files = this.plugin?.app.vault.getMarkdownFiles();
    const activityMap = new Map<string, number>();

    // Count files by creation date
    for (const file of files) {
      const date = new Date(file.stat.ctime);
      const dateStr = date.toISOString().split('T')[0];
      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
    }

    // Convert to heatmap data format
    const data: HeatmapData[] = [];
    activityMap.forEach((count, dateStr) => {
      data.push({
        date: new Date(dateStr),
        count: count
      });
    });

    return data;
  }
}