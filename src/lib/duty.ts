// EASA FTL-inspired flight duty period ceilings. Conservative defaults.
// Real ops config comes from crew/org; this is a hard-block helper for the UI.

export type DutyCheck = {
  ok: boolean;
  reason?: string;
  maxFDPHours: number;
  requestedFDPHours: number;
  restRequiredHours: number;
  restAvailableHours: number;
};

// Max FDP by number of sectors, starting at duty acclimatised local time.
// Simplified single-row table. Not aviation-legal; enforcement layer only.
const FDP_BY_SECTORS: Record<number, number> = { 1: 13, 2: 12.5, 3: 12, 4: 11.5, 5: 11, 6: 10.5, 7: 10, 8: 9 };

export function fdpLimit(sectors: number) {
  const s = Math.max(1, Math.min(8, sectors | 0));
  return FDP_BY_SECTORS[s];
}

export function checkDutyAssignment(opts: {
  sectors: number;
  requestedFDPHours: number;
  restAvailableHours: number;
  totalHoursLast7Days: number;
  totalHoursLast28Days: number;
}): DutyCheck {
  const maxFDP = fdpLimit(opts.sectors);
  const restRequired = Math.max(10, opts.requestedFDPHours);
  const failures: string[] = [];
  if (opts.requestedFDPHours > maxFDP) failures.push(`FDP ${opts.requestedFDPHours.toFixed(1)}h > max ${maxFDP}h for ${opts.sectors} sectors`);
  if (opts.restAvailableHours < restRequired) failures.push(`Rest ${opts.restAvailableHours.toFixed(1)}h < required ${restRequired}h`);
  if (opts.totalHoursLast7Days + opts.requestedFDPHours > 60) failures.push(`Would exceed 60h in 7 days`);
  if (opts.totalHoursLast28Days + opts.requestedFDPHours > 190) failures.push(`Would exceed 190h in 28 days`);
  return {
    ok: failures.length === 0,
    reason: failures.join(" · ") || undefined,
    maxFDPHours: maxFDP,
    requestedFDPHours: opts.requestedFDPHours,
    restRequiredHours: restRequired,
    restAvailableHours: opts.restAvailableHours,
  };
}
