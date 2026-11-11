const json = (data, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
});

// A lista só pode ser lida com o link privado: a chave fica nos secrets do Cloudflare, não no GitHub.
export async function onRequestGet({request,env}) {
  const token = env.ADMIN_LINK_TOKEN;
  const auth = request.headers.get('Authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.length < 40 || supplied.length !== token.length) return json({ok:false,error:'Acesso privado necessário.'},401);
  let difference = 0;
  for (let i=0;i<token.length;i++) difference |= token.charCodeAt(i) ^ supplied.charCodeAt(i);
  if (difference !== 0) return json({ok:false,error:'Link não autorizado.'},401);
  if (!env.DB) return json({ok:false,error:'Banco de dados indisponível.'},503);
  try {
    const {results=[]} = await env.DB.prepare('SELECT name, attending, updated_at FROM responses ORDER BY updated_at DESC, name COLLATE NOCASE ASC').all();
    return json({ok:true,records:results.map(r=>({name:r.name,attending:r.attending===1,updatedAt:r.updated_at}))});
  } catch(error) {
    console.error('Erro ao listar confirmações:',error);
    return json({ok:false,error:'Não foi possível consultar as presenças.'},500);
  }
}
export function onRequestPost() { return json({ok:false,error:'Método não permitido.'},405); }
