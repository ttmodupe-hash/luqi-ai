"""Generate small, offline SVG province paths from pinned geoBoundaries data.
Download URL and license are recorded in docs/SOUTH_AFRICA_PROVINCE_MAP.md.
Usage: python scripts/build-province-map.py /path/to/geoBoundaries-ZAF-ADM1_simplified.geojson
"""
import hashlib, json, math, sys
from pathlib import Path
SHA='e0be7fc729e409be2a1f596271b6d0aac5f704a066cd26cfa3bf9e23b1270fe3'
raw=Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest()!=SHA: raise SystemExit('Boundary source checksum mismatch')
data=json.loads(raw)
map_ids={'EC':'EC','FS':'FS','GT':'GP','KZ':'KZN','LI':'LP','MP':'MP','NC':'NC','NW':'NW','WC':'WC'}
polygons={map_ids[f['properties']['shapeISO']]: f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']] for f in data['features']}
points=[p for parts in polygons.values() for polygon in parts for ring in polygon for p in ring]
if any(not(-36 < lat < -21 and 15 < lon < 34) for lon,lat in points): raise SystemExit('Unexpected mainland extent')
# Equirectangular at 29 degrees south: correct geographic arrangement and aspect.
cos=math.cos(math.radians(29)); xs=[p[0]*cos for p in points];ys=[-p[1] for p in points]
xmin,xmax,ymin,ymax=min(xs),max(xs),min(ys),max(ys)
scale=min(740/(xmax-xmin),550/(ymax-ymin))
xoff=(800-(xmax-xmin)*scale)/2; yoff=(620-(ymax-ymin)*scale)/2
project=lambda lon,lat:[round(xoff+(lon*cos-xmin)*scale,1),round(yoff+(-lat-ymin)*scale,1)]
def rdp(ps,epsilon=.45):
 if len(ps)<3:return ps
 a,b=ps[0],ps[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
 def distance(p):
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
 k=max(range(1,len(ps)-1),key=lambda i:distance(ps[i]))
 if distance(ps[k])>epsilon:return rdp(ps[:k+1],epsilon)[:-1]+rdp(ps[k:],epsilon)
 return [a,b]
def simplify(ring):
 ps=[project(*p) for p in ring]
 k=max(range(1,len(ps)-1),key=lambda i:(ps[i][0]-ps[0][0])**2+(ps[i][1]-ps[0][1])**2)
 result=rdp(ps[:k+1])[:-1]+rdp(ps[k:])
 return result if len(result)>=4 else ps
labels={'EC':(26.2,-32.05),'FS':(26.6,-28.45),'GP':(28.3,-26.05),'KZN':(30.45,-28.65),'LP':(29.3,-23.65),'MP':(30.25,-25.9),'NC':(21.1,-29.25),'NW':(25.25,-26.6),'WC':(20.2,-33.55)}
result=[]
for id,parts in polygons.items():
 path=' '.join('M'+' L'.join(','.join(map(str,p)) for p in simplify(ring))+' Z' for polygon in parts for ring in polygon)
 result.append({'id':id,'path':path,'label':project(*labels[id])})
text="/** Generated from geoBoundaries ZAF ADM1 (2020), OCHA ROSEA / South African MDB.\n * CC BY 4.0 distribution; original CC BY 3.0 IGO. See docs/SOUTH_AFRICA_PROVINCE_MAP.md.\n * Equirectangular 29S, simplified 0.45 SVG units. Display geography, not navigation. */\nimport type { ProvinceCode } from './opportunity-sources';\nexport const PROVINCE_GEOMETRY: readonly {id:ProvinceCode;path:string;label:readonly [number,number]}[] = "+json.dumps(result,separators=(',',':'))+";\nexport const GAUTENG_CALLOUT = "+json.dumps(project(25.9,-24.5))+" as const;\nexport const MAP_CONTEXT_LABELS = "+json.dumps([{'name':'LESOTHO','position':project(28.3,-29.55)},{'name':'ESWATINI','position':project(31.5,-26.5)}])+";\n"
for prefix in ['src','app/src']:Path(prefix+'/lib/sa-province-map.ts').write_text(text)
print('Generated nine province paths:',len(text),'bytes per frontend')
