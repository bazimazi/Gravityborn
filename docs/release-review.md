# Launch-content milestone review

Reviewed 2026-10-02, replay revision `gravityborn-0.4-r24`. This records implementation evidence and open outcomes for specification sections 108–110. It is not a release approval.

The catalog now contains 100 powers, 100 relics, 25 base enemies, 99 curated elite variants, ten bosses, nine regions, ten classes, 50 equipment designs, twelve synergies, nine mutations, ten events, eleven phenomena, four contracts, seven difficulties, eleven modes and 518 challenges. Five mastery milestones per power account for 500 challenges. Count validation reports zero issues.

## Review passes

| Pass | Evidence and corrections | Still open |
| --- | --- | --- |
| 1. Gameplay correctness | 647 unit cases pass. New catalog effects have cast, target, expiry and integration coverage. Upgrade offers now reserve one eligible owned-power/well option, preventing the larger catalog from overwhelming build development. Saved choices and subsequent random draws survive checkpoint restoration. | Observed player understanding and fun. |
| 2. Physics correctness | Actual solver tests cover rebounds, drag, towing, anchoring, changing spring length, angular plate impacts, momentum exchange and capped redirection. Geometry repair preserves locks, mass factors and coatings. Full-catalog tests cast in both catalog orders and check finite motion, body/field/tether caps and serialization. | Long human sessions exploring unintended combinations. Stress fixtures refill energy and grant invulnerability; they are not ordinary victories. |
| 3. Architecture | Coatings use shared surface bases/overrides; tether topologies share endpoint validation and cleanup; moving fields use one analytic motion evaluator and one gravity authority. Typed catalog validation covers new geometry and effect parameters. | Continued review as content changes. |
| 4. Performance | Latest host p95: raw 220-body/50-field simulation 1.513 ms; integrated 220-body/50-field/12-tether scenarios 1.788 ms static and 1.867 ms programmed. Both fit the 8.333 ms simulation-step budget on this host. The production JS bundle is 458.72 kB, 138.68 kB gzip. | Phone rendering, battery and sustained thermal behavior. These CPU measurements are not device FPS results. |
| 5. UX | The full browser suite passes 98 cases across desktop Chromium, Android-sized Chromium and phone WebKit, with four platform-specific skips. New powers display status/anchor/rotation feedback. All nine region motifs are captured; selected normal/high-contrast captures were inspected. Nine focused route/shop/checkpoint cases also pass after the offer change. | Human immediate readability, comfortable touch reach and narrative pacing. |
| 6. Accessibility | Browser checks exercise high contrast, reduced motion/flashing, text scaling, left-handed controls and phone layouts. Background motifs are static and capped, with reduced opacity in high contrast. | Real-device safe areas and accessibility usability with people. |
| 7. Balance | Twelve deterministic seeds per policy, using ordinary controls and no permanent loadout, are recorded below. The offer audit found and fixed catalog dilution. | Standard/campaign pacing, class/build viability, dominant strategies and human win rates. |
| 8. Content extensibility | All 100 power definitions are exercised by generic cast tests; authoring validation rejects malformed surfaces, tethers, spin parameters and scenery. Catalog-driven shops, codex, mastery, rewards and saves include the new definitions. | Individual content quality and independent balancing of every build. |
| 9. Mobile optimization | Production offline test passes. Android debug compilation and native project synchronization succeed. Native validation and its exact APK identity are tracked in `native-delivery.md`. A share-sheet test race was corrected to wait for actual window focus rather than historical activity records; smoke discovery now has a three-minute deadline. | Physical Android matrix, Mac/Xcode iOS compilation, iPhone/iPad lifecycle, haptics and audio interruption checks. |
| 10. Final polish | Regional environmental storytelling, distinct power audio layers, launch catalogs and evidence documentation are integrated. Production dependency audit reports zero known vulnerabilities. | Listening/mix review, human polish review, signing, store assets/accounts, privacy/store review and distribution. |

## Input-only simulation results

`npx tsx scripts/expedition-playtest.ts --mode <mode> --strategy <policy> --runs 12` uses seeds `input-playtest-0` through `input-playtest-11`. Default class is Manipulator. The baseline policy favors Pulse/Collapse and defensive relics; the well policy prioritizes primary-well development and eligible healing purchases. Both move, flip, aim wells and cast learned powers through ordinary game methods. Neither grants damage, health, invulnerability, equipment or research during a run. Map and upgrade decisions are instantaneous; times below are simulated combat time, not human session duration.

| Mode / policy | Wins / defeats / timeouts | Winning combat duration |
| --- | --- | --- |
| Quick / baseline | 7 / 5 / 0 | 47–93 seconds |
| Standard / baseline | 0 / 12 / 0 | No wins |
| Standard / well | 2 / 10 / 0 | 176–192 seconds, 21 rooms |
| Campaign / well | 0 / 12 / 0 | No wins; furthest attempt completed 21 rooms |

These limited policies establish some unassisted route reachability and expose pressure points. They do not establish the specification's 10–15, 15–25 or 20–40+ minute human pacing bands. The campaign starts with no permanent progression in this harness. Increasing hit points or inserting mandatory waits merely to lengthen these bot runs would not establish the intended player experience.

## Completion boundary

The requirement ledger retains partial status for human, physical-device and future online outcomes. The repository implementation and launch quantities are substantially covered; the complete product definition of done is still open. Network leaderboards/replays are explicitly future, stability-gated services in the specification. No store submission or public release has been performed.
