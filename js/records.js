const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

let DATA={playerRecords:[],teamRecords:[],players:[]};
let recordMode="player";

const $=id=>document.getElementById(id);
const clean=v=>v==null?"":String(v).trim();
const eq=(a,b)=>clean(a).toLowerCase()===clean(b).toLowerCase();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const numeric=v=>Number(String(v??"").replace(/[^0-9.\-]/g,""))||0;

function parseDate(v){
  if(!v)return null;
  const s=clean(v),d=new Date(s.length===10?s+"T00:00:00":s);
  return isNaN(d)?null:d;
}
function niceDate(v){
  const d=parseDate(v);
  return d?d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"";
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
function recordValue(r){return clean(r.Value)||"—"}
function formatLabel(r){return clean(r.Format)||"All Formats"}

function populateCategories(){
  const rows=recordMode==="player"?DATA.playerRecords:DATA.teamRecords;
  const cats=[...new Set(rows.map(r=>clean(r.RecordCategory)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const sel=$("recordCategory"),cur=sel.value;
  sel.innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(cats.includes(cur))sel.value=cur;
}

function filteredRows(){
  const rows=recordMode==="player"?DATA.playerRecords:DATA.teamRecords;
  const f=$("recordFormat").value,cat=$("recordCategory").value,q=clean($("recordSearch").value).toLowerCase();

  return rows.filter(r=>{
    if(f&&!eq(r.Format,f))return false;
    if(cat&&!eq(r.RecordCategory,cat))return false;
    if(q){
      const hay=[r.RecordName,r.RecordCategory,r.Description,r.Value,r.FullName,r.PlayerID,r.Opponent,r.Venue,r.Format].map(clean).join(" ").toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}

/* Every SPECIFIC record gets its own group.
   Example:
   ODI + Batting + Career Fours = one leaderboard.
   ODI + Batting + Career Sixes = another leaderboard.
*/
function groupedPlayerRecords(rows){
  const groups={};

  rows.forEach(r=>{
    // Do not show zero-value players in any record leaderboard.
    if(numeric(r.Value)<=0)return;

    const key=[
      clean(r.Format)||"All Formats",
      clean(r.RecordCategory)||"Other",
      clean(r.RecordName)||"Record"
    ].join("|||");

    (groups[key] ||= []).push(r);
  });

  return Object.values(groups).map(group=>{
    return [...group]
      .sort((a,b)=>{
        const ra=numeric(a.Rank),rb=numeric(b.Rank);
        if(ra&&rb&&ra!==rb)return ra-rb;
        if(ra&&!rb)return-1;
        if(!ra&&rb)return 1;
        const va=numeric(a.Value),vb=numeric(b.Value);
        if(va!==vb)return vb-va;
        return clean(a.FullName).localeCompare(clean(b.FullName));
      })
      .map((r,i)=>({...r,_rank:numeric(r.Rank)||i+1}));
  }).sort((a,b)=>{
    const A=a[0],B=b[0];
    return clean(A.Format).localeCompare(clean(B.Format))
      || clean(A.RecordCategory).localeCompare(clean(B.RecordCategory))
      || clean(A.RecordName).localeCompare(clean(B.RecordName));
  });
}

function recordGroup(group){
  const top=group[0],rest=group.slice(1);

  return `<section class="record-group">
    <div class="record-group-head">
      <div>
        <p class="eyebrow">${esc(top.RecordCategory||"Player Record")} · ${esc(formatLabel(top))}</p>
        <h2>${esc(top.RecordName||"Record")}</h2>
      </div>
      <span>${group.length} player${group.length===1?"":"s"}</span>
    </div>

    <div class="record-group-top">
      <a class="record-group-top-player" href="player.html?playerID=${encodeURIComponent(clean(top.PlayerID))}">
        <div class="record-group-rank">#${top._rank}</div>
        <div class="record-group-photo">
          <img src="${esc(photo(top.PhotoURL,top.FullName))}" alt="${esc(top.FullName||"Player")}" onerror="this.src='${placeholder(top.FullName)}'">
        </div>
        <div class="record-group-copy">
          <small>Record leader</small>
          <h3>${esc(top.FullName||top.PlayerID)}</h3>
          <strong>${esc(recordValue(top))}</strong>
          <p>${esc(top.PlayingRole||"Sri Lanka")}</p>
        </div>
      </a>

      <div class="record-group-context">
        ${top.Description?`<p>${esc(top.Description)}</p>`:""}
        <div class="record-meta">
          ${top.Opponent?`<span>vs ${esc(top.Opponent)}</span>`:""}
          ${top.MatchDate?`<span>${esc(niceDate(top.MatchDate))}</span>`:""}
          ${top.Venue?`<span>${esc(top.Venue)}</span>`:""}
        </div>
        ${top.MatchID?`<a class="record-match-link" href="match.html?matchID=${encodeURIComponent(clean(top.MatchID))}">View match →</a>`:""}
      </div>
    </div>

    ${rest.length?`
    <div class="record-group-table-wrap">
      <table class="record-group-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>${esc(top.RecordName||"Value")}</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          ${rest.map(r=>`<tr>
            <td class="record-rank-cell">#${r._rank}</td>
            <td>
              <a class="record-player-cell" href="player.html?playerID=${encodeURIComponent(clean(r.PlayerID))}">
                <img src="${esc(photo(r.PhotoURL,r.FullName))}" alt="${esc(r.FullName||"Player")}" onerror="this.src='${placeholder(r.FullName)}'">
                <div>
                  <strong>${esc(r.FullName||r.PlayerID)}</strong>
                  <small>${esc(r.PlayingRole||"Sri Lanka")}</small>
                </div>
              </a>
            </td>
            <td class="record-value-cell">${esc(recordValue(r))}</td>
            <td class="record-context-cell">
              ${r.Opponent?`<span>vs ${esc(r.Opponent)}</span>`:""}
              ${r.MatchDate?`<span>${esc(niceDate(r.MatchDate))}</span>`:""}
              ${r.MatchID?`<a href="match.html?matchID=${encodeURIComponent(clean(r.MatchID))}">Match →</a>`:""}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`:`<div class="record-group-single">Only one player currently has a non-zero value for this record.</div>`}
  </section>`;
}

function renderPlayerRecords(rows){
  $("playerRecordHero").innerHTML="";
  const groups=groupedPlayerRecords(rows);
  $("playerRecordGrid").innerHTML=groups.map(recordGroup).join("");
}

function groupedTeamRecords(rows){
  const groups={};
  rows.forEach(r=>{
    const key=[clean(r.Format)||"All Formats",clean(r.RecordCategory)||"Other"].join("|||");
    (groups[key] ||= []).push(r);
  });
  return Object.values(groups);
}

function renderTeamRecords(rows){
  $("teamRecordHero").innerHTML="";
  $("teamRecordGrid").innerHTML=groupedTeamRecords(rows).map(group=>{
    const sorted=[...group].sort((a,b)=>clean(a.RecordName).localeCompare(clean(b.RecordName)));
    const first=sorted[0];

    return `<section class="record-group">
      <div class="record-group-head">
        <div><p class="eyebrow">${esc(formatLabel(first))}</p><h2>${esc(first.RecordCategory||"Team Records")}</h2></div>
        <span>${sorted.length} record${sorted.length===1?"":"s"}</span>
      </div>
      <div class="record-group-table-wrap">
        <table class="record-group-table team-record-group-table">
          <thead><tr><th>Record</th><th>Value</th><th>Opponent</th><th>Date</th><th>Venue</th><th></th></tr></thead>
          <tbody>${sorted.map(r=>`<tr>
            <td><strong>${esc(r.RecordName||"Record")}</strong>${r.Description?`<small>${esc(r.Description)}</small>`:""}</td>
            <td class="record-value-cell">${esc(recordValue(r))}</td>
            <td>${esc(r.Opponent||"—")}</td>
            <td>${esc(niceDate(r.MatchDate)||"—")}</td>
            <td>${esc(r.Venue||"—")}</td>
            <td>${r.MatchID?`<a href="match.html?matchID=${encodeURIComponent(clean(r.MatchID))}">Match →</a>`:""}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>`;
  }).join("");
}

function render(){
  populateCategories();
  const rows=filteredRows();

  $("playerRecordsPanel").hidden=recordMode!=="player"||!rows.length;
  $("teamRecordsPanel").hidden=recordMode!=="team"||!rows.length;
  $("recordsEmpty").hidden=!!rows.length;
  $("recordCount").textContent=`${rows.length} stored record entr${rows.length===1?"y":"ies"}`;

  if(recordMode==="player")renderPlayerRecords(rows);
  else renderTeamRecords(rows);
}

async function init(){
  try{
    const r=await fetch(`${API_BASE}?action=recordsPage`,{cache:"no-store"});
    const j=await r.json();
    if(!j.success)throw new Error(j.error||"API request failed");
    DATA=j.data||DATA;
    DATA.playerRecords=Array.isArray(DATA.playerRecords)?DATA.playerRecords:[];
    DATA.teamRecords=Array.isArray(DATA.teamRecords)?DATA.teamRecords:[];
    $("recordsLoading").hidden=true;
    $("playerRecordsPanel").hidden=false;
    render();
  }catch(e){
    $("recordsLoading").hidden=true;
    $("recordsError").hidden=false;
    $("recordsError").textContent="Could not load records: "+e.message;
  }
}

document.querySelectorAll(".records-type").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".records-type").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  recordMode=b.dataset.type;
  $("recordCategory").value="";
  render();
}));
["recordFormat","recordCategory"].forEach(id=>$(id).addEventListener("change",render));
$("recordSearch").addEventListener("input",render);
$("clearRecordFilters").addEventListener("click",()=>{
  $("recordFormat").value="";
  $("recordCategory").value="";
  $("recordSearch").value="";
  render();
});
init();
