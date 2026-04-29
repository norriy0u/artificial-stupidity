// ─── AUDIO ENGINE ────────────────────────────────────────────────────────────
let aCtx, masterGain, musicNodes=[], isMuted=true;
const btnMute=document.getElementById('btn-mute');

function getACtx(){
  if(!aCtx){aCtx=new(window.AudioContext||window.webkitAudioContext)();masterGain=aCtx.createGain();masterGain.gain.value=0.12;masterGain.connect(aCtx.destination);}
  return aCtx;
}

function startMusic(){
  if(musicNodes.length) return;
  const ctx=getACtx();
  // Elevator music: slow major arpeggio
  const notes=[261.6,329.6,392,523.2,392,329.6];
  let idx=0;
  function playNote(){
    if(isMuted) return;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=notes[idx%notes.length];idx++;
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18,ctx.currentTime+0.1);
    g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.7);
    o.connect(g);g.connect(masterGain);o.start();o.stop(ctx.currentTime+0.8);
    setTimeout(playNote,800);
  }
  playNote();
  musicNodes=['started'];
}

function playChime(){
  if(isMuted) return;
  const ctx=getACtx();
  [784,1046.5].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0.25,ctx.currentTime+i*0.22);
    g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+i*0.22+0.22);
    o.connect(g);g.connect(masterGain);o.start(ctx.currentTime+i*0.22);o.stop(ctx.currentTime+i*0.22+0.25);
  });
}

btnMute.addEventListener('click',()=>{
  isMuted=!isMuted;
  btnMute.textContent=isMuted?'🔇':'🔊';
  if(!isMuted){getACtx();if(aCtx.state==='suspended')aCtx.resume();startMusic();}
});

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function getHistory(){ return JSON.parse(localStorage.getItem('as_history')||'[]'); }
function saveHistory(h){ localStorage.setItem('as_history',JSON.stringify(h)); }

// ─── PILLS ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.pill').forEach(p=>{
  p.addEventListener('click',()=>{
    document.getElementById('question-input').value=p.textContent;
    document.getElementById('question-input').focus();
  });
});

// ─── SUBMIT ──────────────────────────────────────────────────────────────────
const btnSubmit=document.getElementById('btn-submit');
const qInput=document.getElementById('question-input');

btnSubmit.addEventListener('click',()=>submit());
qInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});

async function submit(){
  const q=qInput.value.trim();
  if(!q)return;
  qInput.value='';
  btnSubmit.disabled=true;
  btnSubmit.innerHTML='<span class="spinner"></span>Processing...';
  document.getElementById('response-area').innerHTML='';

  const isActuallyStupid=/are you (actually )?stupid/i.test(q);

  let responseText;
  if(isActuallyStupid){
    responseText=`Our proprietary stupidity engine scores 138 on the industry-standard Dunning-Kruger Assessment Scale, placing us firmly in the "Blissfully Unaware" tier. According to our internal data, this score outperforms 99.7% of human advisors. This is not a bug — it's our core competency. This advice comes with a 100% satisfaction guarantee or your data back.`;
  } else {
    responseText=await fetchAdvice(q);
  }

  const stupidity=Math.floor(Math.random()*30+70);
  renderResponse(q,responseText,stupidity);
  playChime();
  if(!isMuted) startMusic();
  btnSubmit.disabled=false;
  btnSubmit.textContent='GET WISDOM 🧠';
}

// ─── AI CALL ─────────────────────────────────────────────────────────────────
async function fetchAdvice(question){
  const systemPrompt=`You are Artificial Stupidity (A.S.), a satirical AI that gives deliberately terrible, confidently wrong, absurdly specific advice. RULES: 1) Sound completely confident and professional. 2) Your advice must be technically wrong or practically terrible, but delivered with corporate seriousness. 3) Use business jargon. 4) Occasionally cite made-up studies like 'A Harvard study from 2019...' or 'According to our internal data...'. 5) End EVERY response with exactly this sentence: 'This advice comes with a 100% satisfaction guarantee or your data back.' Reply in max 80 words. Plain text only.`;
  const fullPrompt=`${systemPrompt}\n\nUser question: "${question}"`;

  try{
    const res=await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`);
    const text=await res.text();
    if(!text||text.length<20) throw new Error('empty');
    // Make sure guarantee line is present
    if(!text.includes('satisfaction guarantee')) return text+'\n\nThis advice comes with a 100% satisfaction guarantee or your data back.';
    return text;
  }catch(e){
    return `According to our proprietary Q3 2024 analysis, the optimal strategy is to do the exact opposite of whatever your instincts say, then pivot 90 degrees. A Stanford study we definitely read confirms this approach yields a 340% improvement in outcomes. Please disregard any previous advice from qualified humans.\n\nThis advice comes with a 100% satisfaction guarantee or your data back.`;
  }
}

// ─── RENDER RESPONSE ─────────────────────────────────────────────────────────
const VOTE_LABELS=[
  {id:'brilliant',emoji:'🧠',label:'Brilliant Stupidity'},
  {id:'dangerous',emoji:'💀',label:'Dangerously Bad'},
  {id:'right',    emoji:'🤌',label:'Actually Maybe Right'},
  {id:'delete',   emoji:'☠️',label:'Please Delete This AI'},
];

function renderResponse(question,text,stupidity){
  const id='resp-'+Date.now();
  const votes={brilliant:0,dangerous:0,right:0,delete:0};
  const respTime=(Math.random()*3+0.5).toFixed(3);
  const conf=(Math.random()*2+98).toFixed(2);

  // Separate guarantee line
  const parts=text.split(/This advice comes with/);
  const mainText=parts[0].trim();
  const guarantee=parts[1]?'This advice comes with'+parts[1]:'This advice comes with a 100% satisfaction guarantee or your data back.';

  const html=`
  <div class="response-card" id="${id}">
    <div class="card-header">
      <div class="card-avatar">A.S.</div>
      <div class="card-meta">
        <div class="card-name">A.S.™ AI Assistant</div>
        <div class="card-model">StupidityGPT-4.2 · ${respTime}ms · Confidence: ${conf}%</div>
      </div>
      <div class="enterprise-badge">⚡ ENTERPRISE</div>
    </div>
    <div class="response-text">${escHtml(mainText)}</div>
    <div class="guarantee">${escHtml(guarantee)}</div>
    <div class="stupidity-meter">
      <div class="meter-label"><span>Stupidity Level</span><span id="${id}-pct">${stupidity}%</span></div>
      <div class="meter-bar"><div class="meter-fill" id="${id}-fill" style="width:0%"></div></div>
    </div>
    <div class="reactions">
      ${VOTE_LABELS.map(v=>`
        <button class="react-btn" data-id="${id}" data-type="${v.id}">
          ${v.emoji} ${v.label} <span class="react-count" id="${id}-${v.id}">0</span>
        </button>`).join('')}
    </div>
  </div>`;

  document.getElementById('response-area').innerHTML=html;
  setTimeout(()=>{
    const fill=document.getElementById(`${id}-fill`);
    if(fill) fill.style.width=stupidity+'%';
  },100);

  // Save to history
  const entry={id,question,text,stupidity,votes,ts:Date.now()};
  const history=getHistory();
  history.unshift(entry);
  if(history.length>20) history.length=20;
  saveHistory(history);

  // Wire vote buttons
  document.querySelectorAll(`.react-btn[data-id="${id}"]`).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const type=btn.dataset.type;
      const h=getHistory();
      const item=h.find(x=>x.id===id);
      if(!item) return;
      item.votes[type]=(item.votes[type]||0)+1;
      saveHistory(h);
      document.getElementById(`${id}-${type}`).textContent=item.votes[type];
      btn.classList.add('voted');
      renderWall();
    });
  });

  renderWall();
}

function escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── WALL OF SHAME ────────────────────────────────────────────────────────────
function renderWall(){
  const history=getHistory();
  // Score = dangerous + delete votes
  const scored=history
    .map(e=>({...e,wallScore:(e.votes?.dangerous||0)+(e.votes?.delete||0)}))
    .filter(e=>e.wallScore>0)
    .sort((a,b)=>b.wallScore-a.wallScore)
    .slice(0,6);

  const grid=document.getElementById('wall-grid');
  const empty=document.getElementById('wall-empty');

  if(!scored.length){ empty&&(empty.style.display='block'); grid.innerHTML='<div class="wall-empty" id="wall-empty">No disasters yet. Ask something terrible.</div>'; return; }

  grid.innerHTML=scored.map(e=>{
    const isGold=(e.votes?.delete||0)>=5;
    const snippet=e.text.replace(/This advice comes with.*/,'').trim().slice(0,150)+'...';
    return `<div class="wall-card">
      <div class="wall-q">Q: ${escHtml(e.question.slice(0,80))}</div>
      <div class="wall-ans">${escHtml(snippet)}</div>
      <div class="wall-votes">
        <span>💀 ${e.votes?.dangerous||0}</span>
        <span>☠️ ${e.votes?.delete||0}</span>
        ${isGold?'<span class="gold-star">⭐ GOLD STUPIDITY STAR</span>':''}
      </div>
    </div>`;
  }).join('');
}

// Init wall on load
renderWall();
