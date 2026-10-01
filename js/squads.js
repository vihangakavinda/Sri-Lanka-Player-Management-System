const API_BASE="https://script.google.com/macros/s/AKfycbyFh2z7XzHtYcYRPSHY5B4T4v5W2ciycnovExzNKZSAZl8H7dfunMNv0buDJKOU_3Cd/exec";

let DATA={squads:[],series:[]};

const $=id=>document.getElementById(id);
const clean=v=>v==null?"":String(v).trim();
const eq=(a,b)=>clean(a).toLowerCase()===clean(b).toLowerCase();
const truthy=v=>v===true||clean(v).toUpperCase()==="TRUE";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function parseDate(v){
  if(!v)return null;
  const s=clean(v),d=new Date(s.length===10?s+"T00:00:00":s);
  return isNaN(d)?null:d;
}
function niceDate(v){
  const d=parseDate(v);
  return d?d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"";
}
function placeholder(name){
  const initials=clean(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"SL";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="100%" height="100%" fill="#11233c"/><text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="62" font-weight="700" fill="#f2bf34">${initials}</text></svg>`;
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

function populateSeries(){
  const sel=$("seriesFilter");
  const list=[...DATA.series].sort((a,b)=>(parseDate(b.StartDate)?.getTime()||0)-(parseDate(a.StartDate)?.getTime()||0));
  sel.innerHTML='<option value="">All Series</option>'+list.map(s=>`<option value="${esc(s.SeriesID)}">${esc(s.SeriesName||s.CompetitionName||s.SeriesID)}</option>`).join("");
}

function filtered(){
  const sid=$("seriesFilter").value;
  const format=$("formatFilter").value;
  const type=$("typeFilter").value;
  const status=$("statusFilter").value;

  return DATA.squads.filter(x=>{
    if(sid&&!eq(x.SeriesID,sid))return false;
    if(format&&!eq(x.Format,format))return false;
    if(type&&normalizedSquadType(x.SquadType)!==clean(type).toLowerCase())return false;
    if(status==="active"&&!entryIsActive(x))return false;
    if(status==="inactive"&&entryIsActive(x))return false;
    return true;
  });
}


function normalizedSquadType(v){
  const s=clean(v).toLowerCase();
  if(!s)return"main";
  if(s.includes("replace"))return"replacement";
  if(s.includes("reserve")||s.includes("standby")||s.includes("stand-by"))return"reserve";
  if(s.includes("main")||s.includes("squad"))return"main";
  return"other";
}
function entryIsActive(x){
  const flag=clean(x.IsActive).toUpperCase();
  if(flag==="TRUE")return true;
  if(flag==="FALSE")return false;
  return true; // blank means current unless explicitly inactive
}
function squadRoleOrder(x){
  if(truthy(x.IsCaptain))return 0;
  if(truthy(x.IsViceCaptain))return 1;
  if(truthy(x.IsWicketKeeper))return 2;
  return 3;
}
function roleFlags(x){
  const flags=[];
  if(truthy(x.IsCaptain))flags.push('<span class="squad-flag captain">C</span>');
  if(truthy(x.IsViceCaptain))flags.push('<span class="squad-flag vice">VC</span>');
  if(truthy(x.IsWicketKeeper))flags.push('<span class="squad-flag keeper">WK</span>');
  return flags.join("");
}

function playerCard(x){
  const tags=[];
  if(truthy(x.IsCaptain))tags.push('<span class="squad-role-tag captain">Captain</span>');
  if(truthy(x.IsViceCaptain))tags.push('<span class="squad-role-tag vice">Vice Captain</span>');
  if(truthy(x.IsWicketKeeper))tags.push('<span class="squad-role-tag keeper">Wicketkeeper</span>');

  return `<a class="squad-player-card squad-player-card-v2" href="player.html?playerID=${encodeURIComponent(clean(x.PlayerID))}">
    <div class="squad-player-photo">
      <img src="${esc(photo(x.PhotoURL,x.FullName))}" alt="${esc(x.FullName||"Player")}" onerror="this.src='${placeholder(x.FullName)}'">
      <div class="squad-player-flags">${roleFlags(x)}</div>
    </div>
    <div class="squad-player-body">
      <div class="squad-player-name-row">
        <h3>${esc(x.FullName||x.PlayerID)}</h3>
        ${!entryIsActive(x)?'<span class="inactive-dot">Inactive</span>':""}
      </div>
      <p>${esc(x.PlayingRole||x.Role||"Sri Lanka")}</p>
      ${tags.length?`<div class="squad-role-tags">${tags.join("")}</div>`:""}
      <div class="squad-player-meta">
        ${clean(x.Role)&&!eq(x.Role,x.PlayingRole)?`<span>${esc(x.Role)}</span>`:""}
        ${x.AnnouncementDate?`<span>${esc(niceDate(x.AnnouncementDate))}</span>`:""}
      </div>
    </div>
  </a>`;
}

function seriesInfo(rows){
  const x=rows[0]||{};
  const dates=[niceDate(x.SeriesStartDate),niceDate(x.SeriesEndDate)].filter(Boolean).join(" – ");
  return `<div class="squad-series-info">
    ${x.Format?`<span>${esc(x.Format)}</span>`:""}
    ${x.HostCountry?`<span>${esc(x.HostCountry)}</span>`:""}
    ${dates?`<span>${esc(dates)}</span>`:""}
    ${x.SeriesStatus?`<span class="series-status">${esc(x.SeriesStatus)}</span>`:""}
  </div>`;
}

function render(){
  const rows=filtered();
  $("squadCount").textContent=`${rows.length} squad entr${rows.length===1?"y":"ies"}`;
  $("squadGroups").hidden=!rows.length;
  $("squadEmpty").hidden=!!rows.length;
  if(!rows.length){$("squadGroups").innerHTML="";return;}

  const groups={};
  rows.forEach(x=>{
    const key=clean(x.SeriesID)||"__unknown";
    (groups[key] ||= []).push(x);
  });

  const keys=Object.keys(groups).sort((a,b)=>{
    const da=parseDate(groups[a][0]?.SeriesStartDate),db=parseDate(groups[b][0]?.SeriesStartDate);
    return (db?.getTime()||0)-(da?.getTime()||0);
  });

  $("squadGroups").innerHTML=keys.map(key=>{
    const list=groups[key].sort((a,b)=>{
      const ro=squadRoleOrder(a)-squadRoleOrder(b);
      if(ro!==0)return ro;
      return clean(a.FullName).localeCompare(clean(b.FullName));
    });
    const x=list[0];
    const main=list.filter(r=>normalizedSquadType(r.SquadType)==="main");
    const reserve=list.filter(r=>normalizedSquadType(r.SquadType)==="reserve");
    const replacement=list.filter(r=>normalizedSquadType(r.SquadType)==="replacement");
    const other=list.filter(r=>normalizedSquadType(r.SquadType)==="other");

    function section(title,arr){
      if(!arr.length)return"";
      return `<div class="squad-type-block"><h3>${title}<span>${arr.length}</span></h3><div class="squad-player-grid">${arr.map(playerCard).join("")}</div></div>`;
    }

    return `<section class="squad-series-block">
      <div class="squad-series-head">
        <div><p class="eyebrow">${esc(x.CompetitionType||x.CompetitionName||"Series / Tournament")}</p><h2>${esc(x.SeriesName||x.SeriesID||"Squad")}</h2></div>
        ${seriesInfo(list)}
      </div>
      <div class="squad-series-summary">
        <span><strong>${list.length}</strong> Players</span>
        <span><strong>${main.length}</strong> Main</span>
        ${reserve.length?`<span><strong>${reserve.length}</strong> Reserves</span>`:""}
        ${replacement.length?`<span><strong>${replacement.length}</strong> Replacements</span>`:""}
      </div>
      ${section("Main Squad",main)}
      ${section("Reserves",reserve)}
      ${section("Replacements",replacement)}
      ${section("Other Squad Entries",other)}
    </section>`;
  }).join("");
}

async function init(){
  try{
    const r=await fetch(`${API_BASE}?action=squads`,{cache:"no-store"});
    const j=await r.json();
    if(!j.success)throw new Error(j.error||"API request failed");
    DATA=j.data||DATA;
    DATA.squads=Array.isArray(DATA.squads)?DATA.squads:[];
    DATA.series=Array.isArray(DATA.series)?DATA.series:[];
    populateSeries();
    $("squadLoading").hidden=true;
    render();
  }catch(e){
    $("squadLoading").hidden=true;
    $("squadError").hidden=false;
    $("squadError").textContent="Could not load squads: "+e.message;
  }
}

["seriesFilter","formatFilter","typeFilter","statusFilter"].forEach(id=>$(id).addEventListener("change",render));
$("clearSquadFilters").addEventListener("click",()=>{
  $("seriesFilter").value="";
  $("formatFilter").value="";
  $("typeFilter").value="";
  $("statusFilter").value="";
  render();
});

init();
