
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

  card.append(
    title,
    company,
    route,
    passengers,
    extraInfo,
    details,
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
