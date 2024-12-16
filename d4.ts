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

