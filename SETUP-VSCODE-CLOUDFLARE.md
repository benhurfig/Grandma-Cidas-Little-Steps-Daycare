# Grandma Cida’s Little Steps Daycare — VS Code e Cloudflare Pages

Projeto preparado para produção. Domínio: **grandmacidaslittlesteps.com**.

## 1. Abrir no VS Code

Extraia o ZIP e abra a pasta `grandma-cida-website`, ou o arquivo `Grandma-Cida.code-workspace`.

Use Node.js 22 ou superior. Não há dependências externas para o website.

No terminal do VS Code:

```bash
npm run dev
```

Abra http://localhost:4173. Para gerar os arquivos do site:

```bash
npm run build
```

O resultado fica em `public/`. Edite `src/`, `content/`, `config/` e `assets/`; os arquivos de `public/` são recriados pelo build.

## 2. Publicar o código no GitHub

No painel Source Control do VS Code, use **Publish to GitHub** e escolha um repositório privado. Nome sugerido: `grandma-cida-little-steps`.

Use `main` como branch principal. O arquivo de exclusões já evita enviar arquivos locais de ambiente, dependências e a pasta gerada `public/`.

Este pacote não contém uma conexão criada com a conta GitHub ou Cloudflare. A criação do repositório e a escolha da conta são feitas nessa etapa.

## 3. Conectar ao Cloudflare Pages

No Cloudflare, abra **Workers & Pages → Create application → Pages → Import an existing Git repository**. Conecte o repositório da Cida.

| Campo | Valor |
| --- | --- |
| Framework preset | None |
| Production branch | main |
| Build command | npm run build |
| Build output directory | public |
| Root directory | deixar vazio (raiz do repositório) |
| NODE_VERSION, se solicitado | 22 |

O projeto inclui a versão do Node em `.node-version`. O Cloudflare executará o build e publicará o conteúdo de `public/` após a conexão autorizada.

O site contém um vídeo de aproximadamente 16,9 MB e uma página 404 própria. A prévia HTML independente não faz parte dos arquivos publicados.

Documentação oficial: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## 4. Domínio

No projeto Pages, abra **Custom domains → Set up a domain** e informe `grandmacidaslittlesteps.com`. Siga a associação do domínio e as instruções de DNS da conta. O domínio principal sem www exige a zona configurada no Cloudflare; os valores de nameservers ou registros virão do painel.

Documentação: https://developers.cloudflare.com/pages/configuration/custom-domains/

## 5. Indexação e Search Console

- Modo padrão: `production`.
- As 24 páginas têm `index,follow`; o HTML gerado não contém `noindex`.
- `robots.txt` permite rastreamento e informa o sitemap.
- Canonical, hreflang e sitemap usam `https://grandmacidaslittlesteps.com`.
- Sitemap para enviar após a publicação: `https://grandmacidaslittlesteps.com/sitemap.xml`.
- A propriedade do Search Console ainda precisa ser verificada com o valor fornecido pelo Google. Este pacote não representa uma verificação de domínio nem garante indexação.

## 6. GA4

Os eventos estão implementados. O ID da Cida ainda não foi informado, portanto a coleta está desligada no pacote.

Para ativar no Cloudflare, adicione a variável de build **GA4_MEASUREMENT_ID** com o ID real da Cida, no formato `G-...`, e faça um novo deploy. Não use ID de outra cliente. Localmente, copie `.env.example` para `.env` e preencha o mesmo campo antes de gerar o site.

Quando o ID é configurado, o site oferece a escolha de permitir ou recusar cookies de análise nos três idiomas. A escolha fica disponível novamente no rodapé. A coleta respeita a recusa e Global Privacy Control; não há Meta Pixel nem recursos de publicidade ativos.

| Evento | O que representa |
| --- | --- |
| page_view | Visualização de página |
| cta_click | Clique em um botão que leva ao contato final |
| contact_options_view | Visualização da área de contato |
| final_cta_request | Clique para abrir o Family Request |
| phone_click | Clique para ligar |
| sms_click | Clique para enviar SMS |
| whatsapp_click | Clique para abrir WhatsApp |
| email_click | Clique para abrir e-mail |
| google_maps_click | Clique no mapa/endereço |
| google_reviews_click | Clique nas avaliações, quando houver link real configurado |
| social_profile_click | Clique no Instagram |
| language_switch | Troca de idioma |
| faq_open | Abertura de uma pergunta |
| video_play | Primeira reprodução do tour na página |

Os eventos usam parâmetros como idioma, tipo de página e local do botão. Não enviam dados das famílias. `final_cta_request` mede um clique; não representa formulário concluído. A confirmação de solicitação recebida pertence à integração com o SmartMate.

Após informar o ID e publicar, conferir Realtime/Tag Assistant na propriedade correta. Os testes locais validam o código, não confirmam recebimento em uma propriedade GA4 real.

## 7. Verificações realizadas

Build de 24 rotas, validação de links e mídias, sitemap, canonical/hreflang, sintaxe e 15 testes de comportamento aprovados. Indexação liberada confirmada nos arquivos gerados. Tour original preservado. Foi testada a configuração do ID por variável de ambiente; nenhum ID de teste permanece nos arquivos publicados.

```bash
npm run qa
```

O boletim de duas vagas está válido até 01/12/2026; disponibilidade e validade devem ser atualizadas com a cliente.
