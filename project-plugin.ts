import { Plugin } from 'obsidian';
import * as d3 from 'd3'
import calendarHeatmap from './calendar-heatmap';
import moment from 'moment';

interface HeatmapData {
  date: Date;
  count: number;
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
      const months = project.duration.months || 0;
      const endDate = d3.timeMonth.offset(startDate, months);
      const missedDates = project.days_missed.map(date => d3.timeParse("%d/%m/%Y")(date));
      const currentDate = new Date();

      const container = el.createDiv({ text: 'placeholder cal' });

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
        var color = '#cd2327';

        // Set overview type (choices are year, month and day)
        var overview = 'year';

        // Handler function
        var print = function (val) {
          console.log(val);
        };

        // Initialize calendar heatmap
        calendarHeatmap.init(example_data, container, color, overview, print);
      })();


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