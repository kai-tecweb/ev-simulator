/**
 * Excel出力（SheetJS）
 */

function exportToExcel() {
  const s = window.getFormState();
  const C = window.EVCalc;
  if (!s || !C) return;

  const monthlyFuelCost = C.monthlyFuel(s.annualKm, s.fuelEfficiency, s.dieselPrice, s.units);
  const monthlyPowerKwh = C.monthlyPower(s.annualKm, s.evEfficiency, s.units);
  const monthlyElecCostVal = C.monthlyElecCost(monthlyPowerKwh, s.routePct, s.homeRate, s.routeRate);
  const equipCost = C.monthlyEquipCost(s.equipPrice, s.units, s.equipDeprecYears);
  const vehicleDiff = C.monthlyVehicleDiff(s.evPrice, s.dieselPricePerUnit, s.evSubsidy, s.units, s.vehicleDeprecYears);
  const dieselMaintTotal = s.dieselMaintenance * s.units;
  const evMaintTotal = s.evMaintenance * s.units;
  const totalBefore = monthlyFuelCost + dieselMaintTotal;
  const totalAfter = monthlyElecCostVal + equipCost + vehicleDiff + evMaintTotal;
  const totalDiff = totalBefore - totalAfter;

  const annualFuelL = (s.annualKm / s.fuelEfficiency) * s.units;
  const annualPowerKwh = monthlyPowerKwh * 12;
  const co2D = C.co2Diesel(annualFuelL);
  const co2E = C.co2Electric(annualPowerKwh);
  const co2Reduce = Math.max(0, co2D - co2E);
  const pct = co2D > 0 ? ((co2Reduce / co2D) * 100).toFixed(1) : '0';
  const trees = Math.round(co2Reduce / 0.0084);

  const wb = XLSX.utils.book_new();

  // シート1: 入力値サマリー
  const summaryData = [
    ['項目', '値'],
    ['EV車種', s.evModel],
    ['台数', s.units],
    ['年間走行距離（km）', s.annualKm],
    ['軽油燃費（km/L）', s.fuelEfficiency],
    ['軽油単価（円/L）', s.dieselPrice],
    ['現行車両価格（円/台）', s.dieselPricePerUnit],
    ['現行車両維持費（円/台/月）', s.dieselMaintenance],
    ['車両償却年数（年）', s.vehicleDeprecYears],
    ['充電設備費（円/台）', s.equipPrice],
    ['設備償却年数（年）', s.equipDeprecYears],
    ['自家充電単価（円/kWh）', s.homeRate],
    ['経路充電単価（円/kWh）', s.routeRate],
    ['経路充電割合（%）', s.routePct],
    ['電力仕入単価（円/kWh）', s.buyPrice],
    ['販売単価（円/kWh）', s.sellPrice],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '入力値サマリー');

  // シート2: コスト比較表
  const costData = [
    ['項目', '導入前（軽油）', '導入後（EV）', '差分'],
    ['燃料費・電気代', monthlyFuelCost, monthlyElecCostVal, monthlyFuelCost - monthlyElecCostVal],
    ['充電設備償却費', null, equipCost, null],
    ['車両維持費', dieselMaintTotal, evMaintTotal, dieselMaintTotal - evMaintTotal],
    ['車両償却費差額', null, vehicleDiff, null],
    ['月間合計', totalBefore, totalAfter, totalDiff],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(costData);
  XLSX.utils.book_append_sheet(wb, ws2, 'コスト比較表');

  // シート3: CO2削減効果
  const co2Data = [
    ['項目', '値'],
    ['軽油CO2排出量（t-CO2/年）', co2D],
    ['EV CO2排出量（t-CO2/年）', co2E],
    ['削減量（t-CO2/年）', co2Reduce],
    ['削減率（%）', pct],
    ['杉の木換算（本）', trees],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(co2Data);
  XLSX.utils.book_append_sheet(wb, ws3, 'CO2削減効果');

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = 'EV試算結果_' + dateStr + '.xlsx';
  XLSX.writeFile(wb, fileName);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-export-excel');
  if (btn) btn.addEventListener('click', exportToExcel);
});
