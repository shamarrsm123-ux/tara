#!/usr/bin/env bash
# Phase 0: check a locally built release APK and the copy installed on a connected phone.
# Usage: scripts/device/check-release-apk.sh [path/to/app-release.apk]
set -euo pipefail

PKG="org.tara.app"
APK="${1:-android/app/build/outputs/apk/release/app-release.apk}"
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK path}"
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"

echo "== APK permissions ($APK)"
"$BT/aapt2" dump badging "$APK" | node scripts/privacy/apkPermissions.js

echo "== Installed on device: requested permissions for $PKG"
if adb shell pm list packages | grep -q "package:$PKG"; then
  if adb shell dumpsys package "$PKG" | grep -q "android.permission.INTERNET"; then
    echo "FAIL: installed app requests INTERNET"; exit 1
  fi
  echo "OK: installed app does not request INTERNET"
else
  echo "SKIP: $PKG not installed on the connected device"
fi
