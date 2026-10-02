// The months every builder uses, from the check date in src/config.json.
// past12: the 12 months before the check month (every comparison uses these only).
// ahead12: the check month and the 11 after it (the year ahead: planning only, never scored).
export const addMonths = (m, n) => { let [y, mm] = m.split('-').map(Number); mm += n; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return `${y}-${String(mm).padStart(2, '0')}`; };
const lastDay = m => { const [y, mm] = m.split('-').map(Number); return `${m}-${String(new Date(Date.UTC(y, mm, 0)).getUTCDate()).padStart(2, '0')}`; };
export function windowsOf(cfg) {
  if (!cfg || !/^\d{4}-\d{2}-\d{2}$/.test(cfg.checked || '')) throw new Error('src/config.json: "checked" must be a date (YYYY-MM-DD)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.firstPassTo || '')) throw new Error('src/config.json: "firstPassTo" must be a date (YYYY-MM-DD)');
  const TODAY = cfg.checked, M0 = TODAY.slice(0, 7);
  const PAST12 = [], AHEAD12 = [];
  for (let i = -12; i < 0; i++) PAST12.push(addMonths(M0, i));
  for (let i = 0; i < 12; i++) AHEAD12.push(addMonths(M0, i));
  const MONTHS = PAST12.concat(AHEAD12);
  return { TODAY, M0, FROM: M0 + '-01', TO: lastDay(AHEAD12[11]), PAST12, AHEAD12, MONTHS, PAST_FROM: PAST12[0] + '-01', PAST_TO: lastDay(PAST12[11]), FIRST_TO: cfg.firstPassTo };
}
