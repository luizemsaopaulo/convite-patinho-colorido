import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {onRequestPost as submitRsvp, onRequestGet as getRsvp} from '../functions/api/rsvp.js';
import {onRequestGet as getAdmin, onRequestPost as postAdmin} from '../functions/api/admin.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rows=new Map();
const ADMIN_LINK_TOKEN='X'.repeat(64);
const env={
 ADMIN_LINK_TOKEN,
 DB:{
  prepare(sql){
   if(sql.trim().toUpperCase().startsWith('SELECT')){
    return {all:async()=>({results:Array.from(rows.values()).map(({name,attending})=>({name,attending,updated_at:'2026-11-12 14:00:00'}))})};
   }
   return {bind(id,name,key,attending){
    return {run:async()=>{rows.set(key,{name,attending});return {success:true}}};
   }};
  }
 }
};
const url='https://teste.example/api/rsvp';
function makeRequest(body,headers={}){
 return new Request(url,{method:'POST',
  headers:{'content-type':'application/json','origin':'https://teste.example',...headers},
  body:typeof body==='string'?body:JSON.stringify(body)});
}
async function readJson(res){return await res.json();}
let checked=0;
const check=(condition,message)=>{assert.ok(condition,message);checked++};
let res=await submitRsvp({request:makeRequest({name:' Ana   Lívia ',attending:true}),env});
check(res.status===200,'RSVP valido deve responder 200');
check((await readJson(res)).attending===true,'RSVP confirma Sim');
check(rows.size===1 && rows.has('ana lívia'),'Nome normalizado e salvo');
res=await submitRsvp({request:makeRequest({name:'ANA LÍVIA',attending:false}),env});
check(res.status===200,'Atualização do RSVP responde 200');
check(rows.size===1 && rows.get('ana lívia').attending===0,'Mesmo nome atualiza, sem duplicar');
res=await submitRsvp({request:makeRequest({name:'A',attending:true}),env});
check(res.status===400,'Nome curto bloqueado');
res=await submitRsvp({request:makeRequest({name:'Nome válido',attending:'sim'}),env});
check(res.status===400,'Resposta nao booleana bloqueada');
res=await submitRsvp({request:makeRequest({name:'Teste',attending:true,website:'robô'}),env});
check(res.status===200 && rows.size===1,'Campo antirrobo nao altera banco');
res=await submitRsvp({request:makeRequest({name:'Teste',attending:true},{origin:'https://outro.example'}),env});
check(res.status===403,'Origem externa rejeitada');
res=await submitRsvp({request:makeRequest('x'.repeat(1100)),env});
check(res.status===413,'Corpo grande rejeitado');
res=await submitRsvp({request:makeRequest({name:'Teste',attending:true},{'content-type':'text/plain'}),env});
check(res.status===415,'Formato incorreto rejeitado');
res=await submitRsvp({request:makeRequest({name:'Teste',attending:true}),env:{DB:null}});
check(res.status===503,'Banco indisponivel tratado');
check(getRsvp().status===405,'GET do RSVP desativado');
check(postAdmin().status===405,'POST do painel administrativo desativado');
res=await getAdmin({request:new Request('https://teste.example/api/admin'),env});
check(res.status===401,'Sem link privado nao le convidados');
res=await getAdmin({request:new Request('https://teste.example/api/admin',{headers:{Authorization:'Bearer '+'Y'.repeat(64)}}),env});
check(res.status===401,'Link privado invalido nao le convidados');
res=await getAdmin({request:new Request('https://teste.example/api/admin',{headers:{Authorization:'Bearer '+ADMIN_LINK_TOKEN}}),env});
const panel=await readJson(res);
check(res.status===200 && panel.ok && panel.records.length===1,'Admin autorizado consulta resposta');
check(panel.records[0].name==='ANA LÍVIA' && panel.records[0].attending===false,'Painel preserva estado da confirmacao');
check(res.headers.get('Cache-Control').includes('no-store'),'Dados privados nao podem ser armazenados em cache HTTP');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
check(index.includes('property="og:image"') && index.includes('whatsapp-previa-final.jpg'),'Previa WhatsApp configurada');
check(fs.statSync(path.join(root,'public','whatsapp-previa-final.jpg')).size>10000,'Arquivo da imagem presente');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/admin/manifest.webmanifest'),'utf8'));
check(manifest.display==='standalone' && manifest.scope==='/admin/','Painel instalavel como PWA');
const adminJs=fs.readFileSync(path.join(root,'public/admin/app.js'),'utf8');
check(adminJs.includes('getItem(key)') && adminJs.includes('Authorization:'),'Painel envia credencial privada');
check(adminJs.includes('const escapeCsv=value=>'),'Exportacao CSV ativa');
console.log('OK: '+checked+' verificacoes sem alterar o banco de dados de producao.');
