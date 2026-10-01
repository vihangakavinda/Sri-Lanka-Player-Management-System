const API_BASE = "https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";
const TEAM = "Sri Lanka";

let matches = [];
let series = [];
let currentView = "all";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = v => String(v ?? "").trim().toLowerCase();

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? v + "T00:00:00" : v);
  return isNaN(d) ? null : d;
}
function niceDate(v) {
  const d = parseDate(v);
  return d ? d.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}) : "Date TBC";
}
function opponent(m) {
  return norm(m.Team1) === norm(TEAM) ? m.Team2 : m.Team1;
}
function isCompleted(m) {
  const s = norm(m.MatchStatus);
  if (["completed","complete","result","finished"].includes(s)) return true;
  if (["upcoming","scheduled","fixture","not started"].includes(s)) return false;
  if (m.Result || m.Winner) return true;
  const d = parseDate(m.MatchDate);
  const today = new Date(); today.setHours(0,0,0,0);
  return d ? d < today : false;
}
function seriesName(id) {
  const s = series.find(x => norm(x.SeriesID) === norm(id));
  return s ? (s.SeriesName || s.CompetitionName || id || "Other Matches") : (id || "Other Matches");
}
function seriesMeta(id) {
  return series.find(x => norm(x.SeriesID) === norm(id)) || {};
}
function resultText(m) {
  if (m.Result) return m.Result;
  if (m.Winner) return `${m.Winner} won${m.Margin ? " " + m.Margin : ""}`;
  return m.MatchStatus || "Result";
}
function badges(m) {
  const b = [];
  if (String(m.IsDLS).toLowerCase() === "true") b.push('<span class="match-badge special">DLS</span>');
  if (String(m.IsSuperOver).toLowerCase() === "true") b.push('<span class="match-badge special">Super Over</span>');
  if (String(m.IsTie).toLowerCase() === "true") b.push('<span class="match-badge special">Tie</span>');
  return b.join("");
}

function oversFromBalls(v){
  const b=Number(v||0); return `${Math.floor(b/6)}.${b%6}`;
}

function overComparisonBlock(m){
  const rows=m.OverComparison||[];
  if(!rows.length)return"";

  const grouped={};
  rows.forEach(r=>{
    const key=`${r.InningsID}|${r.OverNumber}`;
    if(!grouped[key])grouped[key]=[];
    grouped[key].push(r);
  });

  const overs=Object.values(grouped).sort((a,b)=>{
    const ia=String(a[0].InningsID||""),ib=String(b[0].InningsID||"");
    if(ia!==ib)return ia.localeCompare(ib);
    return Number(a[0].OverNumber||0)-Number(b[0].OverNumber||0);
  });

  return `<details class="fixture-over-details">
    <summary>Over by Over <span>${overs.length} overs</span></summary>
    <div class="fixture-over-list">
      ${overs.map(events=>{
        const x=events[0];
        const balls=events.map(e=>`<b class="${String(e.EventCode).toLowerCase().includes("w")?"wicket":""}">${esc(e.EventCode)}</b>`).join("");
        return `<div class="fixture-over-row">
          <div><strong>${esc(x.BattingTeam||"")} · Over ${esc(x.OverNumber)}</strong><span>${esc(x.Bowler||"")}</span></div>
          <div class="fixture-ball-codes">${balls}</div>
          <div class="fixture-over-score"><strong>${esc(x.OverRuns)} runs</strong><span>${esc(x.ScoreRuns)}/${esc(x.ScoreWickets)}</span></div>
        </div>`;
      }).join("")}
    </div>
  </details>`;
}
function summaryBlock(m){
  const regular=(m.InningsSummaries||[]).filter(i=>!i.IsSuperOver);
  const scores=regular.length?`<div class="fixture-score-summary">${regular.map(i=>`
    <div class="fixture-score-line">
      <span>${teamFlagImg(i.BattingTeam)}<strong>${esc(i.BattingTeam||"")}</strong></span>
      <b>${Number(i.Runs||0)}/${Number(i.Wickets||0)}${i.Declared?"d":""}</b>
      <small>${oversFromBalls(i.Balls)} ov</small>
    </div>`).join("")}</div>`:"";

  const perf=[];
  if(m.TopBatting) perf.push(`<a href="player.html?playerID=${encodeURIComponent(m.TopBatting.PlayerID)}"><span>Top Batting</span><strong>${esc(m.TopBatting.FullName)}</strong><b>${m.TopBatting.Runs} (${m.TopBatting.Balls})</b></a>`);
  if(m.TopBowling) perf.push(`<a href="player.html?playerID=${encodeURIComponent(m.TopBowling.PlayerID)}"><span>Top Bowling</span><strong>${esc(m.TopBowling.FullName)}</strong><b>${m.TopBowling.Wickets}/${m.TopBowling.RunsConceded}</b></a>`);
  return scores+(perf.length?`<div class="fixture-performers">${perf.join("")}</div>`:"")+overComparisonBlock(m);
}
function matchCard(m) {
  const done = isCompleted(m);
  const opp = opponent(m) || "Opponent TBC";
  return `<article class="fixture-card ${done ? "completed" : "upcoming"}">
    <div class="fixture-card-top">
      <div><span class="match-badge">${esc(m.Format || "—")}</span>${badges(m)}</div>
      <span class="fixture-status ${done ? "result" : "scheduled"}">${done ? "RESULT" : "FIXTURE"}</span>
    </div>
    <div class="fixture-match-kicker">
      
      <span>${esc(niceDate(m.MatchDate))}${m.MatchEndDate && m.MatchEndDate !== m.MatchDate ? " – " + esc(niceDate(m.MatchEndDate)) : ""}</span>
    </div>
    <div class="fixture-teams visual-team-block">
      <div class="fixture-team-row">
        <span class="fixture-team-flag">${teamFlagImg(m.Team1)}</span>
        <strong>${esc(m.Team1 || "Team 1")}</strong>
      </div>
      <span class="fixture-vs">VS</span>
      <div class="fixture-team-row">
        <span class="fixture-team-flag">${teamFlagImg(m.Team2)}</span>
        <strong>${esc(m.Team2 || "Team 2")}</strong>
      </div>
    </div>
    <div class="fixture-result">${done ? esc(resultText(m)) : esc(m.MatchStatus || "Scheduled")}</div>
    ${done ? summaryBlock(m) : ""}
    <div class="fixture-meta">
      <span>${esc(m.Venue || "Venue TBC")}</span>
      ${m.City ? `<span>${esc(m.City)}</span>` : ""}
      ${m.MatchNumberInSeries ? `<span>${esc(m.MatchNumberInSeries)}</span>` : ""}
    </div>
    <div class="fixture-card-footer">
      <span>${esc(m.MatchID || "")}</span>
      ${m.MatchID ? `<a class="match-link" href="match.html?matchID=${encodeURIComponent(m.MatchID)}">${done ? "View Full Scorecard" : "Match Details"} →</a>` : ""}
    </div>
  </article>`;
}
function populateOpponents() {
  const select = $("opponentFilter");
  const values = [...new Set(matches.map(opponent).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  select.innerHTML = '<option value="">All Opponents</option>' + values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
}
function filteredMatches() {
  const format = $("formatFilter").value;
  const opp = $("opponentFilter").value;
  const month = $("monthFilter").value;
  return matches.filter(m => {
    if (currentView === "results" && !isCompleted(m)) return false;
    if (currentView === "upcoming" && isCompleted(m)) return false;
    if (format && norm(m.Format) !== norm(format)) return false;
    if (opp && norm(opponent(m)) !== norm(opp)) return false;
    if (month && String(m.MatchDate || "").slice(0,7) !== month) return false;
    return true;
  }).sort((a,b) => {
    const da = parseDate(a.MatchDate), db = parseDate(b.MatchDate);
    if (currentView === "upcoming") return (da?.getTime()||0) - (db?.getTime()||0);
    return (db?.getTime()||0) - (da?.getTime()||0);
  });
}

function seriesStatusLabel(meta, group){
  const explicit=String(meta.SeriesStatus||"").trim();
  if(explicit)return explicit;
  if(group.every(isCompleted))return"Completed";
  if(group.some(isCompleted))return"Ongoing";
  return"Upcoming";
}
function seriesDateRange(meta, group){
  const start=meta.StartDate || group.map(x=>x.MatchDate).filter(Boolean).sort()[0] || "";
  const end=meta.EndDate || group.map(x=>x.MatchEndDate||x.MatchDate).filter(Boolean).sort().slice(-1)[0] || "";
  if(!start&&!end)return"";
  if(start&&end&&String(start)!==String(end))return `${niceDate(start)} — ${niceDate(end)}`;
  return niceDate(start||end);
}
function seriesAwards(meta){
  const winner=String(meta.Winner||"").trim();
  const pos=String(meta.PlayerOfSeries||meta.PlayerOfTournament||meta.PlayerOfTheSeries||"").trim();
  if(!winner&&!pos)return"";
  return `<div class="series-awards">
    ${winner?`<div class="series-award-card winner-card">
      <div class="series-award-icon">🏆</div>
      <div><span>Series Winner</span><strong>${esc(winner)}</strong></div>
    </div>`:""}
    ${pos?`<div class="series-award-card">
      <div class="series-award-icon">★</div>
      <div><span>Player of the Series</span><strong>${esc(pos)}</strong></div>
    </div>`:""}
  </div>`;
}
function seriesSummary(meta, group){
  const chips=[];
  if(meta.Format)chips.push(meta.Format);
  if(meta.HostCountry)chips.push(meta.HostCountry);
  const range=seriesDateRange(meta,group);
  if(range)chips.push(range);
  chips.push(`${group.length} match${group.length===1?"":"es"}`);
  return chips.map(x=>`<span>${esc(x)}</span>`).join("");
}

function render() {
  const list = filteredMatches();
  $("matchCount").textContent = `${list.length} match${list.length === 1 ? "" : "es"}`;

  const labels = [];
  if ($("formatFilter").value) labels.push($("formatFilter").value);
  if ($("opponentFilter").value) labels.push("vs " + $("opponentFilter").value);
  if ($("monthFilter").value) labels.push($("monthFilter").value);
  $("filterSummary").textContent = labels.length ? labels.join(" • ") : "Sri Lanka Men's International Cricket";

  $("seriesGroups").hidden = !list.length;
  $("fixturesEmpty").hidden = !!list.length;
  if (!list.length) { $("seriesGroups").innerHTML = ""; return; }

  const groups = {};
  list.forEach(m => {
    const key = m.SeriesID || "__other";
    (groups[key] ||= []).push(m);
  });

  const keys = Object.keys(groups).sort((a,b) => {
    const da = parseDate(groups[a][0]?.MatchDate), db = parseDate(groups[b][0]?.MatchDate);
    return currentView === "upcoming" ? (da?.getTime()||0)-(db?.getTime()||0) : (db?.getTime()||0)-(da?.getTime()||0);
  });

  $("seriesGroups").innerHTML = keys.map(key => {
    const meta = seriesMeta(key === "__other" ? "" : key);
    const name = seriesName(key === "__other" ? "" : key);
    const type = meta.CompetitionType || meta.CompetitionName || "Series / Tournament";
    const status = seriesStatusLabel(meta, groups[key]);

    return `<section class="series-block series-block-v3">
      <div class="series-overview">
        <div class="series-overview-main">
          <div class="series-title-row">
            <div>
              <p class="eyebrow">${esc(type)}</p>
              <h2>${esc(name)}</h2>
            </div>
            <span class="series-status-pill ${norm(status).replace(/\s+/g,"-")}">${esc(status)}</span>
          </div>
          <div class="series-info-chips">${seriesSummary(meta, groups[key])}</div>
        </div>
        ${seriesAwards(meta)}
      </div>

      <div class="series-matches-heading">
        <strong>Matches</strong>
        <span>${groups[key].filter(isCompleted).length} completed · ${groups[key].filter(x=>!isCompleted(x)).length} upcoming</span>
      </div>

      <div class="fixture-grid fixture-grid-organized">${groups[key].map(matchCard).join("")}</div>
    </section>`;
  }).join("");
}
async function api(action, params={}) {
  const url = new URL(API_BASE);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k,v]) => v !== "" && v != null && url.searchParams.set(k,v));
  const r = await fetch(url);
  const j = await r.json();
  if (!j.success) throw new Error(j.error || "API request failed");
  return j.data;
}
async function init() {
  try {
    const [m,s] = await Promise.all([api("fixturesSummary"), api("series")]);
    matches = Array.isArray(m) ? m : [];
    series = Array.isArray(s) ? s : [];
    populateOpponents();
    $("fixturesLoading").hidden = true;
    render();
  } catch (e) {
    $("fixturesLoading").hidden = true;
    $("fixturesError").hidden = false;
    $("fixturesError").textContent = "Could not load fixtures: " + e.message;
  }
}
document.querySelectorAll(".fixture-view").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".fixture-view").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  currentView = btn.dataset.view;
  render();
}));
["formatFilter","opponentFilter","monthFilter"].forEach(id => $(id).addEventListener("change", render));
$("clearFilters").addEventListener("click", () => {
  $("formatFilter").value = "";
  $("opponentFilter").value = "";
  $("monthFilter").value = "";
  render();
});
init();




const TEAM_FLAG_CODES = {
  "sri lanka":"lk",
  "india":"in",
  "pakistan":"pk",
  "bangladesh":"bd",
  "afghanistan":"af",
  "england":"gb-eng",
  "australia":"au",
  "new zealand":"nz",
  "south africa":"za",
  "zimbabwe":"zw",
  "ireland":"ie",
  "netherlands":"nl",
  "nepal":"np",
  "scotland":"gb-sct",
  "united states of america":"us",
  "usa":"us",
  "canada":"ca",
  "oman":"om",
  "uae":"ae",
  "united arab emirates":"ae"
};
function teamFlagCode(name){
  return TEAM_FLAG_CODES[String(name||"").trim().toLowerCase()] || "";
}
function teamFlagImg(name, cls="country-flag-img"){
  const key=String(name||"").trim().toLowerCase();
  if(key==="west indies"){
    return `<img class="${cls} special-team-logo" src="images/teams/Cricket_West_Indies_Logo_2017.svg" alt="West Indies cricket logo">`;
  }
  const c=teamFlagCode(name);
  if(!c) return `<span class="${cls} flag-fallback">🏏</span>`;
  return `<img class="${cls}" src="https://flagcdn.com/w80/${c}.png" srcset="https://flagcdn.com/w160/${c}.png 2x" alt="${esc(name)} flag">`;
}
