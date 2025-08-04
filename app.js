const params = {
  scene: 0,
  dates: [],
  currentDateIdx: 0,
  globalTotals: [],
  byCountry: []
};

const subtitles = [
  "This line graph shows the cumulative global confirmed cases over time. Hover over any point on the line for the exact date & confirmed cases count.",
  "This horizontal bar graph shows the top 10 countries by total latest confirmed cases. Hover over the bars for exact counts.",
  "For this graph, slide to choose a date, then hover over the bars for details!"
];

const scenes = [scene1, scene2, scene3];

const chartw = 1000;
const charth = 800;

d3.csv("time_series_covid19_confirmed_global.csv").then(raw => {
  params.dates = raw.columns.slice(4);
  params.globalTotals = params.dates.map(date => ({
    date,
    total: d3.sum(raw, d => +d[date])
  }));

  params.byCountry = params.dates.map(date =>
    raw.map(d => ({
      country: d["Country/Region"],
      value: +d[date]
    }))
  );

  d3.select("#date-slider")
    .attr("max", params.dates.length - 1)
    .on("input", function() {
    params.currentDateIdx = +this.value;
    updateScene();
  });

  d3.select("#next").on("click", () => {
    params.scene = Math.min(params.scene + 1, scenes.length - 1);
    updateScene();
  });
  d3.select("#prev").on("click", () => {
    params.scene = Math.max(params.scene - 1, 0);
    updateScene();
  });

  updateScene();
});

function updateScene() {
  const titles = [
    "Global Trend: Total Confirmed Cases",
    "Snapshot: Top 10 Countries (Latest)",
    "Explore by Date"
  ];
  d3.select("#scene-title").text(titles[params.scene]);
  d3.select("#subtitle").text(subtitles[params.scene]);

  d3.select("#explore-controls").classed("hidden", params.scene !== 2);
  d3.select("#chart").selectAll("*").remove();
  d3.select("#annotation").html("");

  scenes[params.scene]();
}

function scene1() {
  const svg = d3.select("#chart").attr("width", chartw).attr("height", charth);
  const data = params.globalTotals;
  const margin = {top:150, right:20, bottom:40, left:140};
  const w = chartw - margin.left - margin.right;
  const h = charth - margin.top - margin.bottom;

  const x = d3.scaleTime().domain(d3.extent(data, d => new Date(d.date))).range([0, w]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).nice().range([h, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class","axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6));

  const line = d3.line().x(d => x(new Date(d.date))).y(d => y(d.total));

  g.append("path")
    .datum(data)
    .attr("fill","none")
    .attr("stroke","#e6550d")
    .attr("stroke-width",2)
    .attr("d", line);

  const tooltip = d3.select("body").append("div").attr("class","tooltip hidden");

  g.selectAll("circle").data(data).join("circle")
      .attr("cx", d => x(new Date(d.date)))
      .attr("cy", d => y(d.total))
      .attr("r", 4)
      .attr("fill", "#e6550d")
      .on("mouseover", (event,d) => {
        tooltip
          .html(
            `<strong>${d3.timeFormat("%b %d, %Y")(new Date(d.date))}</strong><br>` +
            `${d3.format(",")(d.total)} cases`
          )
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px")
          .classed("hidden", false);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });

  const peak = data.reduce((a,b) => b.total > a.total ? b : a, data[0]);
  const ann = [{
    note: {
      title: "Global peak",
      label: `${d3.timeFormat("%b %d, %Y")(new Date(peak.date))}\n${d3.format(",")(peak.total)} cases`,
      wrap: 120
    },
    x: x(new Date(peak.date)),
    y: y(peak.total),
    dx: -80,
    dy: -50
  }];

  const makeAnn = d3.annotation()
    .type(d3.annotationLabel)
    .annotations(ann);

  d3.select("#annotation")
    .append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .call(makeAnn);
}

function scene2() {
  const svg = d3.select("#chart").attr("width", chartw).attr("height", charth);

  const idx = params.dates.length - 1;
  const data = params.byCountry[idx]
    .filter(d => d.value > 0)
    .sort((a,b) => b.value - a.value)
    .slice(0,10);

  const margin = {top:150, right:20, bottom:40, left:140};
  const w = chartw - margin.left - margin.right;
  const h = charth - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.country)).range([0, h]).padding(0.1);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class","axis").call(d3.axisLeft(y));
  g.append("g").attr("class","axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

  const tooltip = d3.select("body").append("div").attr("class","tooltip hidden");

  g.selectAll("rect").data(data).join("rect")
    .attr("y", d => y(d.country))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", d => x(d.value))
    .attr("fill", "#3182bd")
    .on("mouseover", (event, d) => {
      tooltip
        .html(`<strong>${d.country}</strong><br/>${d3.format(",")(d.value)} cases`)
        .style("left", `${event.pageX + 5}px`)
        .style("top", `${event.pageY - 28}px`)
        .classed("hidden", false);
    })
    .on("mouseout", () => {
      tooltip.classed("hidden", true);
    });

  const top = data[0];
  const ann = [{
    note: {
      title: top.country,
      label: `${d3.format(",")(top.value)} cases`,
      wrap: 80
    },
    x: x(top.value),
    y: y(top.country) + y.bandwidth()/2,
    dx: -100,
    dy: -20
  }];

  const makeAnn = d3.annotation().type(d3.annotationCallout).annotations(ann);

  d3.select("#annotation").append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .call(makeAnn);
}

function scene3() {
  const svg = d3.select("#chart").attr("width", chartw).attr("height", charth);

  const idx = params.currentDateIdx;
  const date = params.dates[idx];
  const data = params.byCountry[idx].filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0,15);

  d3.select("#slider-value").text(date);

  const margin = {top:40, right:20, bottom:40, left:140};
  const w = chartw - margin.left - margin.right;
  const h = charth - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.country)).range([0, h]).padding(0.1);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class","axis").call(d3.axisLeft(y));
  g.append("g").attr("class","axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

  let tooltip = d3.select("body").selectAll(".tooltip").data([null]);
  tooltip = tooltip.enter().append("div").attr("class", "tooltip hidden").merge(tooltip);

  g.selectAll("rect")
    .data(data)
    .join("rect")
      .attr("y", d => y(d.country))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d.value))
      .on("mouseover", (event, d) => {
        tooltip
          .html(`<strong>${d.country}</strong><br/>${d3.format(",")(d.value)}`)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px")
          .classed("hidden", false);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });
}
