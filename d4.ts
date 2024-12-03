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