/**
 * EV試算 計算ロジック
 */

// 月間走行距離（台数分合計）（km）
const monthlyKmTotal = (annualKm, units) => (annualKm / 12) * units;

// 月間軽油消費量（L）
const monthlyFuelL = (annualKm, fuelEfficiency, units) =>
  (annualKm / 12 / fuelEfficiency) * units;

// 月間燃料費（円）
const monthlyFuelCost = (fuelL, dieselPrice) => fuelL * dieselPrice;

// 月間充電量（kWh）
const monthlyChargeKwh = (annualKm, evEfficiency, units) =>
  (annualKm / 12 / evEfficiency) * units;

// 月間充電金額（従量）（円）
const monthlyChargeCost = (chargeKwh, chargeRate) => chargeKwh * chargeRate;

// EV充電の電力基本料金増加額（月間）（円）
// = (基本料金単価 + 容量拠出金) × 電力増量kWh × 台数
const monthlyBasicChargeCost = (basicRate, capacityRate, powerIncrease, units) =>
  (basicRate + capacityRate) * powerIncrease * units;

// 月間エネルギーコスト削減額（円）
// = 燃料費 - 充電金額 - 基本料金増加額
const monthlyEnergySaving = (fuelCost, chargeCost, basicChargeCost) =>
  fuelCost - chargeCost - basicChargeCost;

// 充電設備 月間償却費（円）
const monthlyEquipCost = (equipPrice, units, years) =>
  (equipPrice * units) / (years * 12);

// 月間削減額（残）= エネルギーコスト削減 + 月間設備費（設備費は負値として加算）
const monthlySaving = (energySaving, equipCost) =>
  energySaving + equipCost;

// EV乗出し価格 = EV車両価格 - 補助金
const evNetPrice = (evPrice, subsidy) => evPrice - subsidy;

// EV切替後の月間収支 = 月間削減額 + EV乗出し価格（リース月額）
// ※リース月額 = EV乗出し価格 / (リース年数 * 12)（負値として加算）
const monthlyBalance = (saving, evNet, leaseYears) =>
  saving + (evNet / (leaseYears * 12));

// 投資回収期間（年）
const paybackYears = (evPrice, dieselPrice, subsidy, equipPrice, units, saving) => {
  const totalInvestment = (evPrice - dieselPrice - subsidy + equipPrice) * units;
  if (saving <= 0 || totalInvestment <= 0) return null;
  return totalInvestment / saving / 12;
};

// CO2計算（軽油）t-CO2/年
const co2Diesel = (annualFuelL) => annualFuelL * 0.00258;

// CO2計算（電力）t-CO2/年
const co2Electric = (annualKwh) => annualKwh * 0.000417;

// ---- 旧API互換（chart-init.js等で使用） ----

// 月間電力使用量（kWh）- 旧名で互換維持
const monthlyPower = (annualKm, evEfficiency, units) =>
  monthlyChargeKwh(annualKm, evEfficiency, units);

// 月間電気代（円）- 旧名で互換維持（経路充電含む）
const monthlyElecCost = (power, routePct, homeRate, routeRate) => {
  const home = power * (1 - routePct / 100) * homeRate;
  const route = power * (routePct / 100) * routeRate;
  return home + route;
};

// 車両差額 月間償却費（円）- 旧名で互換維持
const monthlyVehicleDiff = (evPrice, dieselPrice, subsidy, units, years) =>
  ((evPrice - dieselPrice - subsidy) * units) / (years * 12);

// 維持費差額 月額（円）- 旧名で互換維持
const monthlyMaintenanceDiff = (dieselMaint, evMaint, units) =>
  (dieselMaint - evMaint) * units;

// 新出光側 月間損益（円）
const shinidemiProfit = (power, sellPrice, buyPrice) =>
  power * (sellPrice - buyPrice);

// 損益分岐販売単価（新出光側）（円/kWh）
const breakEvenPrice = (buyPrice, fixedCost, power) =>
  power > 0 ? buyPrice + fixedCost / power : buyPrice;

// 他スクリプトから利用するため window に公開
window.EVCalc = {
  monthlyKmTotal,
  monthlyFuelL,
  monthlyFuelCost,
  monthlyChargeKwh,
  monthlyChargeCost,
  monthlyBasicChargeCost,
  monthlyEnergySaving,
  monthlyEquipCost,
  monthlySaving,
  evNetPrice,
  monthlyBalance,
  paybackYears,
  co2Diesel,
  co2Electric,
  // 旧API互換
  monthlyPower,
  monthlyElecCost,
  monthlyVehicleDiff,
  monthlyMaintenanceDiff,
  shinidemiProfit,
  breakEvenPrice,
  // 旧名エイリアス
  monthlyFuel: (annualKm, fuelEfficiency, dieselPrice, units) =>
    monthlyFuelCost(monthlyFuelL(annualKm, fuelEfficiency, units), dieselPrice),
};
