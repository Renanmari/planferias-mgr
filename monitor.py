"""Piloto SerpApi Google Flights: uma consulta por execução, sem tarifas fictícias.

ATENÇÃO: em pesquisas de ida/volta, o preço retornado na primeira etapa
pode ser referente à seleção da ida; NÃO é cotação final confirmada de ida+volta.
"""
import datetime as dt
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    now = dt.datetime.now(dt.timezone.utc)
    result = {
        "updated_at": now.isoformat(),
        "source": "SerpApi / Google Flights",
        "status": "not_configured",
        "offers": [],
        "errors": [],
        "note": "Preços indicativos da primeira etapa; não representam ida e volta confirmadas."
    }
    key = os.environ.get("SERPAPI_API_KEY", "").strip()
    try:
        routes = json.loads((ROOT / "routes.json").read_text(encoding="utf-8"))
        if not isinstance(routes, list):
            raise ValueError("routes.json deve conter uma lista")
        combos = []
        today = now.date()
        for route in routes:
            if not route.get("enabled", True):
                continue
            origin = route["origin"].upper()
            destination = route["destination"].upper()
            if not all(len(x) == 3 and x.isalpha() for x in (origin, destination)):
                raise ValueError("Código IATA inválido")
            dep_start = dt.date.fromisoformat(route["departStart"])
            dep_end = dt.date.fromisoformat(route["departEnd"])
            ret_start = dt.date.fromisoformat(route["returnStart"])
            ret_end = dt.date.fromisoformat(route["returnEnd"])
            if dep_end < dep_start or ret_end < ret_start:
                raise ValueError("Intervalo de datas inválido")
            if (dep_end - dep_start).days > 31 or (ret_end - ret_start).days > 31:
                raise ValueError("Intervalos de teste limitados a 32 dias")
            adults = int(route.get("adults", 1))
            children = int(route.get("children", 0))
            if adults < 1 or children < 0:
                raise ValueError("Quantidade de passageiros inválida")
            for dep_n in range((dep_end - dep_start).days + 1):
                dep = dep_start + dt.timedelta(days=dep_n)
                for ret_n in range((ret_end - ret_start).days + 1):
                    ret = ret_start + dt.timedelta(days=ret_n)
                    if dep >= today and ret > dep:
                        combos.append((route, origin, destination, dep, ret, adults, children))
        if not key:
            result["errors"].append("SERPAPI_API_KEY não configurada")
        elif not combos:
            result["status"] = "no_valid_dates"
            result["errors"].append("Nenhuma combinação futura válida")
        else:
            # Uma combinação por execução; gira pelas 12 combinações ao longo dos dias.
            # Duas execuções por dia => ~60 consultas em 30 dias (sem execuções extras).
            slot = (now.date().toordinal() * 2 + (1 if now.hour >= 12 else 0)) % len(combos)
            route, origin, destination, dep, ret, adults, children = combos[slot]
            params = {
                "engine": "google_flights", "api_key": key,
                "departure_id": origin, "arrival_id": destination,
                "type": "1", "outbound_date": dep.isoformat(),
                "return_date": ret.isoformat(), "currency": "BRL",
                "hl": "pt", "gl": "br", "adults": str(adults),
                "children": str(children), "output": "json"
            }
            url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
            try:
                request = urllib.request.Request(url, headers={"User-Agent": "planferias-mgr/1.0"})
                with urllib.request.urlopen(request, timeout=120) as response:
                    payload = json.load(response)
                if payload.get("error"):
                    raise RuntimeError(str(payload["error"])[:200])
                for item in (payload.get("best_flights") or []) + (payload.get("other_flights") or []):
                    price = item.get("price")
                    if not isinstance(price, (int, float)) or price <= 0:
                        continue
                    result["offers"].append({
                        "routeId": route["id"], "origin": origin,
                        "destination": destination, "depart": dep.isoformat(),
                        "returnDate": ret.isoformat(), "priceTotal": price,
                        "currency": "BRL", "source": "SerpApi / Google Flights",
                        "priceType": "indicative_outbound_selection",
                        "roundTripConfirmed": False,
                        "checkedAt": now.isoformat()
                    })
                result["offers"].sort(key=lambda item: item["priceTotal"])
                result["status"] = "completed"
                result["query"] = {"origin": origin, "destination": destination,
                                   "depart": dep.isoformat(), "returnDate": ret.isoformat(),
                                   "adults": adults, "children": children}
            except Exception as exc:
                result["status"] = "error"
                result["errors"].append(f"Falha na consulta: {str(exc)[:200]}")
    except Exception as exc:
        result["status"] = "error"
        result["errors"].append(f"Falha na configuração: {str(exc)[:200]}")

    write_json(ROOT / "latest.json", result)
    # Histórico limitado: registros compactos de cada execução.
    history_file = ROOT / "history.json"
    try:
        history = json.loads(history_file.read_text(encoding="utf-8")) if history_file.exists() else []
        if not isinstance(history, list):
            history = []
    except (ValueError, OSError):
        history = []
    history.append({"checkedAt": result["updated_at"], "status": result["status"],
                    "query": result.get("query"),
                    "lowestIndicativePrice": min((x["priceTotal"] for x in result["offers"]), default=None),
                    "currency": "BRL"})
    write_json(history_file, history[-365:])
    print(f"Status: {result['status']} | ofertas indicativas: {len(result['offers'])} | erros: {len(result['errors'])}")
    if result["errors"]:
        print("; ".join(result["errors"]))
    if result["status"] == "error":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
