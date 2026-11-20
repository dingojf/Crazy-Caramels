(() => {
  const initialStock={single:90,bag:24,mint:30};
  const lowStock={single:18,bag:5,mint:6};
  const productNames={single:"Regular singles",bag:"Gift bags",mint:"Peppermint singles"};
  const money=n=>"$"+Number(n||0).toFixed(2);
  let soundOn=localStorage.getItem("ccOrderSound")!=="off";
  let audio=null,knownOrderIds=null,fetching=false;
  const style=document.createElement("style");
  style.textContent=`
    .biz-panel{margin:18px 0;padding:18px;background:#fffaf1;border:2px solid #d2a16e;border-radius:14px;color:#3d2115}
    .biz-panel h2{margin:0 0 14px;color:#6b351b}
    .biz-stats{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px}
    .biz-stat{background:#fff;border:1px solid #e0c29e;border-radius:11px;padding:13px}
    .biz-stat small{display:block;color:#76533d;font-weight:700;margin-bottom:6px}
    .biz-stat strong{font-size:clamp(21px,2.5vw,30px);color:#6b351b}
    .biz-stock{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:10px}
    .biz-stock-item{background:#fff;border:1px solid #e0c29e;border-radius:11px;padding:13px}
    .biz-stock-item strong{display:block;font-size:23px;color:#6b351b;margin:5px 0}
    .biz-stock-item small{color:#76533d}
    .biz-low{border-color:#b7352d;background:#fff0ed}
    .biz-warning{color:#a12620;font-weight:800;margin:10px 0}
    .biz-tools{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0}
    .biz-tools button{border:0;border-radius:9px;padding:10px 14px;background:#8b6547;color:white;font-weight:800;cursor:pointer}
    @media(max-width:700px){.biz-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.biz-stock{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
  const dash=document.getElementById("dashboard");
  if(!dash)return;
  const panel=document.createElement("section");
  panel.className="biz-panel";panel.id="businessDashboard";
  panel.innerHTML=`
    <div class="biz-tools"><h2>Business Overview</h2><button id="toggleOrderSound" type="button"></button></div>
    <div class="biz-stats">
      <div class="biz-stat"><small>Today's sales</small><strong id="bizSales">$0.00</strong></div>
      <div class="biz-stat"><small>Today's orders</small><strong id="bizOrders">0</strong></div>
      <div class="biz-stat"><small>Today's donations</small><strong id="bizDonations">$0.00</strong></div>
      <div class="biz-stat"><small>Best seller</small><strong id="bizBest" style="font-size:20px">No sales yet</strong></div>
    </div>
    <h2 style="margin-top:20px">Inventory Remaining</h2>
    <div class="biz-stock" id="bizStock"></div>
    <div class="biz-warning" id="bizWarnings" role="status"></div>
    <div class="biz-tools"><small id="bizUpdated">Waiting for inventory…</small><button id="bizRefresh" type="button">Refresh Overview</button></div>
  `;
  const adminReviews=document.getElementById("adminReviewSection");
  dash.insertBefore(panel,adminReviews||null);
  const soundButton=document.getElementById("toggleOrderSound");
  function updateSoundButton(){soundButton.textContent="New-order sound: "+(soundOn?"ON":"OFF");}
  updateSoundButton();
  function unlockAudio(){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    try{if(!audio)audio=new Ctx();if(audio.state==="suspended")audio.resume();}catch(e){}
  }
  document.addEventListener("pointerdown",()=>{if(document.body.classList.contains("dash"))unlockAudio();},{passive:true});
  function ding(){
    if(!soundOn)return;unlockAudio();if(!audio||audio.state!=="running")return;
    try{
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type="sine";osc.frequency.setValueAtTime(880,audio.currentTime);
      osc.frequency.setValueAtTime(1175,audio.currentTime+.12);
      gain.gain.setValueAtTime(.0001,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.18,audio.currentTime+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.42);
      osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.44);
    }catch(e){}
  }
  soundButton.addEventListener("click",()=>{soundOn=!soundOn;localStorage.setItem("ccOrderSound",soundOn?"on":"off");updateSoundButton();if(soundOn){unlockAudio();ding();}});
  function soldFrom(rows){
    const sold={single:0,bag:0,mint:0};
    rows.forEach(o=>{const items=o.items||{};for(const k of Object.keys(sold))sold[k]+=Math.max(0,Number(items[k])||0);});
    return sold;
  }
  function remaining(rows){
    const sold=soldFrom(rows),left={};
    Object.keys(initialStock).forEach(k=>left[k]=Math.max(0,initialStock[k]-sold[k]));
    return left;
  }
  function showStock(left){
    const el=document.getElementById("bizStock");
    el.innerHTML=Object.keys(initialStock).map(k=>{
      const low=left[k]<=lowStock[k];
      return '<div class="biz-stock-item '+(low?'biz-low':'')+'"><small>'+productNames[k]+'</small><strong>'+left[k]+' left</strong><small>Started with '+initialStock[k]+'</small></div>';
    }).join("");
    const warnings=Object.keys(left).filter(k=>left[k]<=lowStock[k]).map(k=>left[k]===0?productNames[k]+" are sold out":productNames[k]+" are running low");
    document.getElementById("bizWarnings").textContent=warnings.length?"Stock alert: "+warnings.join(" · "):"Stock levels look good.";
  }
  async function refresh(){
    if(fetching||!db)return;fetching=true;
    try{
      const {data,error}=await db.from("orders").select("id,items,total,created_at").order("created_at",{ascending:false}).limit(5000);
      if(error)throw error;
      const rows=data||[];
      if(knownOrderIds!==null){
        const newRows=rows.filter(o=>!knownOrderIds.has(String(o.id)));
        if(newRows.length)ding();
      }
      knownOrderIds=new Set(rows.map(o=>String(o.id)));
      const today=new Date();const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
      const todayRows=rows.filter(o=>new Date(o.created_at).getTime()>=start);
      let sales=0,donations=0;
      todayRows.forEach(o=>{
        const items=o.items||{};
        sales+=(Number(items.single)||0)+(Number(items.mint)||0)+(Number(items.bag)||0)*6;
        donations+=Number(items.donation)||0;
      });
      document.getElementById("bizSales").textContent=money(sales);
      document.getElementById("bizOrders").textContent=String(todayRows.length);
      document.getElementById("bizDonations").textContent=money(donations);
      const counts=soldFrom(rows);
      const best=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      document.getElementById("bizBest").textContent=counts[best]>0?productNames[best]:"No sales yet";
      const left=remaining(rows);showStock(left);
      document.getElementById("bizUpdated").textContent="Updated "+new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    }catch(e){document.getElementById("bizUpdated").textContent="Couldn't refresh overview. Try again.";}
    finally{fetching=false;}
  }
  document.getElementById("bizRefresh").addEventListener("click",refresh);
  document.getElementById("bizRefresh").addEventListener("click",()=>{});
  if(document.body.classList.contains("dash")){refresh();setInterval(()=>{if(document.body.classList.contains("dash"))refresh();},5000);}
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&document.body.classList.contains("dash"))refresh();});

  // Check stock again at checkout so customers cannot submit more than the remaining count.
  let checkingOrder=false,passThrough=false;
  document.addEventListener("click",async e=>{
    const button=e.target.closest&&e.target.closest("#place");
    if(!button||passThrough)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(checkingOrder)return;
    if(!db){alert("The order system is not connected. Please ask us for help.");return;}
    checkingOrder=true;button.disabled=true;
    try{
      const {data,error}=await db.from("orders").select("items").limit(5000);
      if(error)throw error;
      const left=remaining(data||[]);
      const wanted={single:Number(qty.single)||0,bag:Number(qty.bag)||0,mint:Number(qty.mint)||0};
      const short=Object.keys(wanted).filter(k=>wanted[k]>left[k]);
      if(short.length){alert("Sorry! We only have "+short.map(k=>left[k]+" "+productNames[k].toLowerCase()).join(", ")+" remaining. Please change your order.");button.disabled=false;return;}
      passThrough=true;button.disabled=false;button.click();passThrough=false;
    }catch(err){button.disabled=false;alert("We couldn't check stock right now. Please try placing your order again in a moment.");}
    finally{checkingOrder=false;passThrough=false;}
  },true);
})();