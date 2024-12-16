import { Plugin } from 'obsidian';
import * as d3 from 'd3'
import calendarHeatmap from './calendar-heatmap';
import moment from 'moment';
import { SvgTemplate, RectTemplate, TicksTemplate, ToolTip, DayTemplate, HoursGridTemplate, HoursBarTemplate,
  SaturdayTemplate,
  draw_2024_12_15,
  draw_2024_12_16
 } from 'd4'

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

  appendTo(g: any) {
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

  appendTo(g: any) {
    return g.append('rect')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', this.fill);
  }
}

class Text {
  x: string | number = 0;
  y: string | number = 0;
  text_anchor: string = 'middle';
  dominant_baseline: string = 'middle';
  fill: string | number = '#E0E0E0';
  text: string = 'text'

  constructor() { }

  appendTo(g: any) {
    return g.append('text')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('text-anchor', this.text_anchor)
      .attr('dominant-baseline', this.dominant_baseline)
      .attr('fill', this.fill)
      .text(this.text);

  }
}

type D3Selection = d3.Selection<d3.BaseType, unknown, null, undefined>;

function flashColor(g: D3Selection) {
    const origColor = d3.color(g.attr('fill')) ||  d3.gray(50);
    const hslColor = d3.hsl(origColor);
    hslColor.h += 90; // rotate 90 (e.g. turn green into blue)
    const flashColor1 = hslColor?.darker(0.3);
    const flashColor2 = hslColor?.brighter(0.3);
    const anim = g.append('animate')
      .attr('attributeName', 'fill')
      .attr('values', `${flashColor1?.formatHex()}; ${flashColor2?.formatHex()}; ${flashColor1?.formatHex()}`)
      .attr('dur', '1s')
      .attr('repeatCount', 'indefinite')
}

function isWithinDay(day, date) {
  const d1 = d3.timeDay.floor(day);
  const d2 = d3.timeDay.offset(d1, 1);
  return date >= d1 && date < d2;
}

class Tick {
  x: string | number = '0%';
  y1: string | number = '0%';
  y2: string | number = '100%';
  stroke: string = 'black';

  constructor() { }

  appendTo(g: any) {
    return g.append('line')
      .attr('x1', this.x)
      .attr('x2', this.x)
      .attr('y1', this.y1)
      .attr('y2', this.y2)
      .attr('stroke', this.stroke);
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
      this.drawGithubProgress(el, startDate, endDate);
      this.drawTodayProgress(el);
      const hoursBarT = new HoursBarTemplate();
      hoursBarT.appendTo(el);
      const saturdayT = new SaturdayTemplate();
      saturdayT.appendTo(el);
      draw_2024_12_15(el);
      draw_2024_12_16(el);
      

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
    const pc = (n: number) => n + '%';
    const xp = (d: Date) => pc(x(d));
    const w = (d1: Date, d2: Date) => { return x(d2) - x(d1); };
    const wp = (d1: Date, d2: Date) => pc(w(d1, d2));
    const cent = (d1: Date, d2: Date) => { return w(d1, d2) / 2 + x(d1); };
    const cent_pc = (d1: Date, d2: Date) => { return pc(cent(d1, d2)); };

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

    const completed = { color: "#4CAF50", textColor: "white" };
    const remaining = { color: "#E0E0E0", textColor: "#666" };

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
    r.fill = '#eee';
    r.appendTo(cont);

    // whole project
    r.x = xp(startDate);
    r.width = wp(startDate, endDate);
    r.fill = remaining.color;
    r.appendTo(cont);

    // completed part
    r.x = xp(startDate);
    r.width = wp(startDate, nowDate);
    r.fill = completed.color;
    r.appendTo(cont);

    // completed label
    const t = new Text();
    t.text = `${d3.timeDay.count(startDate, nowDate)}`;
    t.x = cent_pc(startDate, nowDate);
    t.y = height / 2;
    t.fill = completed.textColor;
    t.appendTo(cont);

    // remaining label
    t.text = `${d3.timeDay.count(nowDate, endDate)}`;
    t.x = cent_pc(nowDate, endDate);
    t.y = height / 2;
    t.fill = remaining.textColor;
    t.appendTo(cont);

    // year labels
    const years = d3.timeYear.range(startYear, endYear);
    years.forEach(year => {
      const nextYear = d3.timeYear.offset(year, 1);
      t.text = d3.timeFormat('%Y')(year);
      t.x = cent_pc(year, nextYear);
      t.appendTo(cont);
    });

    // Yearly ticks
    const tick = new Tick();
    tick.y1 = pc(0);
    tick.y2 = pc(100);
    const yearly = d3.timeYear.range(startYear, endYear, 1);
    yearly.push(endYear);
    yearly.forEach(m => {
      tick.x = xp(m);
      tick.appendTo(cont);
    });

    // 6 month ticks
    tick.y1 = pc(100-50);
    const sixMonths = d3.timeMonth.range(startYear, endYear, 6);
    sixMonths.push(endYear);
    sixMonths.forEach(m => {
      tick.x = xp(m);
      tick.appendTo(cont);
    });

    // 3 month ticks
    tick.y1 = pc(100-25);
    const threeMonths = d3.timeMonth.range(startYear, endYear, 3);
    threeMonths.forEach(m => {
      tick.x = xp(m);
      tick.appendTo(cont);
    });

    // 1 month ticks
    tick.y1 = pc(100-12.5);
    const oneMonths = d3.timeMonth.range(startYear, endYear, 1);
    oneMonths.forEach(m => {
      tick.x = xp(m);
      tick.appendTo(cont);
    });

  }

  drawGithubProgress(el: HTMLElement, startDate: Date, endDate: Date) {

    const numWeekDays = 7;
    const squareHeight = 15;
    const squareSpace = 4;
    const width = 100; // percent
    const height = numWeekDays * squareHeight + (numWeekDays - 1) * squareSpace;
    const margin = { left: 2, right: 2 };

    const startYear = d3.timeYear.floor(startDate);
    const startMonday = d3.timeMonday.floor(startYear);
    const endYear = d3.timeMonth.offset(startYear, 24);
    const endMonday = d3.timeMonday.ceil(endYear);
    const x = d3.scaleLinear([startMonday, endMonday], [0, width]);
    const pc = (n: number) => n + '%';
    const xp = (d: Date) => pc(x(d));
    const w = (d1: Date, d2: Date) => { return x(d2) - x(d1); };
    const wp = (d1: Date, d2: Date) => pc(w(d1, d2));
    const cent = (d1: Date, d2: Date) => { return w(d1, d2) / 2 + x(d1); };
    const cent_pc = (d1: Date, d2: Date) => { return pc(cent(d1, d2)); };

    // tooltip
    const tooltip = d3.select(el).append("div")
    .style("position", "absolute")
    .style("background-color", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "5px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0)
    .style("transition", "opacity 0.2s");

    // debugging
    const f = d3.timeFormat("%d/%m/%Y");
    const testDate = d => {
      console.log('my date', f(d), x(d).toFixed(2));
    };
    testDate(startYear);
    testDate(startMonday);
    testDate(endMonday);
    testDate(endYear);

    const nowDate = new Date();

    const svg = new Svg();
    svg.height = height;
    const cont = svg.appendTo(d3.select(el));
    cont.style('cursor', 'default');
    const rect = new Rect();
    rect.height = height;
    rect.fill = '#eee';
    rect.appendTo(cont);


    const color = (date : Date, status : string) => {
      let baseColor = d3.color('#dddddd'); // grey
      if (status == 'completed') {
        baseColor = d3.color('#40c463'); // github green
      } else if (status == 'pending') {
        baseColor = d3.color('#ff6a6a'); // 'indian' red
      }
      const c1 = baseColor;
      const c2 = c1.brighter(0.5);
      const colorFn = d3.scaleLinear([0, 1], [c1.formatHex(), c2.formatHex()]);
      return colorFn(date.getMonth() % 2);
    }

    const weeks = d3.timeMonday.range(startMonday, endMonday);
    rect.fill = 'green';
    const widthPlus = (100 / weeks.length);
    console.log('hey there', weeks.length);
    rect.width = pc(0.90 * widthPlus);
    rect.height = squareHeight;
    weeks.forEach(week => {
      rect.x = xp(week);
      const days = d3.timeDay.range(week, d3.timeWeek.offset(week, 1));
      let dayNum = 0;
      days.forEach(day => {
        rect.y = dayNum * (squareHeight + squareSpace);
        let status = 'outside';
        if (day > startDate && day < endDate) {
          status = day <= nowDate ? 'completed' : 'pending';
        }
        rect.fill = color(day, status);
        dayNum++;
        const r = rect.appendTo(cont);
        r.on('mouseover', event => {
          const [x1, y1] = d3.pointer(event, el);
          tooltip
          .style("opacity", 1)
          .html(`${f(day)}`)
          .style("left", `${x1 + 10}px`)
          .style("top", `${y1 + 10}px`);
        })
        r.on('mousemove', event => {
          const [x1, y1] = d3.pointer(event, el);
          tooltip
          .style("left", `${x1 + 10}px`)
          .style("top", `${y1 + 10}px`);
        })
        r.on('mouseout', () => {
          tooltip
          .style("opacity", 0);
        })
        if (isWithinDay(day, nowDate)) {
          flashColor(r);
        }
      })
    });

  }

  drawTodayProgress(el : HTMLElement) {
    const margin = 20;
    const legendHeight = 20
    const barHeight = 40;
    const totalHeight = 2*legendHeight + barHeight;

    const div = d3.select(el).append('div')
      .style('margin', '5px');

    const svgT = new Svg();
    svgT.height = totalHeight;
    const svg = svgT.appendTo(div);

    const rectT = new Rect();
    rectT.height = barHeight;
    rectT.y = legendHeight;
    rectT.fill = 'steelblue';
    rectT.appendTo(svg);

    const nowDate = new Date();


    const d1 = d3.timeDay.floor(nowDate);
    const d2 = d3.timeDay.offset(d1, 1);
    const x = d3.scaleLinear([d1, d2], [0, 100]);
    const pc = (d : number) => d + '%';
    const pcx = (d : Date) => pc(x(d));
    const pcw = (d1 : Date, d2 : Date) => { return pc(x(d2) -  x(d1)); };


    
    // Color gradient rectangles
    const g1 = '#888';
    const g2 = '#ddd';
    const c1 = d3.scaleLinear([0, 50, 100], [g1, g2, g1]);
    const c2 = d3.scaleLinear([d1, d2], [0, 100]);
    const c3 = (d : Date) => c1(c2(d));

    const darkGray = g1;
    const lightGray = g2;
    const red = '#800';
    const blue = '#008';
    const yellow = '#fcff9e';
    const orange = '#c67700';


    const dayT = new DayTemplate();
    dayT.colorGradient = d3.scaleLinear([0, 100], [orange, yellow]);
    dayT.appendTo(d3.select(el));

    const hoursGridT = new HoursGridTemplate();
    hoursGridT.appendTo(d3.select(el));    

    const tooltip = new ToolTip();
    tooltip.appendTooltip(el);

    const hrs = d3.timeHour.range(d1, d2, 1);
    hrs.forEach(hour => {
      const nextHour = d3.timeHour.offset(hour, 1);
      rectT.x = pcx(hour);
      rectT.width = pcw(hour, nextHour);
      rectT.fill = c3(hour);
      const rect = rectT.appendTo(svg);
      tooltip.addTip(rect, hour.getHours() + '');
    });

    // Ticks
    const ticksT = new TicksTemplate();
    ticksT.timeBase = d3.timeHour;
    ticksT.t1 = d3.timeDay.floor(nowDate);
    ticksT.t2 = d3.timeDay.offset(ticksT.t1, 1);
    ticksT.steps = [6, 3, 1];
    ticksT.top = legendHeight;
    ticksT.bottom = legendHeight + barHeight;
    ticksT.appendTo(svg);

    // now tick
    const tickT = new Tick();
    tickT.x = `${x(nowDate)}%`;
    tickT.stroke = 'red';
    tickT.appendTo(svg);

    // Hours legend
    const hours = d3.timeHour.range(ticksT.t1, ticksT.t2, 3);
    const hourLabels = hours.map(hour => {return {x: x(hour), text: hour.getHours()}});
    hourLabels.push({x: x(ticksT.t2), text: 24})
    const textT = new Text();
    textT.fill = 'black';
    textT.y = legendHeight + barHeight + legendHeight/2;
    hourLabels.forEach(label => {
      textT.x = `${label.x}%`
      textT.text = label.text + '';
      textT.appendTo(svg);
    });





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