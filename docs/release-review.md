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

These limited policies establish some unassisted route reachability and expose pressure points. They do not establish the specification's 10–15, 15–25 or 20–40+ minute human pacing bands. The rows above use no permanent progression. Increasing hit points or inserting mandatory waits merely to lengthen these bot runs would not establish the intended player experience.

## Progression and diagnostics continuation

The follow-up audit found that Beyond the Horizon promised a guardian-victory requirement that its purchase handler did not enforce. The research definition now declares that requirement, and purchase validation and the observatory share one eligibility check. A guardian kill from an otherwise defeated expedition qualifies after settlement. Older profiles with completed expedition victories also qualify; already purchased research remains learned. New tests cover costs, prerequisites, failed-purchase atomicity, save recovery and the mobile research UI.

The playtest harness now accepts `--progression earned` and `--details`. Earned mode begins with an empty profile, settles completed attempts through the normal progression code, spends only earned currency/research, and round-trips the profile through its save reader between attempts. It prioritizes survival research, then ordinary research-tree order; equipment purchases prioritize Basalt Shell and five Lattice pieces, followed by legal upgrades. A requested class remains Manipulator until its unlock can be afforded. A locked mode fails explicitly instead of silently being reported as a different mode.

```
npx tsx scripts/expedition-playtest.ts --mode campaign --strategy well --progression earned --runs 12 --details
```

This deterministic batch produced **one victory, eleven defeats and zero timeouts**. Seed 4 completed all 63 rooms and nine regions in **602 simulated seconds**. It began with 125.9 maximum integrity, eight purchased research nodes, a level-two Basalt Shell and five level-one Lattice pieces, earned from the preceding four defeated attempts. The harness records this starting build, region, final room, damage categories and optional per-room outcomes. Ten defeats ended in Contact damage and one in Projectile+Velocity damage. This supports full-campaign reachability with earned progression; it does not establish a human win rate or demonstrate that contact damage should be nerfed for a limited movement policy.

The game also now records bounded local RoomStarted, RoomCleared, RoomFailed, RoomAbandoned and RoomDamage counters, grouped by mode, region and encounter type. Started values record entry integrity; end values record combat seconds; damage records the resolved hit amount, including any overkill. Optional event fights use their actual encounter type. Noncombat visits are excluded. An interrupted process may leave an attempt without an outcome. The observatory shows up to six groups ordered by defeats, average damage per attempt and average time per clear. Disable, clear, save recovery and display work in the browser checks. Guardian attempt subjects now match guardian kill IDs; older numeric attempt subjects remain historical records rather than being reinterpreted.

Verification at that milestone: **652 unit tests**, **104 browser checks with four platform-specific skips**, content validation and the production offline test passed. Production JavaScript was 460.95 kB (139.40 kB gzip). That continuation changed research eligibility and diagnostics, not active-run physics, so replay revision r24 remained compatible. Native package identity and smoke-test status are recorded in `native-delivery.md`.

## Control mastery and usable offers — r25

The next audit found an impossible progression requirement: Cut the Lines correctly preserves the original payload's kill ownership, but its generated mastery challenges demanded kills attributed to cutting. Cut the Lines and Gyroscopic Brake now use an authored control track: 50 casts; 100 affected links/spinning bodies while hostiles remain; one successfully cleared guardian encounter with a meaningful intervention while the guardian is alive; three targets changed in a single cast; and an expedition victory after qualifying interventions in at least three cleared combat chambers. Failed casts, unchanged bodies, echo effects and post-combat interventions cannot inflate intervention progress. Defeat/abandonment grants no successful-encounter credit. Other powers retain their causal combat objectives.

Milestones, challenge descriptions and mastery cards share one source. Existing mastery data receives zero-valued control fields without inventing prior interventions; existing challenge IDs and claimed rewards are retained. Tests exercise actual constraints/angular motion, zero-change casts, echoes, hostile-free rooms, successful versus failed room flows, checkpoint recovery, victory thresholds, peak aggregation and reward idempotency. Room-flow tests use direct enemy damage to isolate progression; they are not unassisted campaign evidence. Phone captures of the per-power objectives were reviewed.

Four powers also require constructs that their own casts cannot create. New acquisition rules withhold Planet Split until a planet-summoning power is learned; Cut the Lines and Tension Release until a tether power is learned; and Anchor Recall until a fixed-anchor power is learned. Shops and level-ups share this check. Existing owned powers keep their upgrade eligibility. Saved offers that would grant an unusable new power refresh without consuming an upgrade; later saved replacements remain deterministic. Descriptions explain the dependency, and actual cast-time target checks still apply. Replay revision r25 separates these changed reward pools from prior recordings.

The initial repeated twelve-attempt earned-progression campaign batch under r25 produced **zero wins, twelve defeats and zero timeouts**, reaching 37 completed rooms at most. Eleven deaths ended in Contact damage and one in Environmental+Explosion damage. Filtering the reward pool changes seeded choices and subsequent builds, so the earlier r24 63-room victory is historical evidence, not a current-r25 result. These outcomes keep campaign balance open; no enemy-health padding or bot-specific difficulty changes were introduced.

Extending that same deterministic earned-progression sequence to **36 attempts produced two victories, 34 defeats and zero timeouts**. Seeds 25 and 28 each cleared all 63 rooms, in 789 and 563 simulated combat seconds respectively. Both began with 128.6 maximum integrity, all twelve research nodes and six level-five equipment pieces purchased from earlier attempts' earnings, without affixes or a mutation. Of the defeats, 31 ended in Contact damage and three in Environmental+Explosion damage. This establishes full-route reachability under r25; the sample does not establish human win rates, pacing or difficulty balance.

Verification: **665 unit tests**, **107 browser checks with four platform-specific skips**, TypeScript, content validation and the production offline test passed. Production JavaScript is 463.68 kB (140.16 kB gzip). The rebuilt Android package passed the complete native smoke script with exit code zero; its hash and device limitations are recorded in `native-delivery.md`.

## Completion boundary

The requirement ledger retains partial status for human, physical-device and future online outcomes. The repository implementation and launch quantities are substantially covered; the complete product definition of done is still open. Network leaderboards/replays are explicitly future, stability-gated services in the specification. No store submission or public release has been performed.
