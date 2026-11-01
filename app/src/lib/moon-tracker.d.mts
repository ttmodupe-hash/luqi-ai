export interface MoonLocation { latitude: number; longitude: number }
export interface MoonPosition { azimuth: number; altitude: number; distance: number; parallacticAngle: number }
export interface MoonSnapshot { at: string; fraction: number; phase: number; name: string; distanceKm: number; waxing: boolean; local: MoonPosition | null; rotation: number }
export const MOON_REFRESH_MS: number;
export function validMoonLocation(value: unknown): value is MoonLocation;
export function parseMoonLocation(latitude: string, longitude: string): MoonLocation | null;
export function phaseName(phase: number): string;
export function moonSnapshot(date: Date, location?: MoonLocation | null): MoonSnapshot;
export function compassDirection(azimuth: number): string;
export function nextMoonEvents(date: Date, location: MoonLocation): { rise: string | null; set: string | null };
export function illuminatedPath(fraction: number): string;
