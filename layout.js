
/* planferias MGR — navegacao por abas, sem alterar dados nem executar consultas. */
(() => {
  'use strict';

  const start = () => {
    const main = document.querySelector('main');
    if (!main || document.getElementById('mgr-tabs')) return;

    const css = document.createElement('style');
    css.textContent = `
      #mgr-tabs {
        display:flex; gap:8px; overflow-x:auto;
        position:sticky; top:0; z-index:20;
        padding:12px 0; background:#101827;
      }
      #mgr-tabs button {
        border:1px solid #42526c; border-radius:10px;
        background:#24334d; color:#fff;
        padding:11px 15px; white-space:nowrap;
        cursor:pointer; font:inherit;
      }
      #mgr-tabs button[aria-selected="true"] {
        background:#3975e5;
        border-color:#77a2ff;
        font-weight:700;
      }
      .mgr-pane[hidden] { display:none!important; }
      .mgr-pane { min-width:0; }
      .mgr-history {
        background:#1e2c44;
        border-radius:12px;
        padding:18px;
        margin:12px 0;
        color:#fff;
      }
      .mgr-history table {
        width:100%;
        border-collapse:collapse;
        font-size:.9rem;
      }
      .mgr-history td,.mgr-history th {
        padding:9px 6px;
        text-align:left;
        border-bottom:1px solid #40516b;
      }
      .mgr-history .scroll { overflow-x:auto; }
      @media(max-width:600px) {
        #mgr-tabs button {
          padding:10px 12px;
          font-size:14px;
        }
      }
    `;
    document.head.appendChild(css);

    const headings = [...main.querySelectorAll('h1,h2,h3')];
    const groups = [
      {
        id:'ofertas',
        label:'Ofertas',
        matches:['tarifas consultadas']
      },
      {
        id:'historico',
        label:'Histórico',
        matches:['análise histórica','analise historica']
      },
      {
        id:'rotas',
        label:'Rotas',
        matches:['nova rota','minhas rotas','sincronizar rotas']
      },
      {
        id:'alertas',
        label:'Alertas',
        matches:['resultados e alertas']
      }
    ];

    const clean = s => (s||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .trim();

    const getCard = heading => {
      let el = heading;
      while (el && el.parentElement !== main) {
        if (el.matches('section,article,.card,.panel')) {
          return el;
        }
        el = el.parentElement;
      }
      return el && el !== main ? el : null;
    };

    const found = new Map();

    for (const h of headings) {
      const title = clean(h.textContent);
      const group = groups.find(g =>
        g.matches.some(m => title.includes(clean(m)))
      );
      if (!group) continue;

      const card = getCard(h);
      if (!card) continue;

      if (!found.has(group.id)) found.set(group.id,[]);
      if (!found.get(group.id).includes(card)) {
        found.get(group.id).push(card);
      }
    }

    if (![...found.values()].some(a => a.length)) return;

    const nav = document.createElement('nav');
    nav.id = 'mgr-tabs';
    nav.setAttribute('aria-label','Seções do planférias MGR');

    const panes = new Map();
    const host = document.createElement('div');
    host.id = 'mgr-tab-content';

    for (const group of groups) {
      const pane = document.createElement('div');
      pane.id = 'mgr-' + group.id;
      pane.className = 'mgr-pane';
      pane.setAttribute('role','tabpanel');
      pane.hidden = group.id !== 'ofertas';
      panes.set(group.id,pane);

      for (const card of found.get(group.id)||[]) {
        pane.appendChild(card);
      }
      host.appendChild(pane);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = group.label;
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-controls',pane.id);
      btn.setAttribute(
        'aria-selected',
        String(group.id === 'ofertas')
      );

      btn.addEventListener('click',() => {
        for (const [id,p] of panes) {
          p.hidden = id !== group.id;
        }
        for (const b of nav.querySelectorAll('button')) {
          b.setAttribute(
            'aria-selected',
            String(b === btn)
          );
        }
      });

      nav.appendChild(btn);
    }

    const first = main.firstElementChild;
    if (first) {
      first.before(nav,host);
    } else {
      main.append(nav,host);
    }

    const historyPane = panes.get('historico');
    const historyBox = document.createElement('div');
    historyBox.className = 'mgr-history';
    historyBox.innerHTML =
      '<h3>Histórico automático das consultas</h3>' +
      '<p>Carregando registros do GitHub...</p>';
    historyPane.prepend(historyBox);

    fetch('./history.json?t=' + Date.now(), {
      cache:'no-store'
    })
    .then(r => {
      if (!r.ok) throw Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || !data.length) {
        historyBox.querySelector('p').textContent =
          'Ainda não há consultas registradas.';
        return;
      }

      const rows = data.slice(-100).reverse();
      const table = document.createElement('table');

      const head = document.createElement('thead');
      head.innerHTML =
        '<tr><th>Consulta</th><th>Trecho</th>' +
        '<th>Menor preço</th></tr>';
      table.appendChild(head);

      const body = document.createElement('tbody');

      for (const item of rows) {
        const tr = document.createElement('tr');
        const q = item.query || {};
        const price =
          item.lowestIndicativePrice ??
          item.lowestPrice ??
          null;

        const values = [
          item.checkedAt || item.updated_at || '—',
          q.origin && q.destination
            ? `${q.origin} → ${q.destination}`
            : '—',
          typeof price === 'number'
            ? price.toLocaleString('pt-BR',{
                style:'currency',
                currency:item.currency || 'BRL'
              })
            : 'Sem preço'
        ];

        for (const v of values) {
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        }
        body.appendChild(tr);
      }

      table.appendChild(body);

      const scroll = document.createElement('div');
      scroll.className = 'scroll';
      scroll.appendChild(table);

      historyBox.replaceChildren(
        Object.assign(document.createElement('h3'),{
          textContent:'Histórico automático das consultas'
        }),
        scroll
      );

      const note = document.createElement('p');
      note.textContent =
        'Preços históricos podem ser indicativos. ' +
        'Compare apenas pesquisas com passageiros ' +
        'e condições equivalentes.';
      historyBox.appendChild(note);
    })
    .catch(() => {
      historyBox.querySelector('p').textContent =
        'Histórico ainda indisponível. ' +
        'Confira history.json no repositório.';
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start);
  } else {
    start();
  }
})();
/* planferias MGR — aprimoramento visual */
(() => {
  const style = document.createElement('style');

  style.textContent = `
    :root {
      color-scheme: dark;
    }

    body {
      background: #0b1220 !important;
      color: #f8fafc;
      font-size: 17px !important;
      line-height: 1.65;
    }

    main {
      max-width: 1200px !important;
      width: 100%;
      box-sizing: border-box;
      margin: 0 auto;
      padding: 24px 32px;
    }

    h1 {
      font-size: clamp(28px, 3vw, 38px);
      font-weight: 750;
      letter-spacing: -0.6px;
    }

    h2 {
      font-size: 24px;
      line-height: 1.35;
    }

    h3 {
      font-size: 20px;
    }

    p, small {
      color: #d8e3f3;
    }

    .panel, .mgr-history {
      background: #1b2b42 !important;
      border: 1px solid #3c506b;
      border-radius: 18px;
      padding: 26px;
      box-shadow: 0 8px 25px rgba(0,0,0,.15);
    }

    #mgr-tabs {
      display: flex;
      gap: 10px;
      background: #0b1220 !important;
      padding: 16px 0;
    }

    #mgr-tabs button {
      font-size: 17px !important;
      font-weight: 650;
      min-height: 48px;
      padding: 12px 20px;
      background: #273b59;
      border: 1px solid #516b90;
      border-radius: 12px;
    }

    #mgr-tabs button[aria-selected="true"] {
      background: #2563eb;
      border-color: #93c5fd;
      color: #ffffff;
    }

    #mgr-tab-content {
      width: 100%;
      min-width: 0;
    }

    .mgr-pane {
      width: 100%;
    }

    #mgr-ofertas .route {
      background: #243752;
      border: 1px solid #456181 !important;
      border-radius: 15px;
      padding: 20px !important;
      margin: 16px 0;
      font-size: 17px !important;
      line-height: 1.7;
    }

    #mgr-ofertas .route > div:first-child {
      font-size: 28px !important;
      font-weight: 800 !important;
      color: #ffffff;
      line-height: 1.25;
    }

    #mgr-ofertas .route summary {
      background: #31527d;
      border-radius: 9px;
      padding: 12px 14px;
      margin-top: 12px;
      font-size: 16px;
      font-weight: 650;
      cursor: pointer;
      color: #ffffff;
    }

    #mgr-ofertas .route summary:hover {
      background: #3d6495;
    }

    .mgr-history table {
      font-size: 16px !important;
    }

    .mgr-history th,
    .mgr-history td {
      padding: 14px 12px !important;
      border-bottom: 1px solid #526783;
    }

    input, select, button {
      font-size: 16px;
    }

    @media (max-width: 600px) {
      body {
        font-size: 16px !important;
      }

      main {
        padding: 14px !important;
      }

      .panel, .mgr-history {
        padding: 18px;
      }

      #mgr-tabs {
        gap: 6px;
        overflow-x: auto;
      }

      #mgr-tabs button {
        font-size: 14px !important;
        padding: 10px 12px;
      }

      #mgr-ofertas .route {
        padding: 16px !important;
      }

      #mgr-ofertas .route > div:first-child {
        font-size: 25px !important;
      }
    }
  `;

  document.head.appendChild(style);
})();

