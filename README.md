# planférias MGR — MVP local

Este é um protótipo funcional de interface PWA, **não** um monitor de tarifas em produção.

## Teste

Execute `python -m http.server 8000` nesta pasta e abra `http://localhost:8000`. Para instalar em um Android, publique os arquivos em HTTPS (por exemplo, hospedagem estática). Os dados ficam no `localStorage` do dispositivo.

## Implementação para produção

1. Autenticação pessoal e banco Postgres/Supabase: tabelas `routes`, `fare_observations`, `push_subscriptions`, `alert_events`.
2. Agendador no servidor para consultar fornecedores autorizados, respeitando limites, contratos e disponibilidade das APIs. Adaptadores normalizam preço total, moeda, escalas, bagagem e URL de compra; a segunda fonte só entra quando houver acesso real.
3. Consulta de datas flexíveis em lotes com limites de custo e cache; histórico de ofertas reais e deduplicação de resultados.
4. Alertas com critérios configuráveis, deduplicação, cooldown e chaves VAPID guardadas apenas no servidor. Solicitar assinatura PushManager no cliente e enviar pelo backend.
5. Hospedagem HTTPS, logs, proteção de credenciais, monitoramento de erros e testes end-to-end.

**Não** incluir chaves secretas no frontend. Sem APIs conectadas, não há preços nem alertas reais. O service worker apenas oferece suporte inicial a notificações push recebidas de um backend futuro.

## Histórico (v3)

Registre observações reais manualmente por rota, data, preço e fonte. O painel calcula média e classifica a última observação somente com 5 ou mais registros. Essa classificação é exploratória, não ajustada por sazonalidade e não substitui séries históricas de anos anteriores. Para comparações rigorosas, a versão futura precisará registrar datas de embarque, duração, bagagem, escalas, antecedência da compra e origem dos dados, além de normalizar inflação e câmbio quando aplicável.
