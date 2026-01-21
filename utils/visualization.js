/**
 * Visualization Utilities
 * Handles chart generation and data visualization
 */

const VisualizationUtils = {
  /**
   * Create a simple bar chart
   */
  createBarChart(container, data, options = {}) {
    const {
      title = '',
      color = '#2E7D32',
      maxHeight = 200,
      showValues = true
    } = options;

    if (!container || !data || data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    
    const html = `
      ${title ? `<h4 style="margin-bottom: 12px;">${title}</h4>` : ''}
      <div class="bar-chart">
        ${data.map(item => {
          const percentage = (item.value / maxValue) * 100;
          const height = (item.value / maxValue) * maxHeight;
          
          return `
            <div class="bar-item" style="height: ${maxHeight}px;">
              ${showValues ? `<span class="bar-value">${item.value}</span>` : ''}
              <div class="bar" style="height: ${height}px; background: ${color};"></div>
              <span class="bar-label">${item.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Create a line chart for rating history
   */
  createLineChart(container, data, options = {}) {
    const {
      title = '',
      colors = {},
      width = 400,
      height = 200
    } = options;

    if (!container || !data || data.length === 0) return;

    // Simple ASCII-style line chart (can be replaced with canvas/SVG)
    const platforms = Object.keys(data[0]).filter(k => k !== 'date');
    
    const html = `
      ${title ? `<h4 style="margin-bottom: 12px;">${title}</h4>` : ''}
      <div class="line-chart" style="width: ${width}px; height: ${height}px;">
        ${platforms.map(platform => {
          const values = data.map(d => d[platform] || 0);
          const maxValue = Math.max(...values);
          const minValue = Math.min(...values);
          
          return `
            <div class="line-series">
              <span class="line-legend" style="color: ${colors[platform] || '#2E7D32'};">
                ${platform}: ${values[values.length - 1] || 0}
              </span>
            </div>
          `;
        }).join('')}
        <div class="chart-note">Rating progression over time</div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Create a radial progress (for streak, completion, etc.)
   */
  createRadialProgress(container, percentage, options = {}) {
    const {
      size = 120,
      color = '#2E7D32',
      label = '',
      value = ''
    } = options;

    if (!container) return;

    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (percentage / 100) * circumference;

    const html = `
      <div class="radial-progress" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}">
          <circle
            cx="${size/2}"
            cy="${size/2}"
            r="45"
            fill="none"
            stroke="#ddd"
            stroke-width="8"
          />
          <circle
            cx="${size/2}"
            cy="${size/2}"
            r="45"
            fill="none"
            stroke="${color}"
            stroke-width="8"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 ${size/2} ${size/2})"
            style="transition: stroke-dashoffset 0.5s ease;"
          />
        </svg>
        <div class="progress-content">
          <div class="progress-value">${value || Math.round(percentage) + '%'}</div>
          ${label ? `<div class="progress-label">${label}</div>` : ''}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Create a heatmap for activity
   */
  createHeatmap(container, data, options = {}) {
    const {
      title = '',
      weeks = 12,
      colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
    } = options;

    if (!container || !data) return;

    // Generate heatmap grid
    const html = `
      ${title ? `<h4 style="margin-bottom: 12px;">${title}</h4>` : ''}
      <div class="heatmap">
        <div class="heatmap-grid">
          ${this.generateHeatmapCells(data, weeks, colors)}
        </div>
        <div class="heatmap-legend">
          <span>Less</span>
          ${colors.map(c => `<div class="legend-cell" style="background: ${c};"></div>`).join('')}
          <span>More</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Generate heatmap cells
   */
  generateHeatmapCells(data, weeks, colors) {
    const cells = [];
    const today = new Date();
    
    for (let week = weeks - 1; week >= 0; week--) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + (6 - day)));
        
        const dateStr = date.toISOString().split('T')[0];
        const log = data.find(d => d.date === dateStr);
        const count = log ? log.problems_solved || 0 : 0;
        
        // Determine color based on count
        let colorIndex = 0;
        if (count > 0) colorIndex = 1;
        if (count > 3) colorIndex = 2;
        if (count > 6) colorIndex = 3;
        if (count > 10) colorIndex = 4;
        
        cells.push(`
          <div 
            class="heatmap-cell" 
            style="background: ${colors[colorIndex]};"
            title="${dateStr}: ${count} problems"
            data-date="${dateStr}"
            data-count="${count}"
          ></div>
        `);
      }
    }
    
    return cells.join('');
  }
};

export default VisualizationUtils;
