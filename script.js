(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── theme ── */
  const themeToggle = document.getElementById("themeToggle");
  let dark = false;
  try { dark = localStorage.getItem("ayush-theme") === "dark"; } catch (e) {}

  function applyTheme() {
    root.setAttribute("data-theme", dark ? "dark" : "light");
  }
  applyTheme();

  themeToggle.addEventListener("click", () => {
    dark = !dark;
    try { localStorage.setItem("ayush-theme", dark ? "dark" : "light"); } catch (e) {}
    applyTheme();
  });

  /* ── hero variant switcher ── */
  const tabs = document.querySelectorAll(".hero-switcher .tab");
  const variants = document.querySelectorAll(".hero-variant");

  function setVariant(name) {
    variants.forEach((el) => el.classList.toggle("active", el.dataset.hero === name));
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.variant === name));
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setVariant(tab.dataset.variant));
  });
  setVariant("stack");

  /* ── scroll reveal ── */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("revealed"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.transitionDelay = (parseFloat(el.dataset.revealDelay || 0)) + "ms";
        el.classList.add("revealed");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ── stat counters ── */
  function setCount(el, val) {
    const txt = Math.round(val).toLocaleString();
    el.textContent = txt + (el.dataset.suffix || "");
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dur = 1300;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(el, target * eased);
      if (t < 1) requestAnimationFrame(step);
      else setCount(el, target);
    }
    requestAnimationFrame(step);
  }

  const countEls = document.querySelectorAll("[data-count]");
  if (reduceMotion) {
    countEls.forEach((el) => setCount(el, parseFloat(el.dataset.count)));
  } else {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    countEls.forEach((el) => cio.observe(el));
  }

  /* ── parallax watermarks ── */
  if (!reduceMotion) {
    let raf = null;
    function applyParallax() {
      const vh = innerHeight;
      document.querySelectorAll("[data-parallax]").forEach((el) => {
        if (el.offsetParent === null) return;
        const speed = parseFloat(el.dataset.parallax);
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2) - vh / 2;
        el.style.transform = "translate3d(0," + (-off * speed).toFixed(1) + "px,0)";
      });
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; applyParallax(); });
    }
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    applyParallax();
  }

  /* ── pulse meter ── */
  const RED_SELECTOR = "#contact"; // section whose TOP edge the water-fill tracks
  const PULSE_API = "https://ayush-pulse.ayush2252.workers.dev";
  const PULSE_SS = { visited: "pulse-visited-session" };
  const PULSE_LS = { t: "pulse-thumbs-mine", tf: "pulse-thumbed" }; // per-browser thumb state only

  function pulseSetAll(metric, val) {
    document.querySelectorAll('[data-metric="' + metric + '"]').forEach((el) => { el.textContent = val; });
  }
  function pulsePaint(counts) {
    if (!counts) return;
    pulseSetAll("visitors", counts.visitors);
    pulseSetAll("downloads", counts.downloads);
    pulseSetAll("thumbs", counts.thumbs);
  }
  async function pulseFetch(path, opts) {
    const res = await fetch(PULSE_API + path, opts);
    if (!res.ok) throw new Error("pulse api error " + res.status);
    return res.json();
  }

  let pulseThumbed = localStorage.getItem(PULSE_LS.tf) === "1";

  function paintPulseThumb() {
    const base = document.querySelector("[data-thumb-icon]");
    const inv = document.querySelector("[data-thumb-icon-invert]");
    if (base) base.setAttribute("fill", pulseThumbed ? "#e23b2e" : "none");
    if (inv) inv.setAttribute("fill", pulseThumbed ? "#ffffff" : "none");
  }
  paintPulseThumb();

  const pulseThumbBtn = document.querySelector("[data-thumb]");
  if (pulseThumbBtn) {
    pulseThumbBtn.addEventListener("click", () => {
      pulseThumbed = !pulseThumbed;
      localStorage.setItem(PULSE_LS.tf, pulseThumbed ? "1" : "0");
      paintPulseThumb();
      pulseFetch("/pulse/thumb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pulseThumbed ? "inc" : "dec" }),
      }).then(pulsePaint).catch(() => {});
    });
  }

  document.querySelectorAll("[data-resume]").forEach((a) => {
    a.addEventListener("click", () => {
      pulseFetch("/pulse/download", { method: "POST" }).then(pulsePaint).catch(() => {});
    });
  });

  (async function pulseInit() {
    try {
      const initial = await pulseFetch("/pulse");
      pulsePaint(initial);
    } catch (e) { /* leave placeholder markup as-is if the API is unreachable */ }

    if (!sessionStorage.getItem(PULSE_SS.visited)) {
      sessionStorage.setItem(PULSE_SS.visited, "1");
      try { pulsePaint(await pulseFetch("/pulse/visit", { method: "POST" })); } catch (e) {}
    }

    setInterval(() => {
      pulseFetch("/pulse").then(pulsePaint).catch(() => {});
    }, 25000);
  })();

  const pulseEl = document.querySelector(".pulse");
  const pulseInvert = pulseEl && pulseEl.querySelector(".pulse-invert");
  const pulseRed = document.querySelector(RED_SELECTOR);
  let pulseRaf = null;
  function pulseTick() {
    pulseRaf = null;
    if (!pulseEl || !pulseInvert || !pulseRed) return;
    if (pulseEl.offsetWidth === 0 && pulseEl.offsetHeight === 0) return; // hidden (mobile)
    const w = pulseEl.getBoundingClientRect();
    const redTop = pulseRed.getBoundingClientRect().top;
    let fill = redTop - w.top; // px of widget still above the red edge
    fill = Math.max(0, Math.min(w.height, fill));
    pulseInvert.style.clipPath = "inset(" + fill + "px 0 0 0)";
  }
  function schedulePulseTick() { if (!pulseRaf) pulseRaf = requestAnimationFrame(pulseTick); }
  addEventListener("scroll", schedulePulseTick, { passive: true });
  addEventListener("resize", schedulePulseTick, { passive: true });
  pulseTick();
})();
