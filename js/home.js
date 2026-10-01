const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

const $=id=>document.getElementById(id);
const clean=v=>v==null?"":String(v).trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const FLAG_CODES={
  "sri lanka":"lk","india":"in","pakistan":"pk","bangladesh":"bd","australia":"au",
  "new zealand":"nz","south africa":"za","afghanistan":"af","ireland":"ie","zimbabwe":"zw",
  "netherlands":"nl","nepal":"np","scotland":"gb-sct","england":"gb-eng","canada":"ca",
  "oman":"om","uae":"ae","united arab emirates":"ae","usa":"us","united states of america":"us"
};

function dateText(v){
  if(!v)return"";
  const s=clean(v);
  const d=new Date(s.length===10?s+"T00:00:00":s);
  return isNaN(d)?"":d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}
function flagImg(team){
  const key=clean(team).toLowerCase();
  if(key==="west indies"){
    return `<img class="home-team-flag special-team-logo" src="images/teams/Cricket_West_Indies_Logo_2017.svg" alt="West Indies cricket logo">`;
  }
  const code=FLAG_CODES[key];
  if(!code)return'<span class="home-flag-fallback">🏏</span>';
  return `<img class="home-team-flag" src="https://flagcdn.com/w80/${code}.png" srcset="https://flagcdn.com/w160/${code}.png 2x" alt="${esc(team)} flag">`;
}
function placeholder(name){
  const initials=clean(name).split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"SL";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#10243b"/><text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="55" font-weight="700" fill="#f2bf34">${initials}</text></svg>`;
  return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function photo(url,name){
  const v=clean(url);
  const a=v.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const b=v.match(/[?&]id=([^&]+)/i);
  if(a)return`https://drive.google.com/uc?export=view&id=${a[1]}`;
  if(v.includes("drive.google.com")&&b)return`https://drive.google.com/uc?export=view&id=${b[1]}`;
  return v||placeholder(name);
}

function calendarIcon(){
  return `<svg class="home-meta-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 2v3M17 2v3M4 8h16M5 4h14a1 1 0 0 1 1 1v14H4V5a1 1 0 0 1 1-1Z"/>
  </svg>`;
}
function stadiumIcon(){
  return `<svg class="home-meta-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 8c2.8-2 5.8-3 9-3s6.2 1 9 3M5 10v6M19 10v6M8 9v8M16 9v8M3 16h18M6 20h12M10 13h4"/>
  </svg>`;
}

function matchCard(m,isLatest){
  const matchNo=clean(m.MatchNumberInSeries||"");
  return `<article class="dashboard-match ${isLatest?"latest":""}">
    <small>${isLatest?"Latest Result":"Upcoming"} · ${esc(m.Format||"")}</small>

    <h3>
      <span class="home-team">${flagImg(m.Team1)}${esc(m.Team1||"")}</span>
      <i>vs</i>
      <span class="home-team">${flagImg(m.Team2)}${esc(m.Team2||"")}</span>
    </h3>

    <p class="home-series-name">${esc(m.SeriesName||"")}</p>
    ${matchNo?`<div class="home-match-number">${esc(matchNo)}</div>`:""}

    <div class="home-match-meta-row">
      <span>${calendarIcon()}${dateText(m.MatchDate)}</span>
      <span>${stadiumIcon()}${esc(m.Venue||"")}</span>
    </div>

    ${isLatest?`<strong>${esc(m.Result||m.Margin||"Completed")}</strong>`:""}

    <a href="match.html?matchID=${encodeURIComponent(clean(m.MatchID))}">
      ${isLatest?"View scorecard":"Match details"} →
    </a>
  </article>`;
}

function performerCard(p){
  const batting=p.type==="Batting";
  const context=[
    clean(p.SeriesName),
    clean(p.MatchNumberInSeries),
    p.Opponent?`vs ${clean(p.Opponent)}`:""
  ].filter(Boolean).join(" · ");

  return `<a class="home-performer" href="player.html?playerID=${encodeURIComponent(clean(p.PlayerID))}">
    <img src="${esc(photo(p.PhotoURL,p.FullName))}" alt="${esc(p.FullName||"Player")}" onerror="this.src='${placeholder(p.FullName)}'">
    <div>
      <small>${esc(context||p.Format)}</small>
      <h3>${esc(p.FullName||p.PlayerID)}</h3>
      <strong>${batting?`${p.Runs} runs`:`${p.Wickets}/${p.RunsConceded}`}</strong>
      <span>${batting?`${p.Balls} balls · ${p.Fours} fours · ${p.Sixes} sixes`:`${p.Balls} balls`}</span>
    </div>
  </a>`;
}

function setError(message){
  ["matchState","perfState","rankState","seriesState"].forEach(id=>{
    const el=$(id);
    if(el){el.hidden=false;el.textContent=message;}
  });
}

function homeTruthy(v){return v===true||clean(v).toUpperCase()==="TRUE";}
function homeSquadCard(data,series){
  const rows=(data?.squads||[]).filter(x=>clean(x.SeriesID)===clean(series?.SeriesID));
  if(!rows.length)return"";

  rows.sort((a,b)=>{
    const ar=homeTruthy(a.IsCaptain)?0:homeTruthy(a.IsViceCaptain)?1:homeTruthy(a.IsWicketKeeper)?2:3;
    const br=homeTruthy(b.IsCaptain)?0:homeTruthy(b.IsViceCaptain)?1:homeTruthy(b.IsWicketKeeper)?2:3;
    return ar-br||clean(a.FullName).localeCompare(clean(b.FullName));
  });

  const captain=rows.find(x=>homeTruthy(x.IsCaptain));
  const vice=rows.find(x=>homeTruthy(x.IsViceCaptain));
  const faces=rows.slice(0,6);

  return `<article class="home-squad-card">
    <div class="home-squad-top">
      <div>
        <small>${esc(series.Format||series.CompetitionType||"Squad")}</small>
        <h3>${esc(series.SeriesName||series.CompetitionName||"Latest Squad")}</h3>
      </div>
      <span>${rows.length} players</span>
    </div>

    <div class="home-squad-faces">
      ${faces.map(x=>`<a href="player.html?playerID=${encodeURIComponent(clean(x.PlayerID))}" title="${esc(x.FullName||x.PlayerID)}">
        <img src="${esc(photo(x.PhotoURL,x.FullName))}" alt="${esc(x.FullName||"Player")}" onerror="this.src='${placeholder(x.FullName)}'">
        ${homeTruthy(x.IsCaptain)?'<b>C</b>':homeTruthy(x.IsViceCaptain)?'<b>VC</b>':homeTruthy(x.IsWicketKeeper)?'<b>WK</b>':""}
      </a>`).join("")}
      ${rows.length>6?`<span class="home-squad-more">+${rows.length-6}</span>`:""}
    </div>

    <div class="home-squad-leaders">
      ${captain?`<div><span>Captain</span><strong>${esc(captain.FullName||captain.PlayerID)}</strong></div>`:""}
      ${vice?`<div><span>Vice Captain</span><strong>${esc(vice.FullName||vice.PlayerID)}</strong></div>`:""}
    </div>

    <a class="home-squad-link" href="squads.html?seriesID=${encodeURIComponent(clean(series.SeriesID))}">View full squad →</a>
  </article>`;
}

async function loadDashboard(){
  try{
    const [r,sr]=await Promise.all([
      fetch(`${API_BASE}?action=homeDashboard`,{cache:"no-store"}),
      fetch(`${API_BASE}?action=squads`,{cache:"no-store"})
    ]);
    const [j,sj]=await Promise.all([r.json(),sr.json()]);
    if(!j.success)throw new Error(j.error||"Home Dashboard API error");
    if(!sj.success)throw new Error(sj.error||"Squads API error");
    const d=j.data||{};
    const squadData=sj.data||{squads:[],series:[]};

    const cards=[];
    if(d.latestResult)cards.push(matchCard(d.latestResult,true));
    (d.upcomingFixtures||[]).forEach(m=>cards.push(matchCard(m,false)));
    $("matchState").hidden=!!cards.length;
    $("matchGrid").hidden=!cards.length;
    $("matchGrid").innerHTML=cards.join("");
    if(!cards.length)$("matchState").textContent="No match data available.";

    const performers=[
      ...(d.topBatting||[]).slice(0,2),
      ...(d.topBowling||[]).slice(0,2)
    ];
    $("perfState").hidden=!!performers.length;
    $("perfGrid").hidden=!performers.length;
    $("perfGrid").innerHTML=performers.map(performerCard).join("");
    if(!performers.length)$("perfState").textContent="Top performers will appear from entered 2026 scorecards.";

    const ranks=d.rankings||[];
    $("rankState").hidden=!!ranks.length;
    $("rankGrid").hidden=!ranks.length;
    $("rankGrid").innerHTML=ranks.map(x=>`<a href="player.html?playerID=${encodeURIComponent(clean(x.PlayerID))}">
      <b>#${esc(x.Rank)}</b>
      <img src="${esc(photo(x.PhotoURL,x.FullName))}" alt="${esc(x.FullName||"Player")}" onerror="this.src='${placeholder(x.FullName)}'">
      <div><strong>${esc(x.FullName||x.PlayerID)}</strong><small>${esc(x.Format)} · ${esc(x.Category)}</small></div>
      <span>${esc(x.Rating||x.Points||"")}</span>
    </a>`).join("");
    if(!ranks.length)$("rankState").textContent="No current ranking data available.";

    const s=d.latestSeries;
    $("seriesState").hidden=!!s;
    $("seriesGrid").hidden=!s;
    if(s){
      const rich=homeSquadCard(squadData,s);
      $("seriesGrid").innerHTML=rich||`<article class="series-home-card">
        <small>${esc(s.Format||s.CompetitionType||"Series")}</small>
        <h3>${esc(s.SeriesName||s.CompetitionName||"Latest Series")}</h3>
        <p>${dateText(s.StartDate)}${s.EndDate?" — "+dateText(s.EndDate):""}</p>
        <span>${Number(d.latestSquadCount||0)} squad players</span>
        <a href="squads.html">View squad →</a>
      </article>`;
    }else{
      $("seriesState").textContent="No series data available.";
    }
  }catch(err){
    console.error(err);
    setError("Could not load dashboard: "+err.message);
  }
}

loadDashboard();
