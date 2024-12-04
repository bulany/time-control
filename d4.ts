import * as d3 from 'd3'

export class SvgTemplate {
  x : string | number = 0;
  y : string | number = 0;
  width : string | number = '100%';
  height : string | number = '100%';
  xUnits : number  = 100; 
  yUnits : number = 100;

  constructor() {
  }

  appendTo(g: any) {
    return g.append('svg')
      .attr('x', this.x)
      .attr('y', this.y)
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewport', `[0 0 ${this.xUnits} ${this.yUnits}]`);
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
    return g.append('line')
      .attr('x1', this.x)
      .attr('x2', this.x)
      .attr('y1', this.y1)
      .attr('y2', this.y2)
      .attr('stroke', this.stroke);
  }
}

function pc(n : number) { return n + '%'; }

export class TicksTemplate {

  timeBase : d3.CountableTimeInterval = d3.timeHour;
  t1 : Date = new Date();
  t2 : Date = d3.timeDay.offset(this.t1, 1);
  steps : Array<number> = [];
  top : number = 0;
  bottom : number = 100; 

  constructor() {

  }

  appendTo(g : any) {
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