/**
 * Excel出力（xlsx-js-style）
 * シート1: 営業試算表、シート2: 入力パラメータ、シート3: CO2削減効果
 */

// 共通スタイル定義
const STYLES = {
  title: {
    font: { sz: 16, bold: true, color: { rgb: '003087' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  subtitle: {
    font: { sz: 10, color: { rgb: '666666' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  header: {
    fill: { fgColor: { rgb: '003087' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '003087' } },
      bottom: { style: 'thin', color: { rgb: '003087' } },
      left: { style: 'thin', color: { rgb: '003087' } },
      right: { style: 'thin', color: { rgb: '003087' } },
    },
  },
  dataOdd: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { sz: 10 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
  dataEven: {
    fill: { fgColor: { rgb: 'F0F4FA' } },
    font: { sz: 10 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
  totalRow: {
    fill: { fgColor: { rgb: '00A651' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    border: {
      top: { style: 'thin', color: { rgb: '00A651' } },
      bottom: { style: 'thin', color: { rgb: '00A651' } },
      left: { style: 'thin', color: { rgb: '00A651' } },
      right: { style: 'thin', color: { rgb: '00A651' } },
    },
  },
};

// セルスタイルを適用するヘルパー（ベーススタイル＋alignment上書き）
function applyStyle(cell, baseStyle, alignOverride) {
  cell.s = JSON.parse(JSON.stringify(baseStyle));
  if (alignOverride) {
    cell.s.alignment = { ...cell.s.alignment, ...alignOverride };
  }
}

// 列幅自動計算（最低10文字）
function calcColWidths(rows, minWidth) {
  const widths = [];
  rows.forEach((row) => {
    row.forEach((val, i) => {
      const len = String(val != null ? val : '').length + 2;
      widths[i] = Math.max(widths[i] || minWidth, len);
    });
  });
  return widths.map((w) => ({ wch: Math.max(w, minWidth) }));
}

function exportToExcel() {
  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const wb = XLSX.utils.book_new();
  const now = new Date();
  const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

  // ===== シート1: 営業試算表 =====
  const headers = [
    '台数', '軽油消費量(L)', '軽油単価(円/L)', '燃料費(円)',
    '充電量(kWh)', '充電金額(円)', '基本料金増加額(円)',
    'エネルギーコスト削減額(円)', '設備費月払い(円)', '月間削減額(円)',
    'EV車両価格(円)', '補助金(円)', 'EV乗出し価格(円)', 'EV切替後月間収支(円)'
  ];

  // 金額列インデックス（右寄せ・#,##0）
  const moneyCols = new Set([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  // 数値中央揃え列
  const centerCols = new Set([0, 2]);

  // タイトル行 + 空白行 + ヘッダー + データ
  const allRows = [
    ['EV導入効果試算書'],
    ['出力日：' + dateStr],
    [], // 空白行
    headers,
  ];

  // 合計用
  let totalFuelL = 0, totalFuelCost = 0, totalChargeKwh = 0;
  let totalChargeCost = 0, totalBasicCharge = 0, totalEnergySaving = 0;
  let totalEquipCost = 0, totalMonthlySaving = 0;
  let totalEvPrice = 0, totalSubsidy = 0, totalEvNet = 0, totalBalance = 0;

  for (let u = 1; u <= s.units; u++) {
    const fuelL = C.monthlyFuelL(s.annualKm, s.fuelEfficiency, 1);
    const fuelCost = C.monthlyFuelCost(fuelL, s.dieselPrice);
    const chargeKwh = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, 1);
    const chargeCost = C.monthlyChargeCost(chargeKwh, s.homeRate);
    const basicCharge = C.monthlyBasicChargeCost(s.basicRate, s.capacityRate, s.powerIncrease, 1);
    const energySaving = C.monthlyEnergySaving(fuelCost, chargeCost, basicCharge);
    const equipCost = -C.monthlyEquipCost(s.equipPrice, 1, s.equipDeprecYears);
    const monthlySav = C.monthlySaving(energySaving, equipCost);
    const evNet = C.evNetPrice(s.evPrice, s.evSubsidy);
    const balance = C.monthlyBalance(monthlySav, evNet, s.vehicleDeprecYears);

    const row = [
      u, Math.round(fuelL), s.dieselPrice, Math.round(fuelCost),
      Math.round(chargeKwh), Math.round(chargeCost), Math.round(basicCharge),
      Math.round(energySaving), Math.round(equipCost), Math.round(monthlySav),
      s.evPrice, s.evSubsidy, evNet, Math.round(balance)
    ];
    allRows.push(row);

    totalFuelL += fuelL;
    totalFuelCost += fuelCost;
    totalChargeKwh += chargeKwh;
    totalChargeCost += chargeCost;
    totalBasicCharge += basicCharge;
    totalEnergySaving += energySaving;
    totalEquipCost += equipCost;
    totalMonthlySaving += monthlySav;
    totalEvPrice += s.evPrice;
    totalSubsidy += s.evSubsidy;
    totalEvNet += evNet;
    totalBalance += balance;
  }

  // 合計行
  allRows.push([
    '合計', Math.round(totalFuelL), '', Math.round(totalFuelCost),
    Math.round(totalChargeKwh), Math.round(totalChargeCost), Math.round(totalBasicCharge),
    Math.round(totalEnergySaving), Math.round(totalEquipCost), Math.round(totalMonthlySaving),
    totalEvPrice, totalSubsidy, totalEvNet, Math.round(totalBalance)
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(allRows);

  // 列幅（ヘッダー＋データ行で計算、最低10文字）
  ws1['!cols'] = calcColWidths(allRows.slice(3), 10);

  // 行高さ
  ws1['!rows'] = allRows.map((_, i) => {
    if (i === 0) return { hpt: 28 };    // タイトル行
    if (i === 1) return { hpt: 18 };    // サブタイトル行
    if (i === 2) return { hpt: 12 };    // 空白行
    if (i === 3) return { hpt: 25 };    // ヘッダー行
    if (i === allRows.length - 1) return { hpt: 22 }; // 合計行
    return { hpt: 20 };                 // データ行
  });

  // セルマージ：タイトル行と日付行を全列結合
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];

  // スタイル適用
  const range1 = XLSX.utils.decode_range(ws1['!ref']);
  const headerRowIdx = 3;
  const totalRowIdx = allRows.length - 1;

  for (let R = 0; R <= range1.e.r; R++) {
    for (let col = 0; col <= range1.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: col });
      if (!ws1[addr]) ws1[addr] = { v: '', t: 's' };
      const cell = ws1[addr];

      if (R === 0) {
        // タイトル行
        applyStyle(cell, STYLES.title);
      } else if (R === 1) {
        // サブタイトル行
        applyStyle(cell, STYLES.subtitle);
      } else if (R === headerRowIdx) {
        // ヘッダー行
        applyStyle(cell, STYLES.header);
      } else if (R === totalRowIdx) {
        // 合計行
        applyStyle(cell, STYLES.totalRow);
        if (moneyCols.has(col) && typeof cell.v === 'number') {
          cell.z = '#,##0';
          cell.s.alignment = { ...cell.s.alignment, horizontal: 'right' };
        } else if (centerCols.has(col)) {
          cell.s.alignment = { ...cell.s.alignment, horizontal: 'center' };
        }
      } else if (R > headerRowIdx && R < totalRowIdx) {
        // データ行（奇数/偶数で交互色）
        const dataIdx = R - headerRowIdx; // 1始まり
        const base = dataIdx % 2 === 1 ? STYLES.dataOdd : STYLES.dataEven;
        applyStyle(cell, base);

        if (moneyCols.has(col) && typeof cell.v === 'number') {
          cell.z = '#,##0';
          cell.s.alignment = { ...cell.s.alignment, horizontal: 'right' };
        } else if (centerCols.has(col)) {
          cell.s.alignment = { ...cell.s.alignment, horizontal: 'center' };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws1, '営業試算表');

  // ===== シート2: 入力パラメータ =====
  const paramRows = [
    ['EV導入効果試算書 - 入力パラメータ'],
    ['出力日：' + dateStr],
    [],
    ['項目', '値'],
    ['車種', s.evModel],
    ['台数', s.units + '台'],
    ['年間走行距離', s.annualKm.toLocaleString() + ' km'],
    ['軽油燃費', s.fuelEfficiency + ' km/L'],
    ['軽油単価', s.dieselPrice + '円/L'],
    ['電費', s.evEfficiency + ' km/kWh'],
    ['充電単価', s.homeRate + '円/kWh'],
    ['基本料金単価', s.basicRate + '円/kWh'],
    ['容量拠出金', s.capacityRate + '円/kWh'],
    ['設備費（1台）', s.equipPrice.toLocaleString() + '円'],
    ['償却年数', s.equipDeprecYears + '年'],
    ['EV車両価格', s.evPrice.toLocaleString() + '円'],
    ['補助金', s.evSubsidy.toLocaleString() + '円'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(paramRows);
  ws2['!cols'] = [{ wch: 18 }, { wch: 28 }];
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];
  ws2['!rows'] = paramRows.map((_, i) => {
    if (i === 0) return { hpt: 28 };
    if (i === 1) return { hpt: 18 };
    if (i === 2) return { hpt: 12 };
    if (i === 3) return { hpt: 25 };
    return { hpt: 20 };
  });

  // スタイル適用
  for (let R = 0; R < paramRows.length; R++) {
    for (let col = 0; col <= 1; col++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: col });
      if (!ws2[addr]) ws2[addr] = { v: '', t: 's' };
      const cell = ws2[addr];

      if (R === 0) {
        applyStyle(cell, STYLES.title);
      } else if (R === 1) {
        applyStyle(cell, STYLES.subtitle);
      } else if (R === 3) {
        applyStyle(cell, STYLES.header);
      } else if (R > 3) {
        const dataIdx = R - 3;
        const base = dataIdx % 2 === 1 ? STYLES.dataOdd : STYLES.dataEven;
        applyStyle(cell, base);
        if (col === 0) {
          cell.s.font = { ...cell.s.font, bold: true };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws2, '入力パラメータ');

  // ===== シート3: CO2削減効果 =====
  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const chargeKwhTotal = C.monthlyChargeKwh(s.annualKm, s.evEfficiency, s.units);
  const annualPowerKwh = chargeKwhTotal * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = Math.max(0, co2D - co2E);
  const pct = co2D > 0 ? ((co2Reduce / co2D) * 100).toFixed(1) : '0';
  const trees = Math.round(co2Reduce / 0.0084);

  const co2Rows = [
    ['EV導入効果試算書 - CO2削減効果'],
    ['出力日：' + dateStr],
    [],
    ['項目', '値'],
    ['軽油CO2排出量', co2D.toFixed(2) + ' t-CO2/年'],
    ['EV CO2排出量', co2E.toFixed(2) + ' t-CO2/年'],
    ['削減量', co2Reduce.toFixed(2) + ' t-CO2/年'],
    ['削減率', pct + '%'],
    ['杉の木換算', '約' + trees + '本分'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(co2Rows);
  ws3['!cols'] = [{ wch: 18 }, { wch: 28 }];
  ws3['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];
  ws3['!rows'] = co2Rows.map((_, i) => {
    if (i === 0) return { hpt: 28 };
    if (i === 1) return { hpt: 18 };
    if (i === 2) return { hpt: 12 };
    if (i === 3) return { hpt: 25 };
    return { hpt: 20 };
  });

  // スタイル適用
  for (let R = 0; R < co2Rows.length; R++) {
    for (let col = 0; col <= 1; col++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: col });
      if (!ws3[addr]) ws3[addr] = { v: '', t: 's' };
      const cell = ws3[addr];

      if (R === 0) {
        applyStyle(cell, STYLES.title);
      } else if (R === 1) {
        applyStyle(cell, STYLES.subtitle);
      } else if (R === 3) {
        applyStyle(cell, STYLES.header);
      } else if (R > 3) {
        const dataIdx = R - 3;
        const base = dataIdx % 2 === 1 ? STYLES.dataOdd : STYLES.dataEven;
        applyStyle(cell, base);
        if (col === 0) {
          cell.s.font = { ...cell.s.font, bold: true };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws3, 'CO2削減効果');

  // ファイル出力
  const fileDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = 'EV試算結果_' + fileDate + '.xlsx';
  XLSX.writeFile(wb, fileName);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-export-excel');
  if (btn) btn.addEventListener('click', exportToExcel);
});
