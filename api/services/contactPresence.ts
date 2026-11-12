/** Short-lived foreground leases, not login history. Single web-process scope.
 * Production currently runs one replica. Missing state is never online/offline proof. */
export const PRESENCE_TTL_MS = 75_000;
const RETAIN_MS = 15 * 60_000;
// Preserve hidden/expired sequence tombstones without counting them as live tabs.
const MAX_RETAINED_LEASES_PER_USER = 16;
type Lease = { sequence: number; active: boolean; away: boolean; expires: number; touched: number; modeWindowStarted: number; modeSwitches: number; reenableWindowStarted: number; reenableCount: number };
export class ContactPresence {
  private users = new Map<number, Map<string, Lease>>();
  private swept = 0;
  private lastObservedTime = Number.NEGATIVE_INFINITY;
  // Presence uses elapsed process-local time; wall-clock corrections must not
  // revive an expired public Online/Away signal after it became Offline.
  constructor(private clock = () => performance.now(), private capacity = 5000) {}
  private now() {
    const observed = this.clock();
    if (!Number.isFinite(observed)) throw Error('PRESENCE_CLOCK');
    this.lastObservedTime = Math.max(this.lastObservedTime, observed);
    return this.lastObservedTime;
  }
  private sweep(now: number) {
    if (now - this.swept < 30_000) return;
    this.swept = now;
    for (const [user, leases] of this.users) {
      for (const [id, lease] of leases) if (now - lease.touched >= RETAIN_MS) leases.delete(id);
      if (!leases.size) this.users.delete(user);
    }
  }
  prune() { this.sweep(this.now()); }
  update(user: number, id: string, sequence: number, active: boolean, away = false) {
    const now = this.now(); this.sweep(now);
    let leases = this.users.get(user);
    if (!leases) {
      if (!active) return;
      if (this.users.size >= this.capacity) throw Error('PRESENCE_CAPACITY');
      leases = new Map(); this.users.set(user, leases);
    }
    const previous = leases.get(id);
    // A Hide for an unknown tab is a no-op; otherwise fabricated tombstones
    // consume the four-lease quota and block real foreground tabs for 15 min.
    if (!previous && !active) return;
    if (previous && sequence <= previous.sequence) return;
    // A repeated Hide raises the sequence fence but must never refresh the
    // tombstone retention clock; otherwise retries can lock out new tabs.
    if (previous && !previous.active && !active) {
      leases.set(id, { ...previous, sequence });
      return;
    }
    // Keep tombstones to reject delayed pre-Hide packets, but let users open
    // fresh tabs after closing old ones. Bound retained state per account.
    if (!previous && leases.size >= MAX_RETAINED_LEASES_PER_USER) throw Error('PRESENCE_CAPACITY');
    const activating = active && (!previous || !previous.active || previous.expires <= now);
    if (activating) {
      const live = [...leases.entries()].filter(([leaseId, lease]) =>
        leaseId !== id && lease.active && lease.expires > now).length;
      if (live >= 4) throw Error('PRESENCE_CAPACITY');
    }
    if (active && previous?.active && now - previous.touched < 10_000) {
      if (previous.away === away) throw Error('PRESENCE_RATE');
      // Preserve immediate deliberate changes, but bound alternating mode flips:
      // without this cap each opposite-mode request evades same-mode throttling.
      // Mode-only changes never renew the 75-second lease or its heartbeat clock.
      const modeWindowStarted = now - previous.modeWindowStarted < 10_000 ? previous.modeWindowStarted : now;
      const modeSwitches = modeWindowStarted === previous.modeWindowStarted ? previous.modeSwitches : 0;
      if (modeSwitches >= 6) throw Error('PRESENCE_RATE');
      leases.set(id, { ...previous, sequence, away, modeWindowStarted, modeSwitches: modeSwitches + 1 });
      return;
    }
    // Keep an inactive tombstone briefly so a delayed older heartbeat cannot undo Hide.
    // Hide and immediate re-enable must not reset the mode-toggle quota;
    // otherwise callers can evade it by cycling active=false/true.
    const withinModeWindow = !!previous && now - previous.modeWindowStarted < 10_000;
    // Repeated Hide/re-enable can otherwise restart the lease and avoid the mode
    // switch quota indefinitely. Never block Hide, but cap reactivations.
    const withinReenableWindow = !!previous && now - previous.reenableWindowStarted < 10_000;
    const reenableCount = withinReenableWindow ? previous!.reenableCount : 0;
    const reactivating = active && previous?.active === false;
    if (reactivating && reenableCount >= 3) throw Error('PRESENCE_RATE');
    leases.set(id, { sequence, active, away: active && away, expires: now + PRESENCE_TTL_MS, touched: now,
      modeWindowStarted: withinModeWindow ? previous!.modeWindowStarted : now,
      modeSwitches: withinModeWindow ? previous!.modeSwitches : 0,
      reenableWindowStarted: withinReenableWindow ? previous!.reenableWindowStarted : now,
      reenableCount: reenableCount + (reactivating ? 1 : 0) });
  }
  read(user: number): 'online' | 'away' | 'offline' | 'not_shared' {
    const now = this.now(); this.sweep(now);
    const leases = this.users.get(user);
    if (!leases) return 'not_shared';
    const shared = [...leases.values()].filter(lease => lease.active && now - lease.touched < RETAIN_MS);
    const live = shared.filter(lease => lease.expires > now);
    // A foreground tab set to Online wins over an Away tab. No activity is inferred.
    return live.some(lease => !lease.away) ? 'online' : live.length ? 'away' : shared.length ? 'offline' : 'not_shared';
  }
}
export const contactPresence = new ContactPresence();

// Delete expired transient state even after every browser has closed. No network or history writes.
const cleanup = setInterval(() => contactPresence.prune(), 30_000);
cleanup.unref();
