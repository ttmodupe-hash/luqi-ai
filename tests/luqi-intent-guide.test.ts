import { describe, expect, it } from 'vitest';
import { GUIDE_EXAMPLES, MAX_GUIDE_NEED_CHARS, guideLuqiNeed } from '../src/lib/luqi-intent-guide';

describe('LUQI local intent guidance', () => {
  it('does not fabricate bookings, prices, availability or payments', () => {
    for (const need of [
      'Book a hotel in Cape Town for two people',
      'Can I reserve a safari ticket in Kenya?',
      'Find accommodation near Johannesburg',
    ]) {
      const result = guideLuqiNeed(need)!;
      expect(result.kind).toBe('booking');
      expect(result.bookingPreview).toBe(true);
      expect(result.status).toBe('unavailable');
      expect(result.detail).toMatch(/no connected, verified live/i);
      expect(result.caution).toMatch(/nothing has been reserved or charged/i);
      expect(result.primaryPath).toBe('/omega-tasks');
    }
  });
  it('routes travel to a real local calculator without inventing current facts', () => {
    const result = guideLuqiNeed('I am visiting South Africa and want a travel itinerary')!;
    expect(result.kind).toBe('travel');
    expect(result.status).toBe('local');
    expect(result.primaryPath).toBe('/omega-tasks');
    expect(result.detail).toMatch(/not verified live visas/i);
  });
  it('prioritises emergencies above bookings and AI upsells', () => {
    const result = guideLuqiNeed('Emergency: I need an ambulance while staying at a hotel')!;
    expect(result.kind).toBe('urgent');
    expect(result.primaryPath).toBeNull();
    expect(result.detail).toMatch(/contact local emergency services/i);
  });
  it('guides languages, study, creation and business to honest paths', () => {
    expect(guideLuqiNeed('Teach me local languages and customs in Kenya')?.kind).toBe('language');
    expect(guideLuqiNeed('Help me prepare for my exam')?.primaryPath).toBe('/study-desk');
    expect(guideLuqiNeed('Create a short animated story')?.primaryPath).toBe('/content-studio');
    expect(guideLuqiNeed('Prepare a business quotation')?.primaryPath).toBe('/business-desk');
  });
  it('routes legal information to existing source-linked public guides, never to an automatic legal verdict', () => {
    const asylum = guideLuqiNeed('How do asylum seekers apply in South Africa?')!;
    expect(asylum.kind).toBe('rights');
    expect(asylum.primaryPath).toBe('/rights-guide');
    expect(asylum.caution).toMatch(/not independently approved legal advice/);
    const consumer = guideLuqiNeed('The retailer refused a refund for faulty goods')!;
    expect(consumer.kind).toBe('consumer');
    expect(consumer.primaryPath).toBe('/consumer-rights');
    expect(consumer.detail).toMatch(/does not determine liability/);
  });
  it('recognises destinations across Africa without inventing current country data', () => {
    for (const country of ['Rwanda','Botswana','Eswatini','Côte d’Ivoire','São Tomé and Príncipe','Mauritius','Zambia','Uganda','Namibia','Senegal']) {
      const result = guideLuqiNeed('Tell me about ' + country)!;
      expect(result.kind).toBe('travel');
      expect(result.caution).toMatch(/Confirm entry rules/);
    }
  });
  it('prioritises the action over a destination mentioned in the same question', () => {
    expect(guideLuqiNeed('Create an animation about Rwanda')?.kind).toBe('create');
    expect(guideLuqiNeed('Study South African history for an exam')?.kind).toBe('study');
    expect(guideLuqiNeed('Prepare a quotation for a customer in Botswana')?.kind).toBe('business');
    expect(guideLuqiNeed('Help me plan a business trip to Kenya')?.kind).toBe('travel');
  });
  it('understands visitor transport, food and where-to-stay requests without fake listings', () => {
    expect(guideLuqiNeed('How do I get a taxi from the airport?')?.kind).toBe('travel');
    expect(guideLuqiNeed('Where can I eat near the museum?')?.kind).toBe('travel');
    expect(guideLuqiNeed('Where should I stay in Durban?')?.kind).toBe('booking');
  });
  it('keeps arbitrary user input bounded and does not claim autonomous understanding', () => {
    expect(guideLuqiNeed('')).toBeNull();
    expect(guideLuqiNeed('   ')).toBeNull();
    expect(guideLuqiNeed({ query: 'book me a hotel' })).toBeNull();
    expect(guideLuqiNeed('x'.repeat(MAX_GUIDE_NEED_CHARS + 1))).toBeNull();
    const general = guideLuqiNeed('I have a question about tomorrow')!;
    expect(general.kind).toBe('general');
    expect(general.detail).toMatch(/not yet a fully integrated multi-turn/i);
  });
  it('offers concrete examples without claiming live integrations', () => {
    expect(GUIDE_EXAMPLES.length).toBeGreaterThanOrEqual(4);
    for (const example of GUIDE_EXAMPLES) {
      expect(guideLuqiNeed(example.need)).not.toBeNull();
      expect(example.need.length).toBeLessThanOrEqual(MAX_GUIDE_NEED_CHARS);
    }
  });
});
