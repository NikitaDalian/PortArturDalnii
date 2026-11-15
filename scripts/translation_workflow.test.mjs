import test from 'node:test';
import assert from 'node:assert/strict';
import { diffValues, validatePacket, compactReviewedItems, sortedHashMap, equalHashMaps, hash } from './translation_workflow.mjs';
const a=[{slug:'a',title:'Первый',lat:38.8},{slug:'b',title:'Второй',lat:39}];
test('one changed prose field yields one stable task',()=>{
 const changed=structuredClone(a);changed[0].title='Новый';
 const tasks=diffValues(a,changed,[{slug:'b',title:'Second'},{slug:'a',title:'First'}]);
 assert.equal(tasks.length,1);assert.equal(tasks[0].path,'/@slug=a/title');assert.equal(tasks[0].classification,'prose');assert.equal(tasks[0].currentTranslation,'First');
});
test('entity reorder creates no prose or metadata tasks',()=>assert.deepEqual(diffValues(a,[a[1],a[0]],a),[]));
test('coordinate change is metadata',()=>{
 const next=structuredClone(a);next[0].lat=40;const tasks=diffValues(a,next,a);assert.equal(tasks.length,1);assert.equal(tasks[0].classification,'metadata');
});
test('new and deleted identities are explicit, with no index drift',()=>{
 const tasks=diffValues(a,[a[1],{slug:'c',title:'Третий'}],[]);
 assert.deepEqual(tasks.map(x=>[x.path,x.operation]),[['/@slug=a','deleted'],['/@slug=c','added']]);assert.equal(tasks[1].classification,'prose');
});
test('empty and newly tracked entity datasets keep IDs',()=>{
 for(const old of [[],undefined])assert.equal(diffValues(old,[a[0]],[])[0].path,'/@slug=a');
 assert.equal(diffValues([{id:7,caption:'Текст'}],[{id:7,caption:'Новый'}],[])[0].path,'/@id=7/caption');
 assert.equal(diffValues([{place:'fort',title:'Текст'}],[{place:'fort',title:'Новый'}],[])[0].path,'/@place=fort/title');
});
test('photos use unique invariant asset paths when no slug/id exists',()=>{
 const old=[{file:'photos/a.jpg',place:null,subject:'A'},{file:'photos/b.jpg',place:null,subject:'B'}];
 assert.deepEqual(diffValues(old,[old[1],old[0]],[]),[]);
 const next=[...old,{file:'photos/c.jpg',subject:'C'}];assert.equal(diffValues(old,next,[])[0].path,'/@file=photos~1c.jpg');
});
test('navigation names and addresses are structural metadata',()=>{
 for(const key of ['navigationName','navigationAddress'])assert.equal(diffValues({[key]:'甲'},{[key]:'乙'},{} )[0].classification,'metadata');
});
test('paragraphs use positions and URLs remain metadata',()=>{
 assert.equal(diffValues({paragraphs:['a']},{paragraphs:['b']},{paragraphs:['x']})[0].path,'/paragraphs/0');
 assert.equal(diffValues({link:'https://a.test'},{link:'https://b.test'},{} )[0].classification,'metadata');
});
const item={id:'a',classification:'prose',operation:'changed',target:'t',path:'/title',currentTranslation:'Same'};
const current={locale:'en',sourceRevision:'new',baselineRevision:'base',items:[item]};
const baseline={targets:{t:{title:'Same'}}};
const packet=()=>({...current,decisions:[{id:'a',action:'unchanged',note:'Existing translation already expresses the clarified original.'}]});
test('stale source and stale baseline packets are rejected',()=>{
 for(const field of ['sourceRevision','baselineRevision'])assert.throws(()=>validatePacket({...packet(),[field]:'old'},current,baseline),/Stale/);
});
test('unreviewed and hash-only acknowledgements rejected',()=>{
 assert.throws(()=>validatePacket({...current,decisions:[]},current,baseline),/decision/);
 assert.throws(()=>validatePacket({...packet(),decisions:[{id:'a',action:'unchanged'}]},current,baseline),/explanation/);
 assert.throws(()=>validatePacket({...packet(),decisions:[{id:'a',action:'metadata',note:'ok'}]},current,baseline),/metadata/);
});
test('explicit unchanged decision accepted; false translated claim rejected',()=>{
 assert.doesNotThrow(()=>validatePacket(packet(),current,baseline));
 assert.throws(()=>validatePacket({...packet(),decisions:[{id:'a',action:'translated',note:'done'}]},current,baseline),/unchanged/);
});
test('translated decision accepts a changed current target',()=>{
 const changed={...current,items:[{...item,currentTranslation:'Revised'}]};
 assert.doesNotThrow(()=>validatePacket({...packet(),decisions:[{id:'a',action:'translated',note:'Reviewed against the new source.'}]},changed,baseline));
});

test('compact review history preserves unchanged reasons without old source bodies',()=>{
 const p={items:[{id:'one',file:'data/a.json',path:'/@slug=a/title',oldRussian:'old'}],decisions:[{id:'one',action:'unchanged',note:'Already accurately translated.'}]};
 assert.deepEqual(compactReviewedItems(p),[{id:'one',file:'data/a.json',path:'/@slug=a/title',action:'unchanged',note:'Already accurately translated.'}]);
 assert.throws(()=>compactReviewedItems({...p,decisions:[{id:'wrong',action:'unchanged',note:'reason'}]}),/Invalid/);
 assert.throws(()=>compactReviewedItems({...p,decisions:[...p.decisions,...p.decisions]}),/identities/);
});

test('UI hash maps and source revision are independent of directory enumeration order',()=>{
 const windows={'src/z.astro':'z','src/A.astro':'a','src/a.astro':'b'};
 const linux={'src/a.astro':'b','src/A.astro':'a','src/z.astro':'z'};
 assert.equal(equalHashMaps(windows,linux),true);
 assert.deepEqual(Object.keys(sortedHashMap(windows)),['src/A.astro','src/a.astro','src/z.astro']);
 assert.equal(hash({hashes:{'data/a.json':'fixed'},ui:sortedHashMap(windows)}),hash({hashes:{'data/a.json':'fixed'},ui:sortedHashMap(linux)}));
 assert.equal(equalHashMaps(windows,{...linux,'src/a.astro':'changed'}),false);
});
