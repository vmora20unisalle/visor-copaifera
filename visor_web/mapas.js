/* Mapas de consulta: Web Mercator, capas temáticas locales y base opcional.
   No utiliza Mapbox, Carto, servicios privados ni claves de API.
   El swipe recorta DOS DIBUJOS independientes, no un contenedor SVG compartido. */
'use strict';
(function(){
const EARTH=40075016.68557849, LIMIT=85.05112878;
// El fondo se amplía visualmente, sin solicitar teselas fuera de su detalle disponible.
const BASE_NATIVE_ZOOM={satellite:18,osm:19};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const project=(lat,lon)=>{let p=Math.max(-LIMIT,Math.min(LIMIT,+lat))*Math.PI/180;return [(+lon+180)/360,(1-Math.log(Math.tan(p)+1/Math.cos(p))/Math.PI)/2]};
const unproject=([x,y])=>[Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI,x*360-180];
const imageCache=new Map();
function image(src){if(!imageCache.has(src)){const im=new Image();const item={im,ready:false,failed:false,pixels:null};item.promise=new Promise(resolve=>{im.onload=()=>{item.ready=true;resolve(item)};im.onerror=()=>{item.failed=true;resolve(item)}});im.src=src;imageCache.set(src,item)}return imageCache.get(src)}
function getRasterValue(asset,world){const b=VISOR_DATA.maps.bounds_mercator,item=image(asset.src);if(!item.ready)return null;const x=(world[0]*EARTH-EARTH/2-b[0])/(b[2]-b[0]),y=(b[3]-(EARTH/2-world[1]*EARTH))/(b[3]-b[1]);if(x<0||x>=1||y<0||y>=1)return null;if(!item.pixels){const c=document.createElement('canvas');c.width=item.im.width;c.height=item.im.height;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(item.im,0,0);item.pixels=cx}let a;try{a=item.pixels.getImageData(Math.floor(x*item.im.width),Math.floor(y*item.im.height),1,1).data}catch(e){return null}if(a[3]===0)return null;const hex='#'+[...a.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join('');return Object.keys(asset.colors).find(k=>asset.colors[k].toLowerCase()===hex)||null}
function outlineFeatures(geo){const result=[];for(const f of geo.features||[]){const g=f.geometry;if(!g)continue;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];for(const poly of polys)result.push(poly.map(ring=>ring.map(([lng,lat])=>project(lat,lng))))}return result}
class ConsultaMapa{
constructor(id,opts={}){this.el=document.getElementById(id);this.opts=opts;this.center=project(5.12,-72.05);this.zoom=12;this.layers=opts.layers||[];this.split=.5;this.points=opts.points||[];this.selected=null;this.base=opts.base||'none';this.defaultBase=this.base;this.tiles=new Map();this.failures=0;this.baseBroken=false;this.referenceScaleM=null;this.contextPaths=[];this.keepContextFit=false;this.drag=new Map();this.dpr=1;this.needsFit=true;this.outlines=(opts.outlines||[]).map(x=>({paths:outlineFeatures(x.geo),color:x.color||'#285f3c',width:x.width||1.5,fill:x.fill||null}));
this.el.innerHTML=`<canvas class="map-canvas" tabindex="0" role="img" aria-label="${esc(opts.label||'Mapa interactivo')}"></canvas><div class="map-tools"><button title="Acercar" aria-label="Acercar">+</button><button title="Alejar" aria-label="Alejar">−</button><button title="${opts.points?'Centrar selección':'Ver zona completa'}" aria-label="Centrar mapa">⌖</button></div><select class="map-basemap" aria-label="Mapa base"><option value="satellite">Satélite · Esri</option><option value="osm">Calles · OSM</option><option value="none">Sin mapa base</option></select><div class="map-tooltip" hidden></div><div class="map-status" hidden></div><div class="attribution"></div>`;
this.canvas=this.el.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.tip=this.el.querySelector('.map-tooltip');this.status=this.el.querySelector('.map-status');this.attr=this.el.querySelector('.attribution');this.baseSelect=this.el.querySelector('select');this.baseSelect.value=this.base;this.baseSelect.onchange=()=>{this.base=this.baseSelect.value;this.baseBroken=false;this.failures=0;this.tiles.clear();this.drawSoon()};
const btns=this.el.querySelectorAll('.map-tools button');btns[0].onclick=()=>this.zoomAt(1);btns[1].onclick=()=>this.zoomAt(-1);btns[2].onclick=()=>{if(this.selected)this.select(this.selected,true);else this.fit()};
if(opts.compare){this.el.classList.add('compare');this.el.insertAdjacentHTML('beforeend','<div class="map-years"><div class="map-year"><span>Izquierda</span>2018</div><div class="map-year"><span>Derecha</span>2023</div></div><div class="swipe-divider"></div><button class="swipe-handle" aria-label="Arrastrar comparación entre 2018 y 2023" title="Arrastra para comparar">↔</button>');this.handle=this.el.querySelector('.swipe-handle');this.divider=this.el.querySelector('.swipe-divider');const foot=document.getElementById(opts.sliderId);foot.innerHTML='<span>Solo 2023</span><input type="range" min="0" max="100" value="50" aria-label="Proporción de 2018 en el comparador"><span>Solo 2018</span>';this.range=foot.querySelector('input');this.range.oninput=()=>this.setSplit(+this.range.value/100);this.handle.onpointerdown=e=>{this.handle.setPointerCapture(e.pointerId);e.stopPropagation();this.swipeActive=true};this.handle.onpointermove=e=>{if(this.swipeActive)this.setSplit((e.clientX-this.el.getBoundingClientRect().left)/this.el.clientWidth)};this.handle.onpointerup=()=>this.swipeActive=false;this.handle.onpointercancel=()=>this.swipeActive=false;this.handle.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.setSplit(this.split+(e.key==='ArrowRight'?.05:-.05))}}}
this.bind();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.el);this.resize();for(const l of this.layers)image(l.src).promise.then(()=>this.drawSoon());
}
resize(){
 const w=this.el.clientWidth,h=this.el.clientHeight;if(!w||!h)return;
 const changed=this.w!==w||this.h!==h;
 this.w=w;this.h=h;this.dpr=Math.min(window.devicePixelRatio||1,2);
 this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);
 if(this.needsFit){this.fit();this.needsFit=false}
 else if(changed&&this.keepContextFit&&this.selected)this.select(this.selected,true);
 this.drawSoon();
}
fit(points=null){this.keepContextFit=false;this.referenceScaleM=null;const p=points||this.opts.fitPoints;if(p&&p.length){const arr=p.map(x=>project(x.lat,x.lon));this.fitWorld([Math.min(...arr.map(x=>x[0])),Math.min(...arr.map(x=>x[1]))],[Math.max(...arr.map(x=>x[0])),Math.max(...arr.map(x=>x[1]))],55,17)}else{const b=VISOR_DATA.metadata.zona_bounds;this.fitWorld(project(b[1][0],b[0][1]),project(b[0][0],b[1][1]),35,16)}this.tip.hidden=true;this.drawSoon()}
fitWorld(a,b,pad=30,maxZoom=20){this.center=[(a[0]+b[0])/2,(a[1]+b[1])/2];const zx=Math.log2(Math.max(40,(this.w||600)-2*pad)/(256*Math.max(1e-7,b[0]-a[0]))),zy=Math.log2(Math.max(40,(this.h||400)-2*pad)/(256*Math.max(1e-7,b[1]-a[1])));this.zoom=Math.max(4,Math.min(maxZoom,zx,zy))}
select(id,zoom=true){
 this.selected=id;const p=this.points.find(x=>x.id===id);if(!p)return;
 this.referenceScaleM=null;this.contextPaths=[];this.keepContextFit=false;
 if(zoom&&this.opts.contextSelection){
  const scale=p.referenceScaleM||20,center=project(p.lat,p.lon);
  // Encuadre mínimo de contexto. No crea ni representa nuevos polígonos de muestreo.
  const minHalf=3*scale/(EARTH*Math.cos(Number(p.lat)*Math.PI/180));
  let xs=[center[0]-minHalf,center[0]+minHalf],ys=[center[1]-minHalf,center[1]+minHalf];
  this.contextPaths=p.contextGeo?outlineFeatures(p.contextGeo):[];
  for(const poly of this.contextPaths)for(const ring of poly)for(const q of ring){xs.push(q[0]);ys.push(q[1])}
  const pad=Math.min(58,Math.max(38,(this.w||400)*.10));
  this.fitWorld([Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)],pad,19.5);
  this.referenceScaleM=scale;this.keepContextFit=true;
 }else{
  this.center=project(p.lat,p.lon);
  if(zoom)this.zoom=this.opts.selectionZoom||19.6;
 }
 this.tip.hidden=true;this.needsFit=false;this.drawSoon();
}
setSplit(v){this.split=Math.max(0,Math.min(1,v));if(this.handle){this.handle.style.left=(this.split*100)+'%';this.divider.style.left=(this.split*100)+'%';this.range.value=String(Math.round(this.split*100))}this.drawSoon()}
worldAt(x,y){const s=256*2**this.zoom;return [this.center[0]+(x-this.w/2)/s,this.center[1]+(y-this.h/2)/s]}
screen(p){const s=256*2**this.zoom;return [(p[0]-this.center[0])*s+this.w/2,(p[1]-this.center[1])*s+this.h/2]}
zoomAt(d,x=this.w/2,y=this.h/2){this.keepContextFit=false;this.referenceScaleM=null;const anchor=this.worldAt(x,y);this.zoom=Math.max(6,Math.min(21,this.zoom+d));const s=256*2**this.zoom;this.center=[anchor[0]-(x-this.w/2)/s,anchor[1]-(y-this.h/2)/s];this.tip.hidden=true;this.drawSoon()}
bind(){const pos=e=>{let r=this.canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
this.canvas.onpointerdown=e=>{if(e.button!==0&&e.pointerType==='mouse')return;this.canvas.setPointerCapture(e.pointerId);this.drag.set(e.pointerId,pos(e));this.dragStart=pos(e);this.moved=false;this.tip.hidden=true;if(this.drag.size===2){const p=[...this.drag.values()];this.pinchDist=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])}};
this.canvas.onpointermove=e=>{if(!this.drag.has(e.pointerId))return;const p=pos(e),last=this.drag.get(e.pointerId);if(Math.hypot(p[0]-this.dragStart[0],p[1]-this.dragStart[1])>5)this.moved=true;this.drag.set(e.pointerId,p);if(this.drag.size===2){const ps=[...this.drag.values()],dist=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);if(this.pinchDist>0&&dist>0)this.zoomAt(Math.log2(dist/this.pinchDist),(ps[0][0]+ps[1][0])/2,(ps[0][1]+ps[1][1])/2);this.pinchDist=dist;this.moved=true}else{const s=256*2**this.zoom;this.center[0]-=(p[0]-last[0])/s;this.center[1]-=(p[1]-last[1])/s;this.drawSoon()}};
this.canvas.onpointerup=e=>{let p=pos(e);this.drag.delete(e.pointerId);if(!this.moved&&this.drag.size===0)this.click(p[0],p[1]);this.pinchDist=0};this.canvas.onpointercancel=e=>{this.drag.delete(e.pointerId);this.moved=true};
this.canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const p=pos(e);this.zoomAt(e.deltaY<0?.5:-.5,...p)},{passive:false});this.canvas.ondblclick=e=>{e.preventDefault();this.zoomAt(1,...pos(e))};this.canvas.onkeydown=e=>{const s=256*2**this.zoom;if(e.key==='+'||e.key==='=')this.zoomAt(1);else if(e.key==='-')this.zoomAt(-1);else if(e.key==='ArrowLeft')this.center[0]-=70/s;else if(e.key==='ArrowRight')this.center[0]+=70/s;else if(e.key==='ArrowUp')this.center[1]-=70/s;else if(e.key==='ArrowDown')this.center[1]+=70/s;else return;e.preventDefault();this.drawSoon()};}
click(x,y){if(this.points.length){const hits=this.points.filter(p=>{const q=this.screen(project(p.lat,p.lon));return Math.hypot(q[0]-x,q[1]-y)<18});if(hits.length===1){this.opts.onSelect?.(hits[0].id);return}if(hits.length>1){this.showTip(x,y,'<b>Selecciona un punto</b>'+hits.map(p=>`<button data-id="${esc(p.id)}">${esc(p.label||p.id)}</button>`).join(''));this.tip.querySelectorAll('button').forEach(b=>b.onclick=()=>{this.opts.onSelect?.(b.dataset.id);this.tip.hidden=true});return}}
if(this.layers.length){const index=this.opts.compare?(x<this.w*this.split?0:1):0,asset=this.layers[index];const world=this.worldAt(x,y),val=getRasterValue(asset,world);if(!val){this.tip.hidden=true;return}let text;if(this.opts.compare){const year=index===0?2018:2023;const coverageAsset=VISOR_DATA.maps.assets['cobertura_'+year],cov=getRasterValue(coverageAsset,world);const m=VISOR_DATA.metricas_paisaje.find(r=>r.ANIO===year&&String(r.COBERTURA).toLowerCase()===String(cov).toLowerCase());text=`<b>${year} · ${esc(cov||val)}</b><br>Estado ecológico: ${esc(m?.ESTADO_ECOLOGICO||val)}<br>IBP de la cobertura: ${m?.IBP??'—'}`;}else{text=`<b>${esc(asset.labels[val]||val)}</b><br>Patrón emergente del NDVI`;}this.showTip(x,y,text)}else this.tip.hidden=true}
showTip(x,y,html){this.tip.innerHTML=html;this.tip.hidden=false;this.tip.style.left=Math.max(8,Math.min(x+10,this.w-285))+'px';this.tip.style.top=Math.max(60,Math.min(y+8,this.h-this.tip.offsetHeight-26))+'px'}
drawSoon(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw()})}
getNativeTileZoom(){return Math.min(BASE_NATIVE_ZOOM[this.base]||18,Math.floor(this.zoom))}
requestTile(base,z,x,y){
 const n=2**z; x=((x%n)+n)%n;
 const key=`${base}/${z}/${x}/${y}`;
 if(this.tiles.has(key))return this.tiles.get(key);
 const t={im:new Image(),ready:false,failed:false,z,x,y,base};this.tiles.set(key,t);
 t.im.onload=()=>{t.ready=true;this.drawSoon()};
 t.im.onerror=()=>{t.failed=true;this.failures++;this.drawSoon()};
 t.im.src=base==='satellite'
  ?`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  :`https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
 return t;
}
drawBaseTile(ctx,z,x,y,size){
 const target=this.requestTile(this.base,z,x,y),n=2**z,q=this.screen([x/n,y/n]);
 if(target.ready){ctx.drawImage(target.im,q[0],q[1],size+.5,size+.5);return true}
 // Un nivel previo durante la carga; hasta tres si el proveedor falla.
 const maxDepth=target.failed?3:1;
 for(let depth=1;depth<=maxDepth&&z-depth>=0;depth++){
  const factor=2**depth,parent=this.requestTile(this.base,z-depth,Math.floor(x/factor),Math.floor(y/factor));
  if(!parent.ready)continue;
  const sx=((x%factor)+factor)%factor/factor*parent.im.width;
  const sy=((y%factor)+factor)%factor/factor*parent.im.height;
  ctx.drawImage(parent.im,sx,sy,parent.im.width/factor,parent.im.height/factor,q[0],q[1],size+.5,size+.5);
  return true;
 }
 return false;
}
drawBase(ctx){
 ctx.fillStyle='#eaf0e6';ctx.fillRect(0,0,this.w,this.h);
 if(this.base==='none'){
  this.attr.innerHTML='Capas temáticas: datos del proyecto · Web Mercator';this.status.hidden=true;return;
 }
 const z=this.getNativeTileZoom(),n=2**z,size=256*2**(this.zoom-z);
 const start=this.worldAt(0,0),end=this.worldAt(this.w,this.h);
 const minX=Math.floor(start[0]*n),maxX=Math.floor(end[0]*n),minY=Math.floor(start[1]*n),maxY=Math.floor(end[1]*n);
 ctx.imageSmoothingEnabled=true;
 let drawn=0,requested=0;
 for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
  if(y<0||y>=n)continue;
  requested++;if(this.drawBaseTile(ctx,z,x,y,size))drawn++;
 }
 this.lastNativeZoom=z;this.baseTilesDrawn=drawn;
 this.status.hidden=!(requested>0&&drawn===0&&this.failures>3);
 if(!this.status.hidden)this.status.textContent='El proveedor del fondo no responde. Los polígonos, puntos y datos siguen disponibles.';
 this.attr.innerHTML=this.base==='satellite'
  ?'Imágenes © Esri, Maxar, Earthstar Geographics y comunidad GIS'
  :'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';
 if(this.tiles.size>500)for(const k of [...this.tiles.keys()].slice(0,150))this.tiles.delete(k);
}
drawLayer(ctx,asset){const item=image(asset.src);if(item.failed){this.status.hidden=false;this.status.textContent='Falta '+asset.src+'; vuelve a subir la carpeta visor_web completa.';return}if(!item.ready){item.promise.then(()=>this.drawSoon());return}const b=VISOR_DATA.maps.bounds_mercator,a=this.screen([(b[0]+EARTH/2)/EARTH,(EARTH/2-b[3])/EARTH]),c=this.screen([(b[2]+EARTH/2)/EARTH,(EARTH/2-b[1])/EARTH]);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;ctx.drawImage(item.im,a[0],a[1],c[0]-a[0],c[1]-a[1]);ctx.globalAlpha=1}
draw(){if(!this.w||this.el.offsetParent===null)return;const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.drawBase(ctx);if(this.opts.compare){ctx.save();ctx.beginPath();ctx.rect(0,0,this.w*this.split,this.h);ctx.clip();this.drawLayer(ctx,this.layers[0]);ctx.restore();ctx.save();ctx.beginPath();ctx.rect(this.w*this.split,0,this.w*(1-this.split),this.h);ctx.clip();this.drawLayer(ctx,this.layers[1]);ctx.restore()}else for(const l of this.layers)this.drawLayer(ctx,l);
for(const group of this.outlines){ctx.strokeStyle=group.color;ctx.lineWidth=group.width;for(const poly of group.paths){ctx.beginPath();for(const ring of poly){ring.forEach((p,i)=>{const q=this.screen(p);if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q)});ctx.closePath()}if(group.fill){ctx.fillStyle=group.fill;ctx.fill('evenodd')}ctx.stroke()}}

// Resaltar únicamente el polígono original que contiene el punto climático.
if(this.contextPaths.length){
 ctx.save();
 for(const poly of this.contextPaths){
  ctx.beginPath();for(const ring of poly){ring.forEach((p,i)=>{const q=this.screen(p);if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q)});ctx.closePath()}
  ctx.fillStyle='rgba(0,200,230,.05)';ctx.fill('evenodd');
  ctx.strokeStyle='#ffffff';ctx.lineWidth=4.5;ctx.stroke();
  ctx.strokeStyle='#009fb9';ctx.lineWidth=2.5;ctx.stroke();
 }
 ctx.restore();
}
for(const p of this.points.filter(p=>p.id!==this.selected))this.drawPoint(p,false);const sel=this.points.find(p=>p.id===this.selected);if(sel)this.drawPoint(sel,true);this.drawScale();}
drawPoint(p,selected){const q=this.screen(project(p.lat,p.lon));if(q[0]<-100||q[0]>this.w+100||q[1]<-80||q[1]>this.h+80)return;const c=this.ctx;c.save();c.translate(...q);const radius=selected?11:5.5;if(selected){c.beginPath();c.arc(0,0,21,0,Math.PI*2);c.fillStyle='rgba(0,215,255,.20)';c.fill();c.strokeStyle='#ffffff';c.lineWidth=5;c.beginPath();c.arc(0,0,15,0,Math.PI*2);c.stroke();c.strokeStyle='#003C53';c.lineWidth=2;c.stroke();c.strokeStyle='#00d7ff';c.lineWidth=3;c.beginPath();c.arc(0,0,19,0,Math.PI*2);c.stroke()}c.beginPath();if(p.kind==='climate'){c.moveTo(0,-radius);c.lineTo(radius,0);c.lineTo(0,radius);c.lineTo(-radius,0);c.closePath()}else c.arc(0,0,radius,0,Math.PI*2);c.fillStyle=selected?'#00d7ff':p.color||'#31734c';c.fill();c.strokeStyle=selected?'#003c53':'#fff';c.lineWidth=selected?2.5:1.7;c.stroke();c.restore();if(selected){const label=p.label||p.id;c.font='bold 12px Arial';const w=c.measureText(label).width+20;const x=Math.max(5,Math.min(q[0]+25,this.w-w-7)),y=Math.max(55,Math.min(q[1]-15,this.h-45));c.fillStyle='#003e50';c.beginPath();c.roundRect(x,y,w,30,7);c.fill();c.fillStyle='white';c.fillText(label,x+10,y+19)}}
drawScale(){
 const c=this.ctx,lat=unproject(this.center)[0];
 const mpp=EARTH*Math.cos(lat*Math.PI/180)/(256*2**this.zoom);
 const rough=mpp*80,power=10**Math.floor(Math.log10(rough));
 let nice=[1,2,5,10].map(x=>x*power).filter(x=>x<=rough).pop()||power;
 if(this.referenceScaleM&&this.referenceScaleM/mpp>=14&&this.referenceScaleM/mpp<this.w*.5)nice=this.referenceScaleM;
 const px=nice/mpp;this.lastScaleM=nice;
 c.fillStyle='#fffffff0';c.fillRect(9,this.h-42,Math.max(px+12,67),31);
 c.strokeStyle='#2b4335';c.lineWidth=2;c.beginPath();c.moveTo(15,this.h-24);c.lineTo(15,this.h-18);c.lineTo(15+px,this.h-18);c.lineTo(15+px,this.h-24);c.stroke();
 c.font='11px Arial';c.fillStyle='#2b4335';c.fillText(nice>=1000?(nice/1000)+' km':nice+' m',15,this.h-27);
}
}
window.ConsultaMapa=ConsultaMapa;
})();
