// poc-compare.mjs 的 config 範例：複製到 $TASK/notes/poc-compare/config.mjs 後依任務改。
// probe key 的第一段（第一個「.」之前）就是類別，poc-report.py 用它算涵蓋率：
//   shell | card | button | input | dialog | table | badge | filter | empty
// 沒有的類別要在 categories.na 寫理由（會進 coverage.json），不寫就會被 pre-pr-gate 擋。
const TASK = "/Users/xiaoxu/Projects/daodao/worktrees/<n>-<slug>";

// 兩邊共用寫字串；不同寫 { poc, impl }
const P = (poc, impl) => ({ poc, impl });

export default {
  task: TASK,
  poc: { url: "http://127.0.0.1:4173/" },                         // cd $TASK/poc && python3 -m http.server 4173
  impl: {
    url: "http://localhost:3031",
    // 登入：先到公開頁設 localStorage（cookie 由 auth.cookie 自動加）
    login: async (h) => {
      await h.goto("/zh-TW/challenges");
      await h.page.evaluate(() => localStorage.setItem("_userinfo", JSON.stringify({ _id: "<users.external_id>", id: 2 })));
    },
  },
  auth: { cookie: "auth_token", tokenFile: "~/.claude/projects/-Users-xiaoxu-Projects-daodao/dev-jwt.txt", domain: "localhost" },
  viewport: { width: 1280, height: 900 },
  categories: {
    required: ["shell", "card", "button", "input", "dialog", "table", "badge", "filter", "empty"],
    na: { /* table: "本任務頁面沒有表格" */ },
  },
  checkpoints: [
    {
      name: "templates-list",
      flow: async (h) => {
        if (h.isPoc) { await h.goto("/"); await h.click("f.q('button[data-lh-nav=\"templates\"]')"); }
        else await h.goto("/zh-TW/lighthouse/templates");
      },
      probes: {
        "shell.aside": P("f.q('aside[data-lh-aside]')", "f.q('aside')"),
        "shell.h1": "f.byText('^模板庫$','h1')",
        "button.primary": "f.byText('建立模板','button')",
        "input.search": "f.q('input[placeholder^=\"搜尋\"]')",
        "card.item": "f.q('main article')",
        "card.grid": "f.up(f.q('main article'),1)",
        "card.title": "f.q('main article h2')",
        "badge.draft": "f.byText('^草稿$','span')",
      },
    },
    {
      name: "templates-wizard-step2",
      flow: async (h) => {
        if (h.isPoc) { await h.goto("/"); await h.click("f.q('button[data-lh-nav=\"templates\"]')"); }
        else await h.goto("/zh-TW/lighthouse/templates");
        await h.click("f.byText('建立模板','button')");
        await h.type(h.isPoc ? "f.q('section[data-template-create-modal] textarea')" : "f.q('[role=\"dialog\"] textarea')", "每天閱讀 30 頁");
        await h.click("f.byText('^下一步','button')");
      },
      probes: {
        "dialog.overlay": P("f.up(f.q('section[data-template-create-modal]'),1).previousElementSibling", "f.q('[data-slot=\"dialog-overlay\"]')"),
        "dialog.panel": P("f.q('section[data-template-create-modal]')", "f.q('[role=\"dialog\"]')"),
        "dialog.body": P("f.q('section[data-template-create-modal] > div')", "f.q('[role=\"dialog\"] .overflow-y-auto')"), // scrollable 欄位會標出內捲
        "button.footerPrimary": "f.byText('^下一步','button')",
        "button.footerSecondary": "f.byText('^儲存草稿$','button')",
        "button.option": "f.byText('^7 ?天$','button')",
        "input.other": "f.q('input[placeholder^=\"其他天數\"]')",
        "input.label": "f.byText('^天數','*')",
      },
    },
    // table / filter / empty 類別的檢查點依任務加；沒有就在 categories.na 寫理由
  ],
};
