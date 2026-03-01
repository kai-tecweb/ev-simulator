/**
 * EV試算 計算ロジック
 */

// 月間走行距離（km）
const monthlyKm = (annualKm, units) => (annualKm / 12) * units;

// 燃料費（軽油）月額（円）
const monthlyFuel = (annualKm, fuelEfficiency, dieselPrice, units) =>
  (annualKm / 12 / fuelEfficiency) * dieselPrice * units;

// 月間電力使用量（kWh）
const monthlyPower = (annualKm, evEfficiency, units) =>
  (annualKm / 12 / evEfficiency) * units;

// 月間電気代（円）
const monthlyElecCost = (power, homePct, homeRate, routeRate) => {
  const home = power * (1 - homePct / 100) * homeRate;
  const route = power * (homePct / 100) * routeRate;
  return home + route;
};

// 充電設備 月間償却費（円）
const monthlyEquipCost = (equipPrice, units, years) =>
  (equipPrice * units) / (years * 12);

// 車両差額 月間償却費（円）
const monthlyVehicleDiff = (evPrice, dieselPrice, subsidy, units, years) =>
  ((evPrice - dieselPrice - subsidy) * units) / (years * 12);

// 維持費差額 月額（円）
const monthlyMaintenanceDiff = (dieselMaint, evMaint, units) =>
  (dieselMaint - evMaint) * units;

// 月間削減額（顧客側）（円）
const monthlySaving = (fuelCost, elecCost, equipCost, vehicleDiff, maintDiff) =>
  fuelCost - elecCost - equipCost - vehicleDiff + maintDiff;

// 新出光側 月間損益（円）
const shinidemiProfit = (power, sellPrice, buyPrice) =>
  power * (sellPrice - buyPrice);

// 損益分岐販売単価（新出光側）（円/kWh）
const breakEvenPrice = (buyPrice, fixedCost, power) =>
  power > 0 ? buyPrice + fixedCost / power : buyPrice;

// 投資回収期間（年）
const paybackYears = (evPrice, dieselPrice, subsidy, equipPrice, units, saving) => {
  const totalInvestment = (evPrice - dieselPrice - subsidy + equipPrice) * units;
  return saving > 0 ? totalInvestment / saving / 12 : 0;
};

// CO2計算（軽油）t-CO2/年
const co2Diesel = (annualFuelL) => annualFuelL * 0.00258;

// CO2計算（電力）t-CO2/年
const co2Electric = (annualPowerKwh) => annualPowerKwh * 0.000417;

// 他スクリプトから利用するため window に公開
window.EVCalc = {
  monthlyKm,
  monthlyFuel,
  monthlyPower,
  monthlyElecCost,
  monthlyEquipCost,
  monthlyVehicleDiff,
  monthlyMaintenanceDiff,
  monthlySaving,
  shinidemiProfit,
  breakEvenPrice,
  paybackYears,
  co2Diesel,
  co2Electric,
};
