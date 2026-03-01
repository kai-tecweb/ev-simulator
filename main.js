/**
 * EV試算ツール - メイン制御・入力連携・タブ切替
 */

// 車種マスタ
const EV_MASTER = {
  'フォロフライ F11VS': { battery: 82, efficiency: 7.8, range: 350, price: 6000000, subsidy: 2042000, maintenance: 80000 },
  'ZOモーターズ（仮）': { battery: 60, efficiency: 7.0, range: 280, price: 5500000, subsidy: 1700000, maintenance: 75000 },
  '日野ディトロ（仮）': { battery: 100, efficiency: 8.0, range: 400, price: 7500000, subsidy: 2500000, maintenance: 90000 },
};

// 確認事項マスタ（事前確認事項 1-6）
const CONFIRM_ITEMS = [
  { id: 1, text: 'ZOモーターズ・日野ディトロの正確なスペック（バッテリー容量・電費・価格・補助金額）', importance: '高', importanceClass: 'high' },
  { id: 2, text: '充電設備は新出光が提供（レンタル/販売）するのか、顧客が自前調達か', importance: '高', importanceClass: 'high' },
  { id: 3, text: '新出光は電力小売り事業者として顧客に電力を販売するビジネスモデルか、仕入単価の現実値は', importance: '高', importanceClass: 'high' },
  { id: 4, text: '2026年度EV補助金の最新額・申請条件', importance: '中', importanceClass: 'mid' },
  { id: 5, text: 'アウトプットの優先形式（Excel / PDF / 画面印刷）', importance: '中', importanceClass: 'mid' },
  { id: 6, text: 'Zoom打合せの日程調整', importance: '低', importanceClass: 'low' },
];

// Zoom打合せ確認事項（7-16）セクション別
const ZOOM_CONFIRM_SECTIONS = [
  {
    title: '運用・利用者',
    items: [
      { id: 7, text: 'このツールの利用者は新出光の社員だけか、顧客も直接操作するか', importanceClass: 'mid' },
      { id: 8, text: '顧客に画面を見せながら説明するか、PDF/Excelで渡すか', importanceClass: 'mid' },
      { id: 9, text: '営業現場でリアルタイムに動かすか、社内で事前に試算して持参するか', importanceClass: 'mid' },
      { id: 10, text: '1社専用ツールか、複数顧客・複数案件で使い回すか', importanceClass: 'mid' },
    ],
  },
  {
    title: 'アクセス・セキュリティ',
    items: [
      { id: 11, text: 'ログイン機能は必要か（URLを知っていれば誰でも見れてよいか）', importanceClass: 'mid' },
      { id: 12, text: '顧客ごとにデータを保存・管理する必要があるか', importanceClass: 'mid' },
      { id: 13, text: '利用する端末はPCだけか、タブレット・スマホも使うか', importanceClass: 'mid' },
    ],
  },
  {
    title: '将来拡張',
    items: [
      { id: 14, text: '将来的にEMS（分散充電）機能は必要か', importanceClass: 'mid' },
      { id: 15, text: '複数拠点・複数営業所の一括管理は必要か', importanceClass: 'mid' },
      { id: 16, text: '顧客が自分でデータ入力できるセルフサービス型にするか', importanceClass: 'mid' },
    ],
  },
];

// 確認事項のステータス（id -> 未確認|確認中|確認済み）
let confirmStatus = {};
CONFIRM_ITEMS.forEach((item) => { confirmStatus[item.id] = '未確認'; });
ZOOM_CONFIRM_SECTIONS.forEach((sec) => sec.items.forEach((item) => { confirmStatus[item.id] = confirmStatus[item.id] || '未確認'; }));

// フォーム要素のID一覧
const FORM_IDS = [
  'evModel', 'units', 'annualKm', 'fuelEfficiency', 'dieselPrice', 'dieselPricePerUnit',
  'dieselMaintenance', 'vehicleDeprecYears', 'chargerOutput', 'equipPrice', 'equipDeprecYears',
  'homeRate', 'routeRate', 'routePct', 'chargeTimeSlot', 'buyPrice', 'sellPrice'
];

function getFormState() {
  const units = parseInt(document.getElementById('units').value, 10) || 1;
  const annualKm = parseInt(document.getElementById('annualKm').value, 10) || 0;
  const fuelEfficiency = parseFloat(document.getElementById('fuelEfficiency').value) || 12;
  const dieselPrice = parseFloat(document.getElementById('dieselPrice').value) || 0;
  const dieselPricePerUnit = parseInt(document.getElementById('dieselPricePerUnit').value, 10) || 0;
  const dieselMaintenance = parseInt(document.getElementById('dieselMaintenance').value, 10) || 0;
  const vehicleDeprecYears = parseInt(document.getElementById('vehicleDeprecYears').value, 10) || 7;
  const equipPrice = parseInt(document.getElementById('equipPrice').value, 10) || 0;
  const equipDeprecYears = parseInt(document.getElementById('equipDeprecYears').value, 10) || 5;
  const homeRate = parseFloat(document.getElementById('homeRate').value) || 0;
  const routeRate = parseFloat(document.getElementById('routeRate').value) || 0;
  const routePct = parseFloat(document.getElementById('routePct').value) || 0;
  const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
  const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;

  const evModelKey = document.getElementById('evModel').value;
  const ev = EV_MASTER[evModelKey] || { efficiency: 7.8, price: 6000000, subsidy: 0, maintenance: 80000 };

  return {
    evModel: evModelKey,
    evEfficiency: ev.efficiency,
    evPrice: ev.price,
    evSubsidy: ev.subsidy,
    evMaintenance: ev.maintenance,
    units,
    annualKm,
    fuelEfficiency,
    dieselPrice,
    dieselPricePerUnit,
    dieselMaintenance,
    vehicleDeprecYears,
    equipPrice,
    equipDeprecYears,
    homeRate,
    routeRate,
    routePct,
    buyPrice,
    sellPrice,
  };
}

function computeAndUpdateSummary() {
  const s = getFormState();
  const C = window.EVCalc;
  if (!C) return;

  const monthlyFuelCost = C.monthlyFuel(s.annualKm, s.fuelEfficiency, s.dieselPrice, s.units);
  const monthlyPowerKwh = C.monthlyPower(s.annualKm, s.evEfficiency, s.units);
  const monthlyElecCostVal = C.monthlyElecCost(monthlyPowerKwh, s.routePct, s.homeRate, s.routeRate);
  const equipCost = C.monthlyEquipCost(s.equipPrice, s.units, s.equipDeprecYears);
  const vehicleDiff = C.monthlyVehicleDiff(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.units, s.vehicleDeprecYears);
  const maintDiff = C.monthlyMaintenanceDiff(s.dieselMaintenance, s.evMaintenance, s.units);

  const saving = C.monthlySaving(monthlyFuelCost, monthlyElecCostVal, equipCost, vehicleDiff, maintDiff);
  const breakEven = C.breakEvenPrice(s.buyPrice, 0, monthlyPowerKwh);
  const payback = C.paybackYears(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.equipPrice, s.units, saving);

  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const annualPowerKwh = monthlyPowerKwh * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = co2D - co2E;

  document.getElementById('summary-saving').textContent = (saving != null && !Number.isNaN(saving))
    ? Math.round(saving).toLocaleString()
    : '—';
  document.getElementById('summary-breakeven').textContent = breakEven.toFixed(1);
  document.getElementById('summary-co2').textContent = co2Reduce >= 0 ? co2Reduce.toFixed(1) : '0.0';
  document.getElementById('summary-payback').textContent = (payback != null && Number.isFinite(payback)) ? payback.toFixed(1) : '—';
}

function updateResultTab() {
  const s = getFormState();
  const C = window.EVCalc;
  if (!C) return;

  const monthlyFuelCost = C.monthlyFuel(s.annualKm, s.fuelEfficiency, s.dieselPrice, s.units);
  const monthlyPowerKwh = C.monthlyPower(s.annualKm, s.evEfficiency, s.units);
  const monthlyElecCostVal = C.monthlyElecCost(monthlyPowerKwh, s.routePct, s.homeRate, s.routeRate);
  const equipCost = C.monthlyEquipCost(s.equipPrice, s.units, s.equipDeprecYears);
  const vehicleDiff = C.monthlyVehicleDiff(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.units, s.vehicleDeprecYears);
  const dieselMaintTotal = s.dieselMaintenance * s.units;
  const evMaintTotal = s.evMaintenance * s.units;
  const maintDiff = C.monthlyMaintenanceDiff(s.dieselMaintenance, s.evMaintenance, s.units);

  const totalBefore = monthlyFuelCost + dieselMaintTotal;
  const totalAfter = monthlyElecCostVal + equipCost + vehicleDiff + evMaintTotal;
  const totalDiff = totalBefore - totalAfter;

  const fmt = (n) => (n != null && !Number.isNaN(n) ? '¥' + Math.round(n).toLocaleString() : '—');
  const fmtDiff = (n) => {
    if (n == null || Number.isNaN(n)) return '—';
    const v = Math.round(n);
    return v >= 0 ? '▲' + v.toLocaleString() : v.toLocaleString();
  };

  document.getElementById('cost-fuel-before').textContent = fmt(monthlyFuelCost);
  document.getElementById('cost-elec-after').textContent = fmt(monthlyElecCostVal);
  document.getElementById('cost-fuel-diff').textContent = fmtDiff(monthlyFuelCost - monthlyElecCostVal);
  document.getElementById('cost-equip-after').textContent = fmt(equipCost);
  document.getElementById('cost-maint-before').textContent = fmt(dieselMaintTotal);
  document.getElementById('cost-maint-after').textContent = fmt(evMaintTotal);
  document.getElementById('cost-maint-diff').textContent = fmtDiff(maintDiff);
  document.getElementById('cost-vehicle-diff').textContent = fmt(vehicleDiff);
  document.getElementById('cost-total-before').textContent = fmt(totalBefore);
  document.getElementById('cost-total-after').textContent = fmt(totalAfter);
  document.getElementById('cost-total-diff').textContent = fmtDiff(totalDiff);

  // CO2パネル
  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const annualPowerKwh = monthlyPowerKwh * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = Math.max(0, co2D - co2E);
  const pct = co2D > 0 ? ((co2Reduce / co2D) * 100).toFixed(0) : '0';
  // 杉1本のCO2吸収量は約0.0084 t-CO2/年 → 削減量(t-CO2/年) ÷ 0.0084 = 本数
  const CEDAR_CO2_PER_TREE = 0.0084;
  const trees = Math.round(co2Reduce / CEDAR_CO2_PER_TREE);

  document.getElementById('co2-diesel').textContent = co2D.toFixed(2);
  document.getElementById('co2-elec').textContent = co2E.toFixed(2);
  document.getElementById('co2-reduce').textContent = co2Reduce.toFixed(2) + ' t-CO2/年';
  document.getElementById('co2-pct').textContent = pct;
  document.getElementById('co2-trees').textContent = trees;

  if (window.redrawCharts) window.redrawCharts();
}

function renderConfirmTab() {
  const tbody = document.getElementById('confirm-tbody');
  const zoomContainer = document.getElementById('zoom-confirm-content');
  const importanceLabel = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' };
  const statusOrder = ['未確認', '確認中', '確認済み'];

  // 事前確認事項テーブル（1-6）
  tbody.innerHTML = CONFIRM_ITEMS.map((item) => {
    const current = confirmStatus[item.id] || '未確認';
    return `
      <tr>
        <td>${item.id}</td>
        <td>${item.text}</td>
        <td>${importanceLabel[item.importanceClass]}</td>
        <td><button type="button" class="status-btn ${current === '確認済み' ? 'confirmed' : ''} ${current === '確認中' ? 'checking' : ''}" data-id="${item.id}">${current}</button></td>
      </tr>
    `;
  }).join('');

  // Zoom打合せ確認事項（7-16）セクションごとに見出し＋テーブル
  zoomContainer.innerHTML = ZOOM_CONFIRM_SECTIONS.map((sec) => {
    const rows = sec.items.map((item) => {
      const current = confirmStatus[item.id] || '未確認';
      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.text}</td>
          <td>${importanceLabel[item.importanceClass]}</td>
          <td><button type="button" class="status-btn ${current === '確認済み' ? 'confirmed' : ''} ${current === '確認中' ? 'checking' : ''}" data-id="${item.id}">${current}</button></td>
        </tr>
      `;
    }).join('');
    return `
      <h4 class="confirm-subsection-title">【${sec.title}】</h4>
      <table class="confirm-table">
        <thead>
          <tr>
            <th>#</th>
            <th>確認事項</th>
            <th>重要度</th>
            <th>ステータス</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join('');

  // ステータスボタン共通のクリック処理
  const bindStatusButtons = (el) => {
    if (!el) return;
    el.querySelectorAll('.status-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const order = ['未確認', '確認中', '確認済み'];
        const idx = order.indexOf(confirmStatus[id]);
        confirmStatus[id] = order[(idx + 1) % 3];
        renderConfirmTab();
      });
    });
  };
  bindStatusButtons(tbody);
  bindStatusButtons(zoomContainer);
}

function initEvModelSelect() {
  const sel = document.getElementById('evModel');
  Object.keys(EV_MASTER).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === 'フォロフライ F11VS') opt.selected = true;
    sel.appendChild(opt);
  });
}

function applyEvMaster() {
  const key = document.getElementById('evModel').value;
  const ev = EV_MASTER[key];
  if (!ev) return;
  // 価格・補助金・維持費は表示用のみ（入力欄は別なので上書きしない）
  // 車種変更時は効率などは getFormState で EV_MASTER から読むためここでは何もしない
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.add('active');
      if (tab === 'result') updateResultTab();
      if (tab === 'confirm') renderConfirmTab();
    });
  });
}

function setupFormListeners() {
  const routePct = document.getElementById('routePct');
  const routePctValue = document.getElementById('routePctValue');
  routePct.addEventListener('input', () => {
    routePctValue.textContent = routePct.value;
    computeAndUpdateSummary();
  });

  document.getElementById('evModel').addEventListener('change', () => {
    applyEvMaster();
    computeAndUpdateSummary();
  });

  FORM_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || id === 'evModel' || id === 'routePct') return;
    el.addEventListener('input', computeAndUpdateSummary);
    el.addEventListener('change', computeAndUpdateSummary);
  });
}

// 他モジュールから参照用
window.getFormState = getFormState;
window.EV_MASTER = EV_MASTER;

document.addEventListener('DOMContentLoaded', () => {
  initEvModelSelect();
  applyEvMaster();
  setupFormListeners();
  setupTabs();
  computeAndUpdateSummary();
  renderConfirmTab();
});
