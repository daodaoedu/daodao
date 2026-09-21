# daodao plugin

島島阿學的開發流程打包成一個可安裝的 plugin：13 個 skill、PR 證據閘門 hooks、Issue／PR 模板。
支援 Claude Code、Codex、ChatGPT、Claude.ai 四個平台。

## 單一真相源

```
plugin/
├── .claude-plugin/plugin.json   Claude Code manifest
├── skills/<name>/SKILL.md       ← canonical，只有這裡能手改
├── hooks/                       閘門腳本 + hooks.json
├── templates/                   Issue／PR／PRD 模板
├── docs/                        跨 skill 的共用規則
├── platforms.json               能力矩陣：誰需要什麼、哪個平台有什麼
└── scripts/build.ts             canonical → 各平台產物
```

產物（**不要手改，改了會被 `pnpm plugin:check` 抓到**）：

| 產物 | 給誰 |
|---|---|
| `plugin/`（就地） | Claude Code |
| `.agents/skills/` | Codex CLI／IDE、ChatGPT 桌面版 |
| `.codex/hooks.json` | Codex 閘門 |
| `.agents/plugins/marketplace.json` | 本機安裝用的 repo marketplace |
| `plugin/out/openai-plugin/` | ChatGPT 網頁／行動版（Agent Plugins 格式） |
| `plugin/out/claude-ai/` + `plugin:zip` | Claude.ai 手動上傳 |

```bash
pnpm plugin:build    # 重新產生全部
pnpm plugin:check    # CI：產物與 canonical 有沒有漂移
pnpm plugin:zip      # 打包 claude.ai 上傳用的 zip
```

## 安裝

### Claude Code

**不需要 clone 這個 repo。** 從 GitHub repo 裝 marketplace 會 git clone 整包 monorepo（12MB）
只為了拿 163KB 的 plugin，所以散佈走 GitHub Release 的 zip（`archive` 來源，純 HTTPS 下載，
不需要 git 也不需要 npm）。

repo 的 `.claude/settings.json` 已宣告 marketplace 指向 release，所以開過本 repo 或任一
子專案的人只要：

```
/plugin install daodao@daodao
```

完全不在這些 repo 裡的人，自己加一次 marketplace（一樣不 clone）：

```bash
claude plugin marketplace add https://github.com/daodaoedu/daodao/releases/latest/download/marketplace.json
claude plugin install daodao@daodao
```

裝完**重開 session** 才載入；skill 會是 `/daodao:dev-task` 這種帶命名空間的形式。
`claude plugin details daodao@daodao` 可確認 13 skills + 4 hooks 都在。

沒辦法讓別人「自動」裝好——官方明講 repo 設定啟用外部來源 plugin 不會幫別人安裝，
自動的只有 marketplace 註冊，`install` 每人跑一次。

#### 改 plugin 的人（本機開發）

在 daodao 工作目錄裡直接掛工作目錄，不經過 release：

```bash
claude plugin marketplace add ./      # 注意是 ./，單一個 . 會被拒
claude plugin install daodao@daodao-dev
```

散佈用的叫 `daodao`、本機開發用的叫 `daodao-dev`，刻意不同名，才不會互相蓋掉。
兩個不要同時裝，skill 會重複出現。

#### 發新版

```bash
# 1. 在 plugin/.claude-plugin/plugin.json 把 version 往上加
# 2. 合進 main
```

`plugin-release.yml` 會打包、算 sha256、建 release、上傳 zip 與 marketplace.json，
最後**實際下載回來驗 sha256 對不對**才算成功。版本沒往上加會跳過發佈——已發佈的 zip
其 sha256 被釘住，重發同版本會讓已安裝的人對不上。

zip 是可重現的：同一份 commit 在本機 `pnpm plugin:package` 會得到跟 CI 一樣的 sha256，
可以自己驗。

### Codex

`.agents/skills/` 在 repo 裡，Codex 會自動掃（`$CWD`、`$CWD/..`、`$REPO_ROOT` 三層）。
**閘門要先信任**：跑 `/hooks` 檢視並信任 `.codex/hooks.json`。沒信任之前 hooks 不會執行，
那就等同沒有閘門，agent 必須自己逐項跑同一批腳本並貼出輸出。

### ChatGPT

- **桌面版 / Codex CLI / IDE**：跟 Codex 共用 `.agents/skills/`，開 repo 就有，不用裝。
- **網頁版與行動版**：**repo marketplace 到不了**。OpenAI 文件寫明 `.agents/plugins/marketplace.json`
  與個人 marketplace 只有桌面版與 Codex CLI 讀得到。要進網頁／行動版只有兩條路：

  **(a) 工作區管理員匯入（建議）** — Admin → Plugins → Add → Import marketplace，
  填本 repo 網址。**公開 repo 可以**，會直接讀 `.claude-plugin/marketplace.json`，
  每日自動同步，也能釘 branch／tag／commit。裝 `daodao-web`。

  > ⚠ **不要在網頁版要用的 plugin 裡放 MCP server。** 只要 plugin 宣告 `mcp.json` 或
  > `.mcp.json`，ChatGPT 就會把它標成 **Desktop only**，網頁與行動版直接失去——
  > 即使那個 MCP 是遠端 HTTPS 也一樣。

  **(b) 公開上架** — platform.openai.com/plugins。需要身分驗證、Apps Management 寫入權限、
  OpenAI 審核，而且**只有公開上架，沒有 unlisted／私有選項**。內部流程不建議走這條。

- **個人上傳的 skill**：Plugins → Skills → Upload。注意 **桌面版與網頁／行動版要各傳一次，
  不會互相同步**；方案限 Business／Enterprise／Edu，且 Enterprise／Edu 預設是關的。

### Claude.ai

**最省事的一條：個人自己加 marketplace，不需要管理員。**
Customize → Plugins → Personal plugins → **+** → Add marketplace → *Add from a repository*，
填 `https://github.com/daodaoedu/daodao`，然後裝 **`daodao-web`**。公開 repo 可以。

可用範圍：網頁版 chat、Claude Desktop 的 Chat 分頁、Cowork。**hooks 與 sub-agent 只在 Cowork 跑**，
在 chat 會顯示成灰的——所以網頁版本來就拿不到閘門，這也是 `daodao-web` 只收 7 個
不需要 checkout 的流程的原因。

不想用 plugin，要一個一個傳 skill 的話：

```bash
pnpm plugin:build && pnpm plugin:zip
```

Settings → Capabilities 開「Code execution and file creation」→ Customize → Skills →
「+」→ Upload a skill，逐一上傳 `plugin/out/web-plugin-zip/*.zip`。

#### 組織層級散佈（目前做不到）

Owner 可以在 claude.ai 的 Organization settings → Plugins 用 GitHub sync 全組織散佈，
甚至設成 **Required**（自動安裝、不可移除，而且會一路同步進每個人的 Claude Code）。
那是覆蓋面最廣的一招——**但 claude.ai 要求該 repo 必須是 private 或 internal，
公開 repo 不接受**。daodao 是公開 repo，所以這條路現在走不了。

另外 Claude 的 **Skills API（`POST /v1/skills`）餵的是 Console 的 API workspace，
不會出現在 claude.ai**，不能拿來當 CI 推送管道。`syncClaudeAiPlugins` 也只有
claude.ai → Claude Code 單向下載，沒有反向推送。

## 更新

改流程的人只做一件事：**bump 版號**。版號是使用者收不收得到更新的唯一訊號——
marketplace entry 宣告了 `version`，Claude Code 就以它判斷要不要重抓 archive；
沒 bump 就改 zip，已安裝的人會一直用舊快取，而且 release workflow 會直接跳過發佈。

```bash
pnpm plugin:bump          # patch；也可以 minor / major / 直接給 0.3.0
# 產物版號會一起更新，然後走正常 commit → PR → merge main
```

merge 後 `plugin-release.yml` 打包、建 release、**下載回來驗 sha256**。

使用者端：

| 平台 | 怎麼收到更新 |
|---|---|
| Claude Code | marketplace 已開 `autoUpdate`，session 啟動後十分鐘內背景更新，跳出提示後跑 `/reload-plugins`；要立刻更新就 `/plugin update daodao@daodao` |
| Codex／ChatGPT 桌面 | `.agents/skills/` 在 repo 裡，`git pull` 就是更新 |
| ChatGPT 工作區 | 匯入的 marketplace 每日自動同步，管理員也可以按 **Sync now** |
| claude.ai | 從 repository 加的 marketplace 會跟著 repo 更新；手動傳的 zip 要自己重傳 |

> ⚠ **第三方 marketplace 的 `autoUpdate` 預設是關的。** 本 repo 的 `.claude/settings.json`
> 已經設成 `true`，但如果有人是自己手動 `marketplace add` 的，要在 `/plugin` → Marketplaces
> → 選 daodao → **Enable auto-update**，否則他會凍在安裝當下那版，而且沒有任何提示。

已發佈的版號不會被覆蓋：release workflow 看到 tag 已存在就跳過，因為已發佈 zip 的
sha256 被釘在 marketplace.json 裡，重發同版號會讓已安裝的人撞
`Plugin archive integrity check failed`。

## 為什麼各平台收到的 skill 不一樣

`platforms.json` 宣告每個 skill 需要哪些能力、每個平台有哪些能力。需求沒被滿足的 skill **不會**
發到那個平台——硬塞只會讓 agent 宣稱它沒做過的事。可以收錄但有落差的，build 會在 skill 開頭
注入一段「能力落差」，明講哪幾項要改成輸出指令給人執行、哪幾項必須標「未查證」。

| | Claude Code | Codex／ChatGPT 桌面 | ChatGPT 網頁／行動 | Claude.ai 網頁 |
|---|---|---|---|---|
| 安裝的東西 | `daodao` | `.agents/skills/`（免裝） | `daodao-web` | `daodao-web` |
| skill 數 | 13 | 13 | 7 | 7 |
| 本機 repo／shell | ✅ | ✅ | ❌ | ❌ |
| 自動閘門 | ✅ hooks | ✅ 需 `/hooks` 信任 | ❌ | ❌（hooks 只在 Cowork 跑）|
| 瀏覽器驗證 | ✅ | ❌ | ❌ | ❌ |
| Drive 報告 | ✅ | ❌ | ❌ | ❌ |

Claude.ai 少掉的 6 個是 `dev-task`、`code-review`、`pre-commit-check`、`post-merge-wrapup`、
`gh-pipeline`、`format-commit`——全都需要使用者的 checkout。Claude.ai 的 sandbox 有檔案系統也能跑
指令，但那是一個空的暫時環境，不是專案。

## 平台事實（2026-09-21 查證）

決定架構的幾件事，以及來源：

- **Codex 的 skill 目錄是 `.agents/skills/`，不是 `.codex/skills/`**
  （<https://developers.openai.com/codex/skills>）。本 repo 舊有的 `.codex/skills/` 從來沒被
  Codex 載入過，已於 2026-09-21 移除。
- **Codex 有 hooks**，事件名與 Claude Code 相同（PreToolUse／PostToolUse／Stop／SessionStart…），
  設定放 `.codex/hooks.json`，首次使用要 `/hooks` 信任（hash pinning）。
  hook command 以 session cwd 執行，官方明講不要用相對路徑，所以產物用
  `$(git rev-parse --show-toplevel)`（<https://learn.chatgpt.com/docs/hooks.md>）。
- **ChatGPT 有真正的 Agent Skills**（2026-07-13 GA），與 Codex／Claude 共用 `SKILL.md` 標準。
  獨立 skill 走桌面版／Codex CLI／IDE；要進網頁與行動版必須包成 plugin。
- **`${CLAUDE_PLUGIN_ROOT}` 只有 Claude Code 會展開**，所以 canonical 用它、build 對每個平台換掉。
- **claude.ai 的 frontmatter 只收六個標準欄位**（`name`、`description`、`license`、
  `compatibility`、`metadata`、`allowed-tools`），多一個就上傳失敗；`description` 上限
  Anthropic 兩份文件分別寫 200 與 1024，`platforms.json` 取嚴的 200。

未查證：ChatGPT 手動上傳 skill 的格式（zip 或資料夾）與數量／大小上限、ChatGPT Project
instructions 字數上限、ChatGPT Skills 的方案矩陣（OpenAI 兩份文件互相矛盾）。

## 改流程的步驟

1. 改 `plugin/skills/<name>/SKILL.md`（或 `hooks/`、`templates/`、`docs/`）。
2. 新增 skill 時在 `plugin/platforms.json` 的 `skills` 補一筆能力宣告，否則 build 會擋。
3. `pnpm plugin:build`
4. `pnpm vitest run plugin/scripts/__tests__/`
5. 連同產物一起 commit。CI 的 `pnpm plugin:check` 會擋下忘記重跑的情況。
