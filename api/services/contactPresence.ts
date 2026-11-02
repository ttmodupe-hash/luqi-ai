/** Short-lived, opt-in status leases. No last-seen history or durable tracking.
 * Single-process scope: missing state is never online/offline proof. */
export const PRESENCE_TTL_MS = 75_000;
const RETAIN_MS = 15 * 60_000;
export type PresenceAvailability = 'online' | 'away';
type Lease = { sequence: number; active: boolean; availability: PresenceAvailability; expires: number; touched: number };
export class ContactPresence {
  private users = new Map<number, Map<string, Lease>>();
  private swept = 0;
  constructor(private clock = () => Date.now(), private capacity = 5000) {}
  private sweep(now: number) {
    if (now - this.swept < 30_000) return;
    this.swept = now;
    for (const [user, leases] of this.users) {
      for (const [id, lease] of leases) if (now - lease.touched >= RETAIN_MS) leases.delete(id);
      if (!leases.size) this.users.delete(user);
    }
  }
  prune() { this.sweep(this.clock()); }
  update(user: number, id: string, sequence: number, active: boolean, availability: PresenceAvailability = 'online') {
    if (availability !== 'online' && availability !== 'away') throw Error('PRESENCE_INPUT');
    const now = this.clock(); this.sweep(now);
    let leases = this.users.get(user);
    if (!leases) {
      if (!active) return;
      if (this.users.size >= this.capacity) throw Error('PRESENCE_CAPACITY');
      leases = new Map(); this.users.set(user, leases);
    }
    const previous = leases.get(id);
    if (previous && sequence <= previous.sequence) return;
    if (!previous && leases.size >= 4) throw Error('PRESENCE_CAPACITY');
    // Selecting Away does not bypass the existing heartbeat rate bound.
    if (active && previous?.active && now - previous.touched < 10_000) throw Error('PRESENCE_RATE');
    // A newer inactive tombstone prevents reordered requests from undoing Hide.
    leases.set(id, { sequence, active, availability, expires: now + PRESENCE_TTL_MS, touched: now });
  }
  read(user: number): 'online' | 'away' | 'offline' | 'not_shared' {
    const now = this.clock(); this.sweep(now);
    const leases = this.users.get(user);
    if (!leases) return 'not_shared';
    const shared = [...leases.values()].filter(lease => lease.active && now - lease.touched < RETAIN_MS);
    const live = shared.filter(lease => lease.expires > now);
    // Another consenting Online tab takes precedence over an Away tab.
    if (live.some(lease => lease.availability === 'online')) return 'online';
    if (live.some(lease => lease.availability === 'away')) return 'away';
    return shared.length ? 'offline' : 'not_shared';
  }
}
export const contactPresence = new ContactPresence();
const cleanup = setInterval(() => contactPresence.prune(), 30_000);
cleanup.unref();
