/**
 * Excel出力（SheetJS）
 * シート1: 営業試算表、シート2: 入力パラメータ、シート3: CO2削減効果
 */

function exportToExcel() {
  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const wb = XLSX.utils.book_new();

  // ===== シート1: 営業試算表 =====
  // ヘッダー行
  const headers = [
    '台数', '軽油消費量(L)', '軽油単価(円/L)', '燃料費(円)',
    '充電量(kWh)', '充電金額(円)', '基本料金増加額(円)',
    'エネルギーコスト削減額(円)', '設備費月払い(円)', '月間削減額(円)',
    'EV車両価格(円)', '補助金(円)', 'EV乗出し価格(円)', 'EV切替後月間収支(円)'
  ];

  const sheetData = [headers];

  // 合計用
  let totalFuelL = 0, totalFuelCost = 0, totalChargeKwh = 0;
  let totalChargeCost = 0, totalBasicCharge = 0, totalEnergySaving = 0;
  let totalEquipCost = 0, totalMonthlySaving = 0;
  let totalEvPrice = 0, totalSubsidy = 0, totalEvNet = 0, totalBalance = 0;

  // 1台〜入力台数分を1行ずつ出力
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

    sheetData.push([
      u, Math.round(fuelL), s.dieselPrice, Math.round(fuelCost),
      Math.round(chargeKwh), Math.round(chargeCost), Math.round(basicCharge),
      Math.round(energySaving), Math.round(equipCost), Math.round(monthlySav),
      s.evPrice, s.evSubsidy, evNet, Math.round(balance)
    ]);

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
  sheetData.push([
    '合計', Math.round(totalFuelL), '', Math.round(totalFuelCost),
    Math.round(totalChargeKwh), Math.round(totalChargeCost), Math.round(totalBasicCharge),
    Math.round(totalEnergySaving), Math.round(totalEquipCost), Math.round(totalMonthlySaving),
    totalEvPrice, totalSubsidy, totalEvNet, Math.round(totalBalance)
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheetData);

  // 列幅設定
  ws1['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  // セル書式設定
  const range = XLSX.utils.decode_range(ws1['!ref']);
  // 金額列のフォーマット（#,##0）- 列インデックス 1以降
  const numFmt = '#,##0';
  for (let R = 1; R <= range.e.r; R++) {
    for (let C_col = 1; C_col <= range.e.c; C_col++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C_col });
      if (ws1[addr] && typeof ws1[addr].v === 'number') {
        ws1[addr].z = numFmt;
      }
    }
  }

  // ヘッダー行スタイル（背景色 #003087、白文字、太字）
  for (let C_col = 0; C_col <= range.e.c; C_col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C_col });
    if (ws1[addr]) {
      ws1[addr].s = {
        fill: { fgColor: { rgb: '003087' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
        alignment: { horizontal: 'center' }
      };
    }
  }

  // 合計行スタイル（背景色 #e8f0fe、太字）
  const lastRow = range.e.r;
  for (let C_col = 0; C_col <= range.e.c; C_col++) {
    const addr = XLSX.utils.encode_cell({ r: lastRow, c: C_col });
    if (ws1[addr]) {
      ws1[addr].s = {
        fill: { fgColor: { rgb: 'E8F0FE' } },
        font: { bold: true }
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws1, '営業試算表');

  // ===== シート2: 入力パラメータ =====
  const now = new Date();
  const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

  const paramData = [
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
    ['出力日', dateStr],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(paramData);
  ws2['!cols'] = [{ wch: 18 }, { wch: 24 }];

  // ヘッダー行スタイル
  for (let C_col = 0; C_col <= 1; C_col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C_col });
    if (ws2[addr]) {
      ws2[addr].s = {
        fill: { fgColor: { rgb: '003087' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
        alignment: { horizontal: 'center' }
      };
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

  const co2Data = [
    ['項目', '値'],
    ['軽油CO2排出量', co2D.toFixed(2) + ' t-CO2/年'],
    ['EV CO2排出量', co2E.toFixed(2) + ' t-CO2/年'],
    ['削減量', co2Reduce.toFixed(2) + ' t-CO2/年'],
    ['削減率', pct + '%'],
    ['杉の木換算', '約' + trees + '本分'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(co2Data);
  ws3['!cols'] = [{ wch: 18 }, { wch: 24 }];

  // ヘッダー行スタイル
  for (let C_col = 0; C_col <= 1; C_col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C_col });
    if (ws3[addr]) {
      ws3[addr].s = {
        fill: { fgColor: { rgb: '003087' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
        alignment: { horizontal: 'center' }
      };
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
