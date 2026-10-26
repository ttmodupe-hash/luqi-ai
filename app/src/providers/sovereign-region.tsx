import { createContext, useContext, useState, type ReactNode } from 'react';
import { AFRICAN_REGION_CODES, type AfricanRegionCode, isAfricanRegionCode } from '../services/panAfricanSovereignEngine';

/** In-memory tab context: never a claim about precise user location or legal residence. */
type SovereignContext = { region: AfricanRegionCode; setRegion: (value: AfricanRegionCode) => void };
const RegionContext = createContext<SovereignContext | null>(null);
const fallback: SovereignContext = { region: 'PAN_AFRICAN_AU', setRegion: () => {} };

export function SovereignRegionProvider({ children }: { children: ReactNode }) {
  const [region, setSelected] = useState<AfricanRegionCode>('PAN_AFRICAN_AU');
  const setRegion = (value: AfricanRegionCode) => {
    if (isAfricanRegionCode(value)) setSelected(value);
  };
  return <RegionContext.Provider value={{ region, setRegion }}>{children}</RegionContext.Provider>;
}
export function useSovereignRegion(): SovereignContext {
  return useContext(RegionContext) ?? fallback;
}
export function useOptionalSovereignRegion(): SovereignContext | null {
  return useContext(RegionContext);
}
export { AFRICAN_REGION_CODES };
