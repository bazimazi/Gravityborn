# Offline and native delivery

The web production build precaches its own HTML, code, styles, icons, and manifest. It has no runtime CDN or account dependency. Updates wait for existing tabs to close so a running expedition keeps one asset version. Development mode deliberately does not install a service worker. Deploy `dist/` at the origin root over HTTPS; localhost supports local verification.

`npm run test:offline` verifies the production bundle by installing its worker, disconnecting the browser, reloading, restoring a route and settings, playing a room, and opening another offline tab. Build with `npm run build` first. The test uses port 5298 and separate artifacts so it can coexist with the development browser suite.

## Native projects

`android/` and `ios/` contain Capacitor projects for `com.bazimazi.gravityborn`. Native assets are bundled locally; the service worker is disabled inside the native shell. App backgrounding pauses input, physics, and music. Android back closes a dialog or pauses play. Haptics use the native plugin when enabled. Native saves use Preferences, preloaded before game initialization, with ordered backup/primary writes. A storage failure does not overwrite unreadable data. Save export remains available in the observatory.

Run `npm ci`, `npm run native:sync`, then build the selected native project. `npm run icons` regenerates original vector-based web and native icons/splash screens; it requires Playwright Chromium. Android uses JDK 21, the checked-in Gradle wrapper, and SDK 36. Set `JAVA_HOME` and `ANDROID_HOME` for your machine, then run `android/gradlew assembleDebug` from the Android directory (use `gradlew.bat` on Windows). The resulting APK is under `android/app/build/outputs/apk/debug/`.

Save, run and diagnostics exports write UTF-8 JSON into the native app cache and open the OS share sheet. Cancelling leaves the game available; overlapping exports are rejected. Only the latest three named export files are retained. Browsers use ordinary downloads. This follows the official [Share cache-file guidance](https://capacitorjs.com/docs/apis/share) and [Filesystem API/privacy guidance](https://capacitorjs.com/docs/apis/filesystem).

For iOS, run `npm run native:ios` on a Mac with the supported Xcode toolchain. Select a signing team and device, then build/archive. The checked-in project uses Swift Package Manager. Its privacy manifest declares on-device preferences and file timestamp usage and is explicitly included in the Resources phase. The source can be generated on Windows; an iOS build cannot be validated here.

The CLI's Xcode helper uses UUID's compatible CommonJS `v4` API. A scoped override pins UUID 11.1.1 to avoid the older transitive advisory; npm audit currently reports no vulnerabilities. `native-prepare.mjs` parses the Xcode project and checks privacy resource inclusion after sync.

## Remaining release verification

Verified locally on 2026-10-02: `assembleDebug` succeeded with JDK 21 and Android SDK 36, producing a 9,695,103-byte debug APK. An isolated API 36 Pixel 7 emulator installed and launched the APK, played with gravity inputs, paused, survived forced process termination, restored native settings/archive preferences, and recovered the route checkpoint. Native save export produced valid JSON and opened the OS chooser; cancellation returned to play. `scripts/android-smoke.mjs` records these checks and refuses to target physical devices. Two consecutive complete runs passed after a cold emulator restart. This validates replay revision r24 with 100 powers, 100 relics, nine regions, the revised upgrade offer policy, surface coatings, programmed fields, tether networks and angular/momentum effects. The smoke explicitly verifies both packaged catalog counts. It does not validate physical hardware performance. APK SHA-256: `ab0340f4e0f8cf2ddaa3b4dd72870506078e04121ff735b07bc8d037b2cc4be9`.

The emulator required a cold boot (`-no-snapshot`) with `-gpu host` for usable visual captures. A restored snapshot under SwiftShader passed interaction checks but captured a black frame; changing that snapshot to ANGLE failed to boot. During repeated r24 runs the system chooser stopped responding and the WebView native RenderThread later crashed in `libwebviewchromium.so`; a cold restart restored operation. The subsequent two full runs passed and the pause-screen capture was reviewed. The harness also fixed a separate race: historical chooser activity records are insufficient, so it now waits for current chooser window focus and then focus returning to the app. WebView discovery has a three-minute deadline and removes stale success output before each attempt. Emulator frame rates are not device performance evidence.

Generated projects and passing browser tests do not establish native performance, safe-area behavior, OS lifecycle reliability, native save durability, physical haptics, or store approval. Test an installed build on low/mid/high Android hardware and iPhone/iPad in both orientations, including background/foreground, process termination, audio interruption, airplane-mode launch, save migration, sustained thermal load, and 30/60 FPS. Signing, store accounts, and distribution are separate from local development and have not been performed.

Implementation follows the official [Capacitor installation workflow](https://capacitorjs.com/docs/getting-started), [environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup), and [Preferences persistence/privacy guidance](https://capacitorjs.com/docs/apis/preferences).


