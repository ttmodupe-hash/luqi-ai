import { describe, expect, it } from 'vitest';
import { restCompat } from '../api/rest-compat';

describe('legacy sensing results fail closed instead of inventing evidence', () => {
  for (const path of [
    '/api/v1/sensing/radar', '/v1/sensing/radar',
    '/api/v1/sensing/ticker', '/v1/sensing/ticker',
    '/api/v1/sensing/afcfta-corridor',
    '/api/v1/sensing/agritech-predict',
    '/api/v1/sensing/draft-grant',
    '/api/v1/sensing/generate-api-wrapper',
    '/api/v1/sensing/run-scan',
    '/api/v1/sensing/not-yet-reviewed',
  ]) {
    it('blocks the legacy namespace without false results: ' + path, async () => {
      for (const method of ['GET','POST','PUT','DELETE']) {
        const response = await restCompat.request(path + '?email=foreign@example.invalid', {
          method,
          ...(method==='GET'?{}:{headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ declared_value_usd:65000, origin:'Pretoria', region:'Limpopo' })}),
        });
        expect(response.status).toBe(503);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        const data = await response.json();
        expect(data).toMatchObject({status:'unavailable',code:'SENSING_SOURCE_UNVERIFIED'});
        for (const fake of ['success','live_timestamp','viewers_count','satellite_ndvi_index',
          'corridor_distance_km','tariff_savings_percentage','grant_id','settlement_rail']) {
          expect(data).not.toHaveProperty(fake);
        }
      }
    });
  }
  it('does not deny unrelated free lessons and public account routes', async () => {
    expect((await restCompat.request('/api/v1/cert-academy/tracks')).status).toBe(200);
    expect((await restCompat.request('/auth/login')).status).not.toBe(503);
  });
});
