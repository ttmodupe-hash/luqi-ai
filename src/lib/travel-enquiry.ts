/** Offline travel enquiry draft, never a reservation, search or provider connection. */
export interface TravelEnquiryInput {
  goal: string;
  destination: string;
  dates: string;
  travellers: string;
  budget: string;
  preferences: string;
}
export const MAX_TRAVEL_DESTINATION = 80;
export const MAX_TRAVEL_DETAIL = 160;
const clean = (value: string): string => value.replace(/[\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').trim();

export function buildTravelEnquiry(value: TravelEnquiryInput): string | null {
  if (!value || Object.values(value).some(field => typeof field !== 'string')) return null;
  const goal = clean(value.goal);
  const destination = clean(value.destination);
  const dates = clean(value.dates);
  const budget = clean(value.budget);
  const preferences = clean(value.preferences);
  const count = Number(value.travellers);
  if (!goal || goal.length > 500 || !destination || destination.length > MAX_TRAVEL_DESTINATION ||
      dates.length > MAX_TRAVEL_DESTINATION || budget.length > MAX_TRAVEL_DESTINATION ||
      preferences.length > MAX_TRAVEL_DETAIL || !/^\d{1,2}$/u.test(value.travellers.trim()) ||
      !Number.isInteger(count) || count < 1 || count > 30) return null;
  return [
    'DRAFT TRAVEL ENQUIRY — NO RESERVATION OR PAYMENT',
    'My goal: ' + goal,
    'Destination: ' + destination,
    'Dates or travel window: ' + (dates || 'Please advise'),
    'Travellers: ' + count,
    'Total budget and currency: ' + (budget || 'Please provide options'),
    'Accessibility or other preferences: ' + (preferences || 'Please confirm options'),
    '',
    'Please confirm the actual provider/property or service name, authentic location and photos where relevant,',
    'dated availability, final all-in price and fees in the stated currency, payment recipient and cancellation/refund terms.',
    'I will review the verified offer before deciding. Nothing has been booked or paid through LUQI.',
  ].join('\n');
}
