# NaNa-ViewBook 

> **An Independent, Local-First Writing Workspace Preserving Creative Labor and Provenance**

NaNa-ViewBook is an open-source, local-first web utility designed to establish an un-fakeable "Proof-of-Labor" framework for independent writers and authors. This project addresses a massive structural crisis: creators face rampant automated text-scraping and exploitation, yet they lack institutional safety nets, stable salaries, or accessible ways to prove their work is human without surrendering their digital identity to invasive tracking databases.

NaNa-ViewBook solves this by acting as a silent, offline witness to the mechanical friction and cognitive latency of the human writing process.

---

## ⚡ The Project Logic: How It Works

Writing a 90,000-word manuscript is a slow, human process structurally defined by mechanical errors, spontaneous typo corrections, backspaces, and deep pauses of thought between sentences. Generative AI outputs text instantly and uniformly.

NaNa-ViewBook runs entirely inside the user's browser runtime memory under a **strict no-login, zero-database architecture**. It records typing dynamics locally. When a session ends, **the application saves nothing to the cloud—the writer must manually download their work as a local archive file directly to their computer.**

### The Local Output Archive (.ZIP Bundle)
When a user exports their session from the browser, the application packages their data into a timestamped file bundle containing:
1. `manuscript.txt` — The clean, un-altered plain text file.
2. `manuscript.pdf` — A reader-ready document compiled entirely client-side.
3. `proof_token.nana.json` — A cryptographic metadata file tracking total keystrokes, backspace corrections, and session duration bound to an unalterable SHA-256 watermark signature.
4. `live_draft_proof.html` —  An interactive review document featuring custom accent markup for tracking changes, an eye-protective dual-view canvas with multiple themes, and automatic mapping to print-ready white paper standards. For the full detailed description of this item, please refer to the referenced web document.

---

## 🛠️ Repository Directory Framework

The layout of the codebase is structured as a modular plugin architecture to easily attach to existing open-source text interfaces:

* **/src/somatic-engine/** — Captures browser-native typing interval logs and processes the offline Local Differential Privacy (LDP) noise filter to protect biometric identity.
* **/src/provenance-ledger/** — Manages local browser-native fault tolerance (IndexedDB auto-save cache) and compiles the client-side `.zip` bundle export.
* **/specs/** — Houses technical specifications and mathematical design configurations detailing our Laplace perturbation boundaries.

---

## 🔬 About the Researcher & Project Status

This utility is a standalone public-good project developed independently utilizing personal savings.

* **Researcher Background:** I hold a **Master's Degree in International Communication and Public Diplomacy**. My research focus centers on the intersection of creator copyright protection, open internet user sovereignty, and mitigating the economic exploitation of creative labor by automated digital systems.
* **Live UI Simulator Engine:** An interactive front-end visual interface and counter layout is actively configured and hosted via Base44: `https://base44.com`

---

## ⏳ Project Development Tasks (6-Month Roadmap)

I am seeking grant funding from public interest technology channels to cover exactly **1,000 hours** of dedicated technical development, cryptographic testing, and editor implementation at a flat, transparent rate of **€50 per hour** (€50,000 total request).

* **Task 1: Browser Ingestion Sandbox & Telemetry Logic** (Months 1–2 | €19,500)
  Building the core telemetry capture algorithms on top of the open-source ProseMirror/TipTap web framework. Wiring browser events to log backspaces and compute pause intervals safely in temporary memory.
* **Task 2: Fault Tolerance & Local Archive Packaging** (Months 3–4 | €16,500)
  Implementing an offline local recovery cache (IndexedDB) so writers never lose drafts if a browser crashes, and coding the native client-side `.zip` download compiler.
* **Task 3: Modular Plugin Adaptation & Open Metrics** (Months 5–6 | €14,000)
  Packaging the underlying code engine into modular, lightweight upstream plugins for popular markdown ecosystems (such as Obsidian or VS Code) so writers can access these labor proofs inside their favorite local tools.
