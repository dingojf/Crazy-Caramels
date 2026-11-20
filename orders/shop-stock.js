(() => {
  // Customer ordering-page inventory. Kept separate from the dashboard script.
  const startingStock = { single: 90, bag: 24, mint: 30 };
  const names = { single: "regular singles", bag: "gift bags", mint: "peppermint caramels" };
  let busy = false;
  async function getRemaining() {
    if (!db) throw new Error("Database is not connected");
    const { data, error } = await db.from("orders").select("items").limit(5000);
    if (error) throw error;
    const sold = { single: 0, bag: 0, mint: 0 };
    (data || []).forEach(order => {
      const items = order.items || {};
      Object.keys(sold).forEach(k => sold[k] += Math.max(0, Number(items[k]) || 0));
    });
    const left = {};
    Object.keys(sold).forEach(k => left[k] = Math.max(0, startingStock[k] - sold[k]));
    return left;
  }
  async function refreshStock() {
    if (busy) return;
    try {
      const left = await getRemaining();
      Object.keys(left).forEach(k => {
        const add = document.querySelector('.product [data-change="' + k + '"][data-delta="1"]');
        if (!add) return;
        const card = add.closest(".product");
        if (!card) return;
        let label = card.querySelector(".stock-status");
        if (!label) {
          label = document.createElement("div");
          label.className = "stock-status";
          label.style.cssText = "font-size:14px;font-weight:900;text-align:center;min-height:18px;color:#6b351b;margin-top:4px";
          const controls = card.querySelector(".controls");
          if (controls) card.insertBefore(label, controls);
        }
        const soldOut = left[k] === 0;
        add.disabled = soldOut;
        add.style.opacity = soldOut ? ".35" : "1";
        add.style.cursor = soldOut ? "not-allowed" : "pointer";
        label.textContent = soldOut ? "SOLD OUT" : left[k] <= ({single:18,bag:5,mint:6})[k] ? "Only " + left[k] + " left" : "In stock";
        label.style.color = soldOut ? "#a12620" : left[k] <= ({single:18,bag:5,mint:6})[k] ? "#9a5b13" : "#3f7148";
        if (qty[k] > left[k]) {
          qty[k] = left[k];
          const q = document.getElementById("q-" + k);
          if (q) q.textContent = String(qty[k]);
          if (typeof paint === "function") paint();
        }
      });
    } catch (err) {
      console.error("Could not refresh Crazy Caramels stock:", err);
    }
  }
  document.addEventListener("click", async event => {
    const place = event.target.closest && event.target.closest("#place");
    if (!place || busy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy = true;
    place.disabled = true;
    try {
      const left = await getRemaining();
      const wanted = { single: Number(qty.single) || 0, bag: Number(qty.bag) || 0, mint: Number(qty.mint) || 0 };
      const short = Object.keys(wanted).filter(k => wanted[k] > left[k]);
      if (short.length) {
        alert("Sorry! We only have " + short.map(k => left[k] + " " + names[k]).join(", ") + " remaining. Please change your order.");
        place.disabled = false;
        await refreshStock();
        return;
      }
      place.disabled = false;
      place.click();
    } catch (err) {
      alert("We couldn't check inventory right now. Please try again in a moment.");
      place.disabled = false;
    } finally {
      busy = false;
    }
  }, true);
  refreshStock();
  setInterval(refreshStock, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshStock();
  });
})();