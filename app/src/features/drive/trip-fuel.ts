export type FuelDraft = {
  distance: string;
  consumption: string;
  price: string;
  returning: boolean;
  travellers: string;
};

export const emptyFuelDraft = (): FuelDraft => ({
  distance: "",
  consumption: "",
  price: "",
  returning: false,
  travellers: "1",
});

export function estimateFuel(draft: FuelDraft) {
  const inputs = [draft.distance, draft.consumption, draft.price];
  if (
    !inputs.every(
      (v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0,
    )
  )
    return null;
  const distance = Number(draft.distance) * (draft.returning ? 2 : 1);
  const litres = (distance * Number(draft.consumption)) / 100;
  const cost = litres * Number(draft.price);
  const perKm = cost / distance;
  if (
    ![distance, litres, cost, perKm].every((n) => Number.isFinite(n) && n > 0)
  )
    return null;
  const count = Number(draft.travellers);
  const perPerson =
    Number.isInteger(count) && count >= 1 && count <= 8 ? cost / count : null;
  return { distance, litres, cost, perKm, perPerson };
}
