// rings.js
// Renders the "Sync Rings" signature visual: concentric charging rings
// representing streak length. Shared by landing.html (demo data) and
// app.html (live data from the backend) so the mark stays identical.
//
// Colors are read live from the active theme's CSS custom properties
// (--primary, --accent-info, --accent-ok, --accent-warn) rather than
// hardcoded, so the rings automatically match whichever of the 5 themes
// is currently applied.

function renderSyncRings(svgEl, streakDays, opts = {}) {
  const tierSize = opts.tierSize || 7;
  const maxTiers = opts.maxTiers || 4;
  const streak = Math.max(streakDays, 0);
  const tier = streak === 0 ? 0 : Math.min(Math.floor((streak - 1) / tierSize), maxTiers - 1);
  const progressInTier = streak === 0 ? 0 : (((streak - 1) % tierSize) + 1) / tierSize;

  const cs = getComputedStyle(document.body);
  const colors = [
    (cs.getPropertyValue("--primary") || "#7C6FFF").trim(),
    (cs.getPropertyValue("--accent-info") || "#5B8CFF").trim(),
    (cs.getPropertyValue("--accent-ok") || "#3FE0D0").trim(),
    (cs.getPropertyValue("--accent-warn") || "#FF6EC7").trim(),
  ];

  const baseRadius = opts.baseRadius || 20;
  const ringGap = opts.ringGap || 11;
  const strokeWidth = opts.strokeWidth || 6;
  const center = opts.center || 64;

  let svgInner = "";
  for (let i = 0; i < maxTiers; i++) {
    const r = baseRadius + i * ringGap;
    const circ = 2 * Math.PI * r;
    let fillFrac = 0;
    if (i < tier) fillFrac = 1;
    else if (i === tier) fillFrac = streak === 0 ? 0 : progressInTier;
    const dashOffset = circ * (1 - fillFrac);
    const isCurrentlyFilling = i === tier && streak > 0;

    svgInner += `
      <circle cx="${center}" cy="${center}" r="${r}" fill="none"
        stroke="${colors[i % colors.length]}" stroke-opacity="0.16" stroke-width="${strokeWidth}"/>
      <circle cx="${center}" cy="${center}" r="${r}" fill="none"
        stroke="${colors[i % colors.length]}" stroke-width="${strokeWidth}" stroke-linecap="round"
        stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 ${center} ${center})"
        class="${isCurrentlyFilling ? "sync-ring-active" : ""}"
        style="color:${colors[i % colors.length]}"/>
    `;
  }
  svgEl.setAttribute("viewBox", `0 0 ${center * 2} ${center * 2}`);
  svgEl.innerHTML = svgInner;
  svgEl.setAttribute("data-sync-rings", "true");
  svgEl.dataset.streak = String(streak);
  svgEl.dataset.ringOpts = JSON.stringify(opts);
}

// Re-renders every Sync Rings instance currently on the page — call this
// after a theme switch so the rings pick up the new palette immediately.
function refreshAllSyncRings() {
  document.querySelectorAll("[data-sync-rings]").forEach((svg) => {
    const streak = parseInt(svg.dataset.streak || "0", 10);
    const opts = svg.dataset.ringOpts ? JSON.parse(svg.dataset.ringOpts) : {};
    renderSyncRings(svg, streak, opts);
  });
}

window.renderSyncRings = renderSyncRings;
window.refreshAllSyncRings = refreshAllSyncRings;
