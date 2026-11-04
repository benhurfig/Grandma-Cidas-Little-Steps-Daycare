# Grandma Cida’s Little Steps Daycare — versão para Cloudflare

Abra `Grandma-Cida.code-workspace` no VS Code. Guia completo: [SETUP-VSCODE-CLOUDFLARE.md](SETUP-VSCODE-CLOUDFLARE.md).

Node.js 22 ou superior. Rodar localmente: `npm run dev`. Gerar website: `npm run build`. Verificar: `npm run qa`.

Cloudflare Pages: preset None, branch main, build `npm run build`, saída `public`.

Indexação liberada: páginas com index,follow, robots.txt permitindo rastreamento e sitemap no domínio grandmacidaslittlesteps.com. Este pacote ainda não foi publicado nem conectado a uma conta Cloudflare.

Eventos GA4 implementados e testados localmente. Falta o ID da Cida: variável de build `GA4_MEASUREMENT_ID`. A coleta fica desligada sem ID; quando habilitada, respeita a escolha de cookies de análise. O clique em Family Request não representa uma solicitação concluída.
