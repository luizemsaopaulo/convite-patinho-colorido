# Convite de aniversário — Patinho Colorido

Página de convite e confirmação de presença com dois campos somente:
- Nome do convidado
- Vai comparecer? Sim / Não

## Arquitetura
- Código-fonte no GitHub
- Cloudflare Pages: site e função POST /api/rsvp
- Cloudflare D1: confirmações salvas em \`responses\`
- Música: \`public/patinho.mp3\`; toca após abrir o convite, com botão de pausa

## Deploy a partir do Lenovo J2
\`\`\`powershell
cd "C:\Users\ADMIN\Desktop\Convite de Aniversario - Patinho Colorido\site"
wrangler.cmd pages deploy public --project-name convite-patinho-colorido --branch main
\`\`\`

## Consultar confirmações (somente organizador autenticado)
\`\`\`powershell
wrangler.cmd d1 execute convite-patinho-rsvp-db --remote --command "SELECT name, CASE WHEN attending=1 THEN 'SIM' ELSE 'NAO' END AS presenca, updated_at FROM responses ORDER BY name;"
\`\`\`

**Importante:** o convite não exibe data, endereço nem aniversariante até receber os dados corretos. Para alterar apenas o visual e os textos, edite \`public/index.html\`. Não publique a lista de nomes. O mesmo nome pode reenviar a resposta, substituindo a anterior. Como não há autenticação individual, convites com nomes idênticos podem se sobrescrever.

A música enviada pelo usuário foi preservada na pasta original, com cópia MP3 em \`public\`.
