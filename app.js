const KEY='planferias-mgr-routes-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
const save=routes=>localStorage.setItem(KEY,JSON.stringify(routes));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addAlternative(side){const holder=document.getElementById(side==='out'?'outAlternatives':'backAlternatives');const row=document.createElement('div');row.className='grid altrow';row.innerHTML='<div><label>Origem IATA</label><input class="alt-origin" maxlength="3" pattern="[A-Za-z]{3}" placeholder="GRU" required></div><div><label>Destino IATA</label><input class="alt-destination" maxlength="3" pattern="[A-Za-z]{3}" placeholder="MIA" required></div><button type="button" class="secondary remove-alt">Remover alternativa</button>';holder.appendChild(row)}
function getAlternatives(id){return [...document.querySelectorAll('#'+id+' .altrow')].map(row=>({origin:row.querySelector('.alt-origin').value.trim().toUpperCase(),destination:row.querySelector('.alt-destination').value.trim().toUpperCase()}))}
for(const [button,side] of [['addOut','out'],['addBack','back']])document.getElementById(button).addEventListener('click',()=>addAlternative(side));
document.querySelector('#routeForm').addEventListener('click',e=>{if(e.target.classList.contains('remove-alt'))e.target.closest('.altrow').remove()});
function render(){const routes=read();document.querySelector('#routes').innerHTML=routes.length?routes.map(r=>`<div class="route"><strong>${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</strong><br><small>${escapeHtml(r.depart)} a ${escapeHtml(r.returnDate)} · ±${r.flex} dias · limite R$ ${Number(r.maxPrice).toLocaleString('pt-BR')}</small><br><small>Ida: ${escapeHtml((r.outAlternatives||[]).map(a=>a.origin+' → '+a.destination).join(' | ')||'somente principal')} · Volta: ${escapeHtml((r.backAlternatives||[]).map(a=>a.origin+' → '+a.destination).join(' | ')||'somente principal')} · Datas ±${r.flexOut??r.flex} / ±${r.flexBack??r.flex} · Multidestinos: ${r.allowOpenJaw?'sim':'não'}</small><br><span class="tag">Aguardando conexão de fonte de tarifas</span><br><button class="secondary" data-remove="${escapeHtml(r.id)}">Remover</button></div>`).join(''):'<p>Nenhuma rota cadastrada.</p>'}
document.querySelector('#routeForm').addEventListener('submit',e=>{e.preventDefault();const get=id=>document.getElementById(id).value;const origin=get('origin').toUpperCase(),destination=get('destination').toUpperCase(),depart=get('depart'),returnDate=get('returnDate'),flex=Number(get('flex')),maxPrice=Number(get('maxPrice'));if(origin===destination||returnDate<depart||maxPrice<=0||!Number.isInteger(flex)||flex<0||flex>15){alert('Confira aeroportos, datas e valores.');return}const outAlternatives=getAlternatives('outAlternatives'),backAlternatives=getAlternatives('backAlternatives');const flexOut=Number(get('flexOut')),flexBack=Number(get('flexBack')),allowOpenJaw=document.getElementById('allowOpenJaw').checked;if([...outAlternatives,...backAlternatives].some(a=>a.origin===a.destination)||![flexOut,flexBack].every(n=>Number.isInteger(n)&&n>=0&&n<=15)){alert('Verifique as alternativas e a flexibilidade de datas.');return}const routes=read();routes.push({id:crypto.randomUUID(),origin,destination,depart,returnDate,flex,maxPrice,flexOut,flexBack,outAlternatives,backAlternatives,allowOpenJaw});save(routes);e.target.reset();document.querySelector('#outAlternatives').innerHTML='';document.querySelector('#backAlternatives').innerHTML='';document.querySelector('#flex').value=3;render()});
document.querySelector('#routes').addEventListener('click',e=>{const id=e.target.dataset.remove;if(id){save(read().filter(r=>r.id!==id));render()}});
document.querySelector('#notify').addEventListener('click',async()=>{if(!('Notification' in window)){alert('Notificações indisponíveis neste navegador.');return}try{const result=await Notification.requestPermission();document.querySelector('#status').textContent='Permissão de notificações: '+result+'. Fontes de tarifas ainda não conectadas.'}catch(err){document.querySelector('#status').textContent='Erro ao solicitar permissão: '+err.message}});
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(console.error);render();

// Histórico local de preços informados pelo usuário. Não simula dados de mercado.
const HISTORY_KEY='planferias-mgr-history-v1';
const readHistory=()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return []}};
function refreshHistory(){
 const routes=read(),select=document.getElementById('historyRoute'),prior=select.value;
 select.innerHTML=routes.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.origin)} ⇄ ${escapeHtml(r.destination)} (${escapeHtml(r.depart)})</option>`).join('');
 if(routes.some(r=>r.id===prior))select.value=prior;
 const data=readHistory().filter(x=>x.routeId===select.value).sort((a,b)=>a.date.localeCompare(b.date));
 const summary=document.getElementById('historySummary'),chart=document.getElementById('historyChart');
 if(!data.length){summary.textContent='Sem observações registradas para esta rota. Histórico insuficiente.';chart.replaceChildren();return}
 const values=data.map(x=>x.price),last=data[data.length-1],mean=values.reduce((a,b)=>a+b,0)/values.length;
 const deviation=(last.price/mean-1)*100;
 const label=data.length<5?'Histórico insuficiente para classificação confiável':deviation<=-25?'Muito abaixo da média':deviation<=-10?'Abaixo da média':deviation<10?'Na média':deviation<25?'Acima da média':'Muito alto';
 summary.textContent=`${data.length} observação(ões) · média R$ ${mean.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} · última R$ ${last.price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} · ${label}. Histórico informado manualmente, não equivalente a dados de anos anteriores.`;
 chart.innerHTML='<div style="display:grid;gap:9px">'+data.slice(-25).map(x=>`<div><small>${escapeHtml(x.date)} · ${escapeHtml(x.source)} · R$ ${x.price.toLocaleString('pt-BR')}</small><div style="background:#35435a;border-radius:5px;height:12px"><div style="background:#85e6ac;border-radius:5px;height:12px;width:${Math.max(2,x.price/Math.max(...values)*100)}%"></div></div></div>`).join('')+'</div>';
}
document.getElementById('historyRoute').addEventListener('change',refreshHistory);
document.getElementById('observedAt').value=new Date().toLocaleDateString('en-CA');
document.getElementById('addObservation').addEventListener('click',()=>{
 const routeId=document.getElementById('historyRoute').value,date=document.getElementById('observedAt').value,price=Number(document.getElementById('observedPrice').value),source=document.getElementById('observedSource').value.trim();
 if(!routeId||!date||!Number.isFinite(price)||price<=0||!source){alert('Selecione uma rota e informe data, preço positivo e fonte.');return}
 const history=readHistory();history.push({routeId,date,price,source});localStorage.setItem(HISTORY_KEY,JSON.stringify(history));refreshHistory();
});
const originalRender=render;render=function(){originalRender();refreshHistory()};refreshHistory();
