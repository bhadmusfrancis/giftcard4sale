const assert = require("node:assert/strict");
const { test } = require("node:test");
const { calculateRateQuote, reductionsForAdminTrade } = require("./dist");

const regular = { nairaReductionPercent: 20, usdtReductionPercent: 30, ghsReductionPercent: 30 };
const lower = { nairaReductionPercent: 40, usdtReductionPercent: 50, ghsReductionPercent: 60 };
const config = {
  reductions: regular,
  deductionBands: [{ minRateCount: 0, maxRateCount: 5, ...regular, lowDenomEnabled: true }],
  lowDenom: { maxDenom: 50, ...lower },
};

test("admin trades retain automatic amount-based deductions by default", () => {
  assert.deepEqual(reductionsForAdminTrade(null, 3, config, 100), regular);
  assert.deepEqual(reductionsForAdminTrade(null, 3, config, 50), lower);
  assert.deepEqual(reductionsForAdminTrade(null, 3, config, 25, false), lower);
});

test("admins can choose lower-denomination rates above the amount threshold", () => {
  assert.deepEqual(reductionsForAdminTrade(null, 3, config, 200, true), lower);
});

test("explicit selection works outside opted-in deduction bands", () => {
  const disabled = { ...config, deductionBands: [{ ...config.deductionBands[0], lowDenomEnabled: false }] };
  assert.deepEqual(reductionsForAdminTrade(null, 3, disabled, 25), regular);
  assert.deepEqual(reductionsForAdminTrade(null, 3, disabled, 200, true), lower);
  assert.deepEqual(reductionsForAdminTrade(null, 20, config, 200, true), lower);
});

test("explicit lower deductions override card defaults; unset currencies retain their defaults", () => {
  const card = { nairaReductionPercent: 10, usdtReductionPercent: 15 };
  const partial = { ...config, lowDenom: { maxDenom: null, nairaReductionPercent: 0, usdtReductionPercent: null } };
  assert.deepEqual(reductionsForAdminTrade(card, 3, config, 200), { ...regular, ...card });
  assert.deepEqual(reductionsForAdminTrade(card, 3, config, 200, true), lower);
  assert.deepEqual(reductionsForAdminTrade(card, 3, partial, 200, true), {
    nairaReductionPercent: 0,
    usdtReductionPercent: 15,
    ghsReductionPercent: 30,
  });
});

test("missing lower-denomination configuration preserves existing deductions", () => {
  assert.deepEqual(reductionsForAdminTrade(null, 3, { reductions: regular }, 200, true), regular);
});

for (const [payoutCurrency, payoutAmount] of [["NGN", 120000], ["USDT", 100], ["GHS", 800]]) {
  test(`explicit lower-denomination rates calculate the ${payoutCurrency} payout`, () => {
    const quote = calculateRateQuote({
      nairaPerUnit: 1000,
      cardAmount: 200,
      payoutCurrency,
      medium: "PHYSICAL",
      rates: { ngnPerUsdt: 1000, ngnPerGhs: 100 },
      reductions: reductionsForAdminTrade(null, 3, config, 200, true),
    });
    assert.equal(quote.payoutAmount, payoutAmount);
  });
}

test("cards with no SafeTheTrade rates skip the number-of-rates bands", () => {
  assert.deepEqual(reductionsForAdminTrade(null, null, config, 200), regular);
  assert.deepEqual(reductionsForAdminTrade(null, null, config, 200, true), lower);
});
