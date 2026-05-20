/**
 * 顧客専用ページ - ロジック
 * URLパラメータ ?id=UUID でSupabaseから顧客データを取得し、
 * 台数選択のみで試算結果をリアルタイム表示する。
 */

let clientParams = null;  // Supabaseから取得したパラメータ
let selectedUnits = 1;    // 選択中の台数
let chartUnitsClient = null;
let chartShinidemiClient = null;

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  if (!clientId) {
    showError('URLが無効です。顧客IDが指定されていません。');
    return;
  }

  try {
    const SC = window.SupabaseClient;
    if (!SC) throw new Error('システムの初期化に失敗しました');

    const client = await SC.getClientById(clientId);
    if (!client) throw new Error('顧客データが見つかりません');

    clientParams = client.params;
    selectedUnits = clientParams.units || 1;

    // 会社名表示
    document.getElementById('client-company-name').textContent =
      '| ' + client.company_name + ' 様';
    document.title = 'EV導入効果試算 | ' + client.company_name;

    // 台数ボタン生成（1〜max(5, 登録台数)）
    const maxUnits = Math.max(5, selectedUnits);
    renderUnitsButtons(maxUnits);

    // getFormState互換のオブジェクトを作る（export.jsで使用）
    setupFormStateProxy();

    // 初回計算・表示
    recalculate();

    // ローディング非表示、メイン表示
    document.getElementById('client-loading').style.display = 'none';
    document.getElementById('client-main').style.display = 'block';

    // Excel出力ボタン
    document.getElementById('btn-client-export').addEventListener('click', () => {
      if (typeof exportToExcel === 'function') exportToExcel();
    });

  } catch (err) {
    showError(err.message);
  }
});

function showError(message) {
  document.getElementById('client-loading').style.display = 'none';
  const errorEl = document.getElementById('client-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

// 台数ボタンを描画
function renderUnitsButtons(max) {
  const container = document.getElementById('units-buttons');
  container.innerHTML = '';
  for (let u = 1; u <= max; u++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'units-btn' + (u === selectedUnits ? ' active' : '');
    btn.textContent = u + '台';
    btn.addEventListener('click', () => {
      selectedUnits = u;
      container.querySelectorAll('.units-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalculate();
    });
    container.appendChild(btn);
  }
}

// getFormState のプロキシ（export.js がこれを使う）
function setupFormStateProxy() {
  window.getFormState = () => {
    const p = clientParams;
    const ev = (window.EV_MASTER && window.EV_MASTER[p.evModel]) || {
      efficiency: p.evEfficiency || 5.0,
    };
    const dailyKm = p.dailyKm || 0;
    const workDays = p.workDays || 0;
    // 旧データ互換：dailyKm/workDays が無い場合は annualKm から逆算
    const annualKm = (dailyKm && workDays) ? (dailyKm * workDays * 12) : (p.annualKm || 0);
    return {
      evModel: p.evModel || '',
      evEfficiency: ev.efficiency || p.evEfficiency,
      units: selectedUnits,
      dailyKm,
      workDays,
      annualKm,
      fuelEfficiency: p.fuelEfficiency || 10,
      dieselPrice: p.dieselPrice || 0,
      dieselMaintenance: p.dieselMaintenance || 0,
      equipPrice: p.equipPrice || 0,
      homeRate: p.homeRate || 0,
      basicRate: p.basicRate || 0,
      capacityRate: p.capacityRate || 0,
      powerIncrease: p.powerIncrease || 0,
      chargeHours: p.chargeHours || 0,
      routeRate: p.routeRate || 0,
      routePct: p.routePct || 0,
      buyPrice: p.buyPrice || 0,
      sellPrice: p.sellPrice || 0,
    };
  };
}

// 再計算・画面更新
function recalculate() {
  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const units = selectedUnits;

  // 月間燃料費
  const fuelL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, units);
  const fuelCost = C.monthlyFuelCost(fuelL, s.dieselPrice);

  // 月間EV充電コスト
  const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, units);
  const chargeCost = C.monthlyChargeCost(chargeKwh, s.homeRate);
  const basicChargeCost = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease);
  const totalChargeCost = chargeCost + basicChargeCost;

  // 月間エネルギーコスト差額（= 月間削減額）
  const energySaving = C.monthlyEnergySaving(fuelCost, chargeCost, basicChargeCost);
  const saving = energySaving;

  // 損益分岐
  const breakEven = C.breakEvenPrice(s.buyPrice, 0, chargeKwh);

  // 投資回収期間 = 設備費 ÷ 年間差額
  const payback = C.paybackYears(s.equipPrice, energySaving);

  // 維持費（月間/年間）
  // 入力値（車両維持費）を導入前・導入後の両方に適用する
  const dieselMaintTotal = s.dieselMaintenance * units;
  const evMaintTotal = s.dieselMaintenance * units;
  const maintDiff = 0;
  const dieselMaintAnnual = dieselMaintTotal * 12;
  const evMaintAnnual = evMaintTotal * 12;
  const maintDiffAnnual = 0;

  const totalBefore = fuelCost + dieselMaintTotal;
  const totalAfter = totalChargeCost + evMaintTotal;
  const totalDiff = totalBefore - totalAfter;

  // CO2
  const annualFuelL = (s.annualKm / s.fuelEfficiency) * units;
  const annualPowerKwh = chargeKwh * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = Math.max(0, co2D - co2E);
  const pct = co2D > 0 ? ((co2Reduce / co2D) * 100).toFixed(0) : '0';
  const trees = Math.round(co2Reduce / 0.0084);

  // フォーマッター
  const fmt = (n) => (n != null && !Number.isNaN(n) ? '¥' + Math.round(n).toLocaleString() : '—');
  const fmtDiff = (n) => {
    if (n == null || Number.isNaN(n)) return '—';
    const v = Math.round(n);
    return v >= 0 ? '▲' + v.toLocaleString() : v.toLocaleString();
  };

  // サマリーカード
  document.getElementById('cl-summary-saving').textContent =
    (saving != null && !Number.isNaN(saving)) ? Math.round(saving).toLocaleString() : '—';
  document.getElementById('cl-summary-breakeven').textContent = breakEven.toFixed(1);
  document.getElementById('cl-summary-co2').textContent = co2Reduce >= 0 ? co2Reduce.toFixed(1) : '0.0';
  document.getElementById('cl-summary-payback').textContent =
    (payback != null && Number.isFinite(payback)) ? payback.toFixed(2) : '—';

  // コスト比較表
  document.getElementById('cl-cost-fuel-before').textContent = fmt(fuelCost);
  document.getElementById('cl-cost-elec-after').textContent = fmt(totalChargeCost);
  document.getElementById('cl-cost-fuel-diff').textContent = fmtDiff(fuelCost - totalChargeCost);
  document.getElementById('cl-cost-maint-before').textContent = fmt(dieselMaintTotal);
  document.getElementById('cl-cost-maint-after').textContent = fmt(evMaintTotal);
  document.getElementById('cl-cost-maint-diff').textContent = fmtDiff(maintDiff);
  document.getElementById('cl-cost-maint-before-annual').textContent = fmt(dieselMaintAnnual);
  document.getElementById('cl-cost-maint-after-annual').textContent = fmt(evMaintAnnual);
  document.getElementById('cl-cost-maint-diff-annual').textContent = fmtDiff(maintDiffAnnual);
  document.getElementById('cl-cost-total-before').textContent = fmt(totalBefore);
  document.getElementById('cl-cost-total-after').textContent = fmt(totalAfter);
  document.getElementById('cl-cost-total-diff').textContent = fmtDiff(totalDiff);

  // CO2パネル
  document.getElementById('cl-co2-diesel').textContent = co2D.toFixed(2);
  document.getElementById('cl-co2-elec').textContent = co2E.toFixed(2);
  document.getElementById('cl-co2-reduce').textContent = co2Reduce.toFixed(2) + ' t-CO2/年';
  document.getElementById('cl-co2-pct').textContent = pct;
  document.getElementById('cl-co2-trees').textContent = trees;

  // グラフ
  drawClientCharts(s);
}

// グラフ描画
function drawClientCharts(s) {
  const C = window.EVCalc;

  // 台数別月間削減額
  const ctx1 = document.getElementById('cl-chart-units');
  if (chartUnitsClient) chartUnitsClient.destroy();

  const labels = [];
  const savings = [];
  for (let u = 1; u <= 10; u++) {
    labels.push(u + '台');
    const fL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, u);
    const fC = C.monthlyFuelCost(fL, s.dieselPrice);
    const cK = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, u);
    const cC = C.monthlyChargeCost(cK, s.homeRate);
    const bC = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease);
    savings.push(C.monthlyEnergySaving(fC, cC, bC));
  }

  chartUnitsClient = new Chart(ctx1, {
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
        y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() } },
      },
    },
    plugins: [{
      id: 'hline',
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

  // 新出光側損益分岐点
  const ctx2 = document.getElementById('cl-chart-shinidemi');
  if (chartShinidemiClient) chartShinidemiClient.destroy();

  const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, selectedUnits);
  const prices = [];
  const profits = [];
  for (let p = 10; p <= 40; p++) {
    prices.push(p);
    profits.push(C.shinidemiProfit(chargeKwh, p, s.buyPrice));
  }

  chartShinidemiClient = new Chart(ctx2, {
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
