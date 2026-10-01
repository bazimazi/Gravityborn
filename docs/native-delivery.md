# Offline and native delivery

The web production build precaches its own HTML, code, styles, icons, and manifest. It has no runtime CDN or account dependency. Updates wait for existing tabs to close so a running expedition keeps one asset version. Development mode deliberately does not install a service worker. Deploy `dist/` at the origin root over HTTPS; localhost supports local verification.

`npm run test:offline` verifies the production bundle by installing its worker, disconnecting the browser, reloading, restoring a route and settings, playing a room, and opening another offline tab. Build with `npm run build` first. The test uses port 5298 and separate artifacts so it can coexist with the development browser suite.

## Native projects

`android/` and `ios/` contain Capacitor projects for `com.bazimazi.gravityborn`. Native assets are bundled locally; the service worker is disabled inside the native shell. App backgrounding pauses input, physics, and music. Android back closes a dialog or pauses play. Haptics use the native plugin when enabled. Native saves use Preferences, preloaded before game initialization, with ordered backup/primary writes. A storage failure does not overwrite unreadable data. Save export remains available in the observatory.

Run `npm ci`, `npm run native:sync`, then build the selected native project. `npm run icons` regenerates original vector-based web and native icons/splash screens; it requires Playwright Chromium. Android uses JDK 21, the checked-in Gradle wrapper, and SDK 36. Set `JAVA_HOME` and `ANDROID_HOME` for your machine, then run `android/gradlew assembleDebug` from the Android directory (use `gradlew.bat` on Windows). The resulting APK is under `android/app/build/outputs/apk/debug/`.

For iOS, run `npm run native:ios` on a Mac with the supported Xcode toolchain. Select a signing team and device, then build/archive. The checked-in project uses Swift Package Manager. Its privacy manifest declares on-device preferences usage and is explicitly included in the Resources phase. The source can be generated on Windows; an iOS build cannot be validated here.

The CLI's Xcode helper uses UUID's compatible CommonJS `v4` API. A scoped override pins UUID 11.1.1 to avoid the older transitive advisory; npm audit currently reports no vulnerabilities. `native-prepare.mjs` parses the Xcode project and checks privacy resource inclusion after sync.

## Remaining release verification

Generated projects and passing browser tests do not establish native performance, safe-area behavior, OS lifecycle reliability, native save durability, physical haptics, or store approval. Test an installed build on low/mid/high Android hardware and iPhone/iPad in both orientations, including background/foreground, process termination, audio interruption, airplane-mode launch, save migration, sustained thermal load, and 30/60 FPS. Signing, store accounts, and distribution are separate from local development and have not been performed.

Implementation follows the official [Capacitor installation workflow](https://capacitorjs.com/docs/getting-started), [environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup), and [Preferences persistence/privacy guidance](https://capacitorjs.com/docs/apis/preferences).
