import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReadingNotes} from './reading_notes_validation.mjs';
const articles=[{slug:'harbour',summary:'Корабль находился на рейде.',facts:[]}];
const fixture=()=>[{slug:'roadstead',label:'Рейд',aliases:['рейде'],description:'Место стоянки кораблей у берега.',sources:[{title:'Dictionary',url:'https://example.org/dictionary'}],relatedNotes:['harbour'],relatedEssays:[]}];
test('a sourced explanation applies to a real visible mention',()=>assert.deepEqual(validateReadingNotes(fixture(),articles,[]),[]));
test('an explanation cannot be global or assigned to an absent text',()=>{const global=fixture();global[0].relatedNotes=[];assert.ok(validateReadingNotes(global,articles,[]).some(error=>error.includes('scoped')));const absent=fixture();absent[0].relatedNotes=['missing'];assert.ok(validateReadingNotes(absent,articles,[]).some(error=>error.includes('unknown')));});
test('unused aliases and unsourced definitions fail publication',()=>{const data=fixture();data[0].aliases=['причал'];data[0].sources=[];const errors=validateReadingNotes(data,articles,[]);assert.ok(errors.some(error=>error.includes('visible mention')));assert.ok(errors.some(error=>error.includes('source')));});
