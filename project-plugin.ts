import { Plugin } from 'obsidian';
import * as d3 from 'd3';

export class ProjectPlugin {
  plugin: Plugin | null = null;
  
  async onload(plugin: Plugin) {
    console.log('project onload');
    this.plugin = plugin;
    this.plugin.registerMarkdownCodeBlockProcessor("project", (source, el) => {
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
      const months = project.duration.months || 0;
      const endDate = d3.timeMonth.offset(startDate, months);
      const missedDates = project.days_missed.map(date => d3.timeParse("%d/%m/%Y")(date));
      const currentDate = new Date();

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
}