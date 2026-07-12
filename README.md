# Ayush Sharma — Portfolio

A personal DevOps/Platform Engineer portfolio site: hero with three switchable
art directions, animated stats, about, tech stack, experience, certifications,
education and a contact close — dark mode included.

**Live pipeline note:** I didn't hand-write a single line of this. The entire
site — design, code, testing, and deployment — was built end-to-end with
Claude, using three different surfaces of it in sequence. This repo is as
much a demo of that workflow as it is a portfolio.

## How it was built

### 1. Design — [Claude Design](https://claude.ai/design)
The visual system (typography, color tokens, spacing, component states —
buttons, nav, cards) and the page layout itself were designed in Claude's
design tool. This produced a component-driven `.dc.html` prototype with
working interactivity (hero variant switching, dark mode, scroll reveals,
counters, parallax) — a real, clickable design, not a static mockup.

### 2. Build — [Claude Code](https://claude.com/claude-code)
Claude Code pulled the design straight out of the Claude Design project
(via its MCP integration), then rebuilt it as a plain, dependency-free
static site — semantic `index.html`, a single `styles.css` carrying the
design tokens, and vanilla `script.js` replacing the design tool's runtime
(hero switching, theme toggle, `IntersectionObserver`-driven reveals,
animated counters, parallax). No frameworks, no build step.

### 3. Test — [Claude in Chrome](https://claude.com/claude-code)
Claude drove an actual Chrome browser against the running site — clicking
through all three hero variants, toggling dark mode, scrolling every
section, and screenshotting the result — to verify the build matched the
design and nothing broke, before calling it done.

### 4. Deploy — Git + GitHub
Claude initialized the repo, committed the site, and pushed it here.

## Stack

Plain HTML5, CSS (custom properties, `color-mix`, `clamp`, container-aware
layout), and vanilla JavaScript. No build tooling, no dependencies.

## Structure

```
index.html   — page markup
styles.css   — design tokens + component/layout styles
script.js    — hero switcher, theme toggle, scroll reveal, counters, parallax
assets/      — résumé PDF, profile photo
```

## Why this matters

This isn't "AI helped me code." Every layer — the design system, the
markup, the styling, the interaction logic, the QA pass in a real browser,
and the deployment — was produced by directing Claude, not by writing code
myself. It's a working example of what a single person fluent in AI
tooling can ship, start to finish.
