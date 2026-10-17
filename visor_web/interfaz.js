'use strict';
(function(){
const D=window.VISOR_DATA,$=id=>document.getElementById(id),G='#24583d',G2='#7ca761',O='#bd7624',CYAN='#00b7da';
const refs=['Abierto','Árbol','Bosquete','Bosque'];const refName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='arbol'?'Árbol':String(s||'').trim();
const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,n=2)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('es-CO',{minimumFractionDigits:n,maximumFractionDigits:n});
const date=s=>{let v=String(s||'').slice(0,10).split('-');return v.length===3?`${v[2]}/${v[1]}/${v[0]}`:String(s||'')};
const avg=arr=>{const values=arr.filter(v=>v!==null&&v!==undefined&&Number.isFinite(Number(v)));return values.length?values.reduce((a,b)=>a+Number(b),0)/values.length:null};
const climateColors={'Abierto':'#bc7428','Árbol':'#8a549b','Bosquete':'#81a766','Bosque':'#21583b'};
const environmentColors={'Bosque':G,'Potrero':O};const charts=new Set(),maps={};const init=new Set();let activeTab='paisaje',selectedTree=null,selectedRef='Bosque';
const send=(type,fields={})=>{if(window.parent!==window)window.parent.postMessage({isStreamlitMessage:true,type,...fields},'*')};let lastHeight=0,ht;
function height(){clearTimeout(ht);ht=setTimeout(()=>{const h=Math.ceil($('app').getBoundingClientRect().height)+6;if(h!==lastHeight){lastHeight=h;send('streamlit:setFrameHeight',{height:h})}},100)}
window.addEventListener('message',e=>{if(e.data?.type==='streamlit:render')height()});
function layout(extra={}){const mobile=window.innerWidth<620;return {paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'#fff',font:{family:'DM Sans, Arial, sans-serif',color:'#263b2f',size:mobile?10:12},margin:{l:mobile?43:55,r:mobile?15:24,t:18,b:mobile?70:60},showlegend:true,legend:{orientation:'h',y:-.24,x:0,font:{size:mobile?10:11}},colorway:[G,O,'#4d9caa','#88539c'],xaxis:{gridcolor:'#edf2e9',zerolinecolor:'#dbe5d7',fixedrange:mobile,automargin:true},yaxis:{gridcolor:'#edf2e9',zerolinecolor:'#dbe5d7',fixedrange:mobile,automargin:true},hovermode:'closest',separators:',.',...extra}}
function plot(id,traces,extra={}){const el=$(id);if(!el||el.offsetParent===null)return;const mobile=window.innerWidth<620;const pieChart=traces.length>0&&traces.every(t=>String(t.type||'').toLowerCase()==='pie');const mobileStatic=mobile&&!pieChart;el.classList.toggle('mobile-static-chart',mobileStatic);const l=layout(extra);l.height=el.clientHeight;Plotly.react(el,traces,l,{responsive:true,displaylogo:false,displayModeBar:mobile?false:'hover',staticPlot:mobileStatic,scrollZoom:false,modeBarButtonsToRemove:['select2d','lasso2d'],toImageButtonOptions:{filename:id,format:'png',scale:2}}).then(height);charts.add(id)}
function legend(id,palette,names=null){const seen=new Set();$(id).innerHTML=Object.entries(palette).filter(([n])=>{let x=n.toLowerCase();if(seen.has(x))return false;seen.add(x);return true}).map(([label,color])=>`<span class="legend-item"><i class="legend-dot" style="background:${color}"></i>${esc(names?.[label]||label)}</span>`).join('')}
function table(id,rows,columns=null){if(!rows.length){$(id).textContent='Sin registros';return}columns=columns||Object.keys(rows[0]).map(k=>[k,k]);$(id).innerHTML='<table><thead><tr>'+columns.map(c=>`<th>${esc(c[1])}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+columns.map(c=>{let v=r[c[0]];return `<td class="${typeof v==='number'?'number':''}">${typeof v==='number'?(c[0]==='p'&&v>0&&v<0.0001?v.toExponential(3).replace('.',','):num(v,Number.isInteger(v)?0:4)):esc(v??'—')}</td>`}).join('')+'</tr>').join('')+'</tbody></table>'}
function download(rows,name){if(!rows.length)return;const keys=Object.keys(rows[0]);const safe=v=>{let s=String(v??'');if(typeof v==='string'&&/^[=+@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};const csv='\ufeff'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(safe).join(';')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=u;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function landscape(){legend('legend-coberturas',D.maps.coverage_colors,D.maps.coverage_names);legend('legend-estado',D.maps.state_colors);const opts={base:'satellite',compare:true,outlines:[{geo:D.zona_estudio,color:'#214832',width:1.8}]};maps.coverage=new ConsultaMapa('map-coberturas',{...opts,label:'Comparación de cobertura 2018 y 2023',sliderId:'slider-coberturas',layers:[D.maps.assets.cobertura_2018,D.maps.assets.cobertura_2023]});maps.ecology=new ConsultaMapa('map-estado',{...opts,label:'Comparación de estado ecológico 2018 y 2023',sliderId:'slider-estado',layers:[D.maps.assets.estado_2018,D.maps.assets.estado_2023]});renderLandscape();table('table-metricas',D.metricas_paisaje,[['ANIO','Año'],['COBERTURA','Cobertura'],['AREA_HA','Área (ha)'],['PLAND','PLAND (%)'],['NP','NP'],['LPI','LPI (%)'],['PAFRAC','PAFRAC'],['CONTAG','CONTAG (%)'],['IBP','IBP'],['ESTADO_ECOLOGICO','Estado']])}
function renderLandscape(){const cover=['Bosque','Herbazal','Cultivos','Sin cobertura','Agua','Vegetación Mixta'];const disp=['Bosque','Herbazal','Cultivos','Sin<br>cobertura','Agua','Vegetación<br>mixta'];plot('chart-ibp',[2018,2023].map((year,i)=>({type:'bar',name:String(year),x:disp,y:cover.map(k=>D.metricas_paisaje.find(r=>r.ANIO===year&&r.COBERTURA.toLowerCase()===k.toLowerCase())?.IBP??null),marker:{color:[G,G2][i]},hovertemplate:'%{x}<br>IBP: %{y:.4f}<extra>'+year+'</extra>'})),{barmode:'group',yaxis:{title:{text:'IBP'},gridcolor:'#edf2e9',range:[0,.6]},xaxis:{tickfont:{size:10},automargin:true}});const t=[...D.matriz_transicion].reverse();const labels=t.map(r=>r.TRANSICION_2018_2023.replace(' a ',' → '));plot('chart-transiciones',[{type:'bar',orientation:'h',x:t.map(r=>r.PORCENTAJE),y:labels,marker:{color:G2},text:t.map(r=>num(r.PORCENTAJE)+' %'),textposition:'outside',cliponaxis:false,customdata:t.map(r=>r.AREA_HA),hovertemplate:'%{y}<br>%{x:.2f}% · %{customdata} ha<extra></extra>'}],{showlegend:false,margin:{l:window.innerWidth<620?148:177,r:50,t:15,b:50},xaxis:{title:{text:'% del área de origen'},range:[0,105],gridcolor:'#edf2e9'},yaxis:{automargin:true,tickfont:{size:10}}})}
function loadTreeOptions(){const env=$('ambiente').value;const trees=D.arboles.filter(r=>env==='Todos'||r.AMBIENTE===env).sort((a,b)=>a.ETIQUETA.localeCompare(b.ETIQUETA,'es',{numeric:true}));$('tree-select').innerHTML=trees.map(r=>`<option value="${esc(r.ETIQUETA)}">${esc(r.ETIQUETA)} · ${esc(r.AMBIENTE)}</option>`).join('');if(!trees.some(r=>r.ETIQUETA===selectedTree))selectedTree=trees[0]?.ETIQUETA;$('tree-select').value=selectedTree}
function trees(){loadTreeOptions();const points=D.arboles.map(r=>({id:r.ETIQUETA,label:r.ETIQUETA,lat:r.LATITUD,lon:r.LONGITUD,color:environmentColors[r.AMBIENTE]}));maps.trees=new ConsultaMapa('map-trees',{label:'Mapa de los árboles y selección individual',base:'satellite',points,fitPoints:points,selectionZoom:19.7,onSelect:id=>selectTree(id),outlines:[{geo:D.poligonos_borde,color:'#58ad4f',width:2,fill:'#4e914718'}]});$('tree-select').onchange=()=>selectTree($('tree-select').value);$('ambiente').onchange=()=>{loadTreeOptions();selectTree(selectedTree)};$('tree-fit').onclick=()=>maps.trees.fit(points);$('download-tree').onclick=()=>download(D.produccion.filter(r=>r.ID_ARBOL===selectedTree),'produccion_'+selectedTree);table('stats-production',D.resultados_clave.filter(r=>['Producción','Producción temporal'].includes(r.bloque)),[['indicador','Análisis'],['detalle','Detalle'],['estadistico','Estadístico'],['p','p']]);initProductionDistribution();selectTree(selectedTree);renderGeneralProduction()}
function selectTree(id){const r=D.arboles.find(r=>r.ETIQUETA===id);if(!r)return;selectedTree=id;if($('ambiente').value!=='Todos'&&$('ambiente').value!==r.AMBIENTE){$('ambiente').value='Todos';loadTreeOptions()}$('tree-select').value=id;maps.trees.select(id,true);const kv=(label,value,unit='')=>`<div class="kv"><small>${label}</small><strong>${value} <span>${unit}</span></strong></div>`;
$('tree-card').innerHTML=`<div class="eyebrow">Individuo seleccionado</div><h3 class="tree-label">${esc(id)}</h3><div class="tree-sub"><span class="tag">${esc(r.AMBIENTE)}</span><span class="tag live-tag">Referencia climática: ${esc(refName(r.REF_CLIMA))}</span></div><div class="kv-grid">${kv('DAP',num(r.DAP_cm,1),'cm')}${kv('Altura total',num(r.ALTURA_m,1),'m')}${kv('Área de copa',num(r.AREA_COPA_m2,1),'m²')}${kv('Distancia al borde',num(r.Dist_Borde_m,2),'m')}${kv('Diámetro medio de copa',num(r.PROM_COPA_m,2),'m')}${kv('Radio aproximado de copa',num(r.RADIO_COPA_m,2),'m')}</div><div class="production-kpis"><div><small>Aceite acumulado</small><strong>${num(r.ACEITE_TOTAL_ml,1)} <span>mL</span></strong></div><div><small>Resina acumulada</small><strong>${num(r.RESINA_TOTAL_ml,1)} <span>mL</span></strong></div></div><p class="stats-note">Acumulado de los nueve muestreos, febrero de 2025 a junio de 2026.</p><details><summary>NDVI histórico y coordenadas</summary><div class="ndvi-stats">${[['Media',r.NDVI_HIST_MEDIA],['Mediana',r.NDVI_HIST_MEDIANA],['Mínimo',r.NDVI_HIST_MIN],['Máximo',r.NDVI_HIST_MAX],['Variabilidad (DE)',r.NDVI_HIST_SD]].map(([a,v])=>`<div><small>${a}</small><b>${num(v,3)}</b></div>`).join('')}</div><p class="stats-note">Coordenadas: ${num(r.LATITUD,6)}, ${num(r.LONGITUD,6)}. Métricas de las fechas históricas disponibles; no se emparejan con cada muestreo de producción.</p></details>`;$('prod-id').textContent=id;renderTreeProduction();height()}
function renderTreeProduction(){
 const rows=D.produccion.filter(r=>r.ID_ARBOL===selectedTree).sort((a,b)=>a.MUESTREO-b.MUESTREO);
 plot('chart-prod',[['ACEITE_ML','Aceite',G],['RESINA_ML','Resina',O]].map(([field,name,color])=>({
  type:'scatter',mode:'lines+markers',name,x:rows.map(r=>r.MUESTREO),y:rows.map(r=>productionValue(r,field)),
  customdata:rows.map(r=>date(r.FECHA)),line:{color,width:2.7},marker:{color,size:7},
  hovertemplate:'%{customdata}<br>'+name+': %{y} mL<extra></extra>'
 })),{xaxis:{title:{text:'Muestreo'},dtick:1,gridcolor:'#edf2e9'},
       yaxis:{title:{text:'Volumen (mL)'},rangemode:'tozero',gridcolor:'#edf2e9'}});
 table('table-prod',rows.map(r=>({...r,FECHA:date(r.FECHA)})),
  [['MUESTREO','Muestreo'],['FECHA','Fecha'],['ACEITE_ML','Aceite (mL)'],['RESINA_ML','Resina (mL)'],['TIPO_PRODUCCION','Resultado']]);
}
function productionValue(row,field){
 const value=row[field];
 if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))return Number(value);
 const kind=String(row.TIPO_PRODUCCION||'').trim();
 if(kind==='Sin producción'||(field==='ACEITE_ML'&&kind==='Resina')||(field==='RESINA_ML'&&kind==='Aceite'))return 0;
 return null;
}
function classifyProduction(row){
 // Se respeta la categoría declarada; un vacío sin categoría sigue siendo desconocido.
 const oil=productionValue(row,'ACEITE_ML'),resin=productionValue(row,'RESINA_ML');
 if(oil===null||resin===null)return 'Sin dato';
 const a=oil>0,r=resin>0;
 return a&&r?'Aceite y resina':a?'Aceite':r?'Resina':'Sin producción';
}
function productionDistribution(muestreo,ambiente){
 const categories=['Aceite','Resina','Aceite y resina','Sin producción','Sin dato'];
 const rows=D.produccion.filter(r=>Number(r.MUESTREO)===Number(muestreo)&&r.AMBIENTE===ambiente);
 const byTree=new Map();
 for(const row of rows){
  if(byTree.has(row.ID_ARBOL))throw new Error('Hay registros duplicados para '+row.ID_ARBOL+' en el muestreo '+muestreo+'. No se duplican individuos en la torta.');
  byTree.set(row.ID_ARBOL,row);
 }
 const n=byTree.size;
 return categories.map(label=>{
  const count=[...byTree.values()].filter(r=>classifyProduction(r)===label).length;
  return {MUESTREO:Number(muestreo),FECHA:rows[0]?.FECHA||'',AMBIENTE:ambiente,TIPO_PRODUCCION:label,N_INDIVIDUOS:count,PORCENTAJE:n?count/n*100:0,N_TOTAL:n};
 }).filter(r=>r.TIPO_PRODUCCION!=='Sin dato'||r.N_INDIVIDUOS>0);
}
function initProductionDistribution(){
 const samples=[...new Set(D.produccion.map(r=>Number(r.MUESTREO)))].sort((a,b)=>a-b);
 $('distribution-sample').innerHTML=samples.map(m=>{
  const row=D.produccion.find(r=>Number(r.MUESTREO)===m);
  return `<option value="${m}">Muestreo ${m} · ${date(row.FECHA)}</option>`;
 }).join('');
 $('distribution-sample').onchange=renderProductionDistribution;
 $('producer-product').onchange=renderProducerVolumes;
 $('download-producers').onclick=()=>download(productionProducers($('distribution-sample').value,$('producer-product').value),'productores_'+$('producer-product').value.toLowerCase()+'_muestreo_'+$('distribution-sample').value);
 $('download-distribution').onclick=()=>download(['Bosque','Potrero'].flatMap(e=>productionDistribution($('distribution-sample').value,e)),'individuos_por_produccion_muestreo_'+$('distribution-sample').value);
 renderProductionDistribution();
}
function renderProductionDistribution(){
 const m=Number($('distribution-sample').value||1);
 const colors={'Aceite':G,'Resina':O,'Aceite y resina':'#8355a3','Sin producción':'#a4ada5','Sin dato':'#dfd9c9'};
 for(const env of ['Bosque','Potrero']){
  const suffix=env.toLowerCase(),rows=productionDistribution(m,env),n=rows[0]?.N_TOTAL||0;
  const visible=rows.filter(r=>r.N_INDIVIDUOS>0);
  $('distribution-n-'+suffix).textContent=n+' individuos';
  plot('chart-dist-'+suffix,[{type:'pie',labels:visible.map(r=>r.TIPO_PRODUCCION),values:visible.map(r=>r.N_INDIVIDUOS),
   customdata:visible.map(r=>r.PORCENTAJE),sort:false,direction:'clockwise',rotation:0,hole:.52,
   marker:{colors:visible.map(r=>colors[r.TIPO_PRODUCCION]),line:{color:'#ffffff',width:2}},
   text:visible.map(r=>`${r.N_INDIVIDUOS}<br>${num(r.PORCENTAJE,1)} %`),textinfo:'text',textposition:'inside',
   textfont:{color:'#fff',size:13},insidetextorientation:'horizontal',
   hovertemplate:env+' · Muestreo '+m+'<br>%{label}<br>%{value} individuos · %{customdata:.1f}%<extra></extra>'
  }],{showlegend:false,margin:{l:10,r:10,t:12,b:12},xaxis:{visible:false},yaxis:{visible:false},
   annotations:[{x:.5,y:.5,xref:'paper',yref:'paper',showarrow:false,text:`<b>${n}</b><br>árboles`,font:{size:19,color:G}}]});
  $('legend-dist-'+suffix).innerHTML=rows.map(r=>`<div class="distribution-line"><span><i class="legend-dot" style="background:${colors[r.TIPO_PRODUCCION]}"></i>${esc(r.TIPO_PRODUCCION)}</span><strong>${r.N_INDIVIDUOS}<small> ${num(r.PORCENTAJE,1)} %</small></strong></div>`).join('');
 }
 renderProducerVolumes();
 height();
}
function productionTotal(muestreo,ambiente,field){
 const values=D.produccion.filter(r=>Number(r.MUESTREO)===Number(muestreo)&&r.AMBIENTE===ambiente).map(r=>productionValue(r,field));
 return values.length&&values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;
}
function productionProducers(muestreo,field){
 const product=field==='ACEITE_ML'?'Aceite':'Resina';
 return D.produccion.filter(r=>Number(r.MUESTREO)===Number(muestreo)&&productionValue(r,field)>0)
  .map(r=>({MUESTREO:Number(r.MUESTREO),FECHA:r.FECHA,ID_ARBOL:r.ID_ARBOL,AMBIENTE:r.AMBIENTE,PRODUCTO:product,VOLUMEN_ML:productionValue(r,field),TIPO_PRODUCCION:classifyProduction(r)}))
  .sort((a,b)=>a.ID_ARBOL.localeCompare(b.ID_ARBOL,'es',{numeric:true}));
}
function renderProducerVolumes(){
 const m=Number($('distribution-sample').value||1),field=$('producer-product').value||'ACEITE_ML';
 const product=field==='ACEITE_ML'?'Aceite':'Resina',rows=productionProducers(m,field);
 const sampleDate=D.produccion.find(r=>Number(r.MUESTREO)===m)?.FECHA;
 $('producer-sample-label').textContent='Muestreo '+m+' · '+date(sampleDate);
 $('producer-volume-summary').textContent=['Bosque','Potrero'].map(env=>{const group=rows.filter(r=>r.AMBIENTE===env);return env+': '+group.length+' '+(group.length===1?'árbol productor':'árboles productores')+' · '+num(group.reduce((sum,r)=>sum+r.VOLUMEN_ML,0),1)+' mL de '+product.toLowerCase()}).join('. ')+'.';
 $('chart-producer-volume').style.height=Math.max(320,rows.length*26+110)+'px';
 plot('chart-producer-volume',['Bosque','Potrero'].map(env=>{
  const group=rows.filter(r=>r.AMBIENTE===env);
  return {type:'bar',orientation:'h',name:env,x:group.map(r=>r.VOLUMEN_ML),y:group.map(r=>r.ID_ARBOL),
   marker:{color:environmentColors[env]},text:group.map(r=>num(r.VOLUMEN_ML,1)+' mL'),textposition:'outside',cliponaxis:false,
   hovertemplate:'%{y}<br>'+env+' · Muestreo '+m+'<br>'+product+': %{x:.1f} mL<extra></extra>'};
 }),{barmode:'stack',margin:{l:105,r:60,t:20,b:75},
  xaxis:{title:{text:product+' (mL)'},gridcolor:'#edf2e9',rangemode:'tozero',range:[0,Math.max(1,...rows.map(r=>r.VOLUMEN_ML))*1.18]},
  yaxis:{type:'category',categoryorder:'array',categoryarray:rows.map(r=>r.ID_ARBOL),autorange:'reversed',automargin:true,tickfont:{size:11}},
  annotations:rows.length?[]:[{xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false,text:'Sin árboles productores de '+product.toLowerCase()+' en este muestreo.',font:{size:12,color:G}}]
 });
 table('table-producers',rows.map(r=>({...r,FECHA:date(r.FECHA)})),[['ID_ARBOL','Árbol'],['AMBIENTE','Ambiente'],['FECHA','Fecha'],['PRODUCTO','Producto'],['VOLUMEN_ML','Volumen (mL)']]);
 height();
}
function renderGeneralProduction(){const samples=[...new Set(D.produccion.map(r=>Number(r.MUESTREO)))].sort((a,b)=>a-b);for(const [key,id,name] of [['ACEITE_ML','chart-avg-aceite','Aceite'],['RESINA_ML','chart-avg-resina','Resina']])plot(id,['Bosque','Potrero'].map(env=>({type:'scatter',mode:'lines+markers',name:env,x:samples,y:samples.map(m=>productionTotal(m,env,key)),line:{color:environmentColors[env],width:2.5},marker:{size:7},hovertemplate:env+'<br>Muestreo %{x}<br>Total de '+name.toLowerCase()+': %{y:.1f} mL<extra></extra>'})),{xaxis:{title:{text:'Muestreo'},dtick:1},yaxis:{title:{text:name+' total (mL)'},gridcolor:'#edf2e9',rangemode:'tozero'}})}
function patterns(){maps.patterns=new ConsultaMapa('map-patterns',{label:'Mapa de patrones emergentes NDVI',base:'none',layers:[D.maps.assets.patrones_ndvi],outlines:[{geo:D.zona_estudio,color:'#28583d',width:1.8}]});legend('legend-patterns',D.maps.pattern_colors,D.maps.pattern_names);renderPatterns();table('table-patterns',D.patrones_resumen.map(r=>({...r,Patron:D.maps.pattern_names[r.PATTERN]||r.PATTERN})),[['Patron','Patrón'],['AREA_HA','Área (ha)'],['PORCENTAJE','Superficie (%)']])}
function renderPatterns(){
 const order=Object.keys(D.maps.pattern_colors);
 const rows=[...D.patrones_resumen].sort((a,b)=>order.indexOf(a.PATTERN)-order.indexOf(b.PATTERN));
 const total=rows.reduce((sum,r)=>sum+Number(r.AREA_HA),0);
 plot('chart-patterns',[{
  type:'pie',labels:rows.map(r=>D.maps.pattern_names[r.PATTERN]||r.PATTERN),values:rows.map(r=>r.AREA_HA),
  customdata:rows.map(r=>Number(r.AREA_HA)/total*100),sort:false,direction:'clockwise',rotation:0,hole:.45,
  marker:{colors:rows.map(r=>D.maps.pattern_colors[r.PATTERN]),line:{color:'#ffffff',width:1.5}},
  text:rows.map(r=>Number(r.AREA_HA)/total>=.025?num(Number(r.AREA_HA)/total*100,2)+' %':''),
  textinfo:'text',textposition:'inside',textfont:{size:14,color:'#152d3d'},insidetextorientation:'horizontal',
  hovertemplate:'%{label}<br>%{value:.2f} ha · %{customdata:.2f}%<extra></extra>'
 }],{showlegend:false,margin:{l:8,r:8,t:12,b:12},xaxis:{visible:false},yaxis:{visible:false},
  annotations:[{xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false,text:'<b>'+num(total,1)+'</b><br>ha analizadas',font:{size:17,color:G}}]});
 $('pattern-pie-legend').innerHTML=rows.map(r=>`<div class="pattern-legend-row"><i class="legend-dot" style="background:${D.maps.pattern_colors[r.PATTERN]}"></i><div>${esc(D.maps.pattern_names[r.PATTERN]||r.PATTERN)}<small>${num(r.AREA_HA,2)} ha</small></div><strong>${num(Number(r.AREA_HA)/total*100,2)} %</strong></div>`).join('');
}
const bromVars={'MS_65C_G100G':'Materia seca a 65 °C (g/100 g)','PROTEINA_CRUDA_G100G':'Proteína cruda (g/100 g)','CENIZA_G100G_MS':'Ceniza (g/100 g MS)','EXTRACTO_ETEREO_G100G_MS':'Extracto etéreo (g/100 g MS)','FDN_G100G_MS':'FDN (g/100 g MS)','FDA_G100G_MS':'FDA (g/100 g MS)','CALCIO_G100G_MS':'Calcio (g/100 g MS)','FOSFORO_G100G_MS':'Fósforo (g/100 g MS)','MAGNESIO_G100G_MS':'Magnesio (g/100 g MS)','POTASIO_G100G_MS':'Potasio (g/100 g MS)','DIGESTIBILIDAD_MS_G100G':'Digestibilidad MS (g/100 g)','ENERGIA_BRUTA_MCAL_KG_MS':'Energía bruta (Mcal/kg MS)','ED_RUMIANTES_MCAL_KG_MS':'Energía digestible (Mcal/kg MS)','SODIO_G100G_MS':'Sodio (g/100 g MS)','NDT_G100G_MS':'Nutrientes digestibles totales (g/100 g MS)'};

function ringContains(point,ring){
 let inside=false;const [x,y]=point;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
 }
 return inside;
}
function containingPolygon(lon,lat){
 const point=[lon,lat];
 for(const feature of D.poligonos_borde.features||[]){
  const g=feature.geometry;if(!g)continue;
  const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
  if(polys.some(poly=>ringContains(point,poly[0])&&!poly.slice(1).some(h=>ringContains(point,h))))return {type:'FeatureCollection',features:[feature]};
 }
 return null;
}

function climate(){const points=D.ambientes_clima.map(r=>({id:refName(r.Dataloger),label:refName(r.Dataloger),kind:'climate',lat:r.Latitud,lon:r.Longitud,color:climateColors[refName(r.Dataloger)],referenceScaleM:refName(r.Dataloger)==='Bosque'?100:20,contextGeo:containingPolygon(r.Longitud,r.Latitud)}));$('climate-select').innerHTML=refs.map(r=>`<option>${r}</option>`).join('');$('climate-select').value=selectedRef;maps.climate=new ConsultaMapa('map-climate',{label:'Mapa de las referencias climáticas',base:'satellite',points,fitPoints:points,contextSelection:true,selectionZoom:18,onSelect:selectRef,outlines:[{geo:D.poligonos_borde,color:'#77ac60',width:1.7,fill:'#6c98400e'}]});$('climate-select').onchange=()=>selectRef($('climate-select').value);$('climate-fit').onclick=()=>maps.climate.fit(points);$('climate-var').onchange=renderMicroclimate;$('brom-var').innerHTML=Object.entries(bromVars).map(([v,label])=>`<option value="${v}">${label}</option>`).join('');$('brom-var').value='PROTEINA_CRUDA_G100G';$('brom-var').onchange=renderQuality;table('table-rain',D.precipitacion,[['ANIO','Año'],['MES','Mes'],['TOTAL_MES_MM','Total mensual (mm)'],['NO_EVENTOS','Eventos'],['OBSERVACION','Observación']]);table('table-quality',D.calidad_forraje);table('table-forage',D.aforos_forraje);selectRef(selectedRef);renderForage();renderQuality()}
function selectRef(ref){selectedRef=ref;$('climate-select').value=ref;$('climate-current').textContent='Seleccionado: '+ref;maps.climate.select(ref,true);$('climate-map-help').textContent='Vista del polígono delimitado y del punto '+ref+'. Barra de escala de referencia: '+(ref==='Bosque'?'100':'20')+' m. No representa un nuevo buffer de muestreo.';renderClimogram();renderMicroclimate();const rows=D.clima_2025.filter(r=>refName(r.REF_CLIMA)===ref).sort((a,b)=>a.MES_NUM-b.MES_NUM);table('table-climate',rows,[['MES','Mes'],['REF_CLIMA','Referencia'],['TEMPERATURA_C','Temperatura (°C)'],['HUMEDAD_PCT','Humedad (%)'],['ITH_CALCULADO','ITH'],['RAFA','RAFA']]);height()}
function rainMonth(s){const m=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];return m.indexOf(String(s).trim().toLowerCase())+1}
function renderClimogram(){const rows=D.clima_2025.filter(r=>refName(r.REF_CLIMA)===selectedRef).sort((a,b)=>a.MES_NUM-b.MES_NUM);const rain=D.precipitacion.filter(r=>r.ANIO===2025&&!String(r.OBSERVACION||'').trim());$('climogram-title').textContent='Climograma · '+selectedRef;const mobile=window.innerWidth<620;plot('chart-climogram',[{type:'bar',name:'Lluvia (mm)',x:[1,2,3,4,5,6,7,8,9,10,11,12],y:[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>rain.find(r=>rainMonth(r.MES)===m)?.TOTAL_MES_MM??null),marker:{color:'#79abb7'},hovertemplate:'Mes %{x}<br>Lluvia: %{y} mm<extra></extra>'},{type:'scatter',mode:'lines+markers',name:'Temperatura (°C)',x:rows.map(r=>r.MES_NUM),y:rows.map(r=>r.TEMPERATURA_C),yaxis:'y2',line:{color:G,width:2.8},marker:{size:6},hovertemplate:selectedRef+'<br>Mes %{x}<br>%{y:.2f} °C<extra></extra>'}],{margin:{l:44,r:44,t:20,b:75},xaxis:{tickmode:'array',tickvals:[1,2,3,4,5,6,7,8,9,10,11,12],ticktext:months,tickangle:mobile?-45:0,tickfont:{size:10},range:[.4,12.6]},yaxis:{title:{text:'mm'},gridcolor:'#edf2e9',rangemode:'tozero'},yaxis2:{title:{text:'°C'},overlaying:'y',side:'right',showgrid:false,range:[20,34]},legend:{orientation:'h',x:0,y:-.25,font:{size:10}}})}
function renderMicroclimate(){const key=$('climate-var').value;const titles={'TEMPERATURA_C':'Temperatura (°C)','HUMEDAD_PCT':'Humedad (%)','ITH_CALCULADO':'ITH calculado','RAFA':'RAFA'};plot('chart-climate',refs.map(ref=>{const rows=D.clima_2025.filter(r=>refName(r.REF_CLIMA)===ref).sort((a,b)=>a.MES_NUM-b.MES_NUM);return {type:'scatter',mode:'lines+markers',name:ref+(ref===selectedRef?' · seleccionado':''),x:rows.map(r=>r.MES_NUM),y:rows.map(r=>r[key]),line:{color:ref===selectedRef?CYAN:climateColors[ref],width:ref===selectedRef?3.5:1.5},marker:{size:ref===selectedRef?8:5,line:{color:ref===selectedRef?'#00516b':'white',width:1}},opacity:ref===selectedRef?1:.55,hovertemplate:ref+'<br>Mes %{x}<br>%{y:.2f}<extra></extra>'}}),{xaxis:{tickmode:'array',tickvals:[1,2,3,4,5,6,7,8,9,10,11,12],ticktext:months,tickangle:window.innerWidth<620?-45:0},yaxis:{title:{text:titles[key]},gridcolor:'#edf2e9'},legend:{orientation:'h',y:-.25,x:0,font:{size:10}}})}
function renderForage(){const periods=[...new Set(D.aforos_forraje.map(r=>r.PERIODO))].sort();plot('chart-forage',['abierto','arbol'].map((t,i)=>{const rows=D.aforos_forraje.filter(r=>r.TRATAMIENTO===t).sort((a,b)=>a.PERIODO.localeCompare(b.PERIODO));return {type:'scatter',mode:'lines+markers',name:i?'Bajo árbol':'Abierto',x:rows.map(r=>r.PERIODO),y:rows.map(r=>r.MEDIA_G_M2),line:{color:i?G:O,width:2.5},marker:{size:7},hovertemplate:'%{x|%m/%Y}<br>%{y:.1f} g/m²<extra></extra>'}}),{xaxis:{type:'date',tickmode:'array',tickvals:periods,ticktext:periods.map(p=>months[Number(p.slice(5,7))-1]+' '+p.slice(0,4)),tickangle:window.innerWidth<620?-45:0,title:{text:'Mes y año observados'}},yaxis:{title:{text:'Aforo (g/m²)'},gridcolor:'#edf2e9',rangemode:'tozero'}})}
function renderQuality(){const key=$('brom-var').value;const unit=bromVars[key].match(/\((.*?)\)/)?.[1]||'';plot('chart-quality',[{type:'bar',x:['Copaiba','Humidicola<br>sombra','Humidicola<br>pleno sol'],y:D.calidad_forraje.map(r=>r[key]),marker:{color:[G,'#71965d','#cca052']},text:D.calidad_forraje.map(r=>num(r[key],2)),textposition:'outside',cliponaxis:false,hovertemplate:'%{x}<br>%{y:.2f} '+unit+'<extra></extra>'}],{showlegend:false,margin:{l:48,r:18,t:22,b:65},yaxis:{title:{text:unit},gridcolor:'#edf2e9',rangemode:'tozero'},xaxis:{tickfont:{size:11}}})}
function tab(name){activeTab=name;document.querySelectorAll('[role=tabpanel]').forEach(el=>el.hidden=el.id!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===name?'true':'false'));if(!init.has(name)){({paisaje:landscape,arboles:trees,ndvi:patterns,clima:climate}[name])();init.add(name)}requestAnimationFrame(()=>{for(const m of Object.values(maps))m.resize();for(const id of charts)if($(id).offsetParent!==null)Plotly.Plots.resize($(id));height()})}
function boot(){if(!D||!window.Plotly)throw new Error('No se cargaron datos.js o vendor/plotly.min.js. Sube la carpeta visor_web completa.');$('kpis').innerHTML=[[D.arboles.length,'Árboles<br>monitoreados'],[new Set(D.produccion.map(r=>r.MUESTREO)).size,'Muestreos<br>productivos'],[new Set(D.ndvi_copa_tiempo.map(r=>r.FECHA)).size,'Fechas históricas<br>de NDVI'],[D.ambientes_clima.length,'Referencias<br>climáticas']].map(([n,t])=>`<div class="kpi"><strong>${n}</strong><span>${t}</span></div>`).join('');document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));document.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>download(D[b.dataset.download],b.dataset.download));document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',height));tab('paisaje');window.visor={maps,setTab:tab,setTree:selectTree,setClimate:selectRef,data:D,get selectedTree(){return selectedTree},get selectedRef(){return selectedRef},productionDistribution,productionTotal,productionProducers};new ResizeObserver(height).observe($('app'));let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{({paisaje:renderLandscape,arboles:()=>{renderTreeProduction();renderGeneralProduction();renderProductionDistribution()},ndvi:renderPatterns,clima:()=>{renderClimogram();renderMicroclimate();renderForage();renderQuality()}}[activeTab])();height()},180)});send('streamlit:componentReady',{apiVersion:1});height()}
try{boot()}catch(e){$('app').insertAdjacentHTML('afterbegin',`<div class="error-box"><b>No pudo iniciarse el visor.</b><br>${esc(e.message)}</div>`);console.error(e);send('streamlit:componentReady',{apiVersion:1});height()}
})();
