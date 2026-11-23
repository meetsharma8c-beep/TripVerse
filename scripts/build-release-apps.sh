#!/usr/bin/env bash
set -euo pipefail

# TripVerse Store Release Builder (Google Play .aab & Apple App Store Xcode prep)
# Usage: bash scripts/build-release-apps.sh [android|ios|both]

TARGET="${1:-both}"

echo "=== 1. Building Production Web Bundle & Syncing Capacitor ==="
npm run build
npm run test
npx cap sync

if [[ "$TARGET" == "android" || "$TARGET" == "both" ]]; then
  echo ""
  echo "=== 2. Building Signed Android App Bundle (.aab) for Google Play ==="
  if [[ ! -f "android/app/tripverse-release-key.jks" ]]; then
    echo "ERROR: Missing android/app/tripverse-release-key.jks"
    exit 1
  fi
  (cd android && ./gradlew bundleRelease)
  echo "✔ Android AAB generated at: android/app/build/outputs/bundle/release/app-release.aab"
fi

if [[ "$TARGET" == "ios" || "$TARGET" == "both" ]]; then
  echo ""
  echo "=== 3. Preparing iOS Project for App Store Archive ==="
  echo "Opening Xcode workspace — in Xcode choose: Product -> Archive -> Distribute App -> App Store Connect"
  npx cap open ios
fi
