const API_BASE = "https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

let DATA = {
  players:[],
  byFormat:{},
  periodData:{}
};
let loadingToken = 0;
let mode = "player";
let category = "batting";

const $ = id => document.getElementById(id);
const n = v => Number(v || 0);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eq = (a,b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

const metricSets = {
  batting: [
    ["Runs","Most Runs"],["Fifties","Most 50s"],["Hundreds","Most 100s"],["HighestScore","Highest Score"],
    ["BattingAverage","Batting Average"],["BattingStrikeRate","Batting Strike Rate"],["Sixes","Most Sixes"],
    ["Fours","Most Fours"],["BallsFaced","Balls Faced"]
  ],
  bowling: [
    ["Wickets","Most Wickets"],["ThreeWicketHauls","3 Wicket Hauls"],["FiveWicketHauls","5 Wicket Hauls"],
    ["BestBowling","Best Bowling"],["BowlingAverage","Bowling Average"],["Economy","Economy"],
    ["Maidens","Maidens"],["BallsBowled","Balls Bowled"]
  ],
  fielding: [
    ["Catches","Catches"],["Stumpings","Stumpings"],["RunOuts","Run Outs"]
  ]
};

function playerMap(){
  const m={};
  DATA.players.forEach(p=>m[String(p.PlayerID||"").trim()] = p);
  return m;
}
function photo(p){
  const src = p && p.PhotoURL ? p.PhotoURL : "";
  return src ? `<img src="${esc(src)}" alt="${esc(p.FullName||"Player")}" onerror="this.style.display='none'">` :
    `<div class="statsv2-photo-fallback">${esc((p?.ShortName||p?.FullName||"?").slice(0,1))}</div>`;
}
function playerName(pid){
  const p = playerMap()[pid] || {};
  return p.FullName || p.ShortName || pid;
}
function periodRows(format, period){
  const pack=DATA.byFormat[format]||{playerStats:[]};

  if(period==="Career"){
    return (pack.playerStats||[]).map(r=>({...r,StatType:"Player"}));
  }

  const key=`${format}|${period}`;
  const periodRows=DATA.periodData[key]||[];
  const grouped={};

  periodRows.forEach(r=>{
    const id=String(r.PlayerID||"").trim();
    if(!id)return;
    if(!grouped[id])grouped[id]={PlayerID:id,Format:format};
    grouped[id][r.StatName]=r.StatValue;
  });

  return Object.values(grouped);
}

function bestBowlingScore(v){
  const m = String(v||"").match(/(\d+)\s*\/\s*(\d+)/);
  return m ? [Number(m[1]),Number(m[2])] : [0,9999];
}
function sortRows(rows,key){
  const lower = ["BowlingAverage","Economy","BowlingStrikeRate"];
  return [...rows].filter(r=>{
    if(key==="BestBowling") return String(r[key]||"").trim();
    return n(r[key]) > 0;
  }).sort((a,b)=>{
    if(key==="BestBowling"){
      const A=bestBowlingScore(a[key]),B=bestBowlingScore(b[key]);
      return B[0]-A[0] || A[1]-B[1];
    }
    return lower.includes(key) ? n(a[key])-n(b[key]) : n(b[key])-n(a[key]);
  });
}
function metricValue(row,key){
  const val = row[key];
  if(["BattingAverage","BattingStrikeRate","BowlingAverage","Economy","BowlingStrikeRate"].includes(key))
    return n(val).toFixed(2);
  return val === "" || val == null ? "—" : val;
}
function renderMetricCard(rows,key,label){
  const ranked = sortRows(rows,key);
  if(!ranked.length) return `<article class="statsv2-card statsv2-empty-card"><h3>${esc(label)}</h3><p>No data for this period yet.</p></article>`;

  const top = ranked[0], p = playerMap()[String(top.PlayerID||"").trim()] || {};
  const maxForBar = key==="BestBowling" ? null : Math.max(...ranked.slice(0,5).map(x=>n(x[key])),1);

  const table = ranked.slice(1,6).map((r,i)=>{
    const width = maxForBar ? Math.max(6,Math.round(n(r[key])/maxForBar*100)) : 45;
    return `<a class="statsv2-row" href="player.html?playerID=${encodeURIComponent(r.PlayerID)}">
      <span class="statsv2-rank">${i+2}</span>
      <span class="statsv2-name">${esc(playerName(r.PlayerID))}</span>
      <span class="statsv2-bar"><i style="width:${width}%"></i></span>
      <strong>${esc(metricValue(r,key))}</strong>
    </a>`;
  }).join("");

  return `<article class="statsv2-card">
    <div class="statsv2-card-head"><h3>${esc(label)}</h3><span>Top ${Math.min(6,ranked.length)}</span></div>
    <a class="statsv2-hero" href="player.html?playerID=${encodeURIComponent(top.PlayerID)}">
      <div class="statsv2-photo">${photo(p)}</div>
      <div><small>#1 ${esc(label)}</small><h4>${esc(playerName(top.PlayerID))}</h4><div class="statsv2-big-value">${esc(metricValue(top,key))}</div></div>
    </a>
    <div class="statsv2-list">${table || '<div class="statsv2-only">Only one player available.</div>'}</div>
  </article>`;
}
function renderPlayerStats(){
  const format = $("statsFormat").value;
  const period = $("statsPeriod").value;
  const rows = periodRows(format,period);
  $("playerStatsTitle").textContent = `${format} ${period === "Career" ? "Career" : period} Leaders`;

  const metrics = metricSets[category];
  $("playerLeaderboard").innerHTML = `<div class="statsv2-grid">${metrics.map(([k,l])=>renderMetricCard(rows,k,l)).join("")}</div>`;

  if(period !== "Career" && !rows.length){
    $("statsNote").textContent = "This period is calculated from 2026+ match scorecards. It will populate after those matches are entered.";
  } else if(period === "Career"){
    $("statsNote").textContent = "Career totals include your historical baseline through 2025 plus 2026+ scorecards.";
  } else {
    $("statsNote").textContent = "Period statistics are calculated from 2026+ scorecards only.";
  }
}
function teamRows(format,period){
  const source=(DATA.byFormat[format]||{}).teamStats||[];
  let rows = source.filter(r=>
    period==="Career"
      ? (eq(r.PeriodType,"Career") || eq(r.PeriodType,"All Time"))
      : eq(r.PeriodType,period)
  );

  if(period==="Career"&&!rows.length){
    rows=source.filter(r=>eq(r.PeriodType,"Since 2026"));
  }

  return rows;
}

function teamCard(label,value,accent=""){
  return `<div class="statsv3-kpi ${accent}">
    <span>${esc(label)}</span>
    <strong>${esc(value === "" || value == null ? "—" : value)}</strong>
  </div>`;
}

function pct(v){ return Number(v||0).toFixed(1).replace(/\.0$/,""); }

function pieChart(title,items,centerText,centerSub){
  const cleanItems=items.filter(x=>Number(x.value||0)>0);
  const total=cleanItems.reduce((a,x)=>a+Number(x.value||0),0);
  const palette=["#e8b923","#55c58a","#e26666","#6ea8e5","#a88be8","#8295aa"];

  if(!total){
    return `<div class="statsv3-chart-card"><h3>${esc(title)}</h3><div class="statsv3-no-chart">No chart data yet.</div></div>`;
  }

  let cursor=0;
  const stops=cleanItems.map((x,i)=>{
    const from=cursor;
    cursor += Number(x.value)/total*100;
    return `${palette[i%palette.length]} ${from}% ${cursor}%`;
  }).join(",");

  return `<article class="statsv3-chart-card">
    <h3>${esc(title)}</h3>
    <div class="statsv3-pie-layout">
      <div class="statsv3-pie" style="background:conic-gradient(${stops})">
        <div><strong>${esc(centerText)}</strong><span>${esc(centerSub)}</span></div>
      </div>
      <div class="statsv3-legend">
        ${cleanItems.map((x,i)=>`<div><i style="background:${palette[i%palette.length]}"></i><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`).join("")}
      </div>
    </div>
  </article>`;
}

function barChart(title,items){
  const max=Math.max(...items.map(x=>Number(x.value||0)),1);
  return `<article class="statsv3-chart-card">
    <h3>${esc(title)}</h3>
    <div class="statsv3-bars">
      ${items.map(x=>{
        const value=Number(x.value||0);
        const w=Math.max(value?5:0,Math.round(value/max*100));
        return `<div class="statsv3-bar-row">
          <div><span>${esc(x.label)}</span><strong>${esc(value)}</strong></div>
          <div class="statsv3-bar-track"><i style="width:${w}%"></i></div>
        </div>`;
      }).join("")}
    </div>
  </article>`;
}

function scoreComparison(r){
  const vals=[
    {label:"Highest score",value:n(r.HighestScore)},
    {label:"Lowest score",value:n(r.LowestScore)},
    {label:"Highest conceded",value:n(r.HighestScoreConceded)},
    {label:"Lowest conceded",value:n(r.LowestScoreConceded)}
  ];
  return barChart("Team Score Range",vals);
}

function renderTeamStats(){
  const format=$("statsFormat").value, period=$("statsPeriod").value;
  $("statsNote").textContent = "Team statistics are calculated from Sri Lanka match scorecards entered from 2026 onward.";
  const rows=teamRows(format,period);
  $("teamStatsTitle").textContent = `${format} ${period === "Career" ? "Team Overview" : period}`;

  if(!rows.length){
    $("teamOverview").innerHTML = `<div class="state-card">No team statistics are available for this selection yet. These will populate after 2026 scorecards are entered and Team_Stats is refreshed.</div>`;
    return;
  }

  const r=rows[0];
  const decided=n(r.Won)+n(r.Lost);
  const record=`${n(r.Won)}W · ${n(r.Lost)}L${n(r.Draw)?` · ${n(r.Draw)}D`:""}${n(r.Tie)?` · ${n(r.Tie)}T`:""}${n(r.NoResult)?` · ${n(r.NoResult)}NR`:""}`;

  $("teamOverview").innerHTML = `
    <section class="statsv3-team-hero">
      <div>
        <p class="eyebrow">Sri Lanka · ${esc(format)}</p>
        <h3>${esc(period)} Performance</h3>
        <span>${esc(record)}</span>
      </div>
      <div class="statsv3-win-rate">
        <strong>${pct(r.WinPercentage)}%</strong>
        <span>Win rate</span>
      </div>
    </section>

    <div class="statsv3-kpi-grid">
      ${teamCard("Matches",r.Matches,"primary")}
      ${teamCard("Won",r.Won,"win")}
      ${teamCard("Lost",r.Lost,"loss")}
      ${teamCard("Draw",r.Draw)}
      ${teamCard("Tie",r.Tie)}
      ${teamCard("No Result",r.NoResult)}
      ${teamCard("Toss Won",r.TossWon)}
      ${teamCard("Toss Lost",r.TossLost)}
    </div>

    <div class="statsv3-chart-grid">
      ${pieChart("Match Results",[
        {label:"Won",value:n(r.Won)},
        {label:"Lost",value:n(r.Lost)},
        {label:"Draw",value:n(r.Draw)},
        {label:"Tie",value:n(r.Tie)},
        {label:"No Result",value:n(r.NoResult)}
      ],r.Matches,"matches")}

      ${pieChart("Toss Record",[
        {label:"Won toss",value:n(r.TossWon)},
        {label:"Lost toss",value:n(r.TossLost)}
      ],pct((n(r.TossWon)/(Math.max(1,n(r.TossWon)+n(r.TossLost))))*100)+"%","toss win rate")}

      ${barChart("Batting / Bowling First",[
        {label:"Batted first",value:n(r.BatFirst)},
        {label:"Bowled first",value:n(r.BowlFirst)},
        {label:"Bat first wins",value:n(r.BatFirstWon)},
        {label:"Bowl first wins",value:n(r.BowlFirstWon)}
      ])}

      ${scoreComparison(r)}
    </div>

    <div class="statsv3-section-title">
      <div><p class="eyebrow">Match Strategy</p><h3>Chases, Defences & Decisions</h3></div>
    </div>

    <div class="statsv3-strategy-grid">
      <article class="statsv3-strategy-card">
        <span>Successful Chases</span>
        <strong>${n(r.SuccessfulChases)}</strong>
        <div class="statsv3-meter"><i style="width:${Math.min(100,n(r.BowlFirst)?n(r.SuccessfulChases)/n(r.BowlFirst)*100:0)}%"></i></div>
        <small>${n(r.BowlFirst)} matches bowling first</small>
      </article>
      <article class="statsv3-strategy-card">
        <span>Successful Defences</span>
        <strong>${n(r.SuccessfulDefences)}</strong>
        <div class="statsv3-meter"><i style="width:${Math.min(100,n(r.BatFirst)?n(r.SuccessfulDefences)/n(r.BatFirst)*100:0)}%"></i></div>
        <small>${n(r.BatFirst)} matches batting first</small>
      </article>
      <article class="statsv3-strategy-card">
        <span>Bat First Win Rate</span>
        <strong>${pct(r.BatFirstWinPercentage)}%</strong>
        <div class="statsv3-meter"><i style="width:${Math.min(100,n(r.BatFirstWinPercentage))}%"></i></div>
        <small>${n(r.BatFirstWon)} wins</small>
      </article>
      <article class="statsv3-strategy-card">
        <span>Bowl First Win Rate</span>
        <strong>${pct(r.BowlFirstWinPercentage)}%</strong>
        <div class="statsv3-meter"><i style="width:${Math.min(100,n(r.BowlFirstWinPercentage))}%"></i></div>
        <small>${n(r.BowlFirstWon)} wins</small>
      </article>
    </div>

    <div class="statsv3-section-title">
      <div><p class="eyebrow">Score Records</p><h3>Team Totals</h3></div>
    </div>
    <div class="statsv3-record-grid">
      ${teamCard("Highest Score",r.HighestScore)}
      ${teamCard("Lowest Score",r.LowestScore)}
      ${teamCard("Highest Conceded",r.HighestScoreConceded)}
      ${teamCard("Lowest Conceded",r.LowestScoreConceded)}
      ${teamCard("DLS Matches",r.DLSMatches)}
      ${teamCard("Super Over Matches",r.SuperOverMatches)}
    </div>
  `;
}

function showStatsLoading(message="Loading statistics…"){
  $("statsLoading").hidden=false;
  $("statsLoading").innerHTML=`
    <div class="stats-loading-shell">
      <div class="stats-spinner"></div>
      <div><strong>${esc(message)}</strong><span>Reading the cricket database…</span></div>
    </div>`;
  $("statsError").hidden=true;
}

function showStatsError(message){
  $("statsLoading").hidden=true;
  $("statsError").hidden=false;
  $("statsError").innerHTML=`
    <div class="stats-retry-box">
      <div><strong>Statistics could not be loaded</strong><span>${esc(message)}</span></div>
      <button id="statsRetryBtn" class="btn">Retry</button>
    </div>`;
  const b=$("statsRetryBtn");
  if(b)b.addEventListener("click",()=>loadCurrentFormat(true));
}

async function apiJson(action,params={}){
  const url=new URL(API_BASE);
  url.searchParams.set("action",action);
  Object.entries(params).forEach(([k,v])=>{
    if(v!==""&&v!=null)url.searchParams.set(k,v);
  });

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);

  try{
    const r=await fetch(url,{cache:"no-store",signal:controller.signal});
    const j=await r.json();
    if(!j.success)throw new Error(j.error||"API request failed");
    return j.data;
  }finally{
    clearTimeout(timeout);
  }
}

async function loadFormat(format,force=false){
  if(DATA.byFormat[format]&&!force)return DATA.byFormat[format];

  const token=++loadingToken;
  showStatsLoading(`Loading ${format} statistics…`);

  const d=await apiJson("statsDashboard",{format});
  if(token!==loadingToken)return d;

  if(!DATA.players.length&&Array.isArray(d.players))DATA.players=d.players;
  DATA.byFormat[format]={
    playerStats:Array.isArray(d.playerStats)?d.playerStats:[],
    teamStats:Array.isArray(d.teamStats)?d.teamStats:[]
  };

  return DATA.byFormat[format];
}

async function ensurePeriodData(format,period){
  if(period==="Career")return;
  const key=`${format}|${period}`;
  if(DATA.periodData[key])return;

  showStatsLoading(`Loading ${format} · ${period}…`);
  const d=await apiJson("statsPeriodData",{format,period});
  DATA.periodData[key]=Array.isArray(d.rows)?d.rows:[];
}

async function render(){
  const format=$("statsFormat").value;
  const period=$("statsPeriod").value;

  try{
    await loadFormat(format);
    if(mode==="player"&&period!=="Career"){
      await ensurePeriodData(format,period);
    }

    $("statsLoading").hidden=true;
    $("statsError").hidden=true;
    $("playerStatsPanel").hidden=mode!=="player";
    $("teamStatsPanel").hidden=mode!=="team";

    if(mode==="player")renderPlayerStats();
    else renderTeamStats();
  }catch(e){
    const message=e.name==="AbortError"
      ?"The request took too long. Please retry."
      :(e.message||String(e));
    showStatsError(message);
  }
}

async function loadCurrentFormat(force=false){
  const format=$("statsFormat").value;
  if(force){
    delete DATA.byFormat[format];

    Object.keys(DATA.periodData).forEach(k=>{
      if(k.startsWith(format+"|"))delete DATA.periodData[k];
    });
  }
  await render();
}

async function init(){
  showStatsLoading();
  await render();
}

document.querySelectorAll(".stats-mode").forEach(b=>b.addEventListener("click",async()=>{
  document.querySelectorAll(".stats-mode").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  mode=b.dataset.mode;

  if(mode==="team"&&$("statsPeriod").value==="Career"){
    $("statsPeriod").value="Since 2026";
  }

  await render();
}));

document.querySelectorAll(".stat-category").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".stat-category").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  category=b.dataset.category;
  renderPlayerStats();
}));

$("statsFormat").addEventListener("change",()=>render());
$("statsPeriod").addEventListener("change",()=>render());

init();
