const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";
const $=x=>document.getElementById(x), n=v=>Number(v||0), val=v=>(v===null||v===undefined||v==="")?"—":v;
async function load(){
 try{
  const u=new URL(API_BASE);u.searchParams.set("action","teamStatsPage");u.searchParams.set("team","Sri Lanka");
  if($("tsFormat").value)u.searchParams.set("format",$("tsFormat").value);
  if($("tsPeriod").value)u.searchParams.set("periodType",$("tsPeriod").value);
  const r=await fetch(u,{cache:"no-store"}),j=await r.json();if(!j.success)throw Error(j.error||"API error");
  const rows=j.data.stats||[];
  if(!rows.length){$("tsState").hidden=false;$("tsState").textContent="No Team_Stats row matches this selection."; $("tsContent").hidden=true;return}
  const s=[...rows].sort((a,b)=>new Date(b.PeriodEndDate||b.LastUpdated||0)-new Date(a.PeriodEndDate||a.LastUpdated||0))[0];
  render(s);$("tsState").hidden=true;$("tsContent").hidden=false;
 }catch(e){$("tsState").hidden=false;$("tsState").textContent="Could not load team statistics: "+e.message;$("tsContent").hidden=true}
}
function card(l,v){return`<div class="analysis-stat"><span>${l}</span><strong>${val(v)}</strong></div>`}
function bar(label,value,total){
 const p=total?Math.max(0,Math.min(100,value/total*100)):0;
 return`<div class="ts-bar-row"><div><span>${label}</span><strong>${value}</strong></div><div class="ts-track"><i style="width:${p}%"></i></div></div>`;
}
function render(s){
 $("tsTitle").textContent=`${s.Format||"All Format"} Team Overview`;
 $("tsPeriodText").textContent=[s.PeriodType,s.PeriodStartDate,s.PeriodEndDate].filter(Boolean).join(" · ")||"Sri Lanka";
 $("tsRecord").textContent=`${n(s.Won)}W · ${n(s.Lost)}L · ${n(s.Draw)}D · ${n(s.Tie)}T · ${n(s.NoResult)}NR`;
 $("tsSummary").innerHTML=[
  card("Matches",s.Matches),card("Won",s.Won),card("Lost",s.Lost),card("Win %",s.WinPercentage),
  card("Draw",s.Draw),card("Tie",s.Tie),card("No Result",s.NoResult),card("Toss Won",s.TossWon)
 ].join("");
 const matches=n(s.Matches);
 $("resultsChart").innerHTML=bar("Won",n(s.Won),matches)+bar("Lost",n(s.Lost),matches)+bar("Draw",n(s.Draw),matches)+bar("Tie / NR",n(s.Tie)+n(s.NoResult),matches);
 const decisions=n(s.BatFirst)+n(s.BowlFirst);
 $("decisionChart").innerHTML=bar("Batted First",n(s.BatFirst),decisions)+bar("Bowled First",n(s.BowlFirst),decisions)+
  `<div class="ts-mini-grid">${card("Bat First Wins",s.BatFirstWon)}${card("Bat First Win %",s.BatFirstWinPercentage)}${card("Bowl First Wins",s.BowlFirstWon)}${card("Bowl First Win %",s.BowlFirstWinPercentage)}</div>`;
 $("chaseStats").innerHTML=`<div class="ts-feature-numbers">${card("Successful Chases",s.SuccessfulChases)}${card("Successful Defences",s.SuccessfulDefences)}</div>`;
 $("tossStats").innerHTML=`<div class="ts-feature-numbers">${card("Toss Won",s.TossWon)}${card("Toss Lost",s.TossLost)}</div>`+bar("Toss Win Rate",n(s.TossWon),n(s.TossWon)+n(s.TossLost));
 $("scoreRecords").innerHTML=`<div class="ts-record-grid">
 ${card("Highest Score",s.HighestScore)}${card("Lowest Score",s.LowestScore)}
 ${card("Highest Conceded",s.HighestScoreConceded)}${card("Lowest Conceded",s.LowestScoreConceded)}
 </div>`;
 $("specialStats").innerHTML=`<div class="ts-feature-numbers">${card("DLS Matches",s.DLSMatches)}${card("Super Over Matches",s.SuperOverMatches)}</div>`;
}
$("tsFormat").addEventListener("change",load);$("tsPeriod").addEventListener("change",load);load();