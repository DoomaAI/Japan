# Read-only XLSX extraction using OOXML. The source workbook is never rewritten.
import json, re, hashlib, posixpath, sys, unicodedata
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
source=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFKD',s).lower() if not unicodedata.combining(c))
 return re.sub(r'[^a-z0-9]+',' ',s).strip()
with ZipFile(source) as z:
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(t.text or '' for t in si.iter('{'+ns['m']+'}t')) for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]
 rel={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheet=next(s for s in ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets',ns) if s.attrib['name']=='Master List')
 target=rel[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
 path=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
 rows=[]
 for row in ET.fromstring(z.read(path)).findall('m:sheetData/m:row',ns):
  record={}
  for c in row:
   v=c.find('m:v',ns);value=v.text if v is not None else ''
   if c.attrib.get('t')=='s':value=strings[int(value)]
   if c.attrib.get('t')=='inlineStr':value=''.join(t.text or '' for t in c.iter('{'+ns['m']+'}t'))
   record[re.sub(r'\d','',c.attrib['r'])]=value
  if record.get('A') and record['A']!='Venue':rows.append((int(row.attrib['r']),record))
locations=[]
for row,d in rows:
 name=d['A'];address=d.get('E','')
 locations.append({'id':'map-'+hashlib.sha256((name+'|'+address).encode()).hexdigest()[:12],'name':name,'district':d.get('B',''),'city':d.get('C',''),'category':d.get('D',''),'address':address,'notes':d.get('F',''),'sourceUrl':d.get('G',''),'sourceRow':row,'aliases':[name],'referenceOnly':'REFERENCE ONLY' in d.get('F','')})
# Reviewed exact itinerary aliases. Broad areas, station entrances and other branches remain unlinked.
reviewed={
'Aiwafuku Gion Shijo Kyoto':74,'Azabudai Hills Tokyo':16,'Beyblade Bar Tokyo Shimokitazawa':165,'CHADO Matcha 4-13-15 Minamisenba Osaka':180,'Chef Mickey Disney Ambassador Hotel':124,'Disney Ambassador Hotel':124,
'Ebisubashi Osaka':41,'Gacha Gacha no Mori Nipponbashi Ota Road Osaka':138,'Hachiko Statue Shibuya':156,'Haneda Airport Terminal 3 arrivals':86,
'Hatoya Arashiyama Kyoto':8,'Hatoya Shibuya Tokyo':163,"I'm donut Omotesando Tokyo":99,'Kawaii Monster Land Harajuku':90,'ReUnion coffee Arashiyama Kyoto':7,'Rikuro Namba Osaka':46,
'Ryogoku View Hotel 2-19-1 Ryogoku Tokyo':148,'Ryogoku View Hotel Tokyo':148,'Shibuya Crossing Tokyo':161,'Shinsaibashi-suji Osaka':178,'Tamagotchi Factory Harakado Tokyo':92,
'Tatsumi Bridge Gion Kyoto':85,'Tokyu Plaza Omotesando OMOKADO':108,'Totaro Kyoto':122,'Yasaka Pagoda Kyoto':79,'EDW yellow 26-5 Udagawacho Tokyo':154,
'Tokyo Station Marunouchi':131,'Ameyoko Tokyo':189,'teamLab Borderless Azabudai Hills':18}
seed=json.loads((root/'data/seed.json').read_text())
for place in sorted({s['place'] for s in seed['steps']}|{d['hotel'] for d in seed['days']}):
 stripped=re.sub(r' (Tokyo|Kyoto|Osaka|Nara)$','',place)
 candidates=[l for l in locations if norm(l['name']) in [norm(place),norm(stripped)]]
 if place in reviewed:candidates=[l for l in locations if l['sourceRow']==reviewed[place]]
 if len(candidates)==1 and place not in candidates[0]['aliases']:candidates[0]['aliases'].append(place)
# Japanese names live in their own file, keyed by id, so a fresh import keeps them.
japanese=json.loads((root/'data/location-names-ja.json').read_text())
for l in locations:l['japanese']=japanese.get(l['id'],'')
# Keep all source rows, including possible duplicate listings with different names/notes.
for l in locations:
 l['guidePages']=sorted({s['page'] for s in seed['steps'] if s['place'] in l['aliases']})
 l['tripDays']=sorted({s['day'] for s in seed['steps'] if s['place'] in l['aliases']})
 l['japanese']=l.pop('japanese')
(root/'data/map-locations.json').write_text(json.dumps({'source':source.name,'sheet':'Master List','locations':locations},ensure_ascii=False,indent=2)+'\n')
matched=[s for s in seed['steps'] if any(s['place'] in l['aliases'] for l in locations)]
print(f'{len(locations)} source locations, {len(matched)} activity links, {sum(bool(l["guidePages"]) for l in locations)} locations linked to guide pages.')
for l in locations:
 if l['guidePages']:print(f'{l["sourceRow"]}: {l["name"]} <- '+ '; '.join(a for a in l['aliases'] if a!=l['name']))
