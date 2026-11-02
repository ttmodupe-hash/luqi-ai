/*!
 * Lunar calculations adapted from SunCalc 2.0.1, lunar subset only.
 * Upstream: mourner/suncalc @ bbc91f689ede3ff7173011947d435b3fb6c0485d.
 * Modifications: bounded/validated public API, rolling horizon search, phase SVG.
 * Copyright (c) 2026, Volodymyr Agafonkin
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of
 *    conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list
 *    of conditions and the following disclaimer in the documentation and/or other materials
 *    provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
const { PI, sin, cos, tan, asin, atan2: atan, acos } = Math;
const RAD = PI / 180;
const DAY = 86400000;
const EARTH_KM = 6378.14;
export const MOON_REFRESH_MS = 60000;
const MIN_DATE = Date.UTC(1900, 0, 1);
const MAX_DATE = Date.UTC(2101, 0, 1);

function validDate(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.valueOf()) ||
      date.valueOf() < MIN_DATE || date.valueOf() >= MAX_DATE) {
    throw new RangeError('Set the device clock to a date between 1900 and 2100.');
  }
}
export function validMoonLocation(value) {
  return !!value && typeof value === 'object' &&
    Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}
export function parseMoonLocation(latitude, longitude) {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (typeof latitude !== 'string' || typeof longitude !== 'string' ||
      latitude.length > 24 || longitude.length > 24 ||
      !decimal.test(latitude.trim()) || !decimal.test(longitude.trim())) return null;
  const value = { latitude: Number(latitude), longitude: Number(longitude) };
  return validMoonLocation(value) ? value : null;
}
function days(date) { return date.valueOf() / DAY + 2440587.5 - 2451545; }
function deltaT(d) {
  const y = 2000 + d / 365.2425;
  let t;
  if (y < 1920) { t = y - 1900; return -2.79 + t * (1.494119 + t * (-0.0598939 + t * (0.0061966 - t * 0.000197))); }
  if (y < 1941) { t = y - 1920; return 21.20 + t * (0.84493 + t * (-0.076100 + t * 0.0020936)); }
  if (y < 1961) { t = y - 1950; return 29.07 + t * (0.407 + t * (-1 / 233 + t / 2547)); }
  if (y < 1986) { t = y - 1975; return 45.45 + t * (1.067 + t * (-1 / 260 - t / 718)); }
  if (y < 2005) { t = y - 2000; return 63.86 + t * (0.3345 + t * (-0.060374 + t * (0.0017275 + t * (0.000651814 + t * 0.00002373599)))); }
  if (y < 2050) { t = y - 2000; return 62.92 + t * (0.32217 + t * 0.005589); }
  t = (y - 1820) / 100; return -20 + 32 * t * t - 0.5628 * (2150 - y);
}
function sun(d) {
  const t = d / 36525;
  const L0 = RAD * (280.46646 + t * (36000.76983 + t * 0.0003032));
  const M = RAD * (357.52911 + t * (35999.05029 - t * 0.0001537));
  const s = sin(M), c = cos(M);
  const C = RAD * ((1.914602 - t * (0.004817 + t * 0.000014)) * s +
    (0.019993 - 0.000101 * t) * 2 * s * c + 0.000289 * s * (3 - 4 * s * s));
  const om = RAD * (125.04 - 1934.136 * t);
  const L = L0 + C - RAD * (0.00569 + 0.00478 * sin(om));
  const e = RAD * (23.439291 - t * (0.0130042 + t * (0.00000016 - t * 0.000000504))) + RAD * 0.00256 * cos(om);
  return { ra: atan(cos(e) * sin(L), cos(L)), dec: asin(sin(e) * sin(L)) };
}
const LON = [
  0,0,1,0,6288774,-20905355, 2,0,-1,0,1274027,-3699111, 2,0,0,0,658314,-2955968,
  0,0,2,0,213618,-569925, 0,1,0,0,-185116,48888, 0,0,0,2,-114332,-3149,
  2,0,-2,0,58793,246158, 2,-1,-1,0,57066,-152138, 2,0,1,0,53322,-170733,
  2,-1,0,0,45758,-204586, 0,1,-1,0,-40923,-129620, 1,0,0,0,-34720,108743,
  0,1,1,0,-30383,104755, 2,0,0,-2,15327,10321, 0,0,1,2,-12528,0,
  0,0,1,-2,10980,79661, 4,0,-1,0,10675,-34782, 0,0,3,0,10034,-23210,
  4,0,-2,0,8548,-21636, 2,1,-1,0,-7888,24208, 2,1,0,0,-6766,30824,
  1,0,-1,0,-5163,-8379, 1,1,0,0,4987,-16675, 2,-1,1,0,4036,-12831,
  2,0,2,0,3994,-10445, 4,0,0,0,3861,-11650, 2,0,-3,0,3665,14403,
  0,1,-2,0,-2689,-7003, 2,0,-1,2,-2602,0, 2,-1,-2,0,2390,10056,
  1,0,1,0,-2348,6322, 2,-2,0,0,2236,-9884, 0,1,2,0,-2120,5751,
  0,2,0,0,-2069,0, 2,-2,-1,0,2048,-4950, 2,0,1,-2,-1773,4130,
  2,0,0,2,-1595,0, 4,-1,-1,0,1215,-3958, 0,0,2,2,-1110,0,
  3,0,-1,0,-892,3258, 2,1,1,0,-810,2616, 4,-1,-2,0,759,-1897,
  0,2,-1,0,-713,-2117, 2,2,-1,0,-700,2354, 2,1,-2,0,691,0,
  2,-1,0,-2,596,0, 4,0,1,0,549,-1423, 0,0,4,0,537,-1117,
  4,-1,0,0,520,-1571, 1,0,-2,0,-487,-1739, 2,1,0,-2,-399,0,
  0,0,2,-2,-381,-4421, 1,1,1,0,351,0, 3,0,-2,0,-340,0,
  4,0,-3,0,330,0, 2,-1,2,0,327,0, 0,2,1,0,-323,1165,
  1,1,-1,0,299,0, 2,0,3,0,294,0, 2,0,-1,-2,0,8752
];
const LAT = [
  0,0,0,1,5128122, 0,0,1,1,280602, 0,0,1,-1,277693, 2,0,0,-1,173237,
  2,0,-1,1,55413, 2,0,-1,-1,46271, 2,0,0,1,32573, 0,0,2,1,17198,
  2,0,1,-1,9266, 0,0,2,-1,8822, 2,-1,0,-1,8216, 2,0,-2,-1,4324,
  2,0,1,1,4200, 2,1,0,-1,-3359, 2,-1,-1,1,2463, 2,-1,0,1,2211,
  2,-1,-1,-1,2065, 0,1,-1,-1,-1870, 4,0,-1,-1,1828, 0,1,0,1,-1794,
  0,0,0,3,-1749, 0,1,-1,1,-1565, 1,0,0,1,-1491, 0,1,1,1,-1475,
  0,1,1,-1,-1410, 0,1,0,-1,-1344, 1,0,0,-1,-1335, 0,0,3,1,1107,
  4,0,0,-1,1021, 4,0,-1,1,833, 0,0,1,-3,777, 4,0,-2,1,671,
  2,0,0,-3,607, 2,0,2,-1,596, 2,-1,1,-1,491, 2,0,-2,1,-451,
  0,0,3,-1,439, 2,0,2,1,422, 2,0,-3,-1,421, 2,1,-1,1,-366,
  2,1,0,1,-351, 4,0,0,1,331, 2,-1,1,1,315, 2,-2,0,-1,302,
  0,0,1,3,-283, 2,1,1,-1,-229, 1,1,0,-1,223, 1,1,0,1,223,
  0,1,-2,-1,-220, 2,1,-1,-1,-220, 1,0,1,1,-185, 2,-1,-2,-1,181,
  0,1,2,1,-177, 4,0,-2,-1,176, 4,-1,-1,-1,166, 1,0,1,-1,-164,
  4,0,1,-1,132, 1,0,-1,-1,-119, 4,-1,0,-1,115, 2,-2,0,1,107
];
function moon(d) {
  const t = d / 36525;
  const lp = 218.3164477 + t * (481267.88123421 + t * (-0.0015786 + t * (1 / 538841 - t / 65194000)));
  const D = RAD * (297.8501921 + t * (445267.1114034 + t * (-0.0018819 + t * (1 / 545868 - t / 113065000))));
  const M = RAD * (357.5291092 + t * (35999.0502909 + t * (-0.0001536 + t / 24490000)));
  const mp = 134.9633964 + t * (477198.8675055 + t * (0.0087414 + t * (1 / 69699 - t / 14712000)));
  const f = 93.2720950 + t * (483202.0175233 + t * (-0.0036539 + t * (-1 / 3526000 + t / 863310000)));
  const MP = RAD * mp, F = RAD * f, LP = RAD * lp;
  const E = 1 - t * (0.002516 + t * 0.0000074);
  let sl = 0, sr = 0, sb = 0;
  for (let i = 0; i < LON.length; i += 6) {
    const arg = LON[i] * D + LON[i+1] * M + LON[i+2] * MP + LON[i+3] * F;
    const e = E ** Math.abs(LON[i+1]);
    sl += LON[i+4] * e * sin(arg); sr += LON[i+5] * e * cos(arg);
  }
  for (let i = 0; i < LAT.length; i += 5) {
    const arg = LAT[i] * D + LAT[i+1] * M + LAT[i+2] * MP + LAT[i+3] * F;
    sb += LAT[i+4] * E ** Math.abs(LAT[i+1]) * sin(arg);
  }
  const a1 = RAD * (119.75 + 131.849 * t);
  sl += 3958 * sin(a1) + 1962 * sin(LP-F) + 318 * sin(RAD * (53.09 + 479264.290 * t));
  sb += -2235 * sin(LP) + 382 * sin(RAD * (313.45 + 481266.484 * t)) +
    175 * sin(a1-F) + 175 * sin(a1+F) + 127 * sin(LP-MP) - 115 * sin(LP+MP);
  const om = RAD * (125.04452 - 1934.136261 * t);
  const ls = RAD * (280.4665 + 36000.7698 * t), lm = RAD * (218.3165 + 481267.8813 * t);
  const dpsi = (-17.20*sin(om)-1.32*sin(2*ls)-0.23*sin(2*lm)+0.21*sin(2*om))/3600;
  const deps = (9.20*cos(om)+0.57*cos(2*ls)+0.10*cos(2*lm)-0.09*cos(2*om))/3600;
  const eps = RAD * (23.439291-t*(0.0130042+t*(0.00000016-t*0.000000504))+deps);
  const l = RAD * (lp + sl/1e6 + dpsi), b = RAD * sb/1e6;
  return { ra: atan(sin(l)*cos(eps)-tan(b)*sin(eps), cos(l)),
    dec: asin(sin(b)*cos(eps)+cos(b)*sin(eps)*sin(l)), distance: 385000.56 + sr/1000 };
}
function coordinates(date) {
  const d = days(date), tt = d + deltaT(d)/86400;
  return { d, m: moon(tt), s: sun(tt) };
}
function position(date, location) {
  const { d, m } = coordinates(date);
  const phi = location.latitude * RAD;
  const H = RAD * (280.46061837 + 360.98564736629*d + location.longitude) - m.ra;
  const geocentric = asin(sin(phi)*sin(m.dec) + cos(phi)*cos(m.dec)*cos(H));
  const h = geocentric - asin(EARTH_KM/m.distance * cos(geocentric));
  const refH = Math.max(0, h);
  const refraction = 0.0002967/tan(refH+0.00312536/(refH+0.08901179));
  return { azimuth: (atan(sin(H),cos(H)*sin(phi)-tan(m.dec)*cos(phi))/RAD+540)%360,
    altitude: (h+refraction)/RAD, distance: m.distance,
    parallacticAngle: atan(sin(H),tan(phi)*cos(m.dec)-sin(m.dec)*cos(H))/RAD };
}
export function phaseName(phase) {
  if (!Number.isFinite(phase) || phase < 0 || phase > 1) throw new RangeError('Invalid lunar phase.');
  if (phase < .02 || phase > .98) return 'Near new moon';
  if (Math.abs(phase-.25) < .015) return 'Near first quarter';
  if (Math.abs(phase-.5) < .02) return 'Near full moon';
  if (Math.abs(phase-.75) < .015) return 'Near last quarter';
  return phase < .25 ? 'Waxing crescent' : phase < .5 ? 'Waxing gibbous' : phase < .75 ? 'Waning gibbous' : 'Waning crescent';
}
export function moonSnapshot(date, location = null) {
  validDate(date);
  if (location !== null && !validMoonLocation(location)) throw new RangeError('Invalid latitude or longitude.');
  const { m, s } = coordinates(date);
  const phi = acos(Math.max(-1, Math.min(1, sin(s.dec)*sin(m.dec)+cos(s.dec)*cos(m.dec)*cos(s.ra-m.ra))));
  const inc = atan(149598000*sin(phi),m.distance-149598000*cos(phi));
  const angle = atan(cos(s.dec)*sin(s.ra-m.ra),sin(s.dec)*cos(m.dec)-cos(s.dec)*sin(m.dec)*cos(s.ra-m.ra))/RAD;
  const phase = .5 + .5*inc*(angle<0?-1:1)/PI;
  const local = location ? position(date,location) : null;
  return { at: date.toISOString(), fraction: (1+cos(inc))/2, phase, name: phaseName(phase),
    distanceKm: m.distance, waxing: angle<0, local,
    // SVG clockwise from its right-facing bright limb; celestial PA is east-positive.
    rotation: -90-angle+(local?.parallacticAngle??0) };
}
export function compassDirection(azimuth) {
  if (!Number.isFinite(azimuth)) throw new RangeError('Invalid direction.');
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(((azimuth%360+360)%360)/45)%8];
}
function upperLimb(date, location) {
  const p = position(date,location);
  return p.altitude + .2725*asin(EARTH_KM/p.distance)/RAD + .09;
}
/** Bounded rolling 48h search. Ten-minute sampling may miss a grazing polar event;
 * absence is therefore labelled 'not found', never 'always up/down'. */
export function nextMoonEvents(date, location) {
  validDate(date);
  if (!validMoonLocation(location)) throw new RangeError('Invalid latitude or longitude.');
  const end = Math.min(date.valueOf()+2*DAY, MAX_DATE-1);
  const events = { rise: null, set: null };
  let left = date.valueOf(), low = upperLimb(date,location);
  for (let right = Math.min(left+600000,end); right>left && left<end; right=Math.min(left+600000,end)) {
    const high = upperLimb(new Date(right),location);
    if ((low<0 && high>=0) || (low>0 && high<=0)) {
      const type = low<0 ? 'rise' : 'set';
      if (!events[type]) {
        let a=left,b=right,ha=low;
        for (let i=0;i<14;i++) {
          const mid=(a+b)/2, hm=upperLimb(new Date(mid),location);
          if ((ha<0)===(hm<0)) {a=mid;ha=hm;} else b=mid;
        }
        events[type]=new Date((a+b)/2).toISOString();
        if (events.rise && events.set) break;
      }
    }
    left=right;low=high;
  }
  return events;
}
/** Phase silhouette only, not lunar terrain or an image capture. */
export function illuminatedPath(fraction) {
  if (!Number.isFinite(fraction) || fraction<0 || fraction>1) throw new RangeError('Invalid illumination.');
  const points=[];
  for(let i=0;i<=48;i++) {const a=-PI/2+PI*i/48;points.push([50+44*cos(a),50+44*sin(a)]);}
  for(let i=48;i>=0;i--) {const a=-PI/2+PI*i/48;points.push([50-44*(2*fraction-1)*cos(a),50+44*sin(a)]);}
  return points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`).join(' ')+' Z';
}
