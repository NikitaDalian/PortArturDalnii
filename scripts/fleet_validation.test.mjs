import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFleetOverview} from './fleet_validation.mjs';
const source=id=>({id,title:'Historical source',author:'Author',date:'1904',url:'https://example.org/source',locator:'Table 1',note:'Checked table'});
const fixture=()=>({title:'Ships at scale',dek:'A comparison',intro:['Introduction'],sections:[{id:'roles',title:'Roles',paragraphs:['Explanation'],refs:[1]},{id:'limits',title:'Limits',paragraphs:['Explanation'],refs:[2]}],sources:[source(1),source(2)],relatedNotes:[],ships:[{shipSlug:'ship-a',group:'port-arthur',profile:'battleship',lengthOverallM:118,normalDisplacementTonnes:null,measurementNote:'Overall length; comparable normal displacement unconfirmed.',sources:[source(1)]}]});
const check=data=>validateFleetOverview(data,[{slug:'ship-a',kind:'ship'}],new Set());
test('a sourced overall length can publish with explicitly unknown displacement',()=>assert.deepEqual(check(fixture()),[]));
test('free text, zero and missing length cannot silently become scaled measurements',()=>{for(const bad of ['118 m',0,undefined]){const data=fixture();data.ships[0].lengthOverallM=bad;assert.ok(check(data).some(error=>error.includes('measurement')));}});
test('comparison cannot omit a ship, duplicate it or lose its measurement source',()=>{const data=fixture();data.ships=[];assert.ok(check(data).some(error=>error.includes('cover')));const duplicate=fixture();duplicate.ships.push({...duplicate.ships[0]});assert.ok(check(duplicate).some(error=>error.includes('cover')));const unsourced=fixture();unsourced.ships[0].sources=[];assert.ok(check(unsourced).some(error=>error.includes('provenance')));});
