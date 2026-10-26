import { describe, expect, it } from 'vitest';
import { buildTravelEnquiry } from '../src/lib/travel-enquiry';
const base = { goal: 'Book a place to stay in Cape Town', destination: 'Cape Town', dates: '10–15 December', travellers: '2', budget: 'R3000 total', preferences: 'Near public transport' };
describe('private local travel enquiry', () => {
  it('creates a bounded enquiry with real verification prompts, never a reservation', () => {
    const result = buildTravelEnquiry(base)!;
    expect(result).toContain('DRAFT TRAVEL ENQUIRY — NO RESERVATION OR PAYMENT');
    expect(result).toContain('Destination: Cape Town');
    expect(result).toContain('Travellers: 2');
    expect(result).toMatch(/dated availability/);
    expect(result).toMatch(/Nothing has been booked or paid/);
    expect(result.length).toBeLessThan(1350);
  });
  it('rejects missing destinations, implausible groups and oversized fields', () => {
    expect(buildTravelEnquiry({ ...base, destination: '' })).toBeNull();
    for (const travellers of ['0','31','2.5','two','-2','2e2']) expect(buildTravelEnquiry({ ...base, travellers })).toBeNull();
    expect(buildTravelEnquiry({ ...base, budget: 'x'.repeat(81) })).toBeNull();
    expect(buildTravelEnquiry({ ...base, preferences: 'y'.repeat(161) })).toBeNull();
    expect(buildTravelEnquiry({ ...base, goal: 'z'.repeat(501) })).toBeNull();
  });
  it('normalises whitespace without silently contacting or identifying a provider', () => {
    const result = buildTravelEnquiry({ ...base, destination: '  Cape\nTown ', dates: '', budget: '', preferences: '' })!;
    expect(result).toContain('Destination: Cape Town');
    expect(result).toContain('Please provide options');
    expect(result).not.toContain('http');
  });
});
