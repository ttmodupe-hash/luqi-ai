/** Browser-local Academy engines. No network, credentials, eval, or provider calls. */
export type TrackId = 'ccna' | 'security' | 'aws' | 'python' | 'matric' | 'solar';
export type Practice = { id: string; prompt: string; answer: number; unit: string; explanation: string; tolerance: number };
const safeNumber = (value: number, min: number, max: number, name: string) => {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be between ${min} and ${max}.`);
  return value;
};
export function ipv4(address: string, prefix: number) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError('Prefix must be an integer from 0 to 32.');
  const parts = address.trim().split('.');
  if (parts.length !== 4 || parts.some(p => !/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255)) throw new Error('Enter four IPv4 octets from 0 to 255, without leading zeros.');
  const value = parts.reduce((total, p) => total * 256 + Number(p), 0);
  const size = 2 ** (32 - prefix), network = Math.floor(value / size) * size, last = network + size - 1;
  const format = (n: number) => [24, 16, 8, 0].map(shift => Math.floor(n / 2 ** shift) % 256).join('.');
  return { network: format(network), last: format(last), broadcast: prefix < 31 ? format(last) : null,
    firstHost: format(prefix < 31 ? network + 1 : network), lastHost: format(prefix < 31 ? last - 1 : last),
    usable: prefix < 31 ? size - 2 : size, total: size,
    note: prefix === 31 ? '/31 assumes an RFC 3021 point-to-point link.' : prefix === 32 ? '/32 identifies one host route.' : 'Ordinary network and broadcast addresses excluded.' };
}
export function risk(asset: number, exposure: number, occurrences: number) {
  safeNumber(asset, 0, 1e12, 'Asset value'); safeNumber(exposure, 0, 1, 'Exposure factor'); safeNumber(occurrences, 0, 1e6, 'Annual occurrence rate');
  return { sle: asset * exposure, ale: asset * exposure * occurrences };
}
export function cloudCost(gigabytes: number, storageRate: number, hours: number, hourlyRate: number) {
  [gigabytes, storageRate, hours, hourlyRate].forEach(v => safeNumber(v, 0, 1e8, 'Cost input'));
  return gigabytes * storageRate + hours * hourlyRate;
}
export function workEnergy(mass: number, initial: number, final: number) {
  safeNumber(mass, 0.000001, 1e8, 'Mass'); safeNumber(initial, -1e6, 1e6, 'Initial velocity'); safeNumber(final, -1e6, 1e6, 'Final velocity');
  return .5 * mass * (final ** 2 - initial ** 2);
}
export function impulse(mass: number, initial: number, final: number, seconds: number) {
  workEnergy(mass, initial, final); safeNumber(seconds, .000001, 1e8, 'Time');
  const momentumChange = mass * (final - initial);
  return { momentumChange, averageForce: momentumChange / seconds };
}
export function photoelectric(frequency: number, workFunctionEv: number) {
  safeNumber(frequency, 0, 1e22, 'Frequency'); safeNumber(workFunctionEv, 0, 1e6, 'Work function');
  const h = 6.62607015e-34, electronVolt = 1.602176634e-19;
  const photonJ = h * frequency, workJ = workFunctionEv * electronVolt;
  return { photonJ, emitted: photonJ >= workJ, maximumKineticJ: Math.max(0, photonJ - workJ), thresholdHz: workJ / h };
}
export function solar(loadKw: number, hours: number, depth: number, efficiency: number, dailyKwh: number, sunHours: number, pvEfficiency: number) {
  safeNumber(loadKw, 0, 1e6, 'Essential load'); safeNumber(hours, 0, 720, 'Backup hours');
  [depth, efficiency, pvEfficiency].forEach(v => safeNumber(v, .01, 1, 'Efficiency/depth fraction'));
  safeNumber(dailyKwh, 0, 1e8, 'Daily energy'); safeNumber(sunHours, .1, 24, 'Peak-sun-hours assumption');
  return { deliveredKwh: loadKw * hours, nominalBatteryKwh: loadKw * hours / (depth * efficiency), pvKw: dailyKwh / (sunHours * pvEfficiency) };
}
export function generatedPractice(track: TrackId, seed: number): Practice {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('Seed must be a nonnegative safe integer.');
  let n = seed >>> 0;
  const random = (max: number) => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n % max; };
  const a = random(9) + 2, b = random(8) + 2;
  const question = (prompt: string, answer: number, unit: string, explanation: string): Practice => ({ id: `${track}-${seed}`, prompt, answer, unit, explanation,
    // Host counts and Python integer sums are exact; a percent margin falsely credits wrong answers.
    tolerance: track === 'ccna' || track === 'python' ? 0 : Math.max(1e-8, Math.abs(answer) * .001) });
  switch (track) {
    case 'ccna': { const prefix = 20 + random(11), answer = 2 ** (32 - prefix) - 2;
      return question(`For an ordinary IPv4 /${prefix} subnet, how many usable host addresses are available?`, answer, 'hosts', `32 - ${prefix} = ${32 - prefix} host bits; 2^${32 - prefix} - 2 = ${answer}. The /31 exception does not apply here.`); }
    case 'security': return question(`Asset value R${a * 10000}, exposure factor 0.25 and annual rate ${b / 10}. Calculate ALE.`, a * 10000 * .25 * b / 10, 'ZAR/year', `SLE = ${a * 10000} x 0.25 = ${a * 2500}; ALE = SLE x ${b / 10}. This is a scenario estimate, not a forecast guarantee.`);
    case 'aws': return question(`Using an illustrative rate of USD 0.02 per GB-month, what does ${a * 100} GB cost for one month, storage only?`, a * 2, 'USD', `${a * 100} x 0.02 = ${a * 2}. This is not an AWS price quote; requests, transfer, tax and other charges are excluded.`);
    case 'python': return question(`Predict Python's result: sum([${a}, ${b}, ${a + b}])`, 2 * (a + b), 'number', `Add the three list items: ${a} + ${b} + ${a + b}.`);
    case 'matric': return question(`A ${a} kg object speeds up from 2 m/s to ${b + 3} m/s. Calculate net work.`, workEnergy(a, 2, b + 3), 'J', `W_net = 0.5 x ${a} x ((${b + 3})^2 - 2^2). Net work equals the change in kinetic energy.`);
    case 'solar': return question(`An essential load averages ${a * 100} W for ${b} hours. How much energy must be delivered?`, a * b / 10, 'kWh', `Convert watts to kilowatts first: ${a * 100}/1000 x ${b}. Battery losses and reserve are additional.`);
  }
}
export function gradePractice(question: Practice, input: string): boolean {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input.trim())) return false;
  const value = Number(input);
  return Number.isFinite(value) && Math.abs(value - question.answer) <= question.tolerance;
}
export function safeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be' && /^\/[\w-]{11}$/.test(url.pathname)) id = url.pathname.slice(1);
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') id = url.searchParams.get('v');
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export function courseOutline(subject: string, goal: string, topicsText: string, weeklyMinutes: number) {
  if (!subject.trim() || subject.length > 120 || !goal.trim() || goal.length > 600) throw new Error('Add a subject (up to 120 characters) and an outcome (up to 600).');
  safeNumber(weeklyMinutes, 15, 1800, 'Weekly study minutes');
  if (topicsText.length > 4000) throw new Error('Topics are too long.');
  const topics = [...new Set(topicsText.split('\n').map(t => t.trim()).filter(Boolean))];
  if (!topics.length || topics.length > 20 || topics.some(t => t.length > 160)) throw new Error('Provide 1-20 topics, each up to 160 characters.');
  return { subject: subject.trim(), goal: goal.trim(), weeklyMinutes, status: 'Learner-authored outline; sources and subject coverage need review',
    modules: topics.map((topic, index) => ({ title: topic, week: index + 1,
      steps: [`Find an authoritative source for ${topic} and record its date.`, `Explain ${topic} in your own words and your preferred language.`,
        `Build or demonstrate one safe example of ${topic}.`, 'Test an unfamiliar variation; record evidence and mistakes.', 'Teach the idea back, then revisit it on a later day.'] })) };
}
export function nextReview(now: string, successCount: number, correct: boolean): string {
  const time = Date.parse(now);
  if (!Number.isFinite(time) || !Number.isSafeInteger(successCount) || successCount < 0) throw new Error('Invalid review record.');
  const days = correct ? [1, 3, 7, 14, 30][Math.min(successCount, 4)] : 1;
  return new Date(time + days * 86400000).toISOString();
}
export function sourceReviewStatus(reviewedOn: string | null, now = new Date()): 'unverified' | 'reviewed' | 'review-due' {
  if (!reviewedOn || !Number.isFinite(Date.parse(reviewedOn)) || !Number.isFinite(now.getTime())) return 'unverified';
  const age = now.getTime() - Date.parse(reviewedOn);
  return age < 0 ? 'unverified' : age > 30 * 86400000 ? 'review-due' : 'reviewed';
}
