const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";
const $=id=>document.getElementById(id);
const clean=v=>v==null?"":String(v).trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let PLAYERS=[];

async function api(action,params={}){
  const u=new URL(API_BASE);u.searchParams.set("action",action);
  Object.entries(params).forEach(([k,v])=>{if(clean(v))u.searchParams.set(k,v)});
  const r=await fetch(u,{cache:"no-store"});const j=await r.json();
  if(!j.success)throw new Error(j.error||"API error");return j.data;
}
function optionList(id,items,labelFn=x=>x,valueFn=x=>x){
  const s=$(id),base=s.options[0]?.outerHTML||'<option value="">All</option>';
  s.innerHTML=base+items.map(x=>`<option value="${esc(valueFn(x))}">${esc(labelFn(x))}</option>`).join("");
}
async function loadPlayers(){
  const rows=await api("players");PLAYERS=Array.isArray(rows)?rows:[];
  $("playerSelect").innerHTML='<option value="">Select player</option>'+PLAYERS.map(p=>`<option value="${esc(p.PlayerID)}">${esc(p.FullName||p.ShortName||p.PlayerID)}</option>`).join("");
  const q=new URLSearchParams(location.search).get("playerID");if(q){$("playerSelect").value=q;await playerChanged();}
}
async function playerChanged(){
  const id=$("playerSelect").value;
  if(!id){$("analysisResult").hidden=true;$("analysisState").hidden=false;$("analysisState").textContent="Select a player to begin analysis.";return}
  try{
    const o=await api("analysisOptions",{playerID:id});
    optionList("opponentSelect",o.opponents||[]);
    optionList("venueSelect",o.venues||[]);
    optionList("countrySelect",o.countries||[]);
    optionList("seriesSelect",o.series||[],x=>x.SeriesName,x=>x.SeriesID);
    optionList("resultSelect",o.results||[]);
    optionList("positionSelect",o.battingPositions||[],x=>`Position ${x}`);
    optionList("inningsSelect",o.inningsNumbers||[],x=>`Innings ${x}`);
    await runAnalysis();
  }catch(e){$("analysisState").hidden=false;$("analysisState").textContent=e.message}
}
function params(){
  return {
    playerID:$("playerSelect").value,format:$("formatSelect").value,opponent:$("opponentSelect").value,
    venue:$("venueSelect").value,country:$("countrySelect").value,seriesID:$("seriesSelect").value,
    homeAway:$("homeAwaySelect").value,result:$("resultSelect").value,battingPosition:$("positionSelect").value,
    inningsNumber:$("inningsSelect").value,startDate:$("startDate").value,endDate:$("endDate").value
  };
}
function stat(label,value,em=false){return`<div class="analysis-stat ${em?"em":""}"><span>${label}</span><strong>${value??"—"}</strong></div>`}
async function runAnalysis(){
  const p=params();if(!p.playerID)return;
  try{
    $("analysisState").hidden=false;$("analysisState").textContent="Calculating filtered statistics…";$("analysisResult").hidden=true;
    const s=await api("playerSplit",p);
    const pl=PLAYERS.find(x=>clean(x.PlayerID)===p.playerID)||{};
    $("analysisTitle").textContent=pl.FullName||p.playerID;
    const filters=Object.entries(p).filter(([k,v])=>k!=="playerID"&&clean(v)).map(([k,v])=>v);
    $("analysisSubtitle").textContent=filters.length?filters.join(" · "):"All entered matches from 2026 onward";
    $("analysisMatches").textContent=`${s.Matches||0} match${Number(s.Matches)===1?"":"es"}`;

    $("analysisSummary").innerHTML=[
      stat("Matches",s.Matches,true),stat("Runs",s.Runs,true),stat("Wickets",s.Wickets,true),
      stat("Catches",s.Catches),stat("100s",s.Hundreds),stat("50s",s.Fifties)
    ].join("");

    $("battingAnalysis").innerHTML='<div class="analysis-stat-grid">'+[
      stat("Innings",s.BattingInnings),stat("Not Outs",s.NotOuts),stat("Runs",s.Runs,true),
      stat("Highest Score",s.HighestScore),stat("Average",s.BattingAverage,true),stat("Strike Rate",s.BattingStrikeRate,true),
      stat("Balls Faced",s.BallsFaced),stat("100s",s.Hundreds),stat("50s",s.Fifties),stat("Ducks",s.Ducks),
      stat("Fours",s.Fours),stat("Sixes",s.Sixes)
    ].join("")+'</div>';

    $("bowlingAnalysis").innerHTML='<div class="analysis-stat-grid">'+[
      stat("Innings",s.BowlingInnings),stat("Wickets",s.Wickets,true),stat("Best Bowling",s.BestBowling||"—",true),
      stat("Average",s.BowlingAverage,true),stat("Economy",s.Economy,true),stat("Strike Rate",s.BowlingStrikeRate),
      stat("Balls",s.BallsBowled),stat("Maidens",s.Maidens),stat("Runs Conceded",s.RunsConceded),
      stat("3W",s.ThreeWicketHauls),stat("4W",s.FourWicketHauls),stat("5W",s.FiveWicketHauls)
    ].join("")+'</div>';

    $("fieldingAnalysis").innerHTML='<div class="analysis-stat-grid">'+[
      stat("Catches",s.Catches,true),stat("Stumpings",s.Stumpings),stat("Run Outs",s.RunOuts)
    ].join("")+'</div>';

    $("analysisState").hidden=true;$("analysisResult").hidden=false;
  }catch(e){$("analysisState").hidden=false;$("analysisState").textContent="Could not calculate analysis: "+e.message}
}
["formatSelect","opponentSelect","venueSelect","countrySelect","seriesSelect","homeAwaySelect","resultSelect","positionSelect","inningsSelect","startDate","endDate"].forEach(id=>$(id).addEventListener("change",runAnalysis));
$("playerSelect").addEventListener("change",playerChanged);
$("resetAnalysis").addEventListener("click",()=>{["formatSelect","opponentSelect","venueSelect","countrySelect","seriesSelect","homeAwaySelect","resultSelect","positionSelect","inningsSelect","startDate","endDate"].forEach(id=>$(id).value="");runAnalysis()});
loadPlayers().catch(e=>{$("analysisState").textContent=e.message});
