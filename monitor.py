"""Monitoramento de tarifas completas de ida e volta via SerpApi Google Flights.

Uma combinação de datas por execução, no máximo duas buscas API. Sem preços fictícios.
"""
import datetime as dt
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
API = 'https://serpapi.com/search.json'


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def fetch(params):
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'planferias-mgr/2.0'})
    with urllib.request.urlopen(req, timeout=90) as response:
        data = json.load(response)
    if data.get('error'):
        raise RuntimeError(str(data['error'])[:250])
    return data


def flights(data):
    return (data.get('best_flights') or []) + (data.get('other_flights') or [])


def main():
    now = dt.datetime.now(dt.timezone.utc)
    output = {'updated_at': now.isoformat(), 'source': 'SerpApi / Google Flights',
              'status': 'not_configured', 'offers': [], 'errors': [],
              'note': 'Tarifas sujeitas a alteração e confirmação na compra.',
              'apiQueries': 0}
    try:
        routes = json.loads((ROOT / 'routes.json').read_text(encoding='utf-8'))
        if not isinstance(routes, list):
            raise ValueError('routes.json precisa conter uma lista')
        combos = []
        for route in routes:
            if not route.get('enabled', True):
                continue
            origin, destination = route['origin'].upper(), route['destination'].upper()
            if not all(len(code) == 3 and code.isalpha() for code in (origin, destination)):
                raise ValueError('Código IATA inválido')
            dep_a = dt.date.fromisoformat(route['departStart'])
            dep_b = dt.date.fromisoformat(route['departEnd'])
            ret_a = dt.date.fromisoformat(route['returnStart'])
            ret_b = dt.date.fromisoformat(route['returnEnd'])
            if dep_b < dep_a or ret_b < ret_a or (dep_b - dep_a).days > 31 or (ret_b - ret_a).days > 31:
                raise ValueError('Intervalo de datas inválido')
            adults, children = int(route.get('adults', 1)), int(route.get('children', 0))
            if adults < 1 or children < 0:
                raise ValueError('Passageiros inválidos')
            for a in range((dep_b - dep_a).days + 1):
                dep = dep_a + dt.timedelta(days=a)
                for b in range((ret_b - ret_a).days + 1):
                    ret = ret_a + dt.timedelta(days=b)
                    if dep >= now.date() and ret > dep:
                        combos.append((route, origin, destination, dep, ret, adults, children))
        key = os.getenv('SERPAPI_API_KEY', '').strip()
        if not key:
            output['errors'].append('SERPAPI_API_KEY não configurada')
        elif not combos:
            output['status'] = 'no_valid_dates'
        else:
            slot = (now.date().toordinal() * 2 + (1 if now.hour >= 12 else 0)) % len(combos)
            route, origin, destination, dep, ret, adults, children = combos[slot]
            output['query'] = {'origin': origin, 'destination': destination,
                               'depart': dep.isoformat(), 'returnDate': ret.isoformat(),
                               'adults': adults, 'children': children}
            params = {'engine': 'google_flights', 'api_key': key, 'departure_id': origin,
                      'arrival_id': destination, 'type': '1', 'outbound_date': dep.isoformat(),
                      'return_date': ret.isoformat(), 'currency': 'BRL', 'hl': 'pt',
                      'gl': 'br', 'adults': str(adults), 'children': str(children)}
            output['apiQueries'] += 1
            first = fetch(params)
            choices = [x for x in flights(first) if x.get('departure_token')]
            if not choices:
                output['status'] = 'no_roundtrip_options'
                output['errors'].append('A API não retornou uma opção de ida com departure_token; nenhum preço completo registrado.')
            else:
                # Escolher uma opção de ida, preferindo o menor preço indicativo.
                outbound = min(choices, key=lambda x: x.get('price') if isinstance(x.get('price'), (int, float)) else float('inf'))
                second_params = dict(params)
                second_params['departure_token'] = outbound['departure_token']
                output['apiQueries'] += 1
                second = fetch(second_params)
                for option in flights(second):
                    price = option.get('price')
                    if not isinstance(price, (int, float)) or price <= 0:
                        continue
                    output['offers'].append({
                        'routeId': route['id'], 'origin': origin, 'destination': destination,
                        'depart': dep.isoformat(), 'returnDate': ret.isoformat(),
                        'priceTotal': price, 'currency': 'BRL',
                        'source': 'SerpApi / Google Flights',
                        'priceType': 'roundtrip_selection', 'roundTripConfirmed': True,
                        'passengers': {'adults': adults, 'children': children},
                        
'outboundFlights': outbound.get('flights', []),
'returnFlights': option.get('flights', []),
'outboundDuration': outbound.get('total_duration'),
'returnDuration': option.get('total_duration'),
'outboundLayovers': outbound.get('layovers', []),
'returnLayovers': option.get('layovers', []),
'bookingToken': option.get('booking_token'),
'checkedAt': now.isoformat()


                    })
                output['offers'].sort(key=lambda x: x['priceTotal'])
                output['status'] = 'completed' if output['offers'] else 'no_roundtrip_options'
                if not output['offers']:
                    output['errors'].append('Nenhum preço numérico de ida e volta na etapa de retorno.')
    except Exception as exc:
        output['status'] = 'error'
        output['errors'].append(str(exc)[:300])

    save(ROOT / 'latest.json', output)
    history_path = ROOT / 'history.json'
    try:
        history = json.loads(history_path.read_text(encoding='utf-8')) if history_path.exists() else []
        if not isinstance(history, list):
            history = []
    except (OSError, ValueError):
        history = []
    history.append({'checkedAt': output['updated_at'], 'status': output['status'],
                    'query': output.get('query'), 'apiQueries': output['apiQueries'],
                    'lowestRoundTripPrice': min((x['priceTotal'] for x in output['offers']), default=None),
                    'currency': 'BRL'})
    save(history_path, history[-365:])
    print('Status:', output['status'], '| consultas:', output['apiQueries'],
          '| tarifas completas:', len(output['offers']))
    if output['errors']:
        print('Avisos:', '; '.join(output['errors']))
    if output['status'] == 'error':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
