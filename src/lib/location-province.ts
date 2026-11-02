import { PROVINCE_GEOMETRY } from './sa-province-map';
import { MAP_PROJECTION as m } from './sa-map-projection';
import type { ProvinceCode } from './opportunity-sources';
type Point = readonly [number, number];
const regions = PROVINCE_GEOMETRY.map(region => ({ id: region.id,
  rings: region.path.split('M').slice(1).map(ring => ring.replace(' Z', '').split(' L').map(pair => pair.split(',').map(Number) as [number, number])) }));
function inside([x,y]: Point, ring: Point[]) {
  let hit = false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [a,b]=ring[i], [c,d]=ring[j];
    if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) hit=!hit;
  }
  return hit;
}
function distance(p: Point, a: Point, b: Point) {
  const dx=b[0]-a[0], dy=b[1]-a[1], den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
/** Approximate local province suggestion, never navigation or legal boundaries.
 * Fail closed near any simplified boundary, with accuracy plus 2km margin. */
export function suggestProvince(latitude:number, longitude:number, accuracy:number):ProvinceCode|null {
  if(![latitude,longitude,accuracy].every(Number.isFinite)||latitude < -90||latitude>90||longitude < -180||longitude>180||accuracy<0||accuracy>10_000)return null;
  const p:Point=[m.xoff+(longitude*m.cos-m.xmin)*m.scale,m.yoff+(-latitude-m.ymin)*m.scale];
  const margin=(accuracy+2000)/111_000*m.scale;
  const matches=regions.filter(region=>{
    let hit=false;
    for(const ring of region.rings){
      if(inside(p,ring))hit=!hit;
      for(let i=0;i<ring.length;i++)if(distance(p,ring[i],ring[(i+1)%ring.length])<=margin)return false;
    }
    return hit;
  });
  return matches.length===1?matches[0].id:null;
}
