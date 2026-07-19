#!/usr/bin/env bash
# island-3d P0 spike 素材重建腳本
# 產出 test-page/models/*.glb（Kenney CC0，貼圖內嵌）與 test-page/role-d-opt.glb（Blender 腳本建模）
# 需求：curl、unzip、npx、Blender（brew install --cask blender）
set -euo pipefail
cd "$(dirname "$0")"

WORK=$(mktemp -d)
OUT=test-page/models
mkdir -p "$OUT"

# 1. 下載 Kenney 包（CC0；URL 若失效請至 kenney.nl/assets 重新取得）
declare -A PACKS=(
  [survival]="https://kenney.nl/media/pages/assets/survival-kit/4065a8185b-1712149243/kenney_survival-kit.zip"
  [nature]="https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip"
  [pirate]="https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip"
)
for pack in "${!PACKS[@]}"; do
  curl -sL -A "Mozilla/5.0" -o "$WORK/$pack.zip" "${PACKS[$pack]}"
  mkdir -p "$WORK/$pack" && unzip -qo "$WORK/$pack.zip" -d "$WORK/$pack"
done

# 2. 挑選模型並以 gltf-transform 內嵌貼圖（Kenney GLB 引用外部 Textures/colormap.png）
MODELS=(
  "survival:tent-canvas" "survival:campfire-pit"
  "pirate:palm-detailed-bend" "pirate:palm-straight"
  "pirate:rocks-sand-a" "pirate:rocks-sand-b"
  "pirate:boat-row-small" "pirate:structure-platform-dock" "pirate:patch-grass"
)
for entry in "${MODELS[@]}"; do
  pack=${entry%%:*}; name=${entry##*:}
  npx --yes @gltf-transform/cli copy "$WORK/$pack/Models/GLB format/$name.glb" "$OUT/$name.glb"
done

# 3. 角色：Blender 腳本建模 → Draco 壓縮
/Applications/Blender.app/Contents/MacOS/Blender -b -P build_role_d.py -- "$WORK"
npx --yes @gltf-transform/cli optimize "$WORK/role-d.glb" test-page/role-d-opt.glb \
  --compress draco --join false --flatten false

rm -rf "$WORK"
echo "完成：$OUT/*.glb + test-page/role-d-opt.glb"
echo "啟動測試頁：cd test-page && python3 -m http.server 8787"
