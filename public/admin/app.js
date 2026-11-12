'use strict';
(() => {
  const $=selector=>document.querySelector(selector);
  const key='bb-admin-link-v1';
  let token='',records=[],installEvent=null;

  const feedback=(message,error=false)=>{
    const el=$('#accessStatus');
    el.textContent=message;
    el.classList.toggle('error',error);
  };

  // A chave no fragmento # nao e enviada ao servidor em Referer.
  const fragment=location.hash.match(/(?:^#|&)acesso=([A-Za-z0-9_-]{40,})/);
  if(fragment) {
    token=fragment[1];
    try { localStorage.setItem(key,token); } catch {}
    history.replaceState(null,'',location.pathname+location.search);
  }
  if(!token) { try {token=localStorage.getItem(key)||'';} catch {} }

  const forgetToken=()=>{
    token='';
    records=[];
    try {localStorage.removeItem(key);} catch {}
    $('#exportBtn').disabled=true;
    $('#totalCount').textContent='—';
    $('#yesCount').textContent='—';
    $('#noCount').textContent='—';
  };

  const fmtDate=value=>{
    if(!value) return 'Sem data';
    const date=new Date(value.replace(' ','T')+'Z');
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR',{
      timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
    });
  };

  async function deleteGuest(item,button) {
    if(!window.confirm('Excluir definitivamente "'+item.name+'" da lista? Esta ação não pode ser desfeita.')) return;
    button.disabled=true;
    feedback('Excluindo '+item.name+'...');
    try {
      const response=await fetch('/api/admin',{
        method:'DELETE',cache:'no-store',
        headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
        body:JSON.stringify({name:item.name,confirm:true})
      });
      const data=await response.json();
      if(response.status===401) {
        forgetToken();
        throw new Error('Link privado inválido. Abra novamente o link de acesso do organizador.');
      }
      if(!response.ok||!data.ok) throw new Error(data.error||'Não foi possível excluir.');
      await refresh();
      feedback('Convidado "'+item.name+'" excluído com sucesso.');
    } catch(error) {
      feedback(error.message||'Não foi possível excluir. Tente novamente.',true);
      button.disabled=false;
    }
  }

  function render() {
    const query=$('#filter').value.trim().toLocaleLowerCase('pt-BR');
    const rows=records.filter(item=>item.name.toLocaleLowerCase('pt-BR').includes(query));
    const root=$('#records');
    root.replaceChildren();
    if(!rows.length) {
      const msg=document.createElement('p');
      msg.className='empty';
      msg.textContent=query?'Nenhum nome encontrado.':'Ainda não há respostas registradas.';
      root.append(msg);
      return;
    }
    for(const item of rows) {
      const row=document.createElement('div');
      row.className='guest';

      const left=document.createElement('div');
      const name=document.createElement('div');
      name.className='guest-name';
      name.textContent=item.name;
      const date=document.createElement('div');
      date.className='date';
      date.textContent='Respondido em '+fmtDate(item.updatedAt);
      left.append(name,date);

      const actions=document.createElement('div');
      actions.className='guest-actions';
      const state=document.createElement('span');
      state.className='state '+(item.attending?'yes':'no');
      state.textContent=item.attending?'✓ Vai':'✕ Não vai';
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='delete-guest';
      remove.textContent='Excluir';
      remove.setAttribute('aria-label','Excluir '+item.name+' da lista');
      remove.addEventListener('click',()=>deleteGuest(item,remove));
      actions.append(state,remove);
      row.append(left,actions);
      root.append(row);
    }
  }

  async function refresh() {
    if(!token) {
      feedback('Abra o link privado completo do organizador para ver a lista.',true);
      $('#records').replaceChildren();
      const p=document.createElement('p');
      p.className='empty';
      p.textContent='A lista não está disponível sem o link privado.';
      $('#records').append(p);
      return;
    }
    $('#refreshBtn').disabled=true;
    feedback('Atualizando respostas...');
    try {
      const response=await fetch('/api/admin',{
        headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'
      });
      const data=await response.json();
      if(response.status===401) {
        forgetToken();
        throw new Error('Acesso privado inválido. Abra novamente o link privado do organizador.');
      }
      if(!response.ok||!data.ok) throw new Error(data.error||'Não foi possível atualizar.');
      records=Array.isArray(data.records)?data.records:[];
      $('#totalCount').textContent=records.length;
      $('#yesCount').textContent=records.filter(item=>item.attending).length;
      $('#noCount').textContent=records.filter(item=>!item.attending).length;
      $('#updatedLabel').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      $('#exportBtn').disabled=false;
      feedback('Lista atualizada com sucesso.');
      render();
    } catch(error) {
      feedback(error.message||'Falha ao carregar respostas.',true);
      $('#records').replaceChildren();
      const p=document.createElement('p');
      p.className='empty';
      p.textContent='Não foi possível buscar a lista. Confira a conexão e o link privado.';
      $('#records').append(p);
    } finally {
      $('#refreshBtn').disabled=false;
    }
  }

  $('#refreshBtn').addEventListener('click',refresh);
  $('#filter').addEventListener('input',render);
  $('#exportBtn').addEventListener('click',()=>{
    const escapeCsv=value=>{
      const raw=String(value);
      const safe='=+-@'.includes(raw.trimStart().charAt(0))?"'"+raw:raw;
      return '"'+safe.replace(/"/g,'""')+'"';
    };
    const csv='\ufeffNome;Presença;Atualização\r\n'+records.map(item=>
      [escapeCsv(item.name),escapeCsv(item.attending?'Sim':'Não'),escapeCsv(fmtDate(item.updatedAt))].join(';')
    ).join('\r\n');
    const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=href;
    link.download='presencas-benicio-bettina.csv';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(href),1000);
  });

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installEvent=event;
    $('#installBtn').hidden=false;
  });
  $('#installBtn').addEventListener('click',async()=>{
    if(!installEvent)return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent=null;
    $('#installBtn').hidden=true;
  });
  window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;});
  if('serviceWorker' in navigator) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/'}).catch(()=>{}));
  }
  refresh();
})();
