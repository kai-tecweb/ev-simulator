/**
 * Chart.js グラフ初期化・再描画
 */

let chartUnits = null;
let chartShinidemi = null;
let chartMonthly = null;

function destroyCharts() {
  if (chartUnits) { chartUnits.destroy(); chartUnits = null; }
  if (chartShinidemi) { chartShinidemi.destroy(); chartShinidemi = null; }
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
    const fuel = C.monthlyFuel(s.annualKm, s.fuelEfficiency, s.dieselPrice, u);
    const power = C.monthlyPower(s.annualKm, s.evEfficiency, u);
    const elec = C.monthlyElecCost(power, s.routePct, s.homeRate, s.routeRate);
    const equip = C.monthlyEquipCost(s.equipPrice, u, s.equipDeprecYears);
    const vehicle = C.monthlyVehicleDiff(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, u, s.vehicleDeprecYears);
    const maint = C.monthlyMaintenanceDiff(s.dieselMaintenance, s.evMaintenance, u);
    savings.push(C.monthlySaving(fuel, elec, equip, vehicle, maint));
  }

  chartUnits = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '月間削減額（円）',
        data: savings,
        backgroundColor: 'rgba(0, 166, 81, 0.7)',
        borderColor: '#00a651',
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

function drawChartShinidemi() {
  const ctx = document.getElementById('chart-shinidemi');
  if (!ctx) return;
  if (chartShinidemi) chartShinidemi.destroy();

  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const monthlyPowerKwh = C.monthlyPower(s.annualKm, s.evEfficiency, s.units);
  const prices = [];
  const profits = [];
  for (let p = 10; p <= 40; p += 1) {
    prices.push(p);
    profits.push(C.shinidemiProfit(monthlyPowerKwh, p, s.buyPrice));
  }

  const currentPrice = s.sellPrice;
  const currentProfit = C.shinidemiProfit(monthlyPowerKwh, currentPrice, s.buyPrice);

  chartShinidemi = new Chart(ctx, {
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
        const ctx = chart.ctx;
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

function drawChartMonthly() {
  const ctx = document.getElementById('chart-monthly');
  if (!ctx) return;
  if (chartMonthly) chartMonthly.destroy();

  if (typeof DUMMY_MONTHLY_POWER === 'undefined') return;
  const s = window.getFormState();
  if (!s) return;

  const nightCosts = DUMMY_MONTHLY_POWER.night.map((kwh) => kwh * s.homeRate);
  const dayCosts = DUMMY_MONTHLY_POWER.day.map((kwh) => kwh * s.homeRate);

  chartMonthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: DUMMY_MONTHLY_POWER.labels,
      datasets: [
        { label: '深夜充電', data: nightCosts, borderColor: '#003087', tension: 0.2 },
        { label: '昼間充電', data: dayCosts, borderColor: '#00a651', tension: 0.2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          ticks: { callback: (v) => v.toLocaleString() },
        },
      },
    },
  });
}

function redrawCharts() {
  const panel = document.getElementById('tab-result');
  if (!panel || !panel.classList.contains('active')) return;
  drawChartUnits();
  drawChartShinidemi();
  drawChartMonthly();
}

window.redrawCharts = redrawCharts;
