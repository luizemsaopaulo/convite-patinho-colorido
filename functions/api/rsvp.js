const json = (data, code=200) => new Response(JSON.stringify(data), {
  status:code,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
export async function onRequestPost({request,env}) {
  try {
    const origin=request.headers.get('origin');
    if(origin && new URL(origin).origin !== new URL(request.url).origin) return json({ok:false,error:'Origem não autorizada.'},403);
    if(!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json({ok:false,error:'Formato inválido.'},415);
    const bodyText=await request.text();
    if(bodyText.length>1000) return json({ok:false,error:'Dados muito grandes.'},413);
    const body=JSON.parse(bodyText);
    if(body.website) return json({ok:true,attending:!!body.attending});
    const name=typeof body.name==='string' ? body.name.normalize('NFKC').replace(/\s+/gu,' ').trim() : '';
    if(name.length<2||name.length>100||/[\x00-\x1F\x7F]/u.test(name)) return json({ok:false,error:'Informe um nome válido (2 a 100 caracteres).'},400);
    if(typeof body.attending!=='boolean') return json({ok:false,error:'Escolha sim ou não.'},400);
    if(!env.DB) return json({ok:false,error:'Serviço indisponível.'},503);
    const key=name.toLocaleLowerCase('pt-BR');
    await env.DB.prepare('INSERT INTO responses(id,name,name_key,attending,created_at,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(name_key) DO UPDATE SET name=excluded.name,attending=excluded.attending,updated_at=CURRENT_TIMESTAMP')
      .bind(crypto.randomUUID(),name,key,body.attending?1:0).run();
    return json({ok:true,attending:body.attending});
  } catch (error) {
    if(error instanceof SyntaxError) return json({ok:false,error:'Dados inválidos.'},400);
    console.error('Falha ao gravar RSVP:',error);
    return json({ok:false,error:'Não foi possível salvar agora. Tente novamente.'},500);
  }
}
export function onRequestGet() { return json({ok:false,error:'Método não permitido.'},405); }