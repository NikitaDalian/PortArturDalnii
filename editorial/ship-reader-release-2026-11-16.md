# Ship reader release — 16 November 2026

Implementation and translations were delegated to GPT-6.1 Sol agents; architecture, integration and browser verification were completed by the coordinating agent.

- Promoted Ships & Armament to the second primary navigation item, including the mobile menu. Removed staggered mobile link appearance; Escape restores button focus.
- Grouped specifications without dropping exact values, caveats or references. Illustrated armament tiles link from both photograph and heading to the weapon article; museum/modified installations retain explicit captions.
- Added 17 dated interactive ship profiles with 68 independently reviewed explanations. Positions refer to stylized drawings, never geographic coordinates. Sources and armament relationships are validated. No-JavaScript and print views expose every explanation.
- Published the independently reviewed bank narrative and matching English and Chinese translations. Exact review hashes are recorded in adjacent review files.
- Disclosed the 22/24 boiler-count disagreement for Diana and Pallada rather than selecting an unsupported definitive number.

Validation: 30 unit tests passed; data, entity mentions and translation checks passed. The final RU/EN/ZH build exited successfully. All 1,113 pages and 100,235 internal links passed the link checker. Browser checks covered all 51 localized ship pages at 390px, the desktop navigation at 1181px, mobile menu visibility, Escape/focus, pointer and keyboard detail selection, reduced motion, illustrative weapon links, image decoding, and all four panels with JavaScript disabled. A long source URL on Chinese Retvizan was found and fixed; all 51 pages then passed viewport overflow checks. Sampled interactive pages produced no JavaScript errors. Bank title and illustration rendered in all three locales.

Screenshots and working evidence: workspace `work/ship-reader/`, `work/ship-explorer/`, and `work/bank-narrative/`. These working directories are outside the site repository.
