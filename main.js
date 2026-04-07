/**
 * EV試算ツール - メイン制御・入力連携・タブ切替
 */

// 車種マスタ
const EV_MASTER = {
  'フォロフライ F11VS': { battery: 82, efficiency: 5.0, range: 350, price: 11908000, subsidy: 5808000, maintenance: 80000 },
  'ZOモーターズ（仮）': { battery: 60, efficiency: 5.0, range: 280, price: 5500000, subsidy: 1700000, maintenance: 75000 },
  '日野ディトロ（仮）': { battery: 100, efficiency: 5.5, range: 400, price: 7500000, subsidy: 2500000, maintenance: 90000 },
};

// 確認事項マスタ（事前確認事項 1-6）
const CONFIRM_ITEMS = [
  { id: 1, text: 'ZOモーターズ・日野ディトロの正確なスペック（バッテリー容量・電費・価格・補助金額）', importance: '高', importanceClass: 'high' },
  { id: 2, text: '充電設備は新出光が提供（レンタル/販売）するのか、顧客が自前調達か', importance: '高', importanceClass: 'high' },
  { id: 3, text: '新出光は電力小売り事業者として顧客に電力を販売するビジネスモデルか、仕入単価の現実値は', importance: '高', importanceClass: 'high' },
  { id: 4, text: '2026年度EV補助金の最新額・申請条件', importance: '中', importanceClass: 'mid' },
  { id: 5, text: 'アウトプットの優先形式（Excel / PDF / 画面印刷）', importance: '中', importanceClass: 'mid' },
  { id: 6, text: 'ビデオチャットの日程調整', importance: '低', importanceClass: 'low' },
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
  {
    title: 'アウトプット形式',
    items: [
      { id: 17, text: 'アウトプットはWebアプリ・Excel・PDFのどれが希望か（複数可）', importanceClass: 'mid' },
      { id: 18, text: '今回のWebデモのExcel出力機能で要件を満たせているか', importanceClass: 'mid' },
      { id: 19, text: 'Excelで直接操作したい場合はExcelファイルでの納品も可能', importanceClass: 'mid' },
    ],
  },
];

// 確認事項のステータス（id -> 未確認|確認中|確認済み）
let confirmStatus = {};
CONFIRM_ITEMS.forEach((item) => { confirmStatus[item.id] = '確認済み'; });
ZOOM_CONFIRM_SECTIONS.forEach((sec) => sec.items.forEach((item) => { confirmStatus[item.id] = confirmStatus[item.id] || '確認済み'; }));

// フォーム要素のID一覧
const FORM_IDS = [
  'evModel', 'units', 'annualKm', 'fuelEfficiency', 'dieselPrice', 'dieselPricePerUnit',
  'dieselMaintenance', 'vehicleDeprecYears', 'chargerOutput', 'equipPrice', 'equipDeprecYears',
  'homeRate', 'basicRate', 'capacityRate', 'powerIncrease', 'chargeHours',
  'routeRate', 'routePct', 'chargeTimeSlot', 'buyPrice', 'sellPrice'
];

function getFormState() {
  const units = parseInt(document.getElementById('units').value, 10) || 1;
  const annualKm = parseInt(document.getElementById('annualKm').value, 10) || 0;
  const fuelEfficiency = parseFloat(document.getElementById('fuelEfficiency').value) || 10;
  const dieselPrice = parseFloat(document.getElementById('dieselPrice').value) || 0;
  const dieselPricePerUnit = parseInt(document.getElementById('dieselPricePerUnit').value, 10) || 0;
  const dieselMaintenance = parseInt(document.getElementById('dieselMaintenance').value, 10) || 0;
  const vehicleDeprecYears = parseInt(document.getElementById('vehicleDeprecYears').value, 10) || 7;
  const equipPrice = parseInt(document.getElementById('equipPrice').value, 10) || 0;
  const equipDeprecYears = parseInt(document.getElementById('equipDeprecYears').value, 10) || 7;
  const homeRate = parseFloat(document.getElementById('homeRate').value) || 0;
  const basicRate = parseFloat(document.getElementById('basicRate').value) || 0;
  const capacityRate = parseFloat(document.getElementById('capacityRate').value) || 0;
  const powerIncrease = parseFloat(document.getElementById('powerIncrease').value) || 0;
  const chargeHours = parseFloat(document.getElementById('chargeHours').value) || 0;
  const routeRate = parseFloat(document.getElementById('routeRate').value) || 0;
  const routePct = parseFloat(document.getElementById('routePct').value) || 0;
  const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
  const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;

  const evModelKey = document.getElementById('evModel').value;
  const ev = EV_MASTER[evModelKey] || { efficiency: 5.0, price: 11908000, subsidy: 0, maintenance: 80000 };

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
    basicRate,
    capacityRate,
    powerIncrease,
    chargeHours,
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

  // 新ロジック：月間燃料費
  const fuelL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, s.units);
  const fuelCost = C.monthlyFuelCost(fuelL, s.dieselPrice);

  // 新ロジック：月間充電コスト
  const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, s.units);
  const chargeCost = C.monthlyChargeCost(chargeKwh, s.homeRate);
  const basicChargeCost = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease, s.units);

  // 月間エネルギーコスト削減額
  const energySaving = C.monthlyEnergySaving(fuelCost, chargeCost, basicChargeCost);

  // 充電設備 月間償却費（負値）
  const equipCost = -C.monthlyEquipCost(s.equipPrice, s.units, s.equipDeprecYears);

  // 月間削減額
  const saving = C.monthlySaving(energySaving, equipCost);

  // 損益分岐（旧互換）
  const breakEven = C.breakEvenPrice(s.buyPrice, 0, chargeKwh);

  // 投資回収期間
  const payback = C.paybackYears(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.equipPrice, s.units, saving);

  // CO2
  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const annualPowerKwh = chargeKwh * 12;
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

  // 新ロジック：月間燃料費
  const fuelL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, s.units);
  const fuelCost = C.monthlyFuelCost(fuelL, s.dieselPrice);

  // 新ロジック：月間充電コスト
  const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, s.units);
  const chargeCost = C.monthlyChargeCost(chargeKwh, s.homeRate);
  const basicChargeCost = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease, s.units);
  const totalChargeCost = chargeCost + basicChargeCost;

  // エネルギーコスト削減額
  const energySaving = C.monthlyEnergySaving(fuelCost, chargeCost, basicChargeCost);

  // 設備費
  const equipCostVal = C.monthlyEquipCost(s.equipPrice, s.units, s.equipDeprecYears);

  // 車両関連（旧互換：コスト比較表用）
  const vehicleDiff = C.monthlyVehicleDiff(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.units, s.vehicleDeprecYears);
  const dieselMaintTotal = s.dieselMaintenance * s.units;
  const evMaintTotal = s.evMaintenance * s.units;
  const maintDiff = C.monthlyMaintenanceDiff(s.dieselMaintenance, s.evMaintenance, s.units);

  const totalBefore = fuelCost + dieselMaintTotal;
  const totalAfter = totalChargeCost + equipCostVal + vehicleDiff + evMaintTotal;
  const totalDiff = totalBefore - totalAfter;

  const fmt = (n) => (n != null && !Number.isNaN(n) ? '¥' + Math.round(n).toLocaleString() : '—');
  const fmtDiff = (n) => {
    if (n == null || Number.isNaN(n)) return '—';
    const v = Math.round(n);
    return v >= 0 ? '▲' + v.toLocaleString() : v.toLocaleString();
  };

  document.getElementById('cost-fuel-before').textContent = fmt(fuelCost);
  document.getElementById('cost-elec-after').textContent = fmt(totalChargeCost);
  document.getElementById('cost-fuel-diff').textContent = fmtDiff(fuelCost - totalChargeCost);
  document.getElementById('cost-equip-after').textContent = fmt(equipCostVal);
  document.getElementById('cost-maint-before').textContent = fmt(dieselMaintTotal);
  document.getElementById('cost-maint-after').textContent = fmt(evMaintTotal);
  document.getElementById('cost-maint-diff').textContent = fmtDiff(maintDiff);
  document.getElementById('cost-vehicle-diff').textContent = fmt(vehicleDiff);
  document.getElementById('cost-total-before').textContent = fmt(totalBefore);
  document.getElementById('cost-total-after').textContent = fmt(totalAfter);
  document.getElementById('cost-total-diff').textContent = fmtDiff(totalDiff);

  // CO2パネル
  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const annualPowerKwh = chargeKwh * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = Math.max(0, co2D - co2E);
  const pct = co2D > 0 ? ((co2Reduce / co2D) * 100).toFixed(0) : '0';
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
      if (tab === 'clients') renderClientTab();
      if (tab === 'confirm') renderConfirmTab();
    });
  });
}

function setupSubTabs() {
  document.querySelectorAll('.sub-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.subtab;
      document.querySelectorAll('.sub-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.sub-tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('subtab-' + target);
      if (panel) panel.classList.add('active');
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

// ===== 顧客管理機能 =====

// 顧客一覧を描画
async function renderClientTab() {
  const SC = window.SupabaseClient;
  if (!SC) return;

  const loading = document.getElementById('client-loading');
  const errorEl = document.getElementById('client-error');
  const table = document.getElementById('client-table');
  const tbody = document.getElementById('client-tbody');
  const empty = document.getElementById('client-empty');

  loading.style.display = 'flex';
  errorEl.style.display = 'none';
  table.style.display = 'none';
  empty.style.display = 'none';

  try {
    const clients = await SC.getClients();
    loading.style.display = 'none';

    if (!clients || clients.length === 0) {
      empty.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    tbody.innerHTML = clients.map((c) => {
      const date = new Date(c.created_at);
      const dateStr = date.getFullYear() + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + String(date.getDate()).padStart(2, '0');
      const url = SC.getClientUrl(c.id);
      return `
        <tr>
          <td>${escapeHtml(c.company_name)}</td>
          <td>${escapeHtml(c.contact_name)}</td>
          <td>${escapeHtml(c.phone || '—')}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${dateStr}</td>
          <td>
            <div class="client-url-box">
              <span class="url-text">${url}</span>
              <button type="button" class="btn-copy" data-url="${url}">コピー</button>
            </div>
          </td>
          <td>
            <button type="button" class="btn-action" data-id="${c.id}" data-action="edit">編集</button>
            <button type="button" class="btn-action delete" data-id="${c.id}" data-action="delete">削除</button>
          </td>
        </tr>
      `;
    }).join('');

    // コピーボタン
    tbody.querySelectorAll('.btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url).then(() => {
          btn.textContent = 'OK!';
          setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
        });
      });
    });

    // 操作ボタン
    tbody.querySelectorAll('.btn-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'delete') handleDeleteClient(id);
        if (action === 'edit') handleEditClient(id, clients.find((c) => c.id === id));
      });
    });

  } catch (err) {
    loading.style.display = 'none';
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

// HTML エスケープ
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 顧客登録
async function handleRegisterClient() {
  const SC = window.SupabaseClient;
  if (!SC) return;

  const company = document.getElementById('clientCompany').value.trim();
  const contact = document.getElementById('clientContact').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const email = document.getElementById('clientEmail').value.trim();
  const resultEl = document.getElementById('client-register-result');

  if (!company || !contact) {
    resultEl.className = 'client-register-result error';
    resultEl.textContent = '会社名と担当者名は必須です';
    resultEl.style.display = 'block';
    return;
  }

  const params = getFormState();
  const btn = document.getElementById('btn-register-client');
  btn.disabled = true;
  btn.textContent = '登録中...';

  try {
    const client = await SC.createClient({
      company_name: company,
      contact_name: contact,
      phone: phone || null,
      email: email || null,
      params: params,
    });

    const url = SC.getClientUrl(client.id);
    resultEl.className = 'client-register-result success';
    resultEl.innerHTML = '顧客を登録しました。<br>' +
      '<div class="client-url-box"><span>' + url + '</span>' +
      '<button type="button" class="btn-copy" onclick="navigator.clipboard.writeText(\'' + url + '\').then(() => { this.textContent=\'OK!\'; setTimeout(() => this.textContent=\'コピー\', 1500); })">コピー</button></div>';
    resultEl.style.display = 'block';

    // フォームクリア
    document.getElementById('clientCompany').value = '';
    document.getElementById('clientContact').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';

    // 一覧再描画
    renderClientTab();

  } catch (err) {
    resultEl.className = 'client-register-result error';
    resultEl.textContent = err.message;
    resultEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '登録する';
  }
}

// 顧客削除
async function handleDeleteClient(id) {
  if (!confirm('この顧客を削除しますか？')) return;
  const SC = window.SupabaseClient;
  try {
    await SC.deleteClient(id);
    renderClientTab();
  } catch (err) {
    alert(err.message);
  }
}

// 顧客編集（モーダル表示）
function handleEditClient(id, client) {
  if (!client) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>顧客情報の編集</h3>
      <div class="form-group">
        <label>会社名 <span class="required">*</span></label>
        <input type="text" id="edit-company" value="${escapeHtml(client.company_name)}">
      </div>
      <div class="form-group">
        <label>担当者名 <span class="required">*</span></label>
        <input type="text" id="edit-contact" value="${escapeHtml(client.contact_name)}">
      </div>
      <div class="form-group">
        <label>電話番号</label>
        <input type="text" id="edit-phone" value="${escapeHtml(client.phone || '')}">
      </div>
      <div class="form-group">
        <label>メールアドレス</label>
        <input type="email" id="edit-email" value="${escapeHtml(client.email || '')}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="edit-cancel">キャンセル</button>
        <button type="button" class="btn-primary" id="edit-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#edit-save').addEventListener('click', async () => {
    const company = overlay.querySelector('#edit-company').value.trim();
    const contact = overlay.querySelector('#edit-contact').value.trim();
    if (!company || !contact) { alert('会社名と担当者名は必須です'); return; }

    const saveBtn = overlay.querySelector('#edit-save');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      const SC = window.SupabaseClient;
      await SC.updateClient(id, {
        company_name: company,
        contact_name: contact,
        phone: overlay.querySelector('#edit-phone').value.trim() || null,
        email: overlay.querySelector('#edit-email').value.trim() || null,
        params: getFormState(),
      });
      overlay.remove();
      renderClientTab();
    } catch (err) {
      alert(err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  });
}

// 他モジュールから参照用
window.getFormState = getFormState;
window.EV_MASTER = EV_MASTER;

document.addEventListener('DOMContentLoaded', () => {
  initEvModelSelect();
  applyEvMaster();
  setupSubTabs();
  setupFormListeners();
  setupTabs();
  computeAndUpdateSummary();
  renderConfirmTab();

  // 顧客登録ボタン
  const regBtn = document.getElementById('btn-register-client');
  if (regBtn) regBtn.addEventListener('click', handleRegisterClient);
});
