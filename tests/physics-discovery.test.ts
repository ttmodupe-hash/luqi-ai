import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluatePhysics, initialPhysicsValues, PHYSICS_TOPICS } from '../src/features/physics/models';

const metric = (id: Parameters<typeof evaluatePhysics>[0], settings: Record<string, number>, label: string) =>
  evaluatePhysics(id, settings).metrics.find(reading => reading.label === label)?.value;

describe('local Physics Discovery models', () => {
  it('provides eight independent experiment definitions, each with adjustable controls', () => {
    expect(PHYSICS_TOPICS).toHaveLength(8);
    expect(new Set(PHYSICS_TOPICS.map(topic => topic.id)).size).toBe(8);
    for (const topic of PHYSICS_TOPICS) {
      expect(topic.controls.length).toBeGreaterThanOrEqual(3);
      expect(topic.formula.length).toBeGreaterThan(8);
      expect(topic.assumptions.length).toBeGreaterThan(20);
      const initial = initialPhysicsValues(topic.id);
      expect(Object.keys(initial)).toHaveLength(topic.controls.length);
      for (const control of topic.controls) {
        expect(initial[control.key]).toBeGreaterThanOrEqual(control.min);
        expect(initial[control.key]).toBeLessThanOrEqual(control.max);
      }
      expect(evaluatePhysics(topic.id, initial).metrics.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('calculates projectile range and duration with independently controlled flight position', () => {
    const values = { ...initialPhysicsValues('projectile'), speed: 20, angle: 45, height: 0, gravity: 9.8, progress: 50 };
    const result = evaluatePhysics('projectile', values);
    expect(result.values.range).toBeCloseTo(400 / 9.8, 6);
    expect(result.values.duration).toBeCloseTo((2 * 20 * Math.sin(Math.PI / 4)) / 9.8, 6);
    expect(result.values.peak).toBeCloseTo((20 * Math.sin(Math.PI / 4)) ** 2 / (2 * 9.8), 6);
    expect(result.values.t).toBeCloseTo(result.values.duration / 2, 6);
    expect(result.values.y).toBeGreaterThan(0);
  });

  it('models a static block, and mass-independent downhill acceleration after friction threshold', () => {
    const params = { ...initialPhysicsValues('incline'), angle: 0, friction: 0.4 };
    expect(evaluatePhysics('incline', params).state).toBe('At rest');
    params.angle = 30;
    const a = evaluatePhysics('incline', { ...params, mass: 1 });
    const b = evaluatePhysics('incline', { ...params, mass: 9 });
    expect(a.state).toBe('Sliding downhill');
    expect(a.values.acceleration).toBeCloseTo(9.8 * (0.5 - 0.4 * Math.cos(Math.PI / 6)), 6);
    expect(a.values.acceleration).toBeCloseTo(b.values.acceleration, 10);
  });

  it('compares true equivalent resistance and current for series and parallel circuits', () => {
    const values = { voltage: 12, r1: 10, r2: 20, parallel: 0 };
    const series = evaluatePhysics('circuit', values);
    const parallel = evaluatePhysics('circuit', { ...values, parallel: 1 });
    expect(series.values.req).toBeCloseTo(30, 9);
    expect(series.values.current).toBeCloseTo(0.4, 9);
    expect(parallel.values.req).toBeCloseTo(200 / 30, 9);
    expect(parallel.values.current).toBeCloseTo(1.8, 9);
    expect(parallel.values.power).toBeGreaterThan(series.values.power);
  });

  it('calculates wavelength/frequency speed and period from a travelling-wave model', () => {
    const result = evaluatePhysics('wave', { ...initialPhysicsValues('wave'), frequency: 2, wavelength: 3 });
    expect(result.values.speed).toBe(6);
    expect(result.values.period).toBe(0.5);
    expect(metric('wave', initialPhysicsValues('wave'), 'Wave speed')).toBe(6);
  });

  it('handles real, virtual and infinity focus conditions without dividing by zero', () => {
    const values = { focal: 12, objectDistance: 30, objectHeight: 5 };
    const real = evaluatePhysics('lens', values);
    expect(real.values.imageDistance).toBeCloseTo(20, 9);
    expect(real.values.magnification).toBeCloseTo(-2 / 3, 9);
    const virtual = evaluatePhysics('lens', { ...values, objectDistance: 8 });
    expect(virtual.values.imageDistance).toBeCloseTo(-24, 9);
    expect(virtual.state).toContain('Virtual');
    const focus = evaluatePhysics('lens', { ...values, objectDistance: 12 });
    expect(focus.metrics[0].value).toBeNull();
    expect(focus.state).toBe('Image at infinity');
  });

  it('conserves ideal mechanical energy as position changes along the ramp', () => {
    for (const progress of [0, 25, 50, 100]) {
      const result = evaluatePhysics('energy', { ...initialPhysicsValues('energy'), progress });
      expect(result.values.potential + result.values.kinetic).toBeCloseTo(result.values.total, 7);
      expect(result.values.potential).toBeGreaterThanOrEqual(0);
      expect(result.values.kinetic).toBeGreaterThanOrEqual(0);
    }
  });

  it('conserves momentum, respects elasticity and never invents a catch-up collision', () => {
    const values = { m1: 2, m2: 1, u1: 6, u2: 0, restitution: 1 };
    const elastic = evaluatePhysics('collision', values);
    expect(elastic.values.v1).toBeCloseTo(2, 9);
    expect(elastic.values.v2).toBeCloseTo(8, 9);
    expect(elastic.values.before).toBeCloseTo(elastic.values.after, 9);
    const sticky = evaluatePhysics('collision', { ...values, restitution: 0 });
    expect(sticky.values.v1).toBeCloseTo(sticky.values.v2, 9);
    expect(sticky.values.before).toBeGreaterThan(sticky.values.after);
    expect(sticky.values.m1 * sticky.values.v1 + sticky.values.m2 * sticky.values.v2)
      .toBeCloseTo(sticky.values.momentum, 9);
    const noContact = evaluatePhysics('collision', { ...values, u1: 2, u2: 4 });
    expect(noContact.state).toBe('No catch-up collision');
    expect(noContact.values.v1).toBe(2);
    expect(noContact.values.v2).toBe(4);
  });

  it('calculates specific heat using material properties and excludes phase change', () => {
    const values = { material: 0, mass: 1, initial: 20, rise: 10 };
    const water = evaluatePhysics('thermal', values);
    const aluminium = evaluatePhysics('thermal', { ...values, material: 1 });
    const steel = evaluatePhysics('thermal', { ...values, material: 2 });
    expect(water.values.q).toBe(41800);
    expect(aluminium.values.q).toBe(9000);
    expect(steel.values.q).toBe(4500);
    expect(water.values.final).toBe(30);
  });

  it('bounds altered values and uses safe defaults for non-finite input', () => {
    const defaults = evaluatePhysics('projectile', initialPhysicsValues('projectile'));
    const input = { ...initialPhysicsValues('projectile'), speed: NaN, angle: Infinity };
    const result = evaluatePhysics('projectile', input);
    expect(result.values.range).toBeCloseTo(defaults.values.range, 9);
    expect(evaluatePhysics('circuit', { voltage: 12, r1: -100, r2: 1, parallel: 0 }).values.req).toBe(2);
  });

  it('keeps the root and app physics model implementations identical', () => {
    expect(readFileSync('src/features/physics/models.ts', 'utf8'))
      .toBe(readFileSync('app/src/features/physics/models.ts', 'utf8'));
    expect(readFileSync('src/pages/PhysicsLabHubPage.tsx', 'utf8'))
      .toBe(readFileSync('app/src/pages/PhysicsLabHubPage.tsx', 'utf8'));
  });
});
