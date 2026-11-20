#!/usr/bin/env node
/**
 * TripVerse Mobile Store Readiness & IDE Automation CLI
 *
 * Automates Google Play Store (Android Studio / Gradle) and
 * Apple App Store (Xcode / xcodebuild) workflows on macOS.
 *
 * Usage:
 *   node scripts/mobile-release.mjs doctor          # Full store-readiness & toolchain audit
 *   node scripts/mobile-release.mjs sync            # Build web bundle & sync Android + iOS
 *   node scripts/mobile-release.mjs android:apk     # Build & verify Android debug APK
 *   node scripts/mobile-release.mjs android:aab     # Build Google Play Store release AAB
 *   node scripts/mobile-release.mjs android:studio  # Sync & launch Android Studio
 *   node scripts/mobile-release.mjs ios:verify      # Build & verify iOS Simulator binary via xcodebuild
 *   node scripts/mobile-release.mjs ios:archive     # Create App Store .xcarchive (requires Apple Team)
 *   node scripts/mobile-release.mjs ios:xcode       # Sync & launch Xcode
 *   node scripts/mobile-release.mjs open:both       # Sync once & open both Android Studio and Xcode
 *   node scripts/mobile-release.mjs verify:all      # Doctor + Sync + Android AAB + iOS xcodebuild (+ --open)
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');
const IOS_DIR = path.join(ROOT, 'ios', 'App');
const XCODE_PROJECT = path.join(IOS_DIR, 'App.xcodeproj');
const ANDROID_STUDIO_APP = '/Applications/Android Studio.app';

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith('--')) || 'doctor';
const flags = new Set(args.filter((a) => a.startsWith('--')));
const skipSync = flags.has('--no-sync');
const openAfter = flags.has('--open');

function banner(title) {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  TripVerse Mobile Release :: ${title}`);
  console.log(`${'='.repeat(64)}\n`);
}

function step(msg) {
  console.log(`-> ${msg}`);
}

function ok(msg) {
  console.log(`  [PASS] ${msg}`);
}

function warn(msg) {
  console.log(`  [WARN] ${msg}`);
}

function fail(msg) {
  console.error(`  [FAIL] ${msg}`);
}

function detectJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const candidates = [
    path.join(ANDROID_STUDIO_APP, 'Contents/jbr/Contents/Home'),
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const out = execSync('/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home 2>/dev/null', {
      encoding: 'utf8',
    }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // ignore
  }
  return undefined;
}

function ensureAndroidLocalProperties() {
  const localPropsPath = path.join(ANDROID_DIR, 'local.properties');
  const defaultSdk = path.join(os.homedir(), 'Library', 'Android', 'sdk');
  const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdk;

  if (!fs.existsSync(localPropsPath) && fs.existsSync(sdkDir)) {
    fs.writeFileSync(localPropsPath, `sdk.dir=${sdkDir}\n`, 'utf8');
    step(`Created android/local.properties pointing to ${sdkDir}`);
  }
  return { localPropsPath, sdkDir };
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  const env = { ...process.env, ...(opts.env || {}) };
  step(`Running: ${cmd} (in ${path.relative(ROOT, cwd) || '.'})`);
  const res = spawnSync(cmd, {
    cwd,
    env,
    shell: true,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Command failed (exit ${res.status}): ${cmd}`);
  }
}

function tryCapture(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function checkReleaseKeystore() {
  const envKeystore = process.env.ANDROID_KEYSTORE_FILE;
  const appKeystore = path.join(ANDROID_DIR, 'app', 'tripverse-release-key.jks');
  const rootKeystore = path.join(ANDROID_DIR, 'tripverse-release-key.jks');
  if (envKeystore && fs.existsSync(envKeystore)) return envKeystore;
  if (fs.existsSync(appKeystore)) return appKeystore;
  if (fs.existsSync(rootKeystore)) return rootKeystore;
  return null;
}

function hasReleaseSigningCredentials() {
  return Boolean(checkReleaseKeystore() && process.env.ANDROID_KEYSTORE_PASSWORD);
}

async function runDoctor() {
  banner('Store Readiness & Toolchain Doctor');
  let issues = 0;

  // 1. Toolchain
  const nodeVer = process.version;
  ok(`Node.js ${nodeVer}`);

  const javaHome = detectJavaHome();
  if (javaHome) {
    ok(`Java JDK found: ${javaHome}`);
  } else {
    fail('No JDK found (install OpenJDK 21 or Android Studio JBR)');
    issues++;
  }

  const { sdkDir } = ensureAndroidLocalProperties();
  if (fs.existsSync(sdkDir)) {
    ok(`Android SDK found: ${sdkDir}`);
  } else {
    fail(`Android SDK missing at ${sdkDir}`);
    issues++;
  }

  if (fs.existsSync(ANDROID_STUDIO_APP)) {
    ok(`Android Studio installed: ${ANDROID_STUDIO_APP}`);
  } else {
    warn(`Android Studio not found at ${ANDROID_STUDIO_APP}`);
  }

  const xcodeVer = tryCapture('xcodebuild -version');
  if (xcodeVer) {
    ok(`Xcode installed: ${xcodeVer.replace(/\n/g, ' / ')}`);
  } else {
    fail('Xcode command-line tools / xcodebuild unavailable');
    issues++;
  }

  // 2. iOS App Store Compliance
  const privacyPath = path.join(IOS_DIR, 'App', 'PrivacyInfo.xcprivacy');
  if (fs.existsSync(privacyPath)) {
    ok('iOS PrivacyInfo.xcprivacy present');
  } else {
    fail('Missing ios/App/App/PrivacyInfo.xcprivacy (App Store requirement)');
    issues++;
  }

  const pbxproj = fs.readFileSync(path.join(XCODE_PROJECT, 'project.pbxproj'), 'utf8');
  if (pbxproj.includes('PrivacyInfo.xcprivacy')) {
    ok('PrivacyInfo.xcprivacy wired into Xcode PBXResourcesBuildPhase');
  } else {
    fail('PrivacyInfo.xcprivacy is not wired into project.pbxproj');
    issues++;
  }

  const infoPlist = fs.readFileSync(path.join(IOS_DIR, 'App', 'Info.plist'), 'utf8');
  if (infoPlist.includes('<string>arm64</string>') && !infoPlist.includes('<string>armv7</string>')) {
    ok('iOS Info.plist UIRequiredDeviceCapabilities uses arm64 (no obsolete armv7)');
  } else {
    fail('iOS Info.plist should specify arm64 instead of armv7');
    issues++;
  }

  const iconPath = path.join(IOS_DIR, 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  const sipsOut = tryCapture(`sips -g hasAlpha -g pixelWidth -g pixelHeight "${iconPath}"`);
  if (sipsOut && sipsOut.includes('hasAlpha: no') && sipsOut.includes('pixelWidth: 1024') && sipsOut.includes('pixelHeight: 1024')) {
    ok('iOS App Store icon is 1024x1024 RGB with NO alpha channel (passes ITMS-90717)');
  } else {
    fail(`iOS App Store icon check failed:\n${sipsOut || 'missing'}`);
    issues++;
  }

  if (/DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]{10};/.test(pbxproj)) {
    ok('Xcode DEVELOPMENT_TEAM configured for App Store signing');
  } else {
    warn('Xcode DEVELOPMENT_TEAM not set yet — select your Apple Developer Team in Xcode -> Signing & Capabilities before Archiving');
  }

  // 3. Android Play Store Compliance
  const manifest = fs.readFileSync(path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
  if (manifest.includes('android:usesCleartextTraffic="false"')) {
    ok('AndroidManifest enforces HTTPS-only (usesCleartextTraffic="false")');
  } else {
    fail('AndroidManifest missing android:usesCleartextTraffic="false"');
    issues++;
  }

  if (manifest.includes('android:autoVerify="true"') && manifest.includes('trip-verse.com')) {
    ok('Android App Links & tripverse:// deep links configured');
  } else {
    warn('Android App Links not detected in AndroidManifest.xml');
  }

  if (manifest.includes('android:required="false"')) {
    ok('Android optional hardware features marked required="false" (supports tablets/Chromebooks)');
  } else {
    warn('Android hardware features not marked optional');
  }

  const keystore = checkReleaseKeystore();
  if (keystore) {
    ok(`Android release keystore detected: ${keystore}`);
    if (!hasReleaseSigningCredentials()) {
      warn('Set ANDROID_KEYSTORE_PASSWORD when running `npm run mobile:android:aab` (or use Android Studio -> Build -> Generate Signed App Bundle) to sign with this keystore.');
    }
  } else {
    warn('Android Play Store upload keystore not created yet (local release AAB uses debug fallback). Create with: npm run mobile:android:keygen');
  }

  console.log('');
  if (issues > 0) {
    fail(`Doctor found ${issues} blocking issue(s).`);
    process.exit(1);
  }
  ok('All automated Play Store & App Store compliance checks PASSED!');
}

function buildAndSync(platform = 'both') {
  if (skipSync) {
    step('Skipping web build & Capacitor sync (--no-sync)');
    return;
  }
  banner(`Build Web Bundle & Sync Capacitor (${platform})`);
  run('npm run build');
  if (platform === 'android') {
    run('npx cap sync android');
  } else if (platform === 'ios') {
    run('npx cap sync ios');
  } else {
    run('npx cap sync');
  }
}

function getGradleEnv() {
  const javaHome = detectJavaHome();
  const { sdkDir } = ensureAndroidLocalProperties();
  return {
    ...(javaHome ? { JAVA_HOME: javaHome, PATH: `${path.join(javaHome, 'bin')}:${process.env.PATH}` } : {}),
    ...(fs.existsSync(sdkDir) ? { ANDROID_HOME: sdkDir, ANDROID_SDK_ROOT: sdkDir } : {}),
  };
}

function buildAndroidApk() {
  buildAndSync('android');
  banner('Android Debug APK Build');
  run('./gradlew assembleDebug', { cwd: ANDROID_DIR, env: getGradleEnv() });
  const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`Expected APK not found at ${apkPath}`);
  }
  const stat = fs.statSync(apkPath);
  ok(`Android Debug APK ready: ${apkPath} (${formatBytes(stat.size)})`);
}

function buildAndroidAab() {
  buildAndSync('android');
  banner('Google Play Store Release AAB Build');
  const keystore = checkReleaseKeystore();
  run('./gradlew bundleRelease', { cwd: ANDROID_DIR, env: getGradleEnv() });
  const aabPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (!fs.existsSync(aabPath)) {
    throw new Error(`Expected AAB not found at ${aabPath}`);
  }
  const stat = fs.statSync(aabPath);
  ok(`Play Store AAB ready: ${aabPath} (${formatBytes(stat.size)})`);
  if (!hasReleaseSigningCredentials()) {
    warn('Signed with local debug key because ANDROID_KEYSTORE_PASSWORD was not provided. For Google Play Console upload, run: ANDROID_KEYSTORE_PASSWORD="..." npm run mobile:android:aab');
  }
}

function openAndroidStudio() {
  buildAndSync('android');
  banner('Launching Android Studio');
  if (!fs.existsSync(ANDROID_STUDIO_APP)) {
    throw new Error(`Android Studio not found at ${ANDROID_STUDIO_APP}`);
  }
  run(`open -a "${ANDROID_STUDIO_APP}" "${ANDROID_DIR}"`);
  ok(`Opened ${ANDROID_DIR} in Android Studio`);
}

function verifyIosSimulatorBuild() {
  buildAndSync('ios');
  banner('iOS Native Xcode Verification (Simulator Build)');
  const derivedData = path.join(ROOT, 'ios', 'build', 'DerivedData');
  run(
    `xcodebuild -project "${XCODE_PROJECT}" -scheme App -configuration Debug -sdk iphonesimulator -destination "generic/platform=iOS Simulator" -derivedDataPath "${derivedData}" build CODE_SIGNING_ALLOWED=NO`,
    { cwd: IOS_DIR }
  );
  const appBundle = path.join(derivedData, 'Build', 'Products', 'Debug-iphonesimulator', 'App.app');
  const bundledPrivacy = path.join(appBundle, 'PrivacyInfo.xcprivacy');
  if (fs.existsSync(bundledPrivacy)) {
    ok(`Verified PrivacyInfo.xcprivacy bundled inside ${appBundle}`);
  } else {
    throw new Error(`PrivacyInfo.xcprivacy was NOT copied into ${appBundle}`);
  }
  ok('iOS Xcode Simulator build SUCCEEDED!');
}

function archiveIosAppStore() {
  buildAndSync('ios');
  banner('iOS App Store Archive (.xcarchive)');
  const pbxproj = fs.readFileSync(path.join(XCODE_PROJECT, 'project.pbxproj'), 'utf8');
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId && !/DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]{10};/.test(pbxproj)) {
    warn('No Apple Development Team configured yet. Opening Xcode so you can select your Team under App -> Signing & Capabilities, or re-run with APPLE_TEAM_ID=<YOUR_10_CHAR_TEAM_ID>.');
    run(`open "${XCODE_PROJECT}"`);
    return;
  }
  const archivePath = path.join(ROOT, 'ios', 'build', 'TripVerse.xcarchive');
  const teamArg = teamId ? `DEVELOPMENT_TEAM=${teamId}` : '';
  run(
    `xcodebuild -project "${XCODE_PROJECT}" -scheme App -configuration Release -sdk iphoneos -destination "generic/platform=iOS" -archivePath "${archivePath}" ${teamArg} -allowProvisioningUpdates archive`,
    { cwd: IOS_DIR }
  );
  ok(`App Store Archive ready: ${archivePath}`);
  ok('Open in Xcode Organizer (`open "${archivePath}"`) to Distribute App -> App Store Connect.');
}

function openXcode() {
  buildAndSync('ios');
  banner('Launching Xcode');
  run(`open "${XCODE_PROJECT}"`);
  ok(`Opened ${XCODE_PROJECT} in Xcode`);
}

function openBothIdes() {
  buildAndSync('both');
  banner('Launching Android Studio & Xcode');
  if (fs.existsSync(ANDROID_STUDIO_APP)) {
    run(`open -a "${ANDROID_STUDIO_APP}" "${ANDROID_DIR}"`);
    ok(`Opened ${ANDROID_DIR} in Android Studio`);
  } else {
    warn(`Android Studio not found at ${ANDROID_STUDIO_APP}`);
  }
  run(`open "${XCODE_PROJECT}"`);
  ok(`Opened ${XCODE_PROJECT} in Xcode`);
}

function generateAndroidKeystore() {
  banner('Generate Google Play Upload Keystore');
  const outPath = path.join(ANDROID_DIR, 'app', 'tripverse-release-key.jks');
  if (fs.existsSync(outPath)) {
    warn(`Keystore already exists at ${outPath}. Refusing to overwrite.`);
    return;
  }
  const storePass = process.env.ANDROID_KEYSTORE_PASSWORD;
  const keyPass = process.env.ANDROID_KEY_PASSWORD || storePass;
  const alias = process.env.ANDROID_KEY_ALIAS || 'tripverse';
  if (!storePass) {
    console.log('Run with environment variables to generate your Play Store upload keystore:\n');
    console.log('  ANDROID_KEYSTORE_PASSWORD="YOUR_STRONG_PASSWORD" npm run mobile:android:keygen\n');
    console.log('Back up android/tripverse-release-key.jks securely (never commit it to git).');
    return;
  }
  const env = getGradleEnv();
  run(
    `keytool -genkeypair -v -keystore "${outPath}" -alias "${alias}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${storePass}" -keypass "${keyPass}" -dname "CN=TripVerse, OU=Mobile, O=TripVerse, L=Vadodara, ST=Gujarat, C=IN"`,
    { env }
  );
  ok(`Generated release keystore: ${outPath}`);
}

async function main() {
  switch (command) {
    case 'doctor':
      await runDoctor();
      break;
    case 'sync':
      buildAndSync('both');
      break;
    case 'android:apk':
      buildAndroidApk();
      break;
    case 'android:aab':
      buildAndroidAab();
      break;
    case 'android:studio':
      openAndroidStudio();
      break;
    case 'android:keygen':
      generateAndroidKeystore();
      break;
    case 'ios:verify':
      verifyIosSimulatorBuild();
      break;
    case 'ios:archive':
      archiveIosAppStore();
      break;
    case 'ios:xcode':
      openXcode();
      break;
    case 'open:both':
      openBothIdes();
      break;
    case 'verify:all': {
      await runDoctor();
      buildAndSync('both');
      // Avoid rebuilding web bundle twice during verify:all
      const prevArgs = skipSync;
      banner('Android Debug APK + Play Store Release AAB');
      run('./gradlew assembleDebug bundleRelease', { cwd: ANDROID_DIR, env: getGradleEnv() });
      const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      const aabPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
      ok(`APK: ${apkPath} (${formatBytes(fs.statSync(apkPath).size)})`);
      ok(`AAB: ${aabPath} (${formatBytes(fs.statSync(aabPath).size)})`);

      banner('iOS Native Xcode Verification (Simulator Build)');
      const derivedData = path.join(ROOT, 'ios', 'build', 'DerivedData');
      run(
        `xcodebuild -project "${XCODE_PROJECT}" -scheme App -configuration Debug -sdk iphonesimulator -destination "generic/platform=iOS Simulator" -derivedDataPath "${derivedData}" build CODE_SIGNING_ALLOWED=NO`,
        { cwd: IOS_DIR }
      );
      const bundledPrivacy = path.join(derivedData, 'Build', 'Products', 'Debug-iphonesimulator', 'App.app', 'PrivacyInfo.xcprivacy');
      if (!fs.existsSync(bundledPrivacy)) {
        throw new Error('PrivacyInfo.xcprivacy missing from built App.app bundle!');
      }
      ok('iOS Simulator Build & PrivacyInfo.xcprivacy bundle verification PASSED!');

      if (openAfter) {
        banner('Launching Android Studio & Xcode');
        if (fs.existsSync(ANDROID_STUDIO_APP)) {
          run(`open -a "${ANDROID_STUDIO_APP}" "${ANDROID_DIR}"`);
        }
        run(`open "${XCODE_PROJECT}"`);
      }
      void prevArgs;
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  fail(err.message);
  process.exit(1);
});
