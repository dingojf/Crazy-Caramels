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
    .review-panel button{border:0;border-radius:10px;padding:12px 16px;margin:10px 8px 0 0;background:#3f7148;color:white;font-weight:800;font-size:16px}
    .review-panel button.secondary{background:#8b6547}
    .review-stars{display:flex;gap:7px;margin:8px 0}
    .review-stars button{font-size:32px;padding:4px 8px;margin:0;background:#ead9c5;color:#9b7a55}
    .review-stars button.selected{background:#f1c477;color:#6b351b}
    .review-entry{border:1px solid #d2a16e;border-radius:12px;padding:13px;margin:10px 0;background:white}
    .review-entry .stars{font-size:22px;color:#a96516}
    .review-entry p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}
    .review-entry small{color:#76533d}
    .review-error{color:#a12620;font-weight:700;margin-top:8px}
    .review-action{background:#c67d3b!important;color:white!important}
  `;
  document.head.appendChild(style);

  const customer = document.createElement("section");
  customer.id = "customerReviewOverlay";
  customer.className = "review-overlay";
  customer.innerHTML = `<div class="review-panel">
    <h2>Leave a Review</h2>
    <p>How were your Crazy Caramels?</p>
    <form id="customerReviewForm">
      <label>Your email</label><input id="reviewEmail" type="email" maxlength="254" autocomplete="email" required placeholder="you@example.com">
      <label>Your rating</label><div class="review-stars" id="reviewStarPicker" role="group" aria-label="Choose a star rating">
        <button type="button" data-star="1" aria-label="1 star">★</button><button type="button" data-star="2" aria-label="2 stars">★</button><button type="button" data-star="3" aria-label="3 stars">★</button><button type="button" data-star="4" aria-label="4 stars">★</button><button type="button" data-star="5" aria-label="5 stars">★</button>
      </div>
      <label>Your review</label><textarea id="reviewText" maxlength="1000" required minlength="3" placeholder="Tell us what u thought!"></textarea>
      <div id="customerReviewError" class="review-error" role="alert"></div>
      <button type="submit" id="submitReview">Send Review</button><button type="button" class="secondary" id="skipReview">Back to Orders</button>
    </form>
  </div>`;
  document.body.appendChild(customer);

  const admin = document.createElement("section");
  admin.id = "adminReviewOverlay";
  admin.className = "review-overlay";
  admin.innerHTML = `<div class="review-panel">
    <h2>Customer Reviews</h2>
    <div id="reviewAdminLogin">
      <p>Sign in with the private admin account.</p>
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
    </div>
    <button type="button" class="secondary" id="closeAdminReviews">Close</button>
  </div>`;
  document.body.appendChild(admin);

  let stars = 0;
  const starButtons = [...document.querySelectorAll("#reviewStarPicker [data-star]")];
  function setStars(n) {
    stars = n;
    starButtons.forEach(b => b.classList.toggle("selected", Number(b.dataset.star) <= n));
  }
  starButtons.forEach(b => b.addEventListener("click", () => setStars(Number(b.dataset.star))));

  function showCustomerReview() {
    customer.classList.add("show");
    document.getElementById("reviewEmail").focus();
  }
  document.getElementById("skipReview").addEventListener("click", () => {
    customer.classList.remove("show");
    document.getElementById("newOrder").click();
  });
  document.getElementById("customerReviewForm").addEventListener("submit", async e => {
    e.preventDefault();
    const errorEl = document.getElementById("customerReviewError");
    const submit = document.getElementById("submitReview");
    const email = document.getElementById("reviewEmail").value.trim();
    const review = document.getElementById("reviewText").value.trim();
    if (!stars) { errorEl.textContent = "Please choose a star rating."; return; }
    if (!db) { errorEl.textContent = "The review system is not connected yet."; return; }
    submit.disabled = true; submit.textContent = "SENDING…"; errorEl.textContent = "";
    const { error } = await db.from("reviews").insert({ email, review, rating: stars });
    submit.disabled = false; submit.textContent = "Send Review";
    if (error) { errorEl.textContent = "Couldn't send that review. Please try again."; return; }
    customer.querySelector(".review-panel").innerHTML = '<h2>Thanks for the review!</h2><p>Your feedback has been sent.</p><button type="button" id="reviewDone">Back to Orders</button>';
    document.getElementById("reviewDone").addEventListener("click", () => {
      customer.classList.remove("show");
      document.getElementById("newOrder").click();
    });
  });

  const thanks = document.getElementById("thanks");
  if (thanks) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "review-action"; button.textContent = "Leave a Review";
    button.addEventListener("click", showCustomerReview);
    thanks.appendChild(button);
  }

  const dashbar = document.querySelector(".dashbar");
  if (dashbar) {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = "View Reviews";
    button.addEventListener("click", () => { admin.classList.add("show"); checkAdminSession(); });
    dashbar.appendChild(button);
  }

  async function checkAdminSession() {
    const login = document.getElementById("reviewAdminLogin");
    const content = document.getElementById("reviewAdminContent");
    if (!db) return;
    const { data } = await db.auth.getSession();
    login.hidden = !!data.session;
    content.hidden = !data.session;
    if (data.session) loadPrivateReviews();
  }
  async function loadPrivateReviews() {
    const list = document.getElementById("reviewList");
    list.textContent = "Loading reviews…";
    const { data, error } = await db.from("reviews").select("id,email,rating,review,created_at").order("created_at", { ascending: false }).limit(200);
    if (error) { list.textContent = "Couldn't load reviews. Please sign in again."; return; }
    list.replaceChildren();
    if (!data.length) { list.textContent = "No reviews yet."; return; }
    data.forEach(r => {
      const item = document.createElement("article"); item.className = "review-entry";
      const rating = document.createElement("div"); rating.className = "stars"; rating.textContent = "★".repeat(r.rating) + "☆".repeat(5-r.rating);
      const body = document.createElement("p"); body.textContent = r.review;
      const email = document.createElement("small"); email.textContent = "Email: " + r.email;
      const date = document.createElement("small"); date.textContent = " · " + new Date(r.created_at).toLocaleString();
      item.append(rating, body, email, date); list.appendChild(item);
    });
  }
  document.getElementById("reviewLoginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const errorEl = document.getElementById("reviewLoginError");
    if (!db) { errorEl.textContent = "Database connection is unavailable."; return; }
    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById("reviewAdminEmail").value.trim(),
      password: document.getElementById("reviewAdminPassword").value
    });
    if (error) { errorEl.textContent = "Sign-in failed. Check the email and password."; return; }
    errorEl.textContent = "";
    checkAdminSession();
  });
  document.getElementById("reloadReviews").addEventListener("click", loadPrivateReviews);
  document.getElementById("reviewSignOut").addEventListener("click", async () => { await db.auth.signOut(); checkAdminSession(); });
  document.getElementById("closeAdminReviews").addEventListener("click", () => admin.classList.remove("show"));
  db && db.auth.onAuthStateChange(() => checkAdminSession());
})();