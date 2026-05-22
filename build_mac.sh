#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build_mac.sh  —  Build TikTok Shop → FlashShip as a standalone macOS .app
#
# Usage:
#   chmod +x build_mac.sh
#   ./build_mac.sh
#
# Output:
#   dist/TikTokShop.app   ← double-click to run, no Python needed
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_NAME="TikTokShop"
MAIN_SCRIPT="process_tiktik_order.py"
ICON=""   # set to path of a .icns file if you have one, e.g. "assets/icon.icns"

echo "==> Installing / upgrading PyInstaller..."
pip3 install --upgrade pyinstaller

echo "==> Cleaning previous build artefacts..."
rm -rf build dist "${APP_NAME}.spec"

echo "==> Building ${APP_NAME}.app ..."

ICON_FLAG=""
if [ -n "$ICON" ] && [ -f "$ICON" ]; then
    ICON_FLAG="--icon=${ICON}"
fi

pyinstaller \
    --windowed \
    --onedir \
    --name "${APP_NAME}" \
    --add-data "flashship_mapping.json:." \
    --hidden-import openpyxl \
    --hidden-import openpyxl.styles \
    --hidden-import openpyxl.utils \
    --collect-submodules openpyxl \
    --exclude-module pandas \
    --exclude-module numpy \
    --exclude-module PIL \
    --exclude-module Pillow \
    --exclude-module cryptography \
    --exclude-module aiohttp \
    --exclude-module yaml \
    --exclude-module matplotlib \
    --exclude-module scipy \
    --exclude-module IPython \
    --exclude-module jupyter \
    ${ICON_FLAG} \
    "${MAIN_SCRIPT}"

echo ""
echo "==> Stripping extended attributes and applying ad-hoc signature..."
find "dist/${APP_NAME}.app" -type f | xargs xattr -c 2>/dev/null || true
find "dist/${APP_NAME}.app" -type d | xargs xattr -c 2>/dev/null || true
codesign --force --deep --sign - --no-strict "dist/${APP_NAME}.app" && echo "    Signed OK"

echo ""
echo "==> Creating distributable zip..."
ditto -c -k --sequesterRsrc --keepParent \
    "dist/${APP_NAME}.app" "dist/${APP_NAME}.zip"

echo ""
echo "✅  Build complete!"
echo "    App: $(pwd)/dist/${APP_NAME}.app"
echo "    Zip: $(pwd)/dist/${APP_NAME}.zip  ($(du -sh dist/${APP_NAME}.zip | cut -f1))"
echo ""
echo "To distribute: send dist/${APP_NAME}.zip to other Macs."
echo "Recipients unzip and double-click ${APP_NAME}.app — no Python needed."
