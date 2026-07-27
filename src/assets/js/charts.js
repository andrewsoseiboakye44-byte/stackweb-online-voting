// ============================================================
// STACKWEB — Chart.js Configuration & Wrappers (charts.js)
// ============================================================
// Assumes Chart.js is loaded via CDN:
// <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
// ============================================================

// ── Global Chart Defaults ────────────────────────────────
const COLORS = {
  primary:   '#4f46e5',
  secondary: '#06b6d4',
  accent:    '#f59e0b',
  success:   '#3fb950',
  warning:   '#d29922',
  danger:    '#f85149',
  text:      '#8b949e',
  border:    '#21262d',
  bg:        '#161b22',
};

const PALETTE = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.success,
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

if (typeof Chart !== 'undefined') {
  Chart.defaults.color           = COLORS.text;
  Chart.defaults.borderColor     = COLORS.border;
  Chart.defaults.font.family     = "'Inter', sans-serif";
  Chart.defaults.font.size       = 13;
  Chart.defaults.animation.duration = 600;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;
}

// ── Utility ──────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function palette(count) {
  return Array.from({ length: count }, (_, i) => PALETTE[i % PALETTE.length]);
}

// ── Live Votes Trend (Line Chart) ────────────────────────

/**
 * Render live vote trend line chart
 * @param {string} canvasId
 * @param {string[]} labels - time labels
 * @param {number[]} data - vote counts per interval
 */
export function renderVotesTrendChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  const color = COLORS.primary;
  const rgb = hexToRgb(color);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Votes Cast',
        data,
        borderColor: color,
        backgroundColor: `rgba(${rgb},0.1)`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: COLORS.bg,
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: { grid: { color: COLORS.border } },
        y: { grid: { color: COLORS.border }, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

// ── Votes by Position (Bar Chart) ────────────────────────

/**
 * Render bar chart of votes per candidate per position
 * @param {string} canvasId
 * @param {string[]} labels - candidate names
 * @param {number[]} data - vote counts
 * @param {string} [positionName]
 */
export function renderCandidateBarChart(canvasId, labels, data, positionName = 'Votes') {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: positionName,
        data,
        backgroundColor: palette(data.length).map(c => `rgba(${hexToRgb(c)},0.8)`),
        borderColor: palette(data.length),
        borderWidth: 1.5,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: COLORS.bg,
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: COLORS.border }, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

// ── Voter Turnout (Doughnut Chart) ───────────────────────

/**
 * Render doughnut for voter turnout
 * @param {string} canvasId
 * @param {number} voted
 * @param {number} total
 */
export function renderTurnoutChart(canvasId, voted, total) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  const remaining = Math.max(total - voted, 0);

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Voted', 'Not Voted'],
      datasets: [{
        data: [voted, remaining],
        backgroundColor: [
          `rgba(${hexToRgb(COLORS.primary)},0.85)`,
          `rgba(${hexToRgb(COLORS.border)},0.5)`,
        ],
        borderColor: [COLORS.primary, COLORS.border],
        borderWidth: 1.5,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          backgroundColor: COLORS.bg,
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
        },
      },
    },
  });
}

// ── Token Status (Pie Chart) ─────────────────────────────

/**
 * Render pie chart for token statuses
 * @param {string} canvasId
 * @param {{ unused: number, used: number, expired: number, revoked: number }} counts
 */
export function renderTokenStatusChart(canvasId, counts) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Unused', 'Used', 'Expired', 'Revoked'],
      datasets: [{
        data: [counts.unused, counts.used, counts.expired, counts.revoked],
        backgroundColor: [
          `rgba(${hexToRgb(COLORS.secondary)},0.8)`,
          `rgba(${hexToRgb(COLORS.success)},0.8)`,
          `rgba(${hexToRgb(COLORS.warning)},0.8)`,
          `rgba(${hexToRgb(COLORS.danger)},0.8)`,
        ],
        borderColor: COLORS.bg,
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          backgroundColor: COLORS.bg,
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
        },
      },
    },
  });
}

// ── Update chart data (for live refresh) ─────────────────

/**
 * Update a chart's datasets in place
 * @param {Chart} chart
 * @param {string[]} labels
 * @param {number[]} data
 */
export function updateChartData(chart, labels, data) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update('active');
}
