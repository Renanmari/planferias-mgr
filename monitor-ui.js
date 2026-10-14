
const exportButton = document.getElementById('exportRoutes');

if (exportButton) {
  exportButton.addEventListener('click', () => {
    const routes = JSON.parse(
      localStorage.getItem('planferias-mgr-routes-v1') || '[]'
    );
    const file = new Blob([JSON.stringify(routes, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routes.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

const status = document.getElementById('scanStatus');
const area = document.getElementById('liveOffers');

const money = value =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const dateBR = value => {
  if (!value) return 'Não informada';
  const parts = value.slice(0, 10).split('-');
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : value;
};

const minutesText = minutes => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, '0')}`;
};

function airportCode(airport) {
  return airport?.id || '---';
}

function flightTime(airport) {
  return airport?.time?.slice(11, 16) || '--:--';
}

function connectionMinutes(first, second) {
  const arrival = first?.arrival_airport?.time;
  const departure = second?.departure_airport?.time;
  if (!arrival || !departure) return null;

  const start = new Date(arrival.replace(' ', 'T'));
  const end = new Date(departure.replace(' ', 'T'));
  const minutes = Math.round((end - start) / 60000);

  return Number.isFinite(minutes) && minutes >= 0
    ? minutes
    : null;
}

function flightDescription(flights, title) {
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '12px';

  const heading = document.createElement('strong');
  heading.textContent = title;
  wrapper.append(heading);

  if (!Array.isArray(flights) || !flights.length) {
    const missing = document.createElement('p');
    missing.textContent = 'Detalhes dos voos não disponíveis.';
    wrapper.append(missing);
    return wrapper;
  }

  flights.forEach((flight, index) => {
    const line = document.createElement('div');
    line.style.marginTop = '7px';

    const from = flight.departure_airport;
    const to = flight.arrival_airport;

    line.textContent =
      `${airportCode(from)} ${flightTime(from)} → ` +
      `${airportCode(to)} ${flightTime(to)} | ` +
      `${flight.airline || 'Companhia não informada'} ` +
      `${flight.flight_number || ''}`;

    wrapper.append(line);

    if (index < flights.length - 1) {
      const waiting = connectionMinutes(flight, flights[index + 1]);
      if (waiting !== null) {
        const connection = document.createElement('div');
        connection.style.marginTop = '4px';
        connection.style.fontSize = '0.9em';
        connection.style.color = waiting > 360
          ? '#fbbf24'
          : '#a5b4fc';

        connection.textContent =
          `Conexão em ${airportCode(to)}: ${minutesText(waiting)}` +
          (waiting > 360 ? ' — espera longa' : '');

        wrapper.append(connection);
      }
    }
  });

  return wrapper;
}

function createOffer(offer) {
  const card = document.createElement('div');
  card.className = 'route';
  card.style.padding = '15px 0';
  card.style.borderBottom = '1px solid #475569';

  const allFlights = [
    ...(offer.outboundFlights || []),
    ...(offer.returnFlights || [])
  ];

  const airlines = [...new Set(
    allFlights.map(f => f.airline).filter(Boolean)
  )];

  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.fontSize = '1.1em';
  title.textContent = money(offer.priceTotal);

  const company = document.createElement('div');
  company.style.marginTop = '5px';
  company.textContent =
    airlines.join(' / ') || 'Companhia não informada';

  const route = document.createElement('div');
  route.style.marginTop = '8px';
  route.textContent =
    `${offer.origin} → ${offer.destination} | ` +
    `Ida ${dateBR(offer.depart)} | ` +
    `Volta ${dateBR(offer.returnDate)}`;

  const passengers = document.createElement('div');
  passengers.style.marginTop = '5px';
  passengers.textContent =
    `${offer.passengers?.adults ?? '?'} adulto(s) + ` +
    `${offer.passengers?.children ?? '?'} criança(s) | ` +
    'Valor total do grupo';

  const details = document.createElement('details');
  details.style.marginTop = '10px';

  const summary = document.createElement('summary');
  summary.textContent = 'Ver voos, horários e conexões';
  summary.style.cursor = 'pointer';
  details.append(summary);

  details.append(
    flightDescription(offer.outboundFlights, 'Ida'),
    flightDescription(offer.returnFlights, 'Volta')
  );

  const disclaimer = document.createElement('div');
  disclaimer.style.marginTop = '10px';
  disclaimer.style.fontSize = '0.85em';
  disclaimer.textContent =
    'Tarifa consultada, sujeita a alteração. ' +
    'Confirme disponibilidade, bagagem e preço final antes da compra.';

  
  // Preço médio calculado a partir do total do grupo.
  const adults = Number(offer.passengers?.adults || 0);
  const children = Number(offer.passengers?.children || 0);
  const passengerCount = adults + children;

  const extraInfo = document.createElement('div');
  extraInfo.className = 'mgr-offer-extra';
  extraInfo.style.cssText = `
    margin-top: 14px;
    padding: 14px;
    background: #edf4ff;
    border: 1px solid #d4e3fa;
    border-radius: 10px;
    color: #17365d;
    font-size: 15px;
    line-height: 1.7;
  `;

  const average = document.createElement('div');
  average.style.fontWeight = '700';
  average.textContent = passengerCount > 0
    ? `Preço médio por passageiro: ${money(offer.priceTotal / passengerCount)}`
    : 'Preço médio por passageiro: não disponível';

  const explanation = document.createElement('div');
  explanation.style.fontSize = '13px';
  explanation.style.color = '#475569';
  explanation.textContent =
    'Média calculada sobre o valor total do grupo. ' +
    'Não representa necessariamente a tarifa individual de adultos e crianças.';

  const baggage = document.createElement('div');
  baggage.style.marginTop = '10px';

  const cabin = document.createElement('div');
  cabin.textContent = '▣ Bagagem de cabine: franquia não informada';

  const checked = document.createElement('div');
  checked.textContent = '▤ Bagagem despachada: franquia e preço não informados';

  const baggageNote = document.createElement('div');
  baggageNote.style.fontSize = '13px';
  baggageNote.style.color = '#475569';
  baggageNote.textContent =
    'Preço com bagagem adicional: indisponível. ' +
    'Confirme as condições da tarifa antes da compra.';

  baggage.append(cabin, checked, baggageNote);
  extraInfo.append(average, explanation, baggage);


  const bookingLink = document.createElement('a');

  const searchParams = new URLSearchParams({
    q: `Voos ${offer.origin} para ${offer.destination} ` +
       `${offer.depart} ida e ${offer.returnDate} volta ` +
       `${offer.passengers?.adults || 1} adultos ` +
       `${offer.passengers?.children || 0} crianças`
  });

  bookingLink.href =
    'https://www.google.com/travel/flights?' +
    searchParams.toString();

  bookingLink.target = '_blank';
  bookingLink.rel = 'noopener noreferrer';
  bookingLink.textContent = 'Pesquisar esta viagem no Google Flights';

  bookingLink.style.cssText = `
    display: block;
    margin-top: 14px;
    padding: 12px 16px;
    background: #2563eb;
    color: white !important;
    border-radius: 9px;
    text-align: center;
    text-decoration: none;
    font-size: 15px;
    font-weight: 700;
  `;

  card.append(
    title,
    company,
    route,
    passengers,
    extraInfo,
    details,
       bookingLink,
    disclaimer
  );

  return card;
}

(async () => {
  if (!status || !area) return;

  area.replaceChildren();
  status.textContent = 'Carregando tarifas consultadas...';

  try {
    const response = await fetch(
      './latest.json?t=' + Date.now(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    const offers = (data.offers || [])
      .filter(offer =>
        offer.roundTripConfirmed === true &&
        offer.priceType === 'roundtrip_selection' &&
        Number.isFinite(Number(offer.priceTotal)) &&
        Number(offer.priceTotal) > 0
      )
      .sort((a, b) => a.priceTotal - b.priceTotal);

    const updated = data.updated_at
      ? new Date(data.updated_at).toLocaleString('pt-BR')
      : 'Não informada';

    status.textContent =
      `Fonte: ${data.source || 'Não informada'} | ` +
      `Última consulta: ${updated} | ` +
      `Status: ${data.status || 'Desconhecido'} | ` +
      `${data.errors?.length || 0} erro(s).`;

    if (!offers.length) {
      area.textContent =
        'Nenhuma tarifa completa de ida e volta disponível na última consulta.';
      return;
    }

    offers.slice(0, 20).forEach(offer => {
      area.append(createOffer(offer));
    });

  } catch (error) {
    status.textContent =
      'Não foi possível carregar os resultados: ' + error.message;
  }
})();

/* planferias MGR — comparador inteligente de ofertas */
(() => {
  'use strict';

  const area = document.getElementById('liveOffers');
  if (!area) return;

  const formatMoney = value =>
    Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

  const formatMinutes = value => {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return `${h}h${String(m).padStart(2, '0')}`;
  };

  const parseTime = value => {
    if (!value) return NaN;
    return Date.parse(value.replace(' ', 'T'));
  };

  
  const tripMinutes = value => {
    const minutes = Number(value);

    return Number.isFinite(minutes) &&
           minutes > 0 &&
           minutes <= 1440
      ? minutes
      : null;
  };


    const first = flights[0];
    const last = flights[flights.length - 1];

    const start = parseTime(first?.departure_airport?.time);
    const end = parseTime(last?.arrival_airport?.time);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    const minutes = Math.round((end - start) / 60000);
    return minutes >= 0 ? minutes : null;
  };

  const longestConnection = flights => {
    if (!Array.isArray(flights) || flights.length < 2) {
      return 0;
    }

    let longest = 0;

    for (let i = 0; i < flights.length - 1; i++) {
      const arrival = parseTime(
        flights[i]?.arrival_airport?.time
      );
      const departure = parseTime(
        flights[i + 1]?.departure_airport?.time
      );

      if (!Number.isFinite(arrival) ||
          !Number.isFinite(departure)) continue;

      const minutes = Math.round(
        (departure - arrival) / 60000
      );

      if (minutes >= 0) {
        longest = Math.max(longest, minutes);
      }
    }

    return longest;
  };

  const run = async () => {
    try {
      const response = await fetch(
        './latest.json?t=' + Date.now(),
        { cache: 'no-store' }
      );

      if (!response.ok) return;

      const data = await response.json();

      const offers = (data.offers || [])
        .filter(o =>
          o.roundTripConfirmed === true &&
          o.priceType === 'roundtrip_selection' &&
          Number(o.priceTotal) > 0
        )
        .sort((a, b) => a.priceTotal - b.priceTotal)
        .slice(0, 20);

      if (!offers.length) return;

      const metrics = offers.map((offer, index) => {
       const out = tripMinutes(offer.outboundDuration);
const back = tripMinutes(offer.returnDuration);

        return {
          offer,
          index,
          price: Number(offer.priceTotal),
          duration:
            out !== null && back !== null
              ? out + back
              : null,
          connection: Math.max(
            longestConnection(offer.outboundFlights),
            longestConnection(offer.returnFlights)
          )
        };
      });

      const valid = metrics.filter(m => {
  const ida = Number(m.offer.outboundDuration);
  const volta = Number(m.offer.returnDuration);

  return Number.isFinite(ida) &&
         Number.isFinite(volta) &&
         ida > 0 &&
         volta > 0 &&
         ida <= 1440 &&
         volta <= 1440;
});

     const cheapest = valid.length
  ? [...valid].sort((a, b) => a.price - b.price)[0]
  : null;

      const fastest = valid.length
        ? [...valid].sort(
            (a, b) => a.duration - b.duration ||
                      a.price - b.price
          )[0]
        : null;

     const minPrice = valid.length
  ? Math.min(...valid.map(m => m.price))
  : null;

const maxPrice = valid.length
  ? Math.max(...valid.map(m => m.price))
  : null;

      const minDuration = valid.length
        ? Math.min(...valid.map(m => m.duration))
        : null;

      const maxDuration = valid.length
        ? Math.max(...valid.map(m => m.duration))
        : null;

      // Peso igual para preço e duração.
      const balanced = valid.length
        ? [...valid].sort((a, b) => {
            const score = m => {
              const priceScore = maxPrice === minPrice
                ? 0
                : (m.price - minPrice) /
                  (maxPrice - minPrice);

              const durationScore =
                maxDuration === minDuration
                  ? 0
                  : (m.duration - minDuration) /
                    (maxDuration - minDuration);

              return (priceScore + durationScore) / 2;
            };

            return score(a) - score(b) ||
                   a.price - b.price;
          })[0]
        : null;

      const summary = document.createElement('div');
      summary.className = 'mgr-comparator';

      summary.style.cssText = `
        margin: 16px 0 22px;
        padding: 18px;
        background: #edf4ff;
        border: 1px solid #cbdcf5;
        border-radius: 14px;
        color: #17365d;
      `;

      const heading = document.createElement('h3');
      heading.textContent = 'Comparador inteligente';
      heading.style.margin = '0 0 12px';

      const info = document.createElement('p');
      info.style.fontSize = '14px';
      info.textContent =
        'Classificação baseada nas ofertas da última consulta. ' +
        'Duração considera ida e volta, incluindo conexões.';

      const grid = document.createElement('div');
      grid.style.cssText = `
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(190px, 1fr));
        gap: 12px;
      `;

      const makeCard = (label, metric, detail) => {
        const card = document.createElement('div');
        card.style.cssText = `
          background: #ffffff;
          border: 1px solid #d8e2ee;
          border-radius: 11px;
          padding: 14px;
        `;

        const title = document.createElement('strong');
        title.textContent = label;
        title.style.display = 'block';

        const price = document.createElement('div');
        price.textContent = metric
          ? formatMoney(metric.price)
          : 'Não disponível';

        price.style.cssText = `
          font-size: 21px;
          font-weight: 800;
          color: #15803d;
          margin: 7px 0;
        `;

        const description = document.createElement('div');
        description.textContent = detail;
        description.style.fontSize = '13px';
        description.style.color = '#475569';

        card.append(title, price, description);
        return card;
      };

      grid.append(
        
makeCard(
  'Menor preço',
  cheapest,
  cheapest && cheapest.duration !== null
    ? 'Duração total: ' +
      formatMinutes(cheapest.duration)
    : 'Nenhuma oferta válida dentro do limite de 24h por trecho'
),

        makeCard(
          'Menor duração',
          fastest,
          fastest
            ? 'Duração total: ' +
              formatMinutes(fastest.duration)
            : 'Duração não informada'
        ),
        makeCard(
          'Melhor equilíbrio',
          balanced,
          balanced
            ? 'Duração total: ' +
              formatMinutes(balanced.duration)
            : 'Duração não informada'
        )
      );

      summary.append(heading, info, grid);

      const existing = area.querySelector('.mgr-comparator');
      if (existing) existing.remove();

      area.prepend(summary);

      const cards = [
        ...area.querySelectorAll(':scope > .route')
      ];

      metrics.forEach(metric => {
        const card = cards[metric.index];
        if (!card) return;

        const labels = [];

        if (metric.index === cheapest.index) {
          labels.push('Menor preço');
        }

        if (fastest && metric.index === fastest.index) {
          labels.push('Menor duração');
        }

        if (balanced && metric.index === balanced.index) {
          labels.push('Melhor equilíbrio');
        }

        if (metric.connection > 360) {
          labels.push(
            'Conexão longa: ' +
            formatMinutes(metric.connection)
          );
        }

        if (!labels.length) return;

        const badge = document.createElement('div');
        badge.textContent = labels.join(' · ');
        badge.style.cssText = `
          font-size: 13px;
          font-weight: 700;
          color: #1e40af;
          background: #dbeafe;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 12px;
        `;

        if (metric.connection > 360) {
          badge.style.background = '#fff3d6';
          badge.style.color = '#92400e';
        }

        card.prepend(badge);
      });

    } catch (error) {
      console.warn(
        'Comparador indisponível:',
        error.message
      );
    }
  };

  // Aguarda a renderização das ofertas existentes.
  const observer = new MutationObserver(() => {
    if (area.querySelector(':scope > .route')) {
      observer.disconnect();
      run();
    }
  });

  observer.observe(area, {
    childList: true
  });

  if (area.querySelector(':scope > .route')) {
    observer.disconnect();
    run();
  }
})();
