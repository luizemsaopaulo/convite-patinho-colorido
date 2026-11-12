import assert from 'node:assert/strict';
import {onRequestDelete} from '../functions/api/admin.js';

const ADMIN_LINK_TOKEN='T'.repeat(64);
const entries=new Map([['teste',{name:'Teste'}],['joão',{name:'João'}]]);
const env={
 ADMIN_LINK_TOKEN,
 DB:{prepare(sql){
  assert.match(sql,/^DELETE FROM responses WHERE name_key = \? AND name = \?$/);
  return {bind(key,name){
   return {async run(){
    const found=entries.get(key);
    const deleted=found && found.name===name ? 1:0;
    if(deleted) entries.delete(key);
    return {meta:{changes:deleted}};
   }};
  }};
 }}
};
const req=(data,{token=ADMIN_LINK_TOKEN,origin='https://exemplo.test',type='application/json'}={})=>
 new Request('https://exemplo.test/api/admin',{
  method:'DELETE',
  headers:{'Content-Type':type,Origin:origin,Authorization:'Bearer '+token},
  body:JSON.stringify(data)
 });
let tests=0;
async function check(data,expected,options={}) {
 const res=await onRequestDelete({request:req(data,options),env});
 assert.equal(res.status,expected);
 tests++;
 return res.json();
}
await check({name:'Teste',confirm:true},401,{token:'X'.repeat(64)});
await check({name:'Teste',confirm:true},403,{origin:'https://outro.test'});
await check({name:'Teste',confirm:true},415,{type:'text/plain'});
await check({name:'Teste',confirm:false},400);
await check({name:'Teste',confirm:true},200);
assert.equal(entries.has('teste'),false);
assert.equal(entries.has('joão'),true);
tests+=2;
await check({name:'Teste',confirm:true},404);
await check({name:'João',confirm:true},200);
assert.equal(entries.size,0);
tests++;
console.log('OK: '+tests+' verificacoes de exclusao sem usar dados reais.');
