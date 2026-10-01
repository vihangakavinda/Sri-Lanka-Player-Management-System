const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean=v=>v==null?"":String(v).trim();
const num=v=>Number(v||0);
const yes=v=>v===true||clean(v).toUpperCase()==="TRUE";

const TEAM_FLAG_CODES = {
  "sri lanka":"lk","india":"in","pakistan":"pk","bangladesh":"bd","afghanistan":"af",
  "england":"gb-eng","australia":"au","new zealand":"nz","south africa":"za","zimbabwe":"zw",
  "ireland":"ie","netherlands":"nl","nepal":"np","scotland":"gb-sct","united states of america":"us",
  "usa":"us","canada":"ca","oman":"om","uae":"ae","united arab emirates":"ae"
};
function teamFlagCode(name){return TEAM_FLAG_CODES[clean(name).toLowerCase()]||""}
function teamFlagImg(name,cls="match-flag-img"){
  const key=clean(name).toLowerCase();
  if(key==="west indies"){
    return `<img class="${cls} special-team-logo" src="images/teams/Cricket_West_Indies_Logo_2017.svg" alt="West Indies cricket logo">`;
  }
  const c=teamFlagCode(name);
  if(!c)return`<span class="${cls} flag-fallback">🏏</span>`;
  return`<img class="${cls}" src="https://flagcdn.com/w80/${c}.png" srcset="https://flagcdn.com/w160/${c}.png 2x" alt="${esc(name)} flag">`;
}

function params(){return new URLSearchParams(location.search)}
function date(v){
  if(!v)return"";
  const s=clean(v),d=new Date(s.length===10?s+"T00:00:00":s);
  return isNaN(d)?s:d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}
function oversFromBalls(v){const b=num(v);return`${Math.floor(b/6)}.${b%6}`}
function groupBy(rows,key){const o={};(rows||[]).forEach(r=>{const k=clean(r[key]);(o[k] ||= []).push(r)});return o}
function dismissal(r){
  if(!yes(r.IsOut))return"not out";
  const t=clean(r.DismissalType),by=clean(r.DismissedBy),f1=clean(r.Fielder1),f2=clean(r.Fielder2);
  let x=t||"out";
  if(by)x+=` b ${by}`;
  if(f1)x+=` · ${f1}`;
  if(f2)x+=` / ${f2}`;
  return x;
}
function matchResult(m){
  if(clean(m.Result))return m.Result;
  if(clean(m.Winner))return`${m.Winner} won${m.Margin?` ${m.Margin}`:""}`;
  return m.MatchStatus||"";
}
function hero(m,s){
  const badges=[yes(m.IsDLS)?"DLS":"",yes(m.IsSuperOver)?"Super Over":"",yes(m.IsTie)?"Tie":""].filter(Boolean);
  return `<div class="match-hero-top">
    <div><p class="eyebrow">${esc(s?.SeriesName||s?.CompetitionName||m.SeriesID||"International Match")}</p>
    <h1>${esc(m.Format||"")} ${m.MatchNumberInSeries?`· ${esc(m.MatchNumberInSeries)}`:""}</h1></div>
    <div class="match-special-badges">${badges.map(x=>`<span>${x}</span>`).join("")}</div>
  </div>
  <div class="match-teams-large">
    <div>${teamFlagImg(m.Team1,"flag-xl-img")}<strong>${esc(m.Team1||"Team 1")}</strong></div>
    <span class="versus">VS</span>
    <div>${teamFlagImg(m.Team2,"flag-xl-img")}<strong>${esc(m.Team2||"Team 2")}</strong></div>
  </div>
  <div class="match-result-large">${esc(matchResult(m)||"Match details")}</div>
  <div class="match-facts">
    <span>${date(m.MatchDate)}${m.MatchEndDate&&m.MatchEndDate!==m.MatchDate?` – ${date(m.MatchEndDate)}`:""}</span>
    <span>${esc(m.Venue||"Venue TBC")}${m.City?`, ${esc(m.City)}`:""}</span>
    ${m.TossWinner?`<span>Toss: ${esc(m.TossWinner)} · ${esc(m.TossDecision||"")}</span>`:""}
    ${m.PlayerOfMatchID?`<span>Player of the Match: ${esc(m.PlayerOfMatchID)}</span>`:""}
  </div>`;
}

function partnershipGraph(partRows){
  if(!partRows.length)return"";
  const sorted=[...partRows].sort((a,b)=>num(a.WicketNumber)-num(b.WicketNumber));
  const maxRuns=Math.max(...sorted.map(p=>num(p.PartnershipRuns)),1);

  return `<div class="partnership-chart">
    <div class="partnership-chart-title">
      <div><h3>Partnership Progression</h3><p>Partnership runs by wicket</p></div>
      <span>Highest ${maxRuns}</span>
    </div>
    <div class="partnership-bars">
      ${sorted.map(p=>{
        const width=Math.max(4,Math.round(num(p.PartnershipRuns)/maxRuns*100));
        const p1=clean(p.Player1Name||p.Player1ID);
        const p2=clean(p.Player2Name||p.Player2ID);
        return `<div class="partnership-bar-row">
          <div class="partnership-wicket">${num(p.WicketNumber)}<small>WKT</small></div>
          <div class="partnership-track">
            <div class="partnership-fill" style="width:${width}%">
              <strong>${num(p.PartnershipRuns)}</strong>
            </div>
          </div>
          <div class="partnership-detail">
            <strong>${esc(p1)} & ${esc(p2)}</strong>
            <span>${num(p.PartnershipBalls)} balls</span>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}


function renderOverComparison(rows){
  if(!rows||!rows.length)return"";
  const groups={};
  rows.forEach(r=>{
    const key=`${r.InningsID}|${r.OverNumber}`;
    (groups[key] ||= []).push(r);
  });
  const overs=Object.values(groups).sort((a,b)=>{
    const ia=String(a[0].InningsID||""),ib=String(b[0].InningsID||"");
    if(ia!==ib)return ia.localeCompare(ib);
    return num(a[0].OverNumber)-num(b[0].OverNumber);
  });

  return `<section class="innings-card">
    <div class="innings-head"><div><p class="eyebrow">STUMPS Report</p><h2>Over by Over</h2></div></div>
    <div class="scorecard-over-list">
      ${overs.map(events=>{
        const x=events[0];
        const codes=events.map(e=>`<b class="${String(e.EventCode||"").toLowerCase().includes("w")?"wicket":""}">${esc(e.EventCode)}</b>`).join("");
        return `<div class="scorecard-over-row">
          <div><strong>${esc(x.BattingTeam||"")} · Over ${esc(x.OverNumber)}</strong><span>Bowler: ${esc(x.Bowler||"")}</span></div>
          <div class="scorecard-ball-codes">${codes}</div>
          <div><strong>${esc(x.OverRuns)} runs</strong><span>Score ${esc(x.ScoreRuns)}/${esc(x.ScoreWickets)}</span></div>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}
function inningsCard(inn,batRows,bowlRows,partRows){
  const score=`${num(inn.Runs)}/${num(inn.Wickets)}${yes(inn.Declared)?"d":""}`;
  const ovs=oversFromBalls(inn.Balls);
  const target=inn.RevisedTarget||inn.Target;
  const title=inn.IsSuperOver||yes(inn.IsSuperOver)?"Super Over":`Innings ${inn.InningsNumber||""}`;

  const batting=batRows.length?`<div class="score-table-wrap"><h3>Batting — ${esc(inn.BattingTeam||"")}</h3>
  <table class="score-table"><thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
  <tbody>${batRows.map(r=>`<tr><td><a href="player.html?playerID=${encodeURIComponent(r.PlayerID)}">${esc(r.FullName||r.PlayerID)}</a></td><td>${esc(dismissal(r))}</td><td><strong>${num(r.Runs)}</strong></td><td>${num(r.Balls)}</td><td>${num(r.Fours)}</td><td>${num(r.Sixes)}</td><td>${num(r.Balls)?(num(r.Runs)/num(r.Balls)*100).toFixed(2):"0.00"}</td></tr>`).join("")}</tbody></table></div>`:"";

  const bowling=bowlRows.length?`<div class="score-table-wrap"><h3>Bowling — ${esc(inn.BowlingTeam||"")}</h3>
  <table class="score-table"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>WD</th><th>NB</th><th>Econ</th></tr></thead>
  <tbody>${bowlRows.map(r=>`<tr><td><a href="player.html?playerID=${encodeURIComponent(r.PlayerID)}">${esc(r.FullName||r.PlayerID)}</a></td><td>${oversFromBalls(r.Balls)}</td><td>${num(r.Maidens)}</td><td>${num(r.RunsConceded)}</td><td><strong>${num(r.Wickets)}</strong></td><td>${num(r.Wides)}</td><td>${num(r.NoBalls)}</td><td>${num(r.Balls)?(num(r.RunsConceded)/(num(r.Balls)/6)).toFixed(2):"0.00"}</td></tr>`).join("")}</tbody></table></div>`:"";

  const partnerships=partRows.length?`<div class="partnership-list"><h3>Partnerships</h3>${[...partRows].sort((a,b)=>num(a.WicketNumber)-num(b.WicketNumber)).map(p=>{
    const p1=clean(p.Player1Name||p.Player1ID),p2=clean(p.Player2Name||p.Player2ID);
    return `<div><span>${num(p.WicketNumber)} wicket</span><strong>${num(p.PartnershipRuns)} (${num(p.PartnershipBalls)} balls)</strong><small>${esc(p1)} ${num(p.Player1Runs)} (${num(p.Player1Balls)}) · ${esc(p2)} ${num(p.Player2Runs)} (${num(p.Player2Balls)})</small></div>`;
  }).join("")}</div>${partnershipGraph(partRows)}`:"";

  return `<section class="innings-card">
    <div class="innings-head">
      <div><p class="eyebrow">${esc(title)}</p><h2><span class="innings-team-flag">${teamFlagImg(inn.BattingTeam,"innings-flag-img")}</span>${esc(inn.BattingTeam||"")}</h2></div>
      <div class="innings-score"><strong>${score}</strong><span>${ovs} overs</span></div>
    </div>
    <div class="innings-meta">
      <span>Extras ${num(inn.Extras)}</span>
      ${target?`<span>${inn.RevisedTarget?"Revised target":"Target"} ${esc(target)}</span>`:""}
      ${yes(inn.AllOut)?'<span>All out</span>':""}
      ${yes(inn.FollowOn)?'<span>Follow-on</span>':""}
    </div>
    ${batting}
    ${bowling}
    ${partnerships}
    ${!batting&&!bowling?'<div class="scorecard-note">Individual opponent-player scorecard data is not stored in this database. The innings total is shown from Match_Innings.</div>':""}
  </section>`;
}

async function init(){
  const matchID=params().get("matchID");
  if(!matchID){$("matchHero").innerHTML='<div class="state-card">No MatchID supplied.</div>';return}
  try{
    const r=await fetch(`${API_BASE}?action=matchScorecard&matchID=${encodeURIComponent(matchID)}`,{cache:"no-store"});
    const j=await r.json();
    if(!j.success)throw new Error(j.error||"Could not load match");
    const d=j.data,m=d.match;
    $("matchHero").innerHTML=hero(m,d.series);

    const bg=groupBy(d.batting,"InningsID"),wg=groupBy(d.bowling,"InningsID"),pg=groupBy(d.partnerships,"InningsID");
    $("inningsContainer").innerHTML=(d.innings||[]).map(inn=>inningsCard(inn,bg[clean(inn.InningsID)]||[],wg[clean(inn.InningsID)]||[],pg[clean(inn.InningsID)]||[])).join("") || '<div class="state-card">No innings data has been entered for this match.</div>';

    const field=(d.fielding||[]).filter(r=>num(r.Catches)||num(r.Stumpings)||num(r.RunOuts));
    $("fieldingContainer").innerHTML=field.length?`<section class="innings-card"><div class="innings-head"><div><p class="eyebrow">Sri Lanka</p><h2>Fielding</h2></div></div><div class="fielding-grid">${field.map(r=>`<a href="player.html?playerID=${encodeURIComponent(r.PlayerID)}"><strong>${esc(r.FullName||r.PlayerID)}</strong><span>Catches ${num(r.Catches)} · Stumpings ${num(r.Stumpings)} · Run outs ${num(r.RunOuts)}</span></a>`).join("")}</div></section>`:"";
    $("fieldingContainer").insertAdjacentHTML("beforeend", renderOverComparison(d.overEvents||[]));
  }catch(e){
    $("matchHero").innerHTML="";
    $("matchError").hidden=false;
    $("matchError").textContent="Could not load scorecard: "+e.message;
  }
}
init();
