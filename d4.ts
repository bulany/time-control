import * as d3 from 'd3'

function pc(n: number) { return n + '%'; }


export class SvgTemplate {
  x: string | number = 0;
  y: string | number = 0;
  width: string | number = '100%';
  height: string | number = '100%';
  xUnits: number = 100;
  yUnits: number = 100;

  constructor() {
  }

  appendTo(g: any) {
    return g.append('svg')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('width', this.width)
      .attr('height', this.height)
    // .attr('viewBox', `0 0 ${this.xUnits} ${this.yUnits}`);
  }
}


export class RectTemplate {
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

export class TickTemplate {
  x: string | number = '0%';
  y1: string | number = '0%';
  y2: string | number = '100%';
  stroke: string = 'black';

  constructor() { }

  appendTo(g: any) {
    const line = g.append('line')
      .attr('x1', this.x)
      .attr('x2', this.x)
      .attr('y1', this.y1)
      .attr('y2', this.y2)
      .attr('stroke', this.stroke);
    return line;
  }
}


export class TicksTemplate {

  timeBase: d3.CountableTimeInterval = d3.timeHour;
  t1: Date = new Date();
  t2: Date = d3.timeDay.offset(this.t1, 1);
  steps: Array<number> = [];
  top: number = 0;
  bottom: number = 100;

  constructor() {

  }

  appendTo(g: any) {
    const x = d3.scaleLinear([this.t1, this.t2], [0, 100]);
    const tickT = new TickTemplate();
    let y1 = this.top;
    let height = this.bottom - this.top;
    const ranges = this.steps.map(step => {
      return this.timeBase.range(this.t1, this.t2, step)
    });
    if (ranges.length > 0) {
      ranges[0].push(this.t2);
    }
    ranges.forEach(range => {
      range.forEach(time => {
        tickT.x = pc(x(time));
        tickT.y1 = y1;
        tickT.y2 = this.bottom;
        tickT.appendTo(g);
      })
      height = height / 2;
      y1 += height;
    });
  }
}

class TextTemplate {
  x: string | number = 0;
  y: string | number = 0;
  text_anchor: string = 'middle';
  dominant_baseline: string = 'middle';
  fill: string | number = '#E0E0E0';
  text: string = 'text'

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

export class ToolTip {
  tooltip: any = null;

  appendTooltip(el: HTMLElement) {
    this.tooltip = d3.select(el).append("div")
      .style("position", "absolute")
      .style("background-color", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("opacity", 0)
      .style("transition", "opacity 0.2s");
  }

  addTip(g: any, text: string) {
    g.on('mouseover', event => {
      const [x1, y1] = d3.pointer(event, g);
      this.tooltip
        .style("opacity", 1)
        .html(text)
        .style("left", `${x1 + 10}px`)
        .style("top", `${y1 + 10}px`);
    })
    g.on('mousemove', event => {
      const [x1, y1] = d3.pointer(event, g);
      this.tooltip
        .style("left", `${x1 + 10}px`)
        .style("top", `${y1 + 10}px`);
    })
    g.on('mouseout', () => {
      this.tooltip
        .style("opacity", 0);
    })
  }


}


export class DayTemplate {

  darkGray: string = '#888';
  lightGray: string = '#ddd';
  colorGradient = d3.scaleLinear([0, 100], [this.darkGray, this.lightGray]);
  symGradient = d3.scaleLinear([0, 50, 100], [0, 100, 0]);
  date: Date = new Date();
  x: number = 0;
  y: number = 0;
  width: number = 100;
  height: number = 40;

  appendTo(g: any) {
    const svgT = new SvgTemplate();
    svgT.height = this.height;

    const svg = svgT.appendTo(g);


    const d1 = d3.timeDay.floor(this.date);
    const d2 = d3.timeDay.offset(d1, 1);
    const dateToPc = d3.scaleLinear([d1, d2], [0, 100]);
    const dateToColor = (d: Date) => this.colorGradient(this.symGradient(dateToPc(d)));
    const x = d3.scaleLinear([d1, d2], [0, this.width]);
    const pcx = (d: Date) => pc(x(d));
    const pcw = (d1: Date, d2: Date) => { return pc(x(d2) - x(d1)); };

    const rectT = new RectTemplate();
    rectT.y = this.y;
    rectT.height = this.height;

    const hrs = d3.timeHour.range(d1, d2, 1);
    hrs.forEach(hour => {
      const nextHour = d3.timeHour.offset(hour, 1);
      rectT.x = pcx(hour);
      rectT.width = pcw(hour, nextHour);
      const halfHour = d3.timeMinute.offset(hour, 30);
      rectT.fill = dateToColor(halfHour);
      const rect = rectT.appendTo(svg);
    });
    return svg;
  }
}


export class HoursGridTemplate {
  yellow = '#fcff9e';
  orange = '#c67700';
  date: Date = new Date();

  appendTo(g: any) {

    const dayT = new DayTemplate();
    dayT.date = this.date;
    dayT.colorGradient = d3.scaleLinear([0, 100], [this.orange, this.yellow]);
    const svg = dayT.appendTo(g);

    const ticksT = new TicksTemplate();
    //ticksT.date = this.date;
    ticksT.top = 0;
    ticksT.bottom = 40;
    ticksT.steps = [6, 3, 1];
    ticksT.appendTo(svg);
    console.log('svg', svg.node());


  }
}

export class HoursBarTemplate {

  appendTo(el: HTMLElement) {
    const now = new Date();
    const d1 = d3.timeDay.floor(now);
    const d2 = d3.timeDay.offset(d1, 1);
    const x = d3.scaleLinear([d1, d2], [0, 100]);

    const sel = d3.select(el);

    const mRect = s => s.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%')


    const mCirc = s => s.append('circle')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', 4)
      .attr('fill', 'white')

    const mSvg = (s, x, y, w, h) => {
      const out = s.append('svg')
        .attr('viewBox', `${x} ${y} ${w} ${h}`)
        .attr('width', '50px')
        .attr('height', '50px')
        .style('margin', '20px')

      mRect(out)
      mCirc(out)
      return out
    }

    const svg1 = mSvg(sel, 0, 0, 100, 100);
    const svg2 = mSvg(sel, 0, 0, 10, 10);
    const svg3 = mSvg(sel, -5, -5, 10, 10);




    const div = sel.append('div')
      .style('width', '100%')
      .style('height', '40px')

    const svg = div.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background', 'steelblue')
      .attr('viewBox', '0 0 100 100');



    svg.append('circle')
      .attr('r', 40)
      .attr('cx', 50)
      .attr('cy', 50)

    svg.append('circle')
      .attr('r', 40)
      .attr('cx', x(now))
      .attr('cy', 50)
      .attr('fill', 'red');

      svg.append('line')
      .attr('x1', 0)
      .attr('y1', 50)
      .attr('x2', x(now))
      .attr('y2', 50)
      .attr('stroke', 'green')

    return svg;
  }
}

export class SaturdayTemplate {
  appendTo(el: HTMLElement) {
    const now = new Date();
    const d1 = d3.timeDay.floor(now);
    const d2 = d3.timeDay.offset(d1, 1);
    const x = d3.scaleLinear([d1, d2], [0, 100]);

    const sel = d3.select(el);


    const mSvg = (s, x, y, w, h) => {
      const out = s.append('svg')
        .attr('width', '100%')
        .attr('height', '50px')
        .style('margin', '5px')

      
      return out
    }

    const svg = mSvg(sel, 0, 0, 100, 100);

    const hours = d3.timeHour.range(d1, d2);
    hours.forEach(hour => {
      const textT = new TextTemplate();
      textT.text = d3.timeFormat('%H')(hour);
      textT.x = x(hour) + '%';
      textT.y = 50;
      textT.fill = 'black';
      textT.appendTo(svg);
    });

    return svg;
  }
}

export function draw_2024_12_15(el : HTMLElement) {
  {
    const svg = d3.select(el).append('svg');
    svg.append('circle')
      .attr('r', 10);
    svg.append('text')
      .attr('x', 50)
      .attr('y', 50)
      .text('default text stroke is black');

    svg.append('text')
      .attr('x', 50)
      .attr('y', 100)
      .text('default svg dimension: 300x150');

    svg.append('circle')
      .attr('r', 5)
      .attr('cx', 150)
      .attr('cy', 75)
      .attr('fill', 'red')
  }
}


export function draw_2024_12_16(el : HTMLElement) {
  const sel = d3.select(el);
  const svg = sel.append('svg');

  const xTicks = d3.ticks(0, 300, 10);
  const yTicks = d3.ticks(0, 150, 10);
  const data = xTicks.map((x, i) => { return {x: x, y: yTicks[i]}});
  svg.selectAll('text')
    .data(data)
    .join('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .text(d => `(${d.x},${d.y})`)

  svg.append('text')
    .text('default svg dim is 300x150');

  return svg;
}

export function draw_2024_12_17(el : HTMLElement) {
  const width = 100;
  const height = 100;
  const margin = 5;
  const vb_data = [
    null,
    '0, 0, 100, 100',
    '0, -20, 100, 100',
    '0, 0, 300, 150'
  ];

  const div = d3.select(el).append('div');
  div.selectAll('svg')
    .data(vb_data)
    .join('svg')
      .attr('viewBox', d => d)
      .attr('width', width + 'px')
      .attr('height', height + 'px')
      .style('margin', margin + 'px')
      .append('circle')
        .attr('r', 10)
}

export function draw_2024_12_18(el : HTMLElement) {

  const width = 100;
  const height = 100;
  const margin = 5;
  const vb1 = [0, 0, width, height];
  const vb2 = [-20, -20, width, height];
  const vb3 = [-50, -50, width, height];
  const s = (d : Array<number>) => `${d[0]} ${d[1]} ${d[2]} ${d[3]}`
  const px = (d : any) => `${d}px`
  const vb_data = [null, s(vb1), s(vb2), s(vb3)];
  const div = d3.select(el).append('div');

  const svg = div.selectAll('svg')
    .data(vb_data)
    .join('svg')
      .attr('viewBox', d => d)
      .attr('width', px(width))
      .attr('height', px(height))
      .style('margin', px(margin));

  svg.append('text')
    .text('hello world');
  
  svg.append('circle')
    .attr('r', 5);
  
}

export function draw_2024_12_19(el : HTMLElement) {
  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;
  const s = (d : Array<number>) => `${d[0]} ${d[1]} ${d[2]} ${d[3]}`

  const width = 100;
  const height = 40;
  const padding = 2;
  const vb_data = [];
  vb_data.push({vb: null, fill: 'green'});
  vb_data.push({vb: s([0, 0, 100, 100]), fill: 'blue'});
  vb_data.push({vb: s([-20, -20, 100, 100]), fill: 'red'});
  vb_data.push({vb: s([-20, 0, 100, 40]), fill: 'steelblue'});

  const div = d3.select(el).append('div')
    .style('padding', px(padding));

  const svg = div.selectAll('svg')
    .data(vb_data)
    .join('svg')
      .attr('viewBox', d => d.vb)
      .attr('width', pc(width))
      .attr('height', px(height))
      .style('border', d => `1px solid ${d.fill}`);

  svg.append('circle')
    .attr('cx', pc(100))
    .attr('cy', px(height/2))
    .attr('r', px(5))
    .attr('fill', d => d.fill);

  svg.append('circle')
    .attr('cx', pc(0))
    .attr('cy', px(height/2))
    .attr('r', px(5))
    .attr('fill', d => d.fill);
}

export function draw_2024_12_20(el : HTMLElement) {
  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;
  const s = (d : Array<number>) => `${d[0]} ${d[1]} ${d[2]} ${d[3]}`

  const width = 100;
  const height = 40;
  const padding = 2;
  const vb_data = [];
  vb_data.push({vb: null, fill: 'green'});
  vb_data.push({vb: s([0, 0, 100, 40]), fill: 'blue'});
  vb_data.push({vb: s([-20, -20, 100, 40]), fill: 'red'});
  vb_data.push({vb: s([-20, 0, 100, 40]), fill: 'steelblue'});

  const div = d3.select(el).append('div')
    .style('padding', px(padding));

  const svg = div.selectAll('svg')
    .data(vb_data)
    .join('svg')
      .attr('viewBox', d => d.vb)
      .attr('width', pc(width))
      .attr('height', px(height))
      .style('border', d => `1px solid ${d.fill}`);

  svg.append('circle')
    .attr('cx', pc(0))
    .attr('cy', height/2)
    .attr('r', 5)
    .attr('fill', d => d.fill); 

  svg.append('circle')
    .attr('cx', pc(100))
    .attr('cy', height/2)
    .attr('r', 5)
    .attr('fill', d => d.fill);

  svg.append('text')
    .attr('x', pc(100))
    .attr('y', height/2)
    .text('100%')
    .attr('fill', d => d.fill)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')

  svg.append('circle')
    .attr('cx', 400)
    .attr('cy', height/2)
    .attr('r', 5)
    .attr('fill', d => d.fill);
  svg.append('text')
    .attr('x', 400)
    .attr('y', height/2)
    .text('400 user')
    .attr('fill', d => d.fill)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')

  svg.append('circle')
    .attr('cx', -400)
    .attr('cy', height/2)
    .attr('r', 5)
    .attr('fill', d => d.fill);
}

export function draw_2024_12_21(el : HTMLElement) {
  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;

  const width = 100;
  const height = 40;
  const padding = 2;

  const div = d3.select(el).append('div')
    .style('padding', px(padding));
  
  const svg = div.append('svg')
    .attr('width', pc(width))
    .attr('height', px(height))
  

  const p1 = {x: 0, y: height/2};
  const p2 = {x: width, y: height/2};

  const p3 = {x: 0, y: height/3};
  const p4 = {x: width/2, y: height/3};

  const p5 = {x: width/2, y: 2*(height/3)};
  const p6 = {x: width, y: 2*(height/3)};

  const p7 = {x: width/4, y: height/5};
  const p8 = {x: 3*(width/4), y: height/5};

  const appendLine = (selection : any, point1 : any, point2 : any) => {
    selection.append('line')
      .attr('x1', pc(point1.x))
      .attr('y1', point1.y)
      .attr('x2', pc(point2.x))
      .attr('y2', point2.y)
      .attr('stroke', 'black')
  }

  appendLine(svg, p1, p2);
  appendLine(svg, p3, p4);
  appendLine(svg, p5, p6);
  appendLine(svg, p7, p8); 
}

export function draw_2024_12_22(el : HTMLElement) {

  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;

  const svgD = {
    append: 'svg',
    width: 100,
    height: 40,
    parent: null
  }

  const width = 100;
  const height = 40;
  const margin = 2;

  const ticks = d3.ticks(0, width, 5);

  const div = d3.select(el).append('div')
    .style('margin', px(margin));

  const svg = div.append('svg')
    .attr('width', pc(width))
    .attr('height', px(height))
    .style('border', '1px solid black');
  
  svg.selectAll('text')
    .data(ticks)
    .join('text')
      .text(d => d)
      .attr('x', d => pc(d))
      .attr('y', height/2)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')

}

export function draw_2024_12_23(el : HTMLElement) {

  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;

  const margin = 2;
  const width = 100;
  const height = 40;

  const x = d3.scaleLinear([0, 100], [2, 98]);

  const div = d3.select(el).append('div')
    .style('margin', px(margin));

  const svg = div.append('svg')
    .attr('width', pc(width))
    .attr('height', px(40))
    .style('border', '1px solid steelblue')
  
  const ticks = [0, 50, 100];

  svg.selectAll('text')
    .data(ticks)
    .join('text')
      .text(d => d)
      .attr('x', d => pc(x(d)))
      .attr('y', height/2)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
}

export function draw_2024_12_24(el : HTMLElement) {
  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;

  const margin = 2;
  const width = 100;
  const height = 40;

  const x = d3.scaleLinear([0, 100], [2, 98]);

  const yLabel = d3.scaleLinear([0, 100], [height, height/2]);
  const yLines = d3.scaleLinear([0, 100], [height/2, 0]);

  const div = d3.select(el).append('div')
    .style('margin', px(margin))

    const svg = div.append('svg')
    .attr('width', pc(width))
    .attr('height', px(40))
    .style('border', '1px solid steelblue')
  
  const ticks = [
    {x: 0, label: true},
    {x: 25, label: false},
    {x: 50, label: true},
    {x: 75, label: false},
    {x: 100, label: true}
  ];

  svg.selectAll('text')
    .data(ticks)
    .join('text')
      .text(d => d.label ? d.x : null)
      .attr('x', d => pc(x(d.x)))
      .attr('y', yLabel(50))
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
  
  svg.selectAll('line')
    .data(ticks)
    .join('line')
      .attr('x1', d => pc(x(d.x)))
      .attr('x2', d => pc(x(d.x)))
      .attr('y1', yLines(0))
      .attr('y2', d => yLines(d.label ? 100 : 50))
      .attr('stroke', 'black')
}

export function draw_2024_12_25(el : HTMLElement) {
  const now = new Date();
  const d1 = d3.timeDay.floor(now);
  const d2 = d3.timeDay.offset(d1, 1);

  const ticks = d3.timeHour.range(d1, d2);
  ticks.push(d2);

  const tickLength = i => {
    if (i % 6 == 0)
      return 100;
    if (i % 3)
      return 50;
    return 25;
  }

  const data = ticks.map((d, i) => {
    return {
      length: tickLength(i),
      text: i % 3 ? d3.timeFormat("%H")(d) : null,
      date: d
    }
  })

  const px = (d : any) => `${d}px`;
  const pc = (d : any) => `${d}%`;

  const margin = 2;
  const width = 100;
  const height = 40;

  const x = d3.scaleLinear([0, width], [0+margin, width-margin]);

  const t = d3.scaleLinear([d1, d2], [0, 100]);

  const yLabel = d3.scaleLinear([0, 100], [height, height/2]);
  const yLines = d3.scaleLinear([0, 100], [height/2, 0]);

  const div = d3.select(el).append('div')
    .style('margin', px(margin))

  const svg = div.append('svg')
  .attr('width', pc(width))
  .attr('height', px(40))
  .style('border', '1px solid steelblue')

  svg.selectAll('text')
  .data(data)
  .join('text')
    .text(d => d.text)
    .attr('x', d => pc(x(t(d.date))))
    .attr('y', yLabel(50))
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'middle')

  svg.selectAll('line')
  .data(data)
  .join('line')
    .attr('x1', d => pc(x(t(d.date))))
    .attr('x2', d => pc(x(t(d.date))))
    .attr('y1', yLines(0))
    .attr('y2', d => yLines(d.length))
    .attr('stroke', 'black')

}

