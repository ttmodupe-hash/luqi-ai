import {describe,expect,it} from 'vitest';
import {
  DRIVE_AREAS_REVIEWED_ON,DRIVE_AREA_STORIES,DRIVE_AUTO_MIN_GAP_MS,
  DRIVE_AREA_REPEAT_MS,areasForDriveRoute,canAutoNarrateDriveArea,
  driveAreaDistanceKm,nearbyDriveArea,
} from '../src/lib/luqi-drive-areas';
import {
  DRIVE_AREA_STORIES as mirror,
  nearbyDriveArea as mirroredFind,
} from '../app/src/lib/luqi-drive-areas';

describe('Luqi-Drive public regional discovery', () => {
  it('curates unique source-linked geography, history, natural wealth, culture, wildlife and trivia for each starting corridor', () => {
    expect(DRIVE_AREAS_REVIEWED_ON).toBe('2026-11-03');
    expect(DRIVE_AREA_STORIES.length).toBe(4);
    expect(DRIVE_AREA_STORIES).toEqual(mirror);
    expect(new Set(DRIVE_AREA_STORIES.map(a=>a.id)).size).toBe(DRIVE_AREA_STORIES.length);
    const categories=['Geography','History','Natural wealth','Culture & languages','Fauna & flora','Did you know?'];
    for (const area of DRIVE_AREA_STORIES) {
      expect(area.vicinity).toMatch(/near|Near/);
      expect(area.radiusKm).toBeLessThanOrEqual(35);
      expect(area.audioBrief.length).toBeGreaterThan(90);
      expect(area.audioBrief.length).toBeLessThan(350);
      expect(area.topics.map(t=>t.category)).toEqual(categories);
      for (const topic of area.topics) {
        expect(topic.fact.length).toBeGreaterThan(40);
        expect(topic.fact).not.toMatch(/guaranteed sighting|live traffic|beneath the road/i);
        expect(area.sources[topic.source]).toBeDefined();
      }
      for (const source of area.sources) {
        const url=new URL(source.url);
        expect(url.protocol).toBe('https:');
        expect(url.username).toBe('');
        expect(url.password).toBe('');
        expect(url.search).toBe('');
      }
    }
    expect(areasForDriveRoute('n1-pretoria-polokwane').length).toBe(2);
    expect(areasForDriveRoute('n3-joburg-durban').length).toBe(2);
  });

  it('accepts fresh, precise fixes near a selected corridor without inventing road identity', () => {
    const now=1_000_000;
    const makapan=nearbyDriveArea({routeId:'n1-pretoria-polokwane',latitude:-24.19,longitude:29.01,accuracyMeters:15,timestamp:now},now);
    expect(makapan?.id).toBe('n1-mokopane');
    expect(mirroredFind({routeId:'n1-pretoria-polokwane',latitude:-24.19,longitude:29.01,accuracyMeters:15,timestamp:now},now)?.id).toBe('n1-mokopane');
    expect(nearbyDriveArea({routeId:'n3-joburg-durban',latitude:-24.19,longitude:29.01,accuracyMeters:15,timestamp:now},now)).toBeNull();
    expect(driveAreaDistanceKm(-24.19,29.01,-24.19,29.01)).toBeCloseTo(0,7);
    expect(driveAreaDistanceKm(200,0,0,0)).toBe(Infinity);
  });

  it('rejects stale, low-quality, missing and invalid GPS fixes without auto-narration', () => {
    const now=1_000_000;
    const fix={routeId:'n1-pretoria-polokwane' as const,latitude:-24.7,longitude:28.41,accuracyMeters:10,timestamp:now};
    for(const change of [
      {accuracyMeters:1600},{accuracyMeters:-1},{accuracyMeters:NaN},
      {timestamp:now-50_000},{timestamp:now+3_000},
      {latitude:100},{longitude:Infinity},{latitude:NaN},
    ]) expect(nearbyDriveArea({...fix,...change},now)).toBeNull();
    expect(nearbyDriveArea({...fix,latitude:-31.2},now)).toBeNull();
  });

  it('enforces both same-area and global cooldowns, including clock rollback', () => {
    const now=1_000_000;
    expect(canAutoNarrateDriveArea(undefined,undefined,now)).toBe(true);
    expect(canAutoNarrateDriveArea(now-DRIVE_AREA_REPEAT_MS+1,undefined,now)).toBe(false);
    expect(canAutoNarrateDriveArea(undefined,now-DRIVE_AUTO_MIN_GAP_MS+1,now)).toBe(false);
    expect(canAutoNarrateDriveArea(now-DRIVE_AREA_REPEAT_MS,now-DRIVE_AUTO_MIN_GAP_MS,now)).toBe(true);
    expect(canAutoNarrateDriveArea(now+1,undefined,now)).toBe(false);
  });
});
