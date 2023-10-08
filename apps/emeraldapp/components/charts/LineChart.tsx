/** @jsx h */
import { Component, h } from "preact";
import * as d3 from "d3";
import htm from "https://esm.sh/htm@3.1.1";

export function LineChart({ data }) {

    return;
    
  if (!data) data = [
    { x: 1, y: 2 },
  ];

  const margin = { top: 10, right: 20, bottom: 20, left: 30 };
  const width = 500;
  const height = 300;

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.x)])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.y)])
    .range([height - margin.bottom, margin.top]);

  return htm`
    <svg width=${width} height=${height}>
        <path 
        fill="none" 
        stroke="#33C7FF" 
        stroke-width="2" 
        d=${d3.line().x((d) => x(d.x)).y((d) => y(d.y))(data)} />
        <g 
        transform="translate(${margin.left},0)" 
        ref=${(g) => d3.select(g).call(d3.axisLeft(y))} />
        <g 
        transform="translate(0,${height - margin.bottom})" 
        ref=${(g) => d3.select(g).call(d3.axisBottom(x))} />
    </svg>
    `;
}
