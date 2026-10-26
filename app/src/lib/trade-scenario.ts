/** Offline-only scenario arithmetic. Never assumes actual AfCFTA duty rates. */
export type Scenario = {
  declaredUsd: string; standardRate: string; comparisonRate: string;
  standardDutyUsd: string; comparisonDutyUsd: string;
  differenceUsd: string; direction: 'lower' | 'higher' | 'equal';
};
const invalid = () => new Error('INVALID_DUTY_SCENARIO');
const parseMoney = (text: string) => {
  if(typeof text !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(text)) throw invalid();
  const [d,c=''] = text.split('.');
  const cents = BigInt(d)*100n + BigInt(c.padEnd(2,'0'));
  if(cents <= 0n) throw invalid();
  return cents;
};
const parsePercent = (text: string) => {
  if(typeof text !== 'string' || !/^(?:0|[1-9]\d?|100)(?:\.\d{1,2})?$/.test(text)) throw invalid();
  const [d,c=''] = text.split('.');
  const points = BigInt(d)*100n + BigInt(c.padEnd(2,'0'));
  if(points > 10000n) throw invalid();
  return points;
};
const moneyText = (cents: bigint) => {
  const whole = (cents/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return whole + '.' + (cents%100n).toString().padStart(2,'0');
};
const rateText = (basisPoints: bigint) => (basisPoints/100n).toString()
  + '.' + (basisPoints%100n).toString().padStart(2,'0');
const duty = (cents: bigint, basisPoints: bigint) =>
  (cents*basisPoints + 5000n)/10000n;

export function calculateScenario(values: {
  declaredUsd: string; standardRate: string; comparisonRate: string;
}): Scenario {
  if (!values || typeof values !== 'object') throw invalid();
  const amount = parseMoney(values.declaredUsd);
  const firstRate = parsePercent(values.standardRate);
  const secondRate = parsePercent(values.comparisonRate);
  const first = duty(amount,firstRate), second = duty(amount,secondRate);
  const delta = first-second;
  return {
    declaredUsd: moneyText(amount),
    standardRate: rateText(firstRate), comparisonRate: rateText(secondRate),
    standardDutyUsd: moneyText(first), comparisonDutyUsd: moneyText(second),
    differenceUsd: moneyText(delta < 0n ? -delta : delta),
    direction: delta > 0n ? 'lower' : delta < 0n ? 'higher' : 'equal',
  };
}
