const json = (data, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'private, no-store, max-age=0',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  }
});

// A chave de acesso e armazenada apenas como segredo na Cloudflare.
function authorized(request, env) {
  const token=env.ADMIN_LINK_TOKEN;
  const auth=request.headers.get('Authorization') || '';
  const supplied=auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.length<40 || supplied.length!==token.length) return false;
  let difference=0;
  for(let i=0;i<token.length;i++) difference |= token.charCodeAt(i)^supplied.charCodeAt(i);
  return difference===0;
}

export async function onRequestGet({request,env}) {
  if(!authorized(request,env)) return json({ok:false,error:'Acesso privado necessario.'},401);
  if(!env.DB) return json({ok:false,error:'Banco de dados indisponivel.'},503);
  try {
    const {results=[]}=await env.DB.prepare('SELECT name, attending, updated_at FROM responses ORDER BY updated_at DESC, name COLLATE NOCASE ASC').all();
    return json({ok:true,records:results.map(r=>({
      name:r.name,
      attending:r.attending===1,
      updatedAt:r.updated_at
    }))});
  } catch(error) {
    console.error('Erro ao listar confirmacoes:',error);
    return json({ok:false,error:'Nao foi possivel consultar as presencas.'},500);
  }
}

// Exclui apenas o registro escolhido e confirmado pelo organizador.
export async function onRequestDelete({request,env}) {
  if(!authorized(request,env)) return json({ok:false,error:'Acesso privado necessario.'},401);
  const origin=request.headers.get('Origin');
  if(origin && origin!==new URL(request.url).origin) return json({ok:false,error:'Origem nao autorizada.'},403);
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json({ok:false,error:'Formato invalido.'},415);
  if(!env.DB) return json({ok:false,error:'Banco de dados indisponivel.'},503);
  let body;
  try {
    const raw=await request.text();
    if(raw.length>400) return json({ok:false,error:'Dados muito grandes.'},413);
    body=JSON.parse(raw);
  } catch {
    return json({ok:false,error:'Dados invalidos.'},400);
  }
  const name=typeof body?.name==='string' ? body.name.normalize('NFKC').replace(/\s+/gu,' ').trim() : '';
  if(name.length<2 || name.length>100 || body.confirm!==true) {
    return json({ok:false,error:'Exclusao precisa de nome e confirmacao.'},400);
  }
  const key=name.toLocaleLowerCase('pt-BR');
  try {
    const result=await env.DB.prepare('DELETE FROM responses WHERE name_key = ? AND name = ?').bind(key,name).run();
    if(Number(result.meta?.changes||0)===0) return json({ok:false,error:'Convidado nao encontrado. Atualize a lista.'},404);
    return json({ok:true,deleted:1});
  } catch(error) {
    console.error('Falha ao excluir convidado:',error);
    return json({ok:false,error:'Nao foi possivel excluir o convidado.'},500);
  }
}
export function onRequestPost() { return json({ok:false,error:'Metodo nao permitido.'},405); }
