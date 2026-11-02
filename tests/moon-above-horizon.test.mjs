import test from 'node:test';
import assert from 'node:assert/strict';
import { moonSnapshot } from '../src/lib/moon-tracker.mjs';

// Independently generated 2026-11-01 with installed pyswisseph 2.10.03,
// explicit FLG_MOSEPH, FLG_EQUATORIAL|FLG_TOPOCTR for horizontal coordinates,
// sea level / 1013.25 hPa / 10 C. Geocentric distance and illumination are
// calculated separately. Numeric fixtures only, no external library shipped.
// These expand the earlier below-horizon fixtures; they are not actual sightings.
const samples = [
  ['2026-11-02T04:00:00Z',-26.2,28.04,9.665287,44.792101,.46608156,373619.286],
  ['2026-11-02T04:00:00Z',-33.93,18.42,19.764062,35.101530,.46608156,373619.286],
  ['2026-11-02T04:00:00Z',-1.29,36.82,355.128302,70.524389,.46608156,373619.286],
  ['2026-11-02T04:00:00Z',6.52,3.38,67.101860,56.507883,.46608156,373619.286],
  ['2026-11-02T04:00:00Z',9.03,38.75,338.577221,80.399914,.46608156,373619.286],
  ['2026-11-02T04:00:00Z',30.04,31.24,162.921973,77.034988,.46608156,373619.286],
  ['2026-04-02T01:00:00Z',-26.2,28.04,286.488223,43.642415,.99936731,393425.726],
  ['2026-04-02T01:00:00Z',-33.93,18.42,302.412580,48.116713,.99936731,393425.726],
  ['2026-04-02T01:00:00Z',-1.29,36.82,261.876042,36.566524,.99936731,393425.726],
  ['2026-04-02T01:00:00Z',6.52,3.38,234.505922,66.117905,.99936731,393425.726],
  ['2026-04-02T01:00:00Z',9.03,38.75,255.095879,32.567504,.99936731,393425.726],
  ['2026-04-02T01:00:00Z',30.04,31.24,238.298690,30.756027,.99936731,393425.726],
];
for (const [at,latitude,longitude,azimuth,altitude,fraction,distanceKm] of samples) {
  test(`above-horizon reference ${at} ${latitude},${longitude}`, () => {
    const actual = moonSnapshot(new Date(at), {latitude,longitude});
    assert.ok(actual.local.altitude > 0);
    assert.ok(Math.abs((actual.local.azimuth-azimuth+540)%360-180)<.1, 'true-north direction within 0.1 degree');
    assert.ok(Math.abs(actual.local.altitude-altitude)<.1, 'above-horizon altitude within 0.1 degree');
    assert.ok(Math.abs(actual.fraction-fraction)<.001, 'illuminated fraction');
    assert.ok(Math.abs(actual.distanceKm-distanceKm)<250, 'Earth-centre distance');
  });
}
