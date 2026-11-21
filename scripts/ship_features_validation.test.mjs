import test from 'node:test';
import assert from 'node:assert/strict';
import {validateShipFeatures} from './ship_features_validation.mjs';
const ship={slug:'a',kind:'ship',armament:[{weaponSlug:'gun'}],images:[{file:'/images/a.webp',sourceUrl:'https://example.org/photo'}],sources:[{id:1}]};
const fixture=()=>[{shipSlug:'a',period:'1904',photoFile:'/images/a.webp',features:['forward','mast','funnel'].map(id=>({id,label:id,x:50,y:50,text:'Explanation',weaponSlug:null,refs:[1],sourceUrls:[]}))}];
const check=data=>validateShipFeatures(data,[ship],{ships:[]});
test('a port photograph provides context and cannot anchor ship annotations', () => {
  const port = {...ship, images: ship.images.map(image => ({...image, kind:'context'}))};
  assert.deepEqual(validateShipFeatures([], [port], {ships:[]}), []);
  assert.ok(validateShipFeatures(fixture(), [port], {ships:[]}).some(error => error.includes('annotation photo')));
});
test('annotation coordinates cannot silently move to an unrelated photograph',()=>{const data=fixture();data[0].photoFile='/images/another-ship.webp';assert.ok(check(data).some(error=>error.includes('annotation photo')));});
test('only reviewed photo sources or this ship’s source refs support hotspots',()=>{const data=fixture();data[0].features[0].refs=[];data[0].features[0].sourceUrls=['https://example.org/photo'];assert.deepEqual(check(data),[]);data[0].features[0].sourceUrls=['https://example.org/unreviewed'];assert.ok(check(data).some(error=>error.includes('unreviewed')));});
test('wrong weapons and geographical coordinates cannot enter a ship profile',()=>{const data=fixture();data[0].features[0].weaponSlug='other-gun';data[0].features[1].lat=39;assert.ok(check(data).some(error=>error.includes('weapon')));assert.ok(check(data).some(error=>error.includes('geographic')));});
test('missing ships, invalid positions and duplicate zones fail validation',()=>{assert.ok(check([]).length);const data=fixture();data[0].features[1].id='forward';data[0].features[2].x=101;assert.ok(check(data).some(error=>error.includes('duplicate')));assert.ok(check(data).some(error=>error.includes('coordinates')));});
