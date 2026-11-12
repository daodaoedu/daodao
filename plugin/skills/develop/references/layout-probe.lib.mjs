// layout-probe 的判定規則；探針本體是 top-level-await 腳本，import 會直接執行。
// `isClippedByAncestor` 會被序列化送進瀏覽器執行（見 layout-probe.mjs 的 page.evaluate），
// 所以它只能用參數拿到的 getter，不可引用這個模組的其他東西。

const LOGIN_WALL = /\/(auth\/login|auth\/signin|login|signin|sign-in)(\/|$)/;

/** document 的 clientWidth 已扣除經典捲軸，innerWidth 只能作為觀測值。 */
export const horizontalOverflow = (scrollWidth, clientWidth) =>
  Math.max(0, scrollWidth - clientWidth);

/** 元素矩形可能有小數誤差；document 整數寬度的溢出不套用這個容忍值。 */
export const isHorizontallyOutside = (rect, clientWidth) =>
  rect.left < -1 || rect.right > clientWidth + 1;

/** 去掉 route 的 locale 前綴與 query，取得預期落點 pathname。 */
export const targetPathname = (route) =>
  route
    .split("?")[0]
    .replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "")
    .replace(/\/$/, "") || "/";

/**
 * 落在登入牆＝被導離目標頁。
 *
 * 目標 route 本身就在 `/auth/` 底下時（`/auth/error`、`/auth/onboarding`、`/auth/verify-email`），
 * 停在那裡是驗到了，不是被擋下來——舊規則用 `/(auth|login|signin)/` 一律判 ❌，
 * 讓 daodao#239 的 auth 系頁面無法通過探針（false positive）。
 */
export const isLoginWall = (pathname, route) => {
  const current = (pathname || "").replace(/\/$/, "") || "/";
  if (current === targetPathname(route)) return false;
  return LOGIN_WALL.test(current);
};

/**
 * 元素是否被某個祖先的 overflow 裁掉（含水平捲動容器）。
 *
 * 被裁掉的元素不會被使用者看到，也不會讓頁面橫向捲動：水平捲動的卡片列、滿版裝飾插圖都算。
 * 只有「一路往上到 stopAt 都沒有裁切祖先」的才是真的出界（#233 那種 `w-screen` 疊 padding 的情形）。
 *
 * @param el 起始元素
 * @param getOverflowX 取得某元素 computed overflow-x 的 getter
 * @param stopAt 停止往上找的節點（通常是 document.body）
 */
export const isClippedByAncestor = (el, getOverflowX, stopAt) => {
  let a = el.parentElement;
  while (a && a !== stopAt) {
    if (/^(hidden|clip|auto|scroll)$/.test(getOverflowX(a))) return true;
    a = a.parentElement;
  }
  return false;
};

/**
 * 浮層遮擋取樣點的內縮量（px）。
 * 取樣點 (i, i) 要落在半徑 R 的圓角內，需 i ≥ R × (1 − 1/√2)；固定內縮 6px 遇到 24px 圓角的抽屜時，
 * 角落取樣點會落在圓角外、量到背後的遮罩，誤判為「被遮住」（daodao#524）。
 * 半徑以邊長一半為上限（pill 樣式常寫 9999px）。
 *
 * @param radii 四個角的 border-radius（px）
 * @param width 浮層寬
 * @param height 浮層高
 * @param min 最小內縮
 */
export const cornerSampleInset = (radii, width, height, min = 6) => {
  const cap = Math.max(0, Math.min(width, height) / 2);
  const radius = Math.max(0, ...radii.map((v) => Math.min(Number.isFinite(v) ? v : 0, cap)));
  return Math.max(min, Math.ceil(radius * (1 - Math.SQRT1_2)) + 1);
};
