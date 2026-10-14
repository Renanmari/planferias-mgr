"""Pesquisa ofertas Amadeus Self-Service; sem dados fictícios."""
import os,json,datetime,urllib.request,urllib.parse,time,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def req(url, data=None, token=None):
    headers={'Content-Type':'application/x-www-form-urlencoded' if data else 'application/json'}
    if token: headers['Authorization']='Bearer '+token
    r=urllib.request.Request(url,data=data,headers=headers)
    with urllib.request.urlopen(r,timeout=25) as f:return json.load(f)
def dates(center,flex):
    d=datetime.date.fromisoformat(center)
    return [(d+datetime.timedelta(days=n)).isoformat() for n in range(-min(15,int(flex)),min(15,int(flex))+1)]
def main():
    routes=json.loads((ROOT/'routes.json').read_text(encoding='utf8'))
    key=os.getenv('AMADEUS_CLIENT_ID');secret=os.getenv('AMADEUS_CLIENT_SECRET');base=os.getenv('AMADEUS_BASE_URL','https://test.api.amadeus.com').rstrip('/')
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    out={'updated_at':now,'status':'not_configured','offers':[],'errors':[],'source':'Amadeus Self-Service','environment':'test' if 'test.' in base else 'production'}
    if not key or not secret:
        out['errors'].append('Credenciais Amadeus não configuradas. Nenhuma consulta realizada.')
    else:
        try:
            payload=urllib.parse.urlencode({'grant_type':'client_credentials','client_id':key,'client_secret':secret}).encode()
            token=req(base+'/v1/security/oauth2/token',payload)['access_token'];out['status']='completed'
            today=datetime.date.today()
            for route in routes:
                try:
                    origin=route['origin'].upper();destination=route['destination'].upper()
                    if not all(len(x)==3 and x.isalpha() for x in [origin,destination]):raise ValueError('IATA inválido')
                    # Orçamento grátis: limite conservador de 12 combinações por rota por execução.
                    outbound=[(origin,destination)]+[(x['origin'].upper(),x['destination'].upper()) for x in route.get('outAlternatives',[])]
                    inbound=[(destination,origin)]+[(x['origin'].upper(),x['destination'].upper()) for x in route.get('backAlternatives',[])]
                    combos=0
                    for o,d in outbound:
                        for ret_o,ret_d in inbound:
                            if (ret_o!=d or ret_d!=o):continue # v1: somente ida/volta convencional
                            for dep in dates(route['depart'],route.get('flexOut',route.get('flex',0))):
                                for ret in dates(route['returnDate'],route.get('flexBack',route.get('flex',0))):
                                    if combos>=12:break
                                    if datetime.date.fromisoformat(dep)<today or ret<=dep:continue
                                    combos+=1
                                    q=urllib.parse.urlencode({'originLocationCode':o,'destinationLocationCode':d,'departureDate':dep,'returnDate':ret,'adults':int(route.get('adults',1)),'currencyCode':'BRL','max':5})
                                    try:
                                        response=req(base+'/v2/shopping/flight-offers?'+q,token=token)
                                        for offer in response.get('data',[]):
                                            p=offer.get('price',{});amount=float(p.get('grandTotal',p.get('total',0)))
                                            if not amount:continue
                                            out['offers'].append({'routeId':route['id'],'origin':o,'destination':d,'depart':dep,'returnDate':ret,'priceTotal':amount,'currency':p.get('currency','BRL'),'source':'Amadeus','environment':out['environment'],'airlines':offer.get('validatingAirlineCodes',[]),'checkedAt':now})
                                    except Exception as e:out['errors'].append(f'{o}-{d} {dep}/{ret}: {str(e)[:150]}')
                                    time.sleep(.15)
                                if combos>=12:break
                except Exception as e:out['errors'].append(f'Rota inválida: {str(e)[:150]}')
        except Exception as e:out['status']='error';out['errors'].append('Falha na autenticação/consulta: '+str(e)[:250])
    out['offers'].sort(key=lambda x:x['priceTotal'])
    (ROOT/'data'/'latest.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
    print(f"Status {out['status']}; ofertas {len(out['offers'])}; erros {len(out['errors'])}")
    topic=os.getenv('NTFY_TOPIC','').strip()
    if topic and out['environment']=='production' and out['offers']:
        eligible=[x for x in out['offers'] if any(r['id']==x['routeId'] and x['priceTotal']<=float(r.get('maxPrice',0))*int(r.get('adults',1)) for r in routes)]
        if eligible:
            best=min(eligible,key=lambda x:x['priceTotal'])
            # tópico ntfy deve ser aleatório e secreto; push opcional via app ntfy.
            body=f"{best['origin']}-{best['destination']} {best['depart']}/{best['returnDate']} R$ {best['priceTotal']:.2f}. Confirme tarifa no fornecedor."
            request=urllib.request.Request('https://ntfy.sh/'+urllib.parse.quote(topic,safe=''),data=body.encode(),headers={'Title':'planferias MGR - tarifa encontrada','Tags':'airplane'})
            try:urllib.request.urlopen(request,timeout=15).close()
            except Exception as e:print('Falha notificação:',str(e)[:120])
if __name__=='__main__':main()
