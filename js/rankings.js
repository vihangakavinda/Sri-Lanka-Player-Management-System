const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

let DATA={rankings:[],history:[],players:[]};
let rankingType="Player";

const $=id=>document.getElementById(id);
const clean=v=>v==null?"":String(v).trim();
const eq=(a,b)=>clean(a).toLowerCase()===clean(b).toLowerCase();
const yes=v=>v===true||clean(v).toUpperCase()==="TRUE";
const n=v=>Number(v||0);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const TEAM_FLAG_CODES={
  "sri lanka":"lk","india":"in","pakistan":"pk","bangladesh":"bd","afghanistan":"af",
  "england":"gb-eng","australia":"au","new zealand":"nz","south africa":"za","zimbabwe":"zw",
  "ireland":"ie","netherlands":"nl","nepal":"np","scotland":"gb-sct","united states of america":"us",
  "usa":"us","canada":"ca","oman":"om","uae":"ae","united arab emirates":"ae","west indies":""
};
function teamFlagImg(name){
  const key=clean(name).toLowerCase();
  if(key==="west indies"){
    return `<img class="ranking-team-flag special-team-logo" src="images/teams/Cricket_West_Indies_Logo_2017.svg" alt="West Indies cricket logo">`;
  }
  const c=TEAM_FLAG_CODES[key];
  if(!c)return`<span class="ranking-flag-fallback">🏏</span>`;
  return`<img class="ranking-team-flag" src="https://flagcdn.com/w80/${c}.png" srcset="https://flagcdn.com/w160/${c}.png 2x" alt="${esc(name)} flag">`;
}
function parseDate(v){
  if(!v)return null;
  const s=clean(v),d=new Date(s.length===10?s+"T00:00:00":s);
  return isNaN(d)?null:d;
}
function niceDate(v){
  const d=parseDate(v);
  return d?d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
}
function photo(url,name){
  const v=clean(url);
  const a=v.match(/drive\.google\.com\/file\/d\/([^/]+)/i),b=v.match(/[?&]id=([^&]+)/i);
  if(a)return`https://drive.google.com/uc?export=view&id=${a[1]}`;
  if(v.includes("drive.google.com")&&b)return`https://drive.google.com/uc?export=view&id=${b[1]}`;
  return v||placeholder(name);
}
function placeholder(name){
  const initials=clean(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"SL";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#11233c"/><text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="70" font-weight="700" fill="#f2bf34">${initials}</text></svg>`;
  return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function movement(r){
  const mv=n(r.Movement);
  if(mv>0)return`<span class="move up">▲ ${mv}</span>`;
  if(mv<0)return`<span class="move down">▼ ${Math.abs(mv)}</span>`;
  const current=n(r.Rank),prev=n(r.PreviousRank);
  if(prev&&current){
    const d=prev-current;
    if(d>0)return`<span class="move up">▲ ${d}</span>`;
    if(d<0)return`<span class="move down">▼ ${Math.abs(d)}</span>`;
  }
  return`<span class="move same">—</span>`;
}
function valueText(r){
  if(clean(r.Rating))return`Rating ${esc(r.Rating)}`;
  if(clean(r.Points))return`${esc(r.Points)} pts`;
  return"—";
}
function currentRows(){
  const f=$("rankingFormat").value,cat=$("rankingCategory").value;
  return DATA.rankings.filter(r=>
    yes(r.IsCurrent) &&
    eq(r.RankingType,rankingType) &&
    eq(r.Format,f) &&
    (rankingType==="Team" || eq(r.Category,cat))
  ).sort((a,b)=>n(a.Rank)-n(b.Rank));
}
function lastUpdated(rows){
  const dates=rows.map(r=>parseDate(r.RankingDate)).filter(Boolean).sort((a,b)=>b-a);
  $("lastUpdated").textContent=dates.length?niceDate(dates[0]):"—";
}

function renderTopPlayer(rows){
  const box=$("topPlayerCard");
  if(!rows.length){box.innerHTML='<div class="state-card">No current ranking data for this selection.</div>';return}
  const r=rows[0];
  box.innerHTML=`<a class="ranking-top-player" href="player.html?playerID=${encodeURIComponent(clean(r.PlayerID))}">
    <div class="ranking-top-photo"><img src="${esc(photo(r.PhotoURL,r.FullName))}" alt="${esc(r.FullName)}" onerror="this.src='${placeholder(r.FullName)}'"></div>
    <div class="ranking-top-copy">
      <small>#${esc(r.Rank)} · ${esc($("rankingFormat").value)} ${esc($("rankingCategory").value)}</small>
      <h2>${esc(r.FullName||r.PlayerID)}</h2>
      <div class="ranking-top-metrics">
        <div><span>Rating / Points</span><strong>${valueText(r)}</strong></div>
        <div><span>Movement</span><strong>${movement(r)}</strong></div>
        <div><span>Best Rank</span><strong>${r.BestRank?`#${esc(r.BestRank)}`:"—"}</strong></div>
        <div><span>Best Rating</span><strong>${esc(r.BestRating||"—")}</strong></div>
      </div>
    </div>
  </a>`;
}
function renderPlayerTable(rows){
  const box=$("playerRankingTable");
  if(!rows.length){box.innerHTML="";return}
  box.innerHTML=`<div class="ranking-table-card">
    <div class="ranking-table-head"><h3>Current Rankings</h3><span>${rows.length} player${rows.length===1?"":"s"}</span></div>
    <div class="ranking-table-wrap"><table class="ranking-table">
      <thead><tr><th>Rank</th><th>Player</th><th>Rating / Points</th><th>Movement</th><th>Best Rank</th><th>Best Rating</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td class="rank-number">#${esc(r.Rank)}</td>
        <td><a class="ranking-player-cell" href="player.html?playerID=${encodeURIComponent(clean(r.PlayerID))}">
          <img src="${esc(photo(r.PhotoURL,r.FullName))}" alt="${esc(r.FullName)}" onerror="this.src='${placeholder(r.FullName)}'">
          <div><strong>${esc(r.FullName||r.PlayerID)}</strong><small>${esc(r.PlayingRole||"Sri Lanka")}</small></div>
        </a></td>
        <td>${valueText(r)}</td><td>${movement(r)}</td><td>${r.BestRank?`#${esc(r.BestRank)}`:"—"}</td><td>${esc(r.BestRating||"—")}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}
function renderHistory(rows){
  const box=$("rankingHistoryPanel");
  if(!rows.length){box.innerHTML="";return}
  const top=rows[0];
  const hist=DATA.history.filter(h=>eq(h.PlayerID,top.PlayerID)&&eq(h.Format,$("rankingFormat").value)&&eq(h.Category,$("rankingCategory").value))
    .sort((a,b)=>(parseDate(a.RankingDate)?.getTime()||0)-(parseDate(b.RankingDate)?.getTime()||0));

  if(hist.length<2){
    box.innerHTML=`<div class="ranking-history-card"><div class="ranking-table-head"><h3>${esc(top.FullName)} Ranking History</h3></div><div class="ranking-history-empty">Ranking history graph will appear after multiple Ranking_History entries are available.</div></div>`;
    return;
  }

  const ranks=hist.map(x=>n(x.Rank)).filter(Boolean);
  const max=Math.max(...ranks),min=Math.min(...ranks);
  const range=Math.max(1,max-min);
  const pts=hist.map((x,i)=>{
    const X=hist.length===1?50:(i/(hist.length-1))*100;
    const Y=10+((n(x.Rank)-min)/range)*70;
    return`${X},${Y}`;
  }).join(" ");

  box.innerHTML=`<div class="ranking-history-card">
    <div class="ranking-table-head"><div><h3>${esc(top.FullName)} Ranking History</h3><span>Lower rank number is better</span></div></div>
    <div class="ranking-history-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Ranking history chart">
        <line x1="0" y1="90" x2="100" y2="90" class="history-axis"/>
        <polyline points="${pts}" class="history-line"/>
      </svg>
      <div class="history-labels">${hist.map(x=>`<span><b>#${esc(x.Rank)}</b><small>${niceDate(x.RankingDate)}</small></span>`).join("")}</div>
    </div>
  </div>`;
}
function renderTeamTable(rows){
  const box=$("teamRankingTable");
  if(!rows.length){box.innerHTML='<div class="state-card">No current team rankings for this selection.</div>';return}
  box.innerHTML=`<div class="ranking-table-card">
    <div class="ranking-table-head"><h3>${esc($("rankingFormat").value)} Team Rankings</h3><span>${rows.length} teams</span></div>
    <div class="ranking-table-wrap"><table class="ranking-table team-ranking-table">
      <thead><tr><th>Rank</th><th>Team</th><th>Rating</th><th>Points</th><th>Movement</th><th>Best Rank</th></tr></thead>
      <tbody>${rows.map(r=>`<tr class="${eq(r.Team,"Sri Lanka")?"sri-lanka-row":""}">
        <td class="rank-number">#${esc(r.Rank)}</td>
        <td><div class="ranking-team-cell">${teamFlagImg(r.Team)}<strong>${esc(r.Team||"—")}</strong></div></td>
        <td>${esc(r.Rating||"—")}</td><td>${esc(r.Points||"—")}</td><td>${movement(r)}</td><td>${r.BestRank?`#${esc(r.BestRank)}`:"—"}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}
function render(){
  const rows=currentRows();
  lastUpdated(rows);

  $("playerRankingsPanel").hidden=rankingType!=="Player";
  $("teamRankingsPanel").hidden=rankingType!=="Team";
  $("categoryLabel").style.display=rankingType==="Player"?"grid":"none";

  if(rankingType==="Player"){
    renderTopPlayer(rows);
    renderPlayerTable(rows);
    renderHistory(rows);
  }else renderTeamTable(rows);
}
async function init(){
  try{
    const r=await fetch(`${API_BASE}?action=rankingsPage`,{cache:"no-store"});
    const j=await r.json();
    if(!j.success)throw new Error(j.error||"API request failed");
    DATA=j.data||DATA;
    DATA.rankings=Array.isArray(DATA.rankings)?DATA.rankings:[];
    DATA.history=Array.isArray(DATA.history)?DATA.history:[];
    $("rankingLoading").hidden=true;
    $("playerRankingsPanel").hidden=false;
    render();
  }catch(e){
    $("rankingLoading").hidden=true;
    $("rankingError").hidden=false;
    $("rankingError").textContent="Could not load ICC rankings: "+e.message;
  }
}

document.querySelectorAll(".ranking-type").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".ranking-type").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  rankingType=b.dataset.type;
  render();
}));
["rankingFormat","rankingCategory"].forEach(id=>$(id).addEventListener("change",render));
init();
