import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { translatedFiles } from './translation_sources.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const normalize = text => text.replaceAll('\r\n', '\n');
const lexicographic = (a,b) => a < b ? -1 : a > b ? 1 : 0;
export const sortedHashMap = map => Object.fromEntries(Object.keys(map).sort(lexicographic).map(key=>[key,map[key]]));
export const equalHashMaps = (a,b) => JSON.stringify(sortedHashMap(a)) === JSON.stringify(sortedHashMap(b));
const read = file => normalize(fs.readFileSync(file, 'utf8'));
const json = file => JSON.parse(read(file));
const sourceFiles = () => [...translatedFiles.map(x => `data/${x}.json`), 'components/places/dossiers.ts'];
const metadata = new Set('id slug place places people books articles photos cover portrait image file url href lat lng polyline coords coordinates date year years author_years checkedAt ref refs section status guide original originalLanguage kind type era layer layers country city group crop level season series_slug posts tg_ids review_post coord_confidence navigationName navigationAddress'.split(' '));
const escape = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
for (const key of ['periods','sourceLanguages','relatedNotes','relatedPlaces','relatedPeople','relatedSources']) metadata.add(key);
function keyed(array) {
  if (!Array.isArray(array)) return null;
  if(!array.length)return new Map();
  // A shared unique field is safer than selecting a different key per row.
  // Photo metadata has no numeric id: its invariant asset file is the stable identity.
  for(const field of ['slug','id','place','file']) {
    if(!array.every(x=>x && typeof x==='object' && !Array.isArray(x) && ['string','number'].includes(typeof x[field])))continue;
    const ids=array.map(x=>`${field}=${x[field]}`);
    if(new Set(ids).size===ids.length)return new Map(array.map((x,i)=>[ids[i],x]));
  }
  return null;
}
function hasProse(value,key) {
  if(metadata.has(key))return false;
  if(value && typeof value==='object')return Object.entries(value).some(([k,v])=>hasProse(v,Array.isArray(value)?key:k));
  return typeof value==='string' && !!value.trim() && !/^(https?:\/\/|photos\/|\/)|^\d{4}-\d{2}-\d{2}$/.test(value);
}
export function diffValues(oldValue, newValue, translation, location = '', key = '') {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
  // A newly tracked dataset still produces stable per-entity work, not a giant file task.
  if(location==='') {
    if(oldValue===undefined && newValue && typeof newValue==='object')oldValue=Array.isArray(newValue)?[]:{};
    if(newValue===undefined && oldValue && typeof oldValue==='object')newValue=Array.isArray(oldValue)?[]:{};
  }
  if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object' && Array.isArray(oldValue) === Array.isArray(newValue)) {
    const oldMap = keyed(oldValue), newMap = keyed(newValue);
    if (oldMap && newMap) {
      const targetMap = keyed(translation) ?? new Map();
      return [...new Set([...oldMap.keys(),...newMap.keys()])].flatMap(id => diffValues(oldMap.get(id),newMap.get(id),targetMap.get(id),`${location}/@${escape(id)}`,key));
    }
    return [...new Set([...Object.keys(oldValue),...Object.keys(newValue)])].flatMap(k => diffValues(oldValue[k],newValue[k],translation?.[k],`${location}/${escape(k)}`,Array.isArray(newValue) ? key : k));
  }
  const operation = oldValue === undefined ? 'added' : newValue === undefined ? 'deleted' : 'changed';
  const value = newValue ?? oldValue;
  const classification = hasProse(value,key) ? 'prose' : 'metadata';
  return [{path:location,operation,classification,oldRussian:oldValue ?? null,newRussian:newValue ?? null,currentTranslation:translation ?? null}];
}
function atomic(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true}); const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file); }
function git(args) { return normalize(execFileSync(process.env.CODEX_GIT || 'git',args,{cwd:root,encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null'},stdio:['ignore','pipe','pipe']})); }
function gitRead(commit,file,optional=false) { try{return git(['show',`${commit}:${file}`]);}catch(error){if(optional)return null;throw error;} }
function uiFiles(dir=path.join(root,'src')) {
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>lexicographic(a.name,b.name)).flatMap(e => {
    if (['data','i18n'].includes(e.name) && dir===path.join(root,'src'))return [];
    const file=path.join(dir,e.name);
    return e.isDirectory()?uiFiles(file):/\.(astro|ts|js)$/.test(e.name)&&!file.endsWith('dossiers.ts')?[path.relative(root,file).replaceAll('\\','/')]:[];
  });
}
const baselinePath = locale => path.join(root,`src/i18n/${locale}/source-baseline.json`);
const packetPath = locale => path.join(root,`.translation-work/${locale}.json`);
function checkLocale(locale) {if(!['en','zh'].includes(locale))throw Error('Locale must be en or zh');}
export function bootstrap(locale) {
  checkLocale(locale);
  if(fs.existsSync(baselinePath(locale)))throw Error('Baseline already exists; bootstrap never overwrites reviewed history');
  const commit=git(['rev-parse','HEAD']).trim();
  const manifest=JSON.parse(gitRead(commit,`src/i18n/${locale}/source-manifest.json`));
  const sources={},targets={},ui={};
  for(const [file,expected] of Object.entries(manifest)) {
    const text=gitRead(commit,`src/${file}`);
    if(hash(text)!==expected)throw Error(`HEAD is not a verified reviewed source: ${locale}/${file}`);
  }
  for(const file of sourceFiles()) {
    const text=gitRead(commit,`src/${file}`,true);
    if(text===null)continue;
    if(manifest[file]!==hash(text))throw Error(`HEAD manifest does not review ${file}`);
    sources[file]=file.endsWith('.json')?JSON.parse(text):text;
    const target=file.endsWith('.json')?file.replace('data/',`src/i18n/${locale}/`):`src/i18n/${locale}/guides.json`;
    const value=gitRead(commit,target,true);if(value!==null)targets[target]=JSON.parse(value);
  }
  const names=git(['ls-tree','-r','--name-only',commit,'src']).trim().split('\n').filter(f=>/\.(astro|ts|js)$/.test(f)&&!/^src\/(data|i18n)\//.test(f)&&!f.endsWith('dossiers.ts'));
  for(const file of names)ui[file]=hash(gitRead(commit,file));
  const uiTarget=gitRead(commit,`src/i18n/${locale}/ui.json`,true);if(uiTarget)targets[`src/i18n/${locale}/ui.json`]=JSON.parse(uiTarget);
  const baseline={version:1,locale,commit,sources,targets,ui};atomic(baselinePath(locale),baseline);return baseline;
}
function snapshot() {
  const sources={}, hashes={},ui={};
  for(const file of sourceFiles()) {const text=read(path.join(root,'src',file));hashes[file]=hash(text);sources[file]=file.endsWith('.json')?JSON.parse(text):text;}
  for(const file of uiFiles().sort(lexicographic))ui[file]=hash(read(path.join(root,file)));
  return {sources,hashes,ui,revision:hash({hashes,ui:sortedHashMap(ui)})};
}
export function prepare(locale,write=false) {
  checkLocale(locale);const baseline=json(baselinePath(locale)),current=snapshot(),items=[];
  for(const file of new Set([...Object.keys(baseline.sources),...Object.keys(current.sources)])) {
    const target=file.endsWith('.json')?`src/i18n/${locale}/${path.basename(file)}`:`src/i18n/${locale}/guides.json`;
    const translated=fs.existsSync(path.join(root,target))?json(path.join(root,target)):null;
    const previous=baseline.targets[target];
    if(file.endsWith('.json')) {
      for(const item of diffValues(baseline.sources[file],current.sources[file],translated))items.push({...item,file,target,previousTranslation:lookupTranslation(previous,item.path)});
    } else if(baseline.sources[file]!==current.sources[file])items.push({file,path:'',operation:'changed',classification:'dossier',target,oldRussian:baseline.sources[file]??null,newRussian:current.sources[file]??null,currentTranslation:translated,previousTranslation:previous??null,note:'File-level review: compare all affected guides and related translated dossier articles. No safe automatic TS prose extraction is claimed.'});
  }
  if(!equalHashMaps(baseline.ui,current.ui))items.push({file:'UI source files',path:'',operation:'changed',classification:'ui',oldRussian:baseline.ui,newRussian:current.ui,target:`src/i18n/${locale}/ui.json`,currentTranslation:json(path.join(root,`src/i18n/${locale}/ui.json`)),note:`Human review required: git diff ${baseline.commit} -- src (excluding data/i18n); inspect uncommitted edits too, translate literal fragments and check rendered pages.`});
  for(const item of items)item.id=hash({file:item.file,path:item.path,operation:item.operation,old:item.oldRussian,new:item.newRussian}).slice(0,20);
  const packet={version:1,locale,baselineRevision:hash(baseline),sourceRevision:current.revision,sourceHashes:current.hashes,preparedAt:new Date().toISOString(),items,decisions:[]};
  if(write)atomic(packetPath(locale),packet);return packet;
}
function lookupTranslation(value,location) {
  for(const raw of location.split('/').slice(1)) {
    const part=raw.replaceAll('~1','/').replaceAll('~0','~');
    if(part.startsWith('@'))value=keyed(value)?.get(part.slice(1));else value=value?.[part];
  }
  return value??null;
}
export function validatePacket(packet,current,baseline) {
  if(packet.sourceRevision!==current.sourceRevision || packet.baselineRevision!==current.baselineRevision)throw Error('Stale packet: prepare again and review the current source revision');
  if(packet.locale!==current.locale || JSON.stringify(packet.items.map(x=>x.id))!==JSON.stringify(current.items.map(x=>x.id)))throw Error('Packet items changed; prepare again');
  const decisions=new Map((packet.decisions??[]).map(x=>[x.id,x]));
  if(decisions.size!==packet.items.length)throw Error('Explicit review decision required for every item');
  for(const item of current.items){const d=decisions.get(item.id);if(!d||!['translated','unchanged','metadata','deleted'].includes(d.action)||typeof d.note!=='string'||!d.note.trim())throw Error(`Missing review decision and explanation: ${item.id}`);if(d.action==='metadata'&&item.classification!=='metadata')throw Error('Prose cannot be acknowledged as metadata');if(d.action==='deleted'&&item.operation!=='deleted')throw Error('Deleted decision requires a deleted source');if(d.action==='translated'&&JSON.stringify(lookupTranslation(baseline.targets[item.target],item.path))===JSON.stringify(item.currentTranslation))throw Error(`Translation unchanged; use explicit unchanged decision with reason: ${item.id}`);}
}
// Read-only CI API. No CLI execution, git call or writes on import or verification.
export function reviewedBaselineStatus(locale) {
  try {
    const packet=prepare(locale);
    const errors=packet.items.map(item=>`${locale}/${item.file}${item.path}: ${item.classification} review required`);
    return {ok:errors.length===0,errors,sourceRevision:packet.sourceRevision};
  } catch(error) {return {ok:false,errors:[`${locale}: ${error.message}`]};}
}
export function compactReviewedItems(packet) {
  const decisions=new Map((packet.decisions??[]).map(d=>[d.id,d]));
  const ids=new Set(packet.items.map(item=>item.id));
  if(ids.size!==packet.items.length || decisions.size!==ids.size || packet.decisions.length!==ids.size)throw Error('Review item/decision identities must match exactly');
  return packet.items.map(({id,file,path})=>{
    const decision=decisions.get(id);
    if(!decision || !['translated','unchanged','metadata','deleted'].includes(decision.action) || typeof decision.note!=='string' || !decision.note.trim())throw Error(`Invalid preserved review decision: ${id}`);
    return {id,file,path,action:decision.action,note:decision.note};
  });
}
export function review(locale,packetFile=packetPath(locale)) {
  checkLocale(locale);const packet=json(packetFile),current=prepare(locale),baseline=json(baselinePath(locale));validatePacket(packet,current,baseline);
  const state=snapshot(),targets={};
  for(const file of sourceFiles()) {const target=file.endsWith('.json')?`src/i18n/${locale}/${path.basename(file)}`:`src/i18n/${locale}/guides.json`;if(!fs.existsSync(path.join(root,target)))throw Error(`Missing translation: ${target}`);targets[target]=json(path.join(root,target));}
  targets[`src/i18n/${locale}/ui.json`]=json(path.join(root,`src/i18n/${locale}/ui.json`));
  if(state.revision!==packet.sourceRevision)throw Error('Source changed during review; prepare again');
  const next={version:1,locale,commit:git(['rev-parse','HEAD']).trim(),reviewedAt:new Date().toISOString(),reviewedPacket:packet.sourceRevision,reviewedItems:compactReviewedItems(packet),sources:state.sources,targets,ui:state.ui};
  // All review validation happens before either tracked review file is written.
  atomic(baselinePath(locale),next);atomic(path.join(root,`src/i18n/${locale}/source-manifest.json`),state.hashes);
  console.log(`${locale}: explicit editorial review recorded for ${packet.sourceRevision}`);
}
export function cli(args=process.argv.slice(2)) {
  const [command,locale]=args;
  if(command==='bootstrap')console.log(`${locale}: initialized from verified HEAD ${bootstrap(locale).commit}`);
  else if(command==='status'||command==='prepare') {const locales=locale?[locale]:['en','zh'];for(const l of locales){const p=prepare(l,command==='prepare');console.log(`${l}: ${p.items.length} review items (${p.items.filter(x=>x.classification==='metadata').length} metadata), revision ${p.sourceRevision}`);}}
  else if(command==='review') {const i=args.indexOf('--reviewed');if(i<0||!args[i+1])throw Error('Review requires --reviewed en|zh and a current packet with explicit decisions');const p=args.indexOf('--packet');review(args[i+1],p<0?undefined:args[p+1]);}
  else throw Error('Usage: translations:status [en|zh], translations:prepare [en|zh], translations:review -- --reviewed en|zh [--packet path]');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{cli();}catch(error){console.error(error.message);process.exitCode=1;}}
