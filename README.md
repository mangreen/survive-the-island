# survive-the-island

可與朋友連線遊玩的純網頁 3D 紙藝風回合制桌遊（2–6 人，P2P 優先，支援單人離線）。
規則參考桌遊 *Survive: Escape from Atlantis!* 與 *Survive the Island*。

> 本專案為非官方的同好作品，與原作者及出版商無關。
> 倉庫內不收錄官方規則書、官方美術或其他第三方遊戲素材。

## 目前狀態

**M0（地基與技術驗證），還不能玩。** 目前有一個技術原型畫面：紙藝風棋盤、效能量測、
座標格線檢查、房間設定說明。

## 快速開始

需要 Docker（相容 Docker Desktop 4.12），主機不用裝 Node。

```sh
make dev     # http://localhost:5173
make check   # 格式、lint、型別、測試、build
```

M0 驗收步驟見 [docs/runbooks/m0-acceptance.md](docs/runbooks/m0-acceptance.md)。

## 文件

- [AGENTS.md](AGENTS.md)：工程規則、指令、合併授權
- [docs/adr/](docs/adr/)：重大決策

## 分支規則

- `main` 只透過 Pull Request 更新（初始提交除外）。合併授權分級見 [AGENTS.md](AGENTS.md#git-與合併授權)。
- 里程碑分支併入 `main` 前，由專案擁有者驗收。
- 除 `main` 外，只保留最新的里程碑分支。

## 第三方內容

`.claude/skills/papercraft/` 引自 [xikhar/papercraft](https://github.com/xikhar/papercraft)（MIT），
版本與差異見該目錄的 `VENDORED.md`。
