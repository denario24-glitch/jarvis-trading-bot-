const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE="tradingJarvisPrototypeV1";
const seed={balance:10000,closed:[],open:[],journal:[],bots:[],activity:[{title:"JARVIS workspace initialized",detail:"Demo environment ready",icon:"✦"}]};
let state;
try{state=JSON.parse(localStorage.getItem(STORE))||seed}catch{state=structuredClone(seed)}
const assets=[
 {name:"Volatility 100 (1s)",symbol:"V100",price:10432.62,change:"+0.84%",icon:"V",kind:"Volatility"},
 {name:"EUR/USD",symbol:"EURUSD",price:1.08462,change:"+0.12%",icon:"€",kind:"Forex"},
 {name:"XAU/USD (Gold)",symbol:"XAUUSD",price:2736.42,change:"−0.31%",icon:"Au",kind:"Metal"}
];
// Deriv public market-data state. No account token or order endpoint is used.
let derivSocket=null, derivCandles=[], derivLivePrice=null, derivConnected=false, derivSymbolVerified=false, derivLastEpoch=null;
const DERIV_SYMBOL="1HZ100V"; // Volatility 100 Index (1s); verified against active_symbols when connected.
const DERIV_WS_URL="wss://ws.derivws.com/websockets/v3?app_id=1089"; // Deriv docs use 1089 as a testing app ID; register your own before public release.
function save(){localStorage.setItem(STORE,JSON.stringify(state));renderAll()}
function money(n){return (n<0?"−":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function toast(s){const t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function nav(page){$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageTitle").textContent=({overview:"Overview",scanner:"AI Scanner",bots:"Paper Bots",journal:"Trade Journal",analytics:"Analytics",risk:"Risk Manager"})[page];$(".sidebar").classList.remove("open");if(page==="scanner")renderScanner();if(page==="analytics")renderAnalytics()}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)nav(b.dataset.page)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-goto]");if(b)nav(b.dataset.goto)});
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$("#resetBtn").onclick=()=>{if(confirm("Reset all local demo trades, bots, journal entries and balance?")){state=structuredClone(seed);save();toast("Demo workspace reset")}};
function renderMarkets(){$("#marketCards").innerHTML=assets.map((a,i)=>`<article class="market-card"><div class="market-top"><div style="display:flex;gap:10px;align-items:center"><div class="asset-icon">${a.icon}</div><div><div class="market-name">${a.name}</div><div class="market-symbol">${a.symbol}</div></div></div><span class="fake-label">SIMULATED</span></div><div class="price">${a.price.toLocaleString("en-US",{maximumFractionDigits:5})}</div><div class="change">${a.change} <span style="color:var(--muted)">illustrative</span></div></article>`).join("")}
function metrics(){let c=state.closed,w=c.filter(t=>t.pnl>0).length;$("#balanceMetric").textContent=money(state.balance);$("#openMetric").textContent=state.open.length;$("#closedMetric").textContent=c.length;$("#winMetric").textContent=c.length?Math.round(w/c.length*100)+"%":"—";$("#pnlMetric").textContent=money(c.reduce((s,t)=>s+t.pnl,0));$("#analyticsWin").textContent=c.length?Math.round(w/c.length*100)+"%":"—";const gw=c.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0),gl=Math.abs(c.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0));$("#pfMetric").textContent=gl? (gw/gl).toFixed(2):gw?"∞":"—";$("#entryMetric").textContent=state.journal.length}
function renderActivity(){let arr=state.activity.slice(-5).reverse();$("#recentActivity").innerHTML=arr.length?arr.map(a=>`<div class="activity-item"><div class="activity-icon">${a.icon||"•"}</div><div><b>${escapeHtml(a.title)}</b><small>${escapeHtml(a.detail)}</small></div></div>`).join(""):`<div class="empty">No activity yet. Scan a market to begin.</div>`}
function scannerData(){
 const base=assets.map((a,i)=>{let score=[74,63,81][i];let direction=["BUY","WAIT","SELL"][i];let reasons=[["Structure break","Pullback zone","Risk defined"],["Mixed structure","No clear displacement","Wait for confirmation"],["Liquidity sweep","Bearish displacement","Retest zone"]][i];return {...a,score,direction,reasons,entry:a.price,stop:a.price*(i===2?1.006:.994),target:a.price*(i===2?.988:1.012),realData:false}});
 if(derivLivePrice!==null){base[0].price=derivLivePrice;base[0].entry=derivLivePrice}
 if(derivCandles.length>=3){
  const c=derivCandles.slice(-20),last=c[c.length-1],upCount=c.slice(-5).filter(x=>x.close>x.open).length,downCount=c.slice(-5).filter(x=>x.close<x.open).length;
  const range=Math.max(...c.slice(-5).map(x=>x.high))-Math.min(...c.slice(-5).map(x=>x.low));
  const move=last.close-c[Math.max(0,c.length-4)].close;
  const direction=(last.close>last.open&&move>0&&upCount>=3)?"BUY":(last.close<last.open&&move<0&&downCount>=3)?"SELL":"WAIT";
  const body=Math.abs(last.close-last.open),bodyRatio=range>0?body/range:0,score=Math.min(95,Math.max(50,50+Math.round(Math.abs(move)/(range||1)*25)+Math.round(bodyRatio*20)));
  const a=base[0],distance=Math.max(body,Math.abs(move)*.5,range*.2);
  a.direction=direction;a.score=score;a.realData=true;a.reasons=[direction==="WAIT"?"Mixed 5m candle direction":direction+" 5m momentum",`Last 5 candles: ${upCount} bullish / ${downCount} bearish`,"Transparent rule score from recent 5m candles"];
  a.entry=last.close;a.stop=direction==="SELL"?last.close+distance:last.close-distance;a.target=direction==="SELL"?last.close-distance*2:last.close+distance*2;
 }
 return base;
}
function renderScanner(){let market=$("#scanMarket")?.value||"all",min=Number($("#minScore")?.value||50);let data=scannerData().filter(a=>(market==="all"||a.name===market)&&a.score>=min);$("#scanResults").innerHTML=data.length?data.map(a=>`<article class="scan-card ${a.realData?"real-signal":""}"><div class="scan-asset"><b>${a.name}</b><small>${a.realData?"5m · DERIV CANDLE RULES":"SIMULATED EXAMPLE · NOT LIVE"}</small></div><div class="score">${a.score}</div><div><div class="signal ${a.direction==="SELL"?"sell":""}">${a.direction}</div><small style="display:block;color:var(--muted);font-size:9px;margin-top:5px">${a.realData?"Live-feed rule output":"Illustrative only"}</small></div><div class="scan-metric"><small>Illustrative entry</small><b>${a.entry.toFixed(a.price<10?5:2)}</b></div><div class="scan-actions"><button class="mini-btn buy" data-paper="${a.name}" data-dir="${a.direction==="WAIT"?"BUY":a.direction}">Paper trade</button><button class="mini-btn" data-detail="${a.name}">Why?</button></div></article>`).join(""):`<div class="panel empty">No illustrative setups meet this filter. Try a lower minimum score or scan all markets.</div>`}
$("#scanBtn").onclick=()=>{renderScanner();toast("Illustrative rules scanned")};["scanMarket","scanTf","minScore"].forEach(id=>$("#"+id).addEventListener("change",renderScanner));
$("#scanResults").addEventListener("click",e=>{let b=e.target.closest("button");if(!b)return;if(b.dataset.paper){const a=assets.find(x=>x.name===b.dataset.paper);openPaper(a,b.dataset.dir,"Scanner signal")}if(b.dataset.detail){let a=scannerData().find(x=>x.name===b.dataset.detail);alert(`${a.name} — illustrative score ${a.score}/100\n\nChecklist:\n• ${a.reasons.join("\n• ")}\n\nThis is a hard-coded demonstration rule score, not AI or live analysis.`)}});
function openPaper(a,dir,source){if(!a)return;const risk=state.balance*.005;state.open.push({id:Date.now(),market:a.name,direction:dir,entry:a.price,risk,opened:new Date().toISOString(),source});state.activity.push({title:`Paper ${dir} opened: ${a.name}`,detail:`${money(risk)} simulated risk · ${source}`,icon:dir==="BUY"?"↗":"↘"});save();toast("Paper position opened — no broker order placed")}
function closePaper(id){let t=state.open.find(x=>x.id===id);if(!t)return;let win=Math.random()>.48;let pnl=t.risk*(win?1.5:-1);state.balance+=pnl;state.closed.push({...t,pnl,closed:new Date().toISOString(),outcome:win?"WIN":"LOSS"});state.open=state.open.filter(x=>x.id!==id);state.activity.push({title:`Paper trade closed: ${t.market}`,detail:`${win?"WIN":"LOSS"} · ${money(pnl)} simulated P&L`,icon:win?"✓":"×"});save();toast("Simulated result recorded")}
$("#botForm").addEventListener("submit",e=>{e.preventDefault();let b={id:Date.now(),name:$("#botName").value.trim(),market:$("#botMarket").value,strategy:$("#botStrategy").value,risk:Number($("#botRisk").value),rr:Number($("#botRR").value),running:false,trades:0};if(!b.name||b.risk<=0||b.risk>1||b.rr<1){toast("Check bot settings");return}state.bots.push(b);state.activity.push({title:`Paper bot created: ${b.name}`,detail:`${b.market} · paused by default`,icon:"◈"});save();toast("Paper bot created")}
);
function renderBots(){$("#botList").innerHTML=state.bots.length?state.bots.map(b=>`<div class="bot-card"><div class="bot-top"><div><b>${escapeHtml(b.name)}</b><p>${escapeHtml(b.market)} · ${b.strategy==="fib"?"Fibonacci pullback":b.strategy==="sweep"?"Liquidity sweep":"Structure + pullback"}</p></div><span class="status ${b.running?"running":""}">${b.running?"RUNNING (SIM)":"PAUSED"}</span></div><p>Risk ${b.risk}% · R:R ${b.rr}:1 · simulated trades ${b.trades}</p><div class="bot-actions"><button class="mini-btn" data-bot-toggle="${b.id}">${b.running?"Pause":"Start demo"}</button><button class="mini-btn" data-bot-run="${b.id}">Simulate one trade</button><button class="mini-btn" data-bot-delete="${b.id}">Delete</button></div></div>`).join(""):`<div class="empty">No bots yet. Configure one to create a paused paper bot.</div>`}
$("#botList").addEventListener("click",e=>{let b=e.target.closest("button");if(!b)return;let id=Number(b.dataset.botToggle||b.dataset.botRun||b.dataset.botDelete),bot=state.bots.find(x=>x.id===id);if(b.dataset.botToggle){bot.running=!bot.running;state.activity.push({title:`${bot.name} ${bot.running?"started in demo":"paused"}`,detail:"No live market data or broker orders",icon:"◈"});save();return}if(b.dataset.botRun){let a=assets.find(x=>x.name===bot.market)||assets[0];let risk=state.balance*bot.risk/100;let win=Math.random()>.48;let pnl=risk*(win?bot.rr:-1);state.balance+=pnl;state.closed.push({id:Date.now(),market:bot.market,direction:Math.random()>.5?"BUY":"SELL",entry:a.price,risk,pnl,opened:new Date().toISOString(),closed:new Date().toISOString(),outcome:win?"WIN":"LOSS",source:bot.name});bot.trades++;state.activity.push({title:`${bot.name}: simulated trade`,detail:`${win?"WIN":"LOSS"} · ${money(pnl)} simulated P&L`,icon:win?"✓":"×"});save();toast("One simulated outcome generated");return}if(b.dataset.botDelete){state.bots=state.bots.filter(x=>x.id!==id);save();toast("Bot deleted")}})
function renderJournal(){let rows=[...state.journal].reverse();$("#journalCount").textContent=`${rows.length} entr${rows.length===1?"y":"ies"}`;$("#journalRows").innerHTML=rows.length?rows.map(j=>`<tr><td>${escapeHtml(j.date)}</td><td>${escapeHtml(j.market)}</td><td>${escapeHtml(j.direction)}</td><td>${escapeHtml(j.setup)}</td><td>${j.rr||"—"}</td><td>${j.result===""?"—":escapeHtml(j.result)}</td><td>${escapeHtml(j.thesis)}${j.lesson?`<br><small>${escapeHtml(j.lesson)}</small>`:""}</td></tr>`).join(""):`<tr><td colspan="7" class="empty">No journal entries yet.</td></tr>`}
$("#jDate").value=new Date().toISOString().slice(0,10);
$("#journalForm").addEventListener("submit",e=>{e.preventDefault();state.journal.push({date:$("#jDate").value,market:$("#jMarket").value,direction:$("#jDirection").value,setup:$("#jSetup").value,rr:$("#jRR").value,result:$("#jResult").value,thesis:$("#jThesis").value,lesson:$("#jLesson").value});state.activity.push({title:"Journal entry saved",detail:`${$("#jMarket").value} · ${$("#jDirection").value}`,icon:"▤"});save();e.target.reset();$("#jDate").value=new Date().toISOString().slice(0,10);toast("Journal entry saved locally")});
$("#clearJournal").onclick=()=>{if(confirm("Delete all local journal entries?")){state.journal=[];save();toast("Journal cleared")}};
$("#exportBtn").onclick=()=>{let cols=["date","market","direction","setup","rr","result","thesis","lesson"];let csv=[cols.join(","),...state.journal.map(j=>cols.map(k=>`"${String(j[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="trading-jarvis-journal.csv";a.click();URL.revokeObjectURL(a.href)};
function renderAnalytics(){let c=state.closed;let points=[10000,...c.map((t,i)=>10000+c.slice(0,i+1).reduce((s,x)=>s+x.pnl,0))].slice(-9);let lo=Math.min(...points),hi=Math.max(...points),range=hi-lo||1;$("#equityChart").innerHTML=points.map((v,i)=>`<div class="bar-wrap"><div class="bar ${i&&v<points[i-1]?"negative":""}" style="height:${Math.max(4,((v-lo)/range)*100+15)}%"></div><span class="bar-label">${i===0?"Start":i}</span></div>`).join("");let wins=c.filter(t=>t.pnl>0).length,losses=c.filter(t=>t.pnl<0).length;$("#disciplineStats").innerHTML=`<div class="stat-row"><span>Paper trades closed</span><b>${c.length}</b></div><div class="stat-row"><span>Winning trades</span><b>${wins}</b></div><div class="stat-row"><span>Losing trades</span><b>${losses}</b></div><div class="stat-row"><span>Open paper positions</span><b>${state.open.length}</b></div><div class="stat-row"><span>Journal entries</span><b>${state.journal.length}</b></div><div class="stat-row"><span>Starting demo balance</span><b>$10,000.00</b></div>`}
$("#riskForm").addEventListener("submit",e=>{e.preventDefault();calcRisk()});
function calcRisk(){let bal=Number($("#riskBalance").value),pct=Number($("#riskPercent").value),entry=Number($("#riskEntry").value),stop=Number($("#riskStop").value);if(!bal||!pct||!entry||!stop||entry===stop){toast("Enter valid values and distinct entry/stop prices");return}let amount=bal*pct/100,dist=Math.abs(entry-stop);$("#riskAmount").textContent=money(amount);$("#riskDistance").textContent=dist.toLocaleString("en-US",{maximumFractionDigits:6});$("#riskPercentOut").textContent=pct.toFixed(2)+"%";$("#riskUnits").textContent=(amount/dist).toLocaleString("en-US",{maximumFractionDigits:4})}
function renderAll(){metrics();renderMarkets();renderActivity();renderScanner();renderBots();renderJournal();renderAnalytics();calcRisk()}
renderAll();

// Public Deriv market data only: no authentication, account access, or order requests.
function setDerivStatus(label,kind="offline"){const el=$("#derivStatus");if(el){el.textContent=label;el.className="feed-status "+kind}}
function formatDerivPrice(n){return Number(n).toLocaleString("en-US",{maximumFractionDigits:5,minimumFractionDigits:2})}
function sendDeriv(obj){if(derivSocket&&derivSocket.readyState===WebSocket.OPEN)derivSocket.send(JSON.stringify(obj))}
function renderCandleStrip(){
 const el=$("#candleStrip");if(!el)return;if(!derivCandles.length){el.innerHTML='<div class="empty">Connected, waiting for candle history…</div>';return}
 const list=derivCandles.slice(-36),lo=Math.min(...list.map(c=>c.low)),hi=Math.max(...list.map(c=>c.high)),span=hi-lo||1;
 el.innerHTML=list.map(c=>{const h=Math.max(8,((c.high-c.low)/span)*70);return `<div class="candle-stick ${c.close>=c.open?"up":"down"}" title="${new Date(c.epoch*1000).toLocaleString()} O:${c.open} H:${c.high} L:${c.low} C:${c.close}" style="height:${h}px"></div>`}).join("");
}
function updateDerivDisplay(){
 if($("#derivLivePrice"))$("#derivLivePrice").textContent=derivLivePrice===null?"—":formatDerivPrice(derivLivePrice);
 if($("#derivLastUpdate"))$("#derivLastUpdate").textContent=derivLastEpoch?"Tick at "+new Date(derivLastEpoch*1000).toLocaleTimeString():"Waiting for first tick";
 const c=derivCandles[derivCandles.length-1];
 if($("#derivCandleState"))$("#derivCandleState").textContent=c?(c.close>=c.open?"BULLISH":"BEARISH"):"—";
 if($("#derivCandleTime"))$("#derivCandleTime").textContent=c?new Date(c.epoch*1000).toLocaleString():"No candle data yet";
 if($("#derivSourceLabel"))$("#derivSourceLabel").textContent=derivConnected?"Deriv public WS":"Not connected";
 if($("#derivSymbolLabel"))$("#derivSymbolLabel").textContent=derivSymbolVerified?DERIV_SYMBOL+" verified in active symbols":"Awaiting symbol check";
 renderCandleStrip();renderMarkets();renderScanner();
}
function connectDerivFeed(){
 if(derivSocket&&(derivSocket.readyState===WebSocket.OPEN||derivSocket.readyState===WebSocket.CONNECTING)){toast("Deriv feed is already connecting/connected");return}
 setDerivStatus("CONNECTING","offline");if($("#connectDerivBtn"))$("#connectDerivBtn").textContent="Connecting…";
 try{derivSocket=new WebSocket(DERIV_WS_URL)}catch(e){setDerivStatus("ERROR","error");toast("Could not start WebSocket");return}
 derivSocket.onopen=()=>{derivConnected=true;setDerivStatus("SOCKET OPEN · TESTING","online");if($("#connectDerivBtn"))$("#connectDerivBtn").textContent="Disconnect feed";sendDeriv({ping:1,req_id:100});sendDeriv({active_symbols:"brief",req_id:101})};
 derivSocket.onmessage=(event)=>{
  let d;try{d=JSON.parse(event.data)}catch{return}
  if(d.error){setDerivStatus("API ERROR","error");toast(d.error.message||"Deriv API error");return}
  if(d.msg_type==="active_symbols"){
   const symbols=d.active_symbols||[],found=symbols.find(s=>(s.underlying_symbol||s.symbol)===DERIV_SYMBOL);
   if(!found){derivSymbolVerified=false;setDerivStatus("SYMBOL NOT FOUND","error");if($("#derivSymbolLabel"))$("#derivSymbolLabel").textContent="Symbol not present in active_symbols";toast("Deriv did not list "+DERIV_SYMBOL+" as active");return}
   derivSymbolVerified=true;
   sendDeriv({ticks_history:DERIV_SYMBOL,end:"latest",count:100,style:"candles",granularity:300,subscribe:1,req_id:102});
   sendDeriv({ticks:DERIV_SYMBOL,subscribe:1,req_id:103});updateDerivDisplay();
  }
  if(d.msg_type==="candles"&&Array.isArray(d.candles)){
   const parsed=d.candles.map(c=>({epoch:Number(c.epoch),open:Number(c.open),high:Number(c.high),low:Number(c.low),close:Number(c.close)})).filter(c=>Number.isFinite(c.close)&&Number.isFinite(c.epoch));
   if(parsed.length){derivCandles=parsed.slice(-250);derivLivePrice=derivCandles[derivCandles.length-1].close;derivLastEpoch=derivCandles[derivCandles.length-1].epoch;updateDerivDisplay()}
  }
  if(d.msg_type==="tick"&&d.tick&&Number.isFinite(Number(d.tick.quote))){
   const price=Number(d.tick.quote),epoch=Number(d.tick.epoch)||Math.floor(Date.now()/1000);derivLivePrice=price;derivLastEpoch=epoch;
   const bucket=Math.floor(epoch/300)*300;let last=derivCandles[derivCandles.length-1];
   if(!last||last.epoch!==bucket){last={epoch:bucket,open:price,high:price,low:price,close:price};derivCandles.push(last);if(derivCandles.length>250)derivCandles.shift()}
   else{last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);last.close=price}
   updateDerivDisplay();
  }
 };
 derivSocket.onerror=()=>{setDerivStatus("WEBSOCKET ERROR · SEE CLOSE DETAILS","error");if($("#connectDerivBtn"))$("#connectDerivBtn").textContent="Reconnect Deriv feed";toast("WebSocket error. Check the status for close details.")};
 derivSocket.onclose=(event)=>{derivConnected=false;const code=event?.code??"unknown",reason=event?.reason||"no reason provided";setDerivStatus("CLOSED "+code,"error");if($("#connectDerivBtn"))$("#connectDerivBtn").textContent="Connect Deriv feed";if($("#derivSourceLabel"))$("#derivSourceLabel").textContent="Socket closed";if($("#derivSymbolLabel"))$("#derivSymbolLabel").textContent=String(reason).slice(0,90);toast("Deriv socket closed: "+code+" · "+reason);updateDerivDisplay()};
}
function disconnectDerivFeed(){if(derivSocket){try{derivSocket.close()}catch{}derivSocket=null}derivConnected=false;setDerivStatus("DISCONNECTED","offline");if($("#connectDerivBtn"))$("#connectDerivBtn").textContent="Connect Deriv feed";updateDerivDisplay()}
$("#connectDerivBtn")?.addEventListener("click",()=>{if(derivSocket&&(derivSocket.readyState===WebSocket.OPEN||derivSocket.readyState===WebSocket.CONNECTING))disconnectDerivFeed();else connectDerivFeed()});
const originalRenderMarkets=renderMarkets;
renderMarkets=function(){originalRenderMarkets();if(derivLivePrice!==null){const card=$("#marketCards .market-card");if(card){const price=card.querySelector(".price"),change=card.querySelector(".change"),badge=card.querySelector(".fake-label");if(price)price.textContent=formatDerivPrice(derivLivePrice);if(change)change.textContent="LIVE DERIV QUOTE · "+(derivLastEpoch?new Date(derivLastEpoch*1000).toLocaleTimeString():"");if(badge){badge.textContent="LIVE FEED";badge.style.color="var(--green)";badge.style.borderColor="#285b44"}}}}

if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
