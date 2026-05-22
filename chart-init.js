/**
 * Chart.js グラフ初期化・再描画
 */

let chartUnits = null;
let chartShinidemi = null;
let chartShinidemiSub = null;
let chartMonthly = null;

const BAR_COLOR = 'rgba(0, 166, 81, 0.7)';
const BAR_COLOR_ACTIVE = 'rgba(220, 38, 38, 0.85)';
const BAR_BORDER = '#00a651';
const BAR_BORDER_ACTIVE = '#dc2626';

function destroyCharts() {
  if (chartUnits) { chartUnits.destroy(); chartUnits = null; }
  if (chartShinidemi) { chartShinidemi.destroy(); chartShinidemi = null; }
  if (chartShinidemiSub) { chartShinidemiSub.destroy(); chartShinidemiSub = null; }
  if (chartMonthly) { chartMonthly.destroy(); chartMonthly = null; }
}

function drawChartUnits() {
  const ctx = document.getElementById('chart-units');
  if (!ctx) return;
  if (chartUnits) chartUnits.destroy();

  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const labels = [];
  const savings = [];
  for (let u = 1; u <= 10; u++) {
    labels.push(u + '台');
    const fuelL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, u);
    const fuelCost = C.monthlyFuelCost(fuelL, s.dieselPrice);
    const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, u);
    const chargeCost = C.monthlyChargeCost(chargeKwh, s.homeRate);
    const basicCharge = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease);
    savings.push(C.monthlyEnergySaving(fuelCost, chargeCost, basicCharge));
  }
  // 現在の台数（s.units）の棒だけを強調表示
  const bgColors = labels.map((_, i) => (i + 1) === s.units ? BAR_COLOR_ACTIVE : BAR_COLOR);
  const borderColors = labels.map((_, i) => (i + 1) === s.units ? BAR_BORDER_ACTIVE : BAR_BORDER);

  chartUnits = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '月間削減額（円）',
        data: savings,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => v.toLocaleString() },
        },
      },
      plugins: {
        annotation: false,
      },
    },
    plugins: [{
      id: 'hline',
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const yScale = chart.scales.y;
        const zeroY = yScale.getPixelForValue(0);
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, zeroY);
        ctx.lineTo(chart.chartArea.right, zeroY);
        ctx.stroke();
        ctx.restore();
      },
    }],
  });
}

function buildShinidemiChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return null;

  const monthlyPowerKwh = C.monthlyPower(s.annualKm, s.evEfficiency, s.units);
  const prices = [];
  const profits = [];
  for (let p = 10; p <= 40; p += 1) {
    prices.push(p);
    profits.push(C.shinidemiProfit(monthlyPowerKwh, p, s.buyPrice));
  }

  const currentPrice = s.sellPrice;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: prices.map((v) => v + '円'),
      datasets: [{
        label: '月間損益（円）',
        data: profits,
        borderColor: '#003087',
        backgroundColor: 'rgba(0, 48, 135, 0.1)',
        fill: true,
        tension: 0.2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { title: { display: true, text: '販売単価（円/kWh）' } },
        y: {
          title: { display: true, text: '収益予想（円/月）' },
          ticks: { callback: (v) => v.toLocaleString() },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const price = 10 + idx;
              if (Math.abs(price - currentPrice) < 0.5) return ' ← 現在の販売単価';
              return '';
            },
          },
        },
      },
    },
    plugins: [{
      id: 'zeroLine',
      afterDraw: (chart) => {
        const yScale = chart.scales.y;
        const zeroY = yScale.getPixelForValue(0);
        const c = chart.ctx;
        c.save();
        c.strokeStyle = 'red';
        c.setLineDash([5, 5]);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(chart.chartArea.left, zeroY);
        c.lineTo(chart.chartArea.right, zeroY);
        c.stroke();
        c.restore();
      },
    }],
  });
}

function drawChartShinidemi() {
  if (chartShinidemi) chartShinidemi.destroy();
  chartShinidemi = buildShinidemiChart('chart-shinidemi');
}

function drawChartShinidemiSub() {
  if (chartShinidemiSub) chartShinidemiSub.destroy();
  chartShinidemiSub = buildShinidemiChart('chart-shinidemi-sub');
}

function drawChartMonthly() {
  const ctx = document.getElementById('chart-monthly');
  if (!ctx) return;
  if (chartMonthly) chartMonthly.destroy();

  const s = window.getFormState();
  if (!s) return;

  // 月間消費電力(kWh) = 1日走行距離 × 稼働日数 × 台数 ÷ 電費
  const evEff = s.evEfficiency || 5.0;
  const monthlyKwh = (s.dailyKm * s.workDays * s.units) / evEff;
  // 経路充電割合（0-100 → 0-1）
  const routeRatio = (s.routePct || 0) / 100;
  // 深夜充電コスト = 月間消費電力 × (1 - 経路充電割合) × EV充電従量単価
  const nightCost = monthlyKwh * (1 - routeRatio) * s.homeRate;
  // 昼間充電コスト = 月間消費電力 × 経路充電割合 × 経路充電単価
  const dayCost = monthlyKwh * routeRatio * s.routeRate;

  const labels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  // 季節変動なし：全月同値
  const nightCosts = labels.map(() => nightCost);
  const dayCosts = labels.map(() => dayCost);

  chartMonthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '深夜充電（円/月）', data: nightCosts, borderColor: '#003087', backgroundColor: 'rgba(0,48,135,0.1)', tension: 0.2 },
        { label: '昼間（経路）充電（円/月）', data: dayCosts, borderColor: '#00a651', backgroundColor: 'rgba(0,166,81,0.1)', tension: 0.2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: '充電コスト（円/月）' },
          ticks: { callback: (v) => v.toLocaleString() },
        },
      },
    },
  });
}

function redrawCharts() {
  const panel = document.getElementById('tab-result');
  if (panel && panel.classList.contains('active')) {
    drawChartUnits();
    drawChartMonthly();
  }
  // 新出光側サブタブが開いている場合のみ損益分岐グラフを描画
  const subPanel = document.getElementById('subtab-shinidemi');
  if (subPanel && subPanel.classList.contains('active')) {
    drawChartShinidemiSub();
  }
}

window.redrawCharts = redrawCharts;
