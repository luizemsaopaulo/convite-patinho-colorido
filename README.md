# Convite de 1 aninho — Benício e Bettina

Site do convite público: https://convite-patinho-colorido.pages.dev/

## Arquitetura
- `public/index.html`, `style.css`, `app.js`: convite, música e formulário de presença (nome + Sim/Não).
- `public/whatsapp-previa-final.jpg`: imagem de compartilhamento Open Graph do WhatsApp.
- `functions/api/rsvp.js`: grava ou atualiza a resposta no Cloudflare D1.
- `public/admin/`: painel instalável como PWA, com filtro, totais, atualização e CSV.
- `functions/api/admin.js`: consulta privativa da lista de respostas.
- `schema.sql`: tabela `responses`, com chave única de nome normalizado.

## Painel privado, sem tela de senha
O painel usa um **link privado com chave aleatória**. O endereço público `/admin/` sozinho não exibe dados.

No Lenovo autorizado, os arquivos de acesso foram salvos na área de trabalho:
- `Painel privado Benicio e Bettina.url` — abre diretamente o painel.
- `Acesso Painel Benicio e Bettina.txt` — link que pode ser copiado para o Android.

Não compartilhe o link privado com convidados. Ele dá acesso à lista; qualquer pessoa que receba esse link poderá consultar as presenças. O segredo é configurado na Cloudflare como `ADMIN_LINK_TOKEN`, **nunca no GitHub ou nos arquivos públicos**.

Para instalar o painel no celular, abra o link privado no Chrome e use o menu **Instalar aplicativo** ou **Adicionar à tela inicial**, conforme o navegador. O painel exige conexão para atualizar respostas, mesmo quando instalado.

## Testes (não escrevem no D1 de produção)
Execute no terminal do VS Code:
```powershell
node tests/smoke.mjs
node --check public/app.js
node --check public/admin/app.js
node --check public/admin/sw.js
```

## Publicação (na pasta do projeto)
```powershell
wrangler.cmd pages deploy public --project-name convite-patinho-colorido --branch main
```
Mantenha as alterações sincronizadas com o repositório GitHub `luizemsaopaulo/convite-patinho-colorido`.

## Dados
- O formulário público aceita apenas nome e comparecimento Sim/Não.
- Uma nova resposta com o mesmo nome normalizado substitui a resposta anterior. Pessoas diferentes com nomes idênticos podem conflitar.
- A API administrativa aceita consultas autenticadas por link privado e exclusão individual de registros após confirmação explícita no painel. A exclusão é permanente e protegida pela mesma chave privada.
- O banco real não deve receber respostas fictícias de testes.
- A prévia do WhatsApp pode permanecer temporariamente em cache no aplicativo.

O convite original, a trilha sonora do Patinho e os dados já registrados devem ser preservados durante as revisões.
