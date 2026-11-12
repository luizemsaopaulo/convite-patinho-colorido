'use strict';
(() => {
 const $=s=>document.querySelector(s);
 const key='bb-admin-link-v1';
 let token='',records=[],installEvent=null;
 const feedback=(msg,error=false)=>{const el=$('#accessStatus');el.textContent=msg;el.classList.toggle('error',error)};
 // O token fica após # no link privado: não vai nos logs do servidor nem no histórico de referer.
 const fragment=location.hash.match(/(?:^#|&)acesso=([A-Za-z0-9_-]{40,})/);
 if(fragment){ token=fragment[1];try{localStorage.setItem(key,token)}catch{} history.replaceState(null,'',location.pathname+location.search) }
 if(!token){try{token=localStorage.getItem(key)||''}catch{}}
 const fmtDate=value=>{if(!value)return 'Sem data';const date=new Date(value.replace(' ','T')+'Z');return Number.isNaN(date.getTime())?value:date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
 const render=()=>{
  const q=$('#filter').value.trim().toLocaleLowerCase('pt-BR');
  const rows=records.filter(x=>x.name.toLocaleLowerCase('pt-BR').includes(q));
  const root=$('#records');root.replaceChildren();
  if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent=q?'Nenhum nome encontrado.':'Ainda não há respostas registradas.';root.append(p);return}
  for(const item of rows){const row=document.createElement('div');row.className='guest';const left=document.createElement('div');const name=document.createElement('div');name.className='guest-name';name.textContent=item.name;const date=document.createElement('div');date.className='date';date.textContent='Respondido em '+fmtDate(item.updatedAt);left.append(name,date);const state=document.createElement('span');state.className='state '+(item.attending?'yes':'no');state.textContent=item.attending?'✓ Vai':'✕ Não vai';row.append(left,state);root.append(row)}
 };
 const refresh=async()=>{
  if(!token){ feedback('Abra o painel pelo atalho privado salvo na área de trabalho do Lenovo.',true);$('#records').innerHTML='<p class="empty">As confirmações só aparecem com o link privado do organizador.</p>';return}
  $('#refreshBtn').disabled=true;feedback('Atualizando respostas...');
  try{
   const response=await fetch('/api/admin',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
   const data=await response.json();
   if(response.status===401){
    token='';records=[];try{localStorage.removeItem(key)}catch{}
    $('#exportBtn').disabled=true;
    $('#totalCount').textContent='—';$('#yesCount').textContent='—';$('#noCount').textContent='—';
    throw new Error('Acesso privado inválido. Reabra o atalho salvo na área de trabalho do Lenovo.');
   }
   if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível atualizar.');
   records=data.records||[];
   $('#totalCount').textContent=records.length;
   $('#yesCount').textContent=records.filter(x=>x.attending).length;
   $('#noCount').textContent=records.filter(x=>!x.attending).length;
   $('#updatedLabel').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
   $('#exportBtn').disabled=false;feedback('Lista atualizada com sucesso.');render();
  }catch(e){feedback(e.message||'Falha ao carregar respostas.',true);$('#records').innerHTML='<p class="empty">Não foi possível buscar a lista. Verifique sua conexão e seu link privado.</p>'}
  finally{$('#refreshBtn').disabled=false}
 };
 $('#refreshBtn').addEventListener('click',refresh);
 $('#filter').addEventListener('input',render);
 $('#exportBtn').addEventListener('click',()=>{
  const esc=v=>{const raw=String(v);const safe='=+-@'.includes(raw.trimStart().charAt(0))?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"'};
  const csv='\ufeffNome;Presença;Atualização\r\n'+records.map(r=>[esc(r.name),esc(r.attending?'Sim':'Não'),esc(fmtDate(r.updatedAt))].join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='presencas-benicio-bettina.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
 });
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installBtn').hidden=false});
 $('#installBtn').addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#installBtn').hidden=true});
 window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true});
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/'}).catch(()=>{}));
 refresh();
})();
