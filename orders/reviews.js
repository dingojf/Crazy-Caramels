(() => {
  const style = document.createElement("style");
  style.textContent = `
    .review-overlay{position:fixed;inset:0;z-index:50;background:rgba(39,22,12,.72);display:none;align-items:center;justify-content:center;padding:16px;overflow:auto}
    .review-overlay.show{display:flex}
    .review-panel{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fffaf1;border:3px solid #6b351b;border-radius:18px;padding:22px;color:#3d2115;box-shadow:0 10px 35px #0005}
    .review-panel h2{margin:0 0 14px;color:#6b351b;font-size:28px}
    .review-panel label{display:block;font-weight:800;margin:12px 0 6px}
    .review-panel input,.review-panel textarea{width:100%;border:2px solid #b98b60;border-radius:9px;padding:12px;font:16px Arial;background:white;color:#3d2115}
    .review-panel textarea{min-height:110px;resize:vertical}
    .review-panel button,.review-inline button{border:0;border-radius:10px;padding:12px 16px;margin:10px 8px 0 0;background:#3f7148;color:white;font-weight:800;font-size:16px;cursor:pointer}
    .review-panel button.secondary,.review-inline button.secondary{background:#8b6547}
    .review-stars{display:flex;gap:7px;margin:8px 0}
    .review-stars button{font-size:32px;padding:4px 8px;margin:0;background:#ead9c5;color:#9b7a55}
    .review-stars button.selected{background:#f1c477;color:#6b351b}
    .review-entry{border:1px solid #d2a16e;border-radius:12px;padding:13px;margin:10px 0;background:white}
    .review-entry .stars{font-size:22px;color:#a96516}
    .review-entry p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}
    .review-entry small{color:#76533d;display:block;margin-top:4px}
    .review-error{color:#a12620;font-weight:700;margin-top:8px}
    .review-action{background:#c67d3b!important;color:white!important}
    .review-inline{margin-top:24px;padding:18px;background:#fffaf1;border:2px solid #d2a16e;border-radius:14px;color:#3d2115}
    .review-inline h2{color:#6b351b;margin:0 0 12px}
    .review-inline form{max-width:460px}
    .review-inline[hidden],#reviewAdminContent[hidden],#reviewAdminLogin[hidden]{display:none!important}
    .review-entry .approve{background:#3f7148}.review-entry .pending{color:#8a4b16;font-weight:800}
  `;
  document.head.appendChild(style);

  const customer = document.createElement("section");
  customer.id = "customerReviewOverlay"; customer.className = "review-overlay";
  customer.innerHTML = `<div class="review-panel">
    <h2>Leave a Review</h2><p>How were your Crazy Caramels?</p>
    <form id="customerReviewForm">
      <label>Your email</label><input id="reviewEmail" type="email" maxlength="254" autocomplete="email" required placeholder="you@example.com">
      <label>Your rating</label><div class="review-stars" id="reviewStarPicker" role="group" aria-label="Choose a star rating">
        <button type="button" data-star="1" aria-label="1 star">★</button><button type="button" data-star="2" aria-label="2 stars">★</button><button type="button" data-star="3" aria-label="3 stars">★</button><button type="button" data-star="4" aria-label="4 stars">★</button><button type="button" data-star="5" aria-label="5 stars">★</button>
      </div>
      <label>Your review</label><textarea id="reviewText" maxlength="1000" required minlength="3" placeholder="Tell us what u thought!"></textarea>
      <div id="customerReviewError" class="review-error" role="alert"></div>
      <button type="submit" id="submitReview">Send Review</button><button type="button" class="secondary" id="skipReview">Back to Orders</button>
    </form></div>`;
  document.body.appendChild(customer);

  const publicOverlay = document.createElement("section");
  publicOverlay.id = "publicReviewsOverlay"; publicOverlay.className = "review-overlay";
  publicOverlay.innerHTML = `<div class="review-panel"><h2>Customer Reviews</h2><div id="publicReviewList">Loading reviews…</div><button type="button" class="secondary" id="closePublicReviews">Close</button></div>`;
  document.body.appendChild(publicOverlay);

  const dashboard = document.getElementById("dashboard");
  const reviewSection = document.createElement("section");
  reviewSection.className = "review-inline"; reviewSection.id = "adminReviewSection";
  reviewSection.innerHTML = `<h2>Customer Reviews</h2>
    <div id="reviewAdminLogin"><p>Sign in to review submissions and approve which ones appear publicly.</p>
      <form id="reviewLoginForm">
        <label>Admin email</label><input id="reviewAdminEmail" type="email" autocomplete="username" required>
        <label>Password</label><input id="reviewAdminPassword" type="password" autocomplete="current-password" required>
        <div id="reviewLoginError" class="review-error" role="alert"></div>
        <button type="submit">Sign In</button>
      </form>
    </div>
    <div id="reviewAdminContent" hidden>
      <button type="button" id="reloadReviews">Refresh Reviews</button><button type="button" class="secondary" id="reviewSignOut">Sign Out</button>
      <div id="reviewList"></div>
    </div>`;
  if (dashboard) dashboard.appendChild(reviewSection);

  let stars = 0;
  const starButtons = [...document.querySelectorAll("#reviewStarPicker [data-star]")];
  function setStars(n) { stars=n; starButtons.forEach(b=>b.classList.toggle("selected",Number(b.dataset.star)<=n)); }
  starButtons.forEach(b=>b.addEventListener("click",()=>setStars(Number(b.dataset.star))));
  function showCustomerReview(){customer.classList.add("show");document.getElementById("reviewEmail").focus();}
  document.getElementById("skipReview").addEventListener("click",()=>{customer.classList.remove("show");document.getElementById("newOrder").click();});
  document.getElementById("customerReviewForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const errorEl=document.getElementById("customerReviewError"),submit=document.getElementById("submitReview");
    const email=document.getElementById("reviewEmail").value.trim(),review=document.getElementById("reviewText").value.trim();
    if(!stars){errorEl.textContent="Please choose a star rating.";return;}
    if(!db){errorEl.textContent="The review system is not connected yet.";return;}
    submit.disabled=true;submit.textContent="SENDING…";errorEl.textContent="";
    const {error}=await db.from("reviews").insert({email,review,rating:stars});
    submit.disabled=false;submit.textContent="Send Review";
    if(error){errorEl.textContent="Couldn't send that review. Please try again.";return;}
    customer.querySelector(".review-panel").innerHTML='<h2>Thanks for the review!</h2><p>Your feedback has been sent for approval.</p><button type="button" id="reviewDone">Back to Orders</button>';
    document.getElementById("reviewDone").addEventListener("click",()=>{customer.classList.remove("show");document.getElementById("newOrder").click();});
  });

  const thanks=document.getElementById("thanks");
  if(thanks){
    const reviewButton=document.createElement("button");reviewButton.type="button";reviewButton.className="review-action";reviewButton.textContent="Leave a Review";reviewButton.addEventListener("click",showCustomerReview);thanks.appendChild(reviewButton);
    const readButton=document.createElement("button");readButton.type="button";readButton.className="review-action";readButton.textContent="Read Customer Reviews";readButton.addEventListener("click",showPublicReviews);thanks.appendChild(readButton);
  }
  document.getElementById("closePublicReviews").addEventListener("click",()=>publicOverlay.classList.remove("show"));
  async function showPublicReviews(){
    publicOverlay.classList.add("show");const list=document.getElementById("publicReviewList");list.textContent="Loading reviews…";
    if(!db){list.textContent="Reviews are temporarily unavailable.";return;}
    const {data,error}=await db.from("public_reviews").select("id,rating,review,created_at").order("created_at",{ascending:false}).limit(30);
    if(error){list.textContent="Reviews are temporarily unavailable.";return;}
    list.replaceChildren();
    if(!data||!data.length){list.textContent="No approved reviews yet. Be the first to leave one!";return;}
    data.forEach(r=>{const item=document.createElement("article");item.className="review-entry";const rating=document.createElement("div");rating.className="stars";rating.textContent="★".repeat(r.rating)+"☆".repeat(5-r.rating);const body=document.createElement("p");body.textContent=r.review;const date=document.createElement("small");date.textContent=new Date(r.created_at).toLocaleDateString();item.append(rating,body,date);list.appendChild(item);});
  }

  async function checkAdminSession(){
    const login=document.getElementById("reviewAdminLogin"),content=document.getElementById("reviewAdminContent");
    if(!db||!login||!content)return;
    const {data,error}=await db.auth.getSession();
    if(error){document.getElementById("reviewLoginError").textContent="Couldn't check sign-in status. Reload the page.";return;}
    login.hidden=!!data.session;content.hidden=!data.session;if(data.session)loadPrivateReviews();
  }
  async function loadPrivateReviews(){
    const list=document.getElementById("reviewList");list.textContent="Loading reviews…";
    const {data,error}=await db.from("reviews").select("id,email,rating,review,approved,created_at").order("created_at",{ascending:false}).limit(200);
    if(error){list.textContent="Couldn't load reviews. Check the admin account permissions and run the updated review setup SQL.";return;}
    list.replaceChildren();
    if(!data||!data.length){list.textContent="No reviews yet.";return;}
    data.forEach(r=>{
      const item=document.createElement("article");item.className="review-entry";
      const rating=document.createElement("div");rating.className="stars";rating.textContent="★".repeat(r.rating)+"☆".repeat(5-r.rating);
      const body=document.createElement("p");body.textContent=r.review;
      const email=document.createElement("small");email.textContent="Email: "+r.email;
      const date=document.createElement("small");date.textContent=new Date(r.created_at).toLocaleString();
      const state=document.createElement("small");state.className=r.approved?"":"pending";state.textContent=r.approved?"Approved — visible to customers":"Waiting for approval";
      const approve=document.createElement("button");approve.className="approve";approve.textContent=r.approved?"Unapprove":"Approve";
      approve.addEventListener("click",async()=>{approve.disabled=true;const {error:updateError}=await db.from("reviews").update({approved:!r.approved}).eq("id",r.id);if(updateError){approve.disabled=false;state.textContent="Could not update approval. Check SQL permissions.";return;}loadPrivateReviews();});
      item.append(rating,body,email,date,state,approve);list.appendChild(item);
    });
  }
  document.getElementById("reviewLoginForm").addEventListener("submit",async e=>{
    e.preventDefault();const errorEl=document.getElementById("reviewLoginError");
    if(!db){errorEl.textContent="Database connection is unavailable.";return;}
    const {error}=await db.auth.signInWithPassword({email:document.getElementById("reviewAdminEmail").value.trim(),password:document.getElementById("reviewAdminPassword").value});
    if(error){errorEl.textContent="Sign-in failed. Check the email and password.";return;}errorEl.textContent="";checkAdminSession();
  });
  document.getElementById("reloadReviews").addEventListener("click",loadPrivateReviews);
  document.getElementById("reviewSignOut").addEventListener("click",async()=>{await db.auth.signOut();checkAdminSession();});
  if(db)db.auth.onAuthStateChange(()=>checkAdminSession());
})();