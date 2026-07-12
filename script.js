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
})();
