#!/usr/bin/env bash
set -euo pipefail

APP="Curiosity Coding Interface.app"
DEST="/Applications/$APP"
BASE="https://github.com/VisruthSK/Curiosity-Coding-Frontend/releases/latest/download"
ARCH=$([[ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]] && echo Apple-Silicon || echo Intel)
VERSION=$(curl -fsSL https://api.github.com/repos/VisruthSK/Curiosity-Coding-Frontend/releases/latest |
  sed -n 's/.*"tag_name": *"\(v[^"]*\)".*/\1/p' |
  head -n 1)
test -n "$VERSION" || { echo "Could not determine latest release version"; exit 1; }
DMG="Curiosity-Coding-Interface-macOS-$ARCH-$VERSION.dmg"

pgrep -x "${APP%.app}" >/dev/null && { echo "Quit ${APP%.app} first"; exit 1; }

T=$(mktemp -d)
trap 'hdiutil detach "$T/m" -quiet 2>/dev/null || true; rm -rf "$T"' EXIT

mkdir "$T/m"
curl -fsSL "$BASE/$DMG" -o "$T/app.dmg"
hdiutil attach "$T/app.dmg" -readonly -nobrowse -mountpoint "$T/m" -quiet
test -d "$T/m/$APP"

ditto "$T/m/$APP" "$T/$APP"
codesign --force --deep --sign - "$T/$APP"
xattr -dr com.apple.quarantine "$T/$APP" 2>/dev/null || true

sudo rm -rf "$DEST"
sudo ditto "$T/$APP" "$DEST"
sudo xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "Installed $APP"

