# planférias MGR — v4

Aplicativo PWA com cadastro local, alternativas, histórico manual e monitor agendado de ofertas **quando configurado**. Sem preços inventados.

## Publicar

1. Faça backup das rotas: no app atual, clique em **Baixar routes.json** depois de atualizar a página com os arquivos v4. As rotas cadastradas no mesmo navegador e endereço permanecem no localStorage.
2. Envie **todos os arquivos e pastas** desta versão à raiz do repositório `planferias-mgr` (inclusive `.github/workflows/monitor.yml`, `scripts/scan.py`, `data/latest.json`). Substitua os arquivos de mesmo nome. GitHub Pages deve permanecer `main` / `/ (root)`.
3. Após publicar, abra o app e exporte `routes.json`. No GitHub, substitua o `routes.json` vazio pelo arquivo exportado e confirme o commit. **Atenção:** repositório público = rotas e datas públicas. Se não quiser publicar suas viagens, NÃO envie o arquivo com suas rotas. Essa arquitetura gratuita requer revisão de privacidade.
4. Solicite acesso à API Amadeus for Developers (Self-Service), sujeito à disponibilidade e termos atuais. Em **Settings → Secrets and variables → Actions → New repository secret**, crie `AMADEUS_CLIENT_ID` e `AMADEUS_CLIENT_SECRET` (nunca insira no app nem em arquivos do repositório).
5. O workflow usa `https://test.api.amadeus.com` por padrão. **Test é ambiente de teste e não prova preço comprável.** Só altere para produção depois de habilitar acesso real autorizado e entender limites/custos. Para produção crie a variável de repositório `AMADEUS_BASE_URL` com `https://api.amadeus.com` se seu contrato permitir.
6. Abra **Actions → Monitorar tarifas → Run workflow**. Leia logs. A agenda tenta rodar duas vezes ao dia, mas GitHub pode atrasar ou suspender tarefas agendadas; quotas e cobertura da API podem limitar resultados. Confira permissões de escrita do workflow em **Settings → Actions → General → Workflow permissions** caso o commit falhe.
7. Alertas opcionais: instale o aplicativo gratuito **ntfy** no Android, crie um tópico longo e aleatório e assine-o no celular. Crie o secret `NTFY_TOPIC` no GitHub. O script só envia alertas no ambiente de produção. Tópicos públicos do ntfy.sh não oferecem privacidade forte; nunca use informações sensíveis. O código ainda não implementa Web Push nativo do PWA.

## Limitações explícitas

- A integração inicial cobre apenas Amadeus, não Google Flights, Decolar, LATAM, GOL e Copa individualmente. Esses sites exigem acesso autorizado específico; não há scraping neste pacote.
- O monitor inicial pesquisa no máximo **12 combinações por rota por execução**, por economia de quota. A flexibilidade completa pode não ser examinada; a seleção prioriza datas iniciais do intervalo, não o preço mais baixo global.
- Só pesquisa ida/volta convencional com aeroportos compatíveis. Rotas multitrechos/open-jaw ficam salvas na interface, mas **não são pesquisadas automaticamente** nesta versão.
- O código não fornece comparação histórica de anos anteriores; o histórico manual continua no navegador. Não presume que preços de teste são tarifas reais.
- O campo de preço retornado é o total da oferta para a quantidade de adultos consultados; não é necessariamente preço por pessoa e pode excluir serviços adicionais. O monitor usa `adults=1` para rotas antigas sem esse campo.
- O envio ntfy não faz deduplicação de alertas entre execuções. Alertas podem se repetir.
- GitHub Pages é público e o histórico local não sincroniza entre dispositivos.
- A utilização do GitHub Actions e APIs depende de termos, limites e eventuais alterações de planos gratuitos. Nenhum serviço pago é ativado automaticamente.
