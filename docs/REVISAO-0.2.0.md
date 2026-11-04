# Revisão técnica — MateGrowth Daycare Template v0.2.0

**Data:** 28/10/2026  
**Entrada:** `MateGrowth-Daycare-Template.zip`, versão declarada 0.1.0.  
**Entrega:** cópia revisada v0.2.0, ainda neutra e em DEMO.  
**SHA-256 do ZIP de entrada preservado:** `a15ac58e3695d8e0a5f1a1fec3bfaca8f2d8b62564c2d42486b099b61d29a222`

## Conclusão

A arquitetura é adequada como base reutilizável: site estático sem dependências npm, conteúdo por idioma, componentes compartilhados e separação entre fonte e `public/`. Não era, porém, uma base totalmente validada: os 11 testes originais passavam, mas não cobriam várias situações reais. As correções desta entrega foram feitas somente na nova cópia. Nenhum repositório, domínio, conta, projeto de cliente ou ambiente de produção foi alterado.

## Achados e correções

| Área | Evidência no código original | Correção na v0.2.0 |
|---|---|---|
| Boletim vencido | `src/styles.css`: `.bulletin{display:grid}` prevalecia sobre o atributo `hidden`. O Chromium confirmou `display: grid` para um aviso oculto. | Regra explícita `[hidden]`, atualização de validade/data e recálculo ao voltar à aba. O aviso expirado fica invisível. |
| Carregamento GA4 | `src/main.js`: chamadas concorrentes de `setConsent(true)` podiam criar mais de um script antes de `gaReady`. | Uma única promessa de carregamento; repetição não cria uma segunda tag em paralelo. |
| Revogação | `setConsent(false)` apenas mudava a variável; a revogação durante o carregamento e a concessão posterior não tinham um ciclo completo de atualização. | Atualização denied explícita, proteção enquanto carrega, nova concessão explícita e page_view único. |
| Contagem de cliques | O mesmo `WeakMap` de uma vez por elemento era aplicado a todos os cliques. | Cliques separados são registrados separadamente. Visualização, FAQ e vídeo conservam sua regra de uma vez por página/elemento. |
| UTMs/armazenamento | Um único try/catch incluía leitura, escrita e alteração dos links; bloquear o armazenamento impedia encaminhar até os parâmetros da página atual. Valores armazenados não eram revalidados. | Separação do armazenamento opcional, validação de ambos os inputs, substituição de campanha antiga e preservação na troca de idioma. |
| Text me/menu | Não havia comportamento para evitar sobreposição da ação principal nem fechamento por clique fora do menu. | Link com ícone SVG, ocultação quando realmente cruza as ações principais ou o menu está aberto; Escape/foco e clique externo testados. |
| Páginas locais | Ramo HTML separado em `src/build.mjs`: não aplicava o tema nem o boletim da página comum; não havia links de descoberta no site. | Renderização compartilhada, cores consistentes, links no rodapé e alternates incluindo x-default. |
| Conteúdo local | A validação cobrava sobretudo metadados e intro; não existia corpo local estruturado obrigatório. | Seções visíveis por idioma, checagem mínima de corpo e detecção de simples trocas do nome da cidade. Revisão editorial ainda obrigatória. |
| Validação | Um modo desconhecido como `prod` podia escapar tanto do modo DEMO quanto das exigências de produção. Ausência de tradução em produção podia gerar exceção em vez de lista de erros. | Modos fechados, erros de configuração legíveis, home obrigatória, URLs verificadas e slugs duplicados rejeitados. |
| Verificador HTML | Conferia a existência de algum `#contact`, não a direção de cada CTA; não comprovava a relação entre sitemap/canonical/alternates. | Checagem por CTA, links/assets, ids, metadados, pares de idioma e correspondência do sitemap. |
| Identidade/mídia | Sem campo de logo no header; vídeo sem poster, dimensões e alternativa textual. | Logo e imagem de compartilhamento opcionais; vídeo com poster, dimensões, controles, VTT opcional e descrição/transcrição por idioma. |
| Preview local | Servidor sem MIME específico para imagens/vídeos e sem Range. | Tipos corretos, HEAD e Range; teste HTTP local 200/206 realizado. |
| Acessibilidade | Sem regra explícita de movimento reduzido; faixa DEMO fixa podia cobrir o conteúdo. | Movimento reduzido, foco visível, melhor contraste no destaque e faixa DEMO no fluxo normal. |

## O que foi preservado

H1 → mídia → H2 no Hero mobile; menu superior; idiomas configuráveis; Our Space; boletim editável; Final CTA único; SMS/telefone/e-mail com seus protocolos; CTAs de conversão rolando para `#contact` e somente o botão final abrindo SmartMate. Não existe página interna de Family Request, iframe ou resize. O contrato de **nomes dos eventos não mudou**. Não foram adicionados Lead/generate_lead, Pixel ou banner de cookies.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Testes originais, antes das alterações | **11/11 passaram**, reproduzidos nesta sessão. |
| Testes da revisão | **32/32 passaram**: configuração, eventos simulados e builds em pastas temporárias. |
| Build DEMO | **PASS** — 7 páginas mais 404. |
| Verificador de saída | **PASS** — rotas, assets, CTAs, Hero, metadados e sitemap. |
| Sintaxe JavaScript | **PASS** — 13 arquivos de fonte/configuração/teste. |
| Bloqueio de produção da demo | **PASS** — a configuração neutra continua impedida de gerar produção. |
| Configuração completa sintética de produção | **PASS**, exclusivamente em pasta temporária de teste, removida ao final. Sem publicação. |
| Chromium offline | **56 combinações**: 8 arquivos HTML × larguras 320, 375, 390, 768, 1024, 1280 e 1440. Sem overflow horizontal ou erro JavaScript observado. |
| Interações no Chromium | Menu/Escape/foco/clique fora, FAQ, aviso vencido, SMS sem sobrepor CTA, demo sem tag e movimento reduzido passaram. |
| Geração multilíngue/local | Rotas EN/PT testadas com conteúdo sintético, tema compartilhado, alternates e links locais. **Não é uma tradução portuguesa aprovada.** |
| Idioma e atribuição | Teste unitário de mudança para rota existente preservando UTMs seguras mesmo com storage bloqueado. |
| Servidor local HTTP | Home 200; MIME video/mp4; HEAD; Range 206 com os bytes esperados. |

### Evidências no pacote

`audit-output/qa.txt`, `audit-output/original-tests.txt`, `audit-output/original-browser.json`, `audit-output/http-preview.json` e `audit-output/browser/results.json`. Há capturas da Home mobile/desktop e Our Space mobile. `tools/browser-smoke.py` permite repetir a renderização offline com Playwright instalado.

## Limitações — o que não está concluído

**Medição real:** o GA4 está desligado e exige a integração de consentimento aprovada. A API revisada não é um consent manager pronto. O template não contém implementação de Meta Pixel. Não houve contato com Google Analytics, Meta Events Manager ou SmartMate, nem confirmação de eventos recebidos, nem envio de formulário. Não foi medido desempenho real de campanha, consentimento em um CMP real ou atribuição cross-domain.

**UTMs:** valores seguros são enviados ao SmartMate, não aos parâmetros personalizados do GA4. A origem/campanha no GA4 não foi comprovada por esta revisão. Sem sessionStorage, há fallback na página atual e na mudança de idioma, mas não persistência garantida em toda navegação interna.

**Visual:** o navegador do ambiente bloqueou a navegação HTTP local. Por isso os testes visuais carregaram o HTML/CSS/JS gerado diretamente no Chromium, sem rede. O servidor HTTP foi verificado separadamente. Não foram testados Safari, iPhone/Android físicos, condições reais de rede ou Core Web Vitals de produção. Essas evidências não são um teste end-to-end de hospedagem.

**Conteúdo e mídia:** a entrega contém apenas o pacote DEMO inglês. Português e crioulo da Sofia ainda precisam de conteúdo/revisão; nenhum texto foi inventado ou copiado de outro cliente. O tour real, legendas, fotos, cores e logo da Sofia entrarão na cópia dela. O vídeo tem estrutura de acessibilidade, mas o áudio real e suas legendas não foram avaliados.

**SEO:** os validadores comprovam estrutura, não qualidade editorial, licença, elegibilidade, posicionamento nem aprovação do cliente. Os mínimos de caracteres não garantem uma boa página local. Verificação de domínio, propriedade, Search Console e indexação real não foi feita.

## Uso recomendado

Abrir a v0.2.0 em **nova pasta**, executar `npm run qa` e usar essa base para criar um projeto independente da Sofia. Não substituir pastas de clientes nem editar `public/` manualmente. Só configurar domínio/publicação depois da revisão do website específico e da aprovação de Maria.
