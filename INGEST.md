---
title: 知识库 · 资料摄入流程
type: schema
status: stable
created: 2026-04-26
updated: 2026-04-26
tags: [sop, ingest, agent, multi-model]
---

# 资料摄入流程 INGEST

> [!important] 本文件的地位
> 本文件是知识库**唯一的摄入操作权威**，跨所有模型与 Agent 客户端通用（Claude Code / Hermes / Codex / Cursor / Gemini ...）。
> 当 [[CLAUDE]] §3.1 或 [[SCHEMA]] 与本文件冲突时，**以本文件为准**。
> 本文件属于模式层，不得擅自修改，需显式授权。

---

## 0. 何时触发

满足以下任一条件即触发摄入流程：

- 用户在 chat 窗口**粘贴一段内容**（最常见路径，覆盖 90%+ 场景）
- 用户给出**文件路径**让 Agent 读取
- 用户给出 **URL** 让 Agent 抓取（若 Agent 无抓取能力，要求用户改为粘贴）
- 用户明确说"摄入"、"入库"、"按  处理这份资料"

---

## 1. 段 1 · 入参识别（统一入口）

不论入参形态，先做两件事：

### 1.1 来源类型判定（4 选 1）

| 类型 | 信号 | 落档目录 |
| --- | --- | --- |
| **代码文档** | 含 `package.json` / 函数签名 / API 文档结构 / 来自 monorepo 路径 / 用户提及 `@cs/*` 等工作 package | `sources/papers/` |
| **行业文章 / gist** | 公开发布、有作者署名、有 URL、形如博客/论文/gist | `sources/articles/` |
| **个人笔记** | 用户自述"这是我的笔记/思考/会议纪要"，无外部出处 | `sources/meetings/` 或 `sources/clippings/` |
| **网页收藏** | 来自浏览器剪藏、纯网页内容片段 | `sources/clippings/` |

**判定不确定 → 问用户一次**："我把它当作 X 类来源处理，对吗？"

### 1.2 分流

```
代码文档 → 跳到 段 3（版本化摄入子流程）
其他三类 → 跳到 段 2（标准摄入子流程）
```

### 1.3 多份资料检测

如果粘贴内容里出现以下任一信号，**先不摄入**，列出拆分建议让用户确认：

- 多个明显的 `# 标题` 或 `## 标题` 分隔
- 多个独立 URL 来源
- 内容主题完全不相关

汇报格式：
```
我看到这粘贴里似乎是 N 份独立资料，建议拆分如下：
[1] xxx（代码文档，约 800 字）
[2] yyy（文章，约 1500 字）
[3] zzz（笔记，约 200 字）
请确认后我按顺序逐份摄入。
```

### 1.4 质量门槛

- 原文 **不足 200 字**且无明确论点 → 提示："这份资料体量较小，建议直接放 daily/<today>.md 备注，不必走 ingest 全流程。是否仍要走？"
- 由用户裁决，不擅自降级或拒绝。

### 1.5 元信息批量确认（仅粘贴模式）

粘贴模式下原文件元信息丢失。Agent 必须从内容中抽取候选元信息，**一次性列给用户确认**（不要每个字段问一次）：

```
摄入前确认（请回复"都对"或修正某几项）：
  来源类型：article
  我推断的 slug：karpathy-llm-wiki
  推荐标题：Karpathy · LLM Wiki gist
  原文链接：https://gist.github.com/...（如无可留空）
  作者：Andrej Karpathy（如无可留空）
  发布时间：2026-04-04（如无可留空）
  [若是代码文档] 版本号：未抽出，请告知 / 可推断为 X.X.X
```

---

## 2. 段 2 · 标准摄入子流程

适用：行业文章 / 个人笔记 / 网页收藏（共 3 类）。

### Step 1 · 落档原文

写入 `sources/{articles|meetings|clippings}/<YYYY-MM-DD>-<slug>.md`，frontmatter 模板见 [TEMPLATES/source.md](TEMPLATES/source.md)。

最小必填字段：
```yaml
title:        # 资料标题
type: source
status: stable
source_type:  # article | clipping | note
source_url:   # 可空
source_author:# 可空
source_date:  # 可空
created: <today>
updated: <today>
```

正文部分**完整保留原文**，不删节、不重排。

### Step 2 · 生成 summary

写入 `summaries/<YYYY-MM-DD>-<slug>.md`，骨架见 [SCHEMA.md](SCHEMA.md) §4。

必填段落：
- `## 一句话` — 一句话讲清这份资料说了什么
- `## TL;DR` — 3~5 条 bullet
- `## 核心论点` — 列 1~5 条作者主张
- `## 我的加工意图` — 这份资料新建/更新了哪些 concept/entity
- `## 原文链接` — wikilink 回到 source

frontmatter 必须含 `sources: ["[[<原文 wikilink>]]"]`。

### Step 3 · 抽取候选 concept / entity

不直接建页，先列清单：

```
候选 concept：
  - X（理由：在原文出现 N 次，是核心抽象）
  - Y
候选 entity：
  - 人物 A（作者）
  - 项目 B
  - 工具 C
```

### Step 4 · ★ 同义收敛前置检查（硬约束，不可跳过）

对每个候选词执行：

```
[A] 扫 00-index/by-topic.md / by-entity.md
[B] 扫 concepts/ entities/ 各页 frontmatter 的 title / aliases / tags
[C] 扫现有页面正文里出现的所有粗体术语
[D] 三选一判定：
    - 可归并 → 不新建，在既有页 aliases 加候选词，正文对应段追加内容
    - 子概念 → 不新建，在既有页加段；或挂为未来拆分 TODO 写 daily
    - 全新   → 才允许建 stub；新 stub 的 aliases 必须填全所有可能同义/近义词
[E] 判定理由一行写入 daily/<today>.md
[F] 判定不确定 → 问用户
```

### Step 5 · 执行更新（追加优先）

按 [[CLAUDE]] §5.2 执行。允许的写入动作：

- **既有页**：在对应标题段落**追加**新断言/新例证；文末或 `## 引用来源` 段补 `[[<新 summary>]]`
- **新页**：套 [TEMPLATES/](TEMPLATES/) 模板建 stub；进入 `concepts/{foundations|patterns|domains}/` 或 `entities/{people|projects|tools}/` 对应分层
- **冲突**：在原段落追加 `> [!warning] 矛盾点 · YYYY-MM-DD` callout，frontmatter `status: conflicts`，遵循 [[CLAUDE]] §4

**严禁**：整段重写、删除既有内容、借机重组周边段落。

### Step 6 · 双重登记

每个被本次摄入触及的 wiki 页面，必须同时：

1. frontmatter `sources:` 数组 `append` 一条 `[[<新 summary>]]`
2. 正文 `## 引用来源` 段落追加一条 `[[<新 summary>]]`

两处缺一不可。

### Step 7 · 反向校验

新建的每个 stub 必须被至少一个 `topic/` 或 `00-index/` 页面引用，否则视为孤儿页。

执行：
- 优先把新 stub 加到合适的 topic 页（若无合适 topic，考虑是否需要新建 topic，但**新建 topic 需要用户授权**）
- 兜底：加入 `00-index/by-topic.md` 或 `00-index/by-entity.md`
- 仍无去处 → 写入 `00-index/orphans.md`，并在汇报中提醒

### Step 8 · daily 留痕

`daily/<YYYY-MM-DD>.md` 的 `## 摄入` 段追加：

```markdown
- 摄入 [[<新 summary>|<标题>]]
  - 原文复制至 `sources/{...}/<...>.md`
  - 同义收敛：<判定理由 / 触及哪些既有页>
  - 新建 [[<stub>]]（同义收敛判定：...）
  - 触发冲突 callout：<目标页> （若有）
  - 非追加改动：<理由>（若有）
```

若 daily 文件不存在则按 [TEMPLATES/daily.md](TEMPLATES/daily.md) 新建。

### Step 9 · 汇报

向用户输出（保持简洁）：

```
✅ 摄入完成：[[<新 summary>]]
- 改了 N 个页面：[[页1]] [[页2]] ...
- 新建了 M 个 stub：[[stubA]]（同义收敛理由：...）
- 冲突：N 处 / 无
- daily：已记录到 [[YYYY-MM-DD]]
- 下一步建议：<推 stub 到 draft / 补充某个段落 / ...>
```

---

## 3. 段 3 · 版本化摄入子流程

适用：**仅工作类代码文档**。

### Step 1 · 识别版本号（按优先级链）

```
[A] 用户在对话中显式告知（如"这是 v3.0 的文档"）
[B] 内容里的明显版本字段：
    - package.json 的 "version"
    - 文档头部 "Version: x.x.x" / "Release x.x.x"
    - git tag / commit hash
[C] 摄入日期（fallback，仅当 A、B 都无信息时使用，标注 inferred-from-date）
```

前一档命中即用；全部缺失 → **主动询问用户一次**。

> 粘贴模式下文件 mtime 不可用，故只有 3 档（去掉了原方案的 mtime）。

### Step 2 · 检测同 slug 旧版本

扫 `sources/papers/` 下所有 `<*>-<slug>-v*.md`。

```
[无旧版本] → 走"首次版本化摄入"（继续 Step 3a）
[有旧版本] → 走"版本对账"（继续 Step 3b）
```

### Step 3a · 首次版本化摄入（无旧版）

按 段 2 标准流程执行，但：
- 文件名带版本号：`<YYYY-MM-DD>-<slug>-v<X.Y.Z>.md`（source 与 summary 都是）
- frontmatter 加 `version: X.Y.Z`
- 不需要 `supersedes` / `superseded_by`

汇报里注明：`首次版本化摄入，已建立版本基线`。

### Step 3b · 版本对账（有旧版）

#### 3b.1 新原文落档

```
sources/papers/<YYYY-MM-DD>-<slug>-v<X.Y.Z>.md
```

frontmatter：
```yaml
version: X.Y.Z
supersedes: "[[<旧 summary 的文件名>]]"   # 注意：指向旧 summary，不是旧 source
```

#### 3b.2 生成新版 summary（必含 ## 与旧版差异）

```
summaries/<YYYY-MM-DD>-<slug>-v<X.Y.Z>.md
```

frontmatter：
```yaml
version: X.Y.Z
supersedes: "[[<旧 summary>]]"
```

正文除标准 summary 段落外，**必须**包含：

```markdown
## 与旧版差异

### 新增（v<X.Y.Z> 引入）
- ……

### 仍然成立（沿用 v<旧>）
- ……

### 被推翻（v<X.Y.Z> 取代旧断言）
- 旧：……（原断言，引用 [[<旧 summary>]]）
- 新：……
- 已在以下页面触发冲突 callout：[[<受影响的概念页/实体页>]]
```

#### 3b.3 旧 summary 字段补全

> [!important] 这是 [[CLAUDE]] §5.4 "禁止修改 sources/" 的**唯一例外**

旧 summary 的 frontmatter 追加（不修改其他字段、不动正文）：
```yaml
superseded_by: "[[<新 summary>]]"
```

并在 daily 当天明确留痕："对 [[<旧 summary>]] 仅补全 superseded_by 字段，未动其他内容"。

#### 3b.4 实体页 / 概念页演进记录追加

按 [[CLAUDE]] §5.2 追加优先：

- **实体页**（如 `entities/tools/cs-nest-redis.md`）：
  ```markdown
  ## 关键事件 / 里程碑
  - YYYY-MM-DD · v<旧> → v<新>：变化点 ZZ（详见 [[<新 summary>]]）
  ```
- **概念页**：在 `## 演进记录` 段做同样追加

#### 3b.5 处理被推翻的旧断言

每条"被推翻"的断言必须在原页面对应段落追加冲突 callout：

```markdown
> [!warning] 矛盾点 · YYYY-MM-DD（v<旧> → v<新>）
> - 旧断言：……（来源 [[<旧 summary>]]）
> - 新断言：……（来源 [[<新 summary>]]）
> - 当前裁决：以新为准（版本迭代，新版权威）
> - 复核人：Agent · 待人工确认
```

页面 frontmatter `status: conflicts`，待人工确认裁决后改回 `stable`。

#### 3b.6 双重登记 + 反向校验

同 段 2 Step 6-7。

#### 3b.7 daily 留痕（版本迭代特别格式）

```markdown
- 【版本迭代摄入】[[<新 summary>]] · v<旧> → v<新>
  - 旧版：[[<旧 summary>]]（已补 superseded_by）
  - 新增 N 条断言 / 仍然成立 M 条 / 推翻 K 条
  - 触发冲突 callout：[[页1]] [[页2]] ...
  - 受影响实体/概念页：[[页]] [[页]]
```

#### 3b.8 汇报

```
✅ 版本化摄入完成：[[<新 summary>]] (v<新>)
- 旧版基线：[[<旧 summary>]] (v<旧>)
- diff：新增 N / 保留 M / 推翻 K
- 冲突 callout：N 处（[[页1]] [[页2]]），待人工裁决
- 实体/概念页演进记录已追加
- daily：已记录
- 下一步建议：人工裁决 K 条推翻断言
```

---

## 4. 段 4 · 通用约束（两个分支共用）

### 4.1 失败回滚

摄入过程中任一步失败：
- **不留半成品**：撤回本次已写入的所有文件（删除新建文件、还原已修改文件至本次摄入前状态）
- daily 留一行："摄入未完成 · <资料标题> · 失败原因：<XXX>"
- 向用户汇报失败原因与建议

### 4.2 不确定就问

3 个判断点必须问，不要硬猜：
1. 来源类型（如果信号不清晰）
2. 版本号（如果 3 档优先级链都没命中）
3. 同义收敛归并 / 子概念 / 全新（如果 1 分钟内判不准）

> 单次摄入打扰用户次数 ≤ 1 次。多个不确定项 → 一次性合并问完。

### 4.3 不打扰原则

确定的事不要问。已经在 frontmatter / 已有页里能查到的信息不要重复问。

### 4.4 全程使用中文

所有汇报、callout、daily 留痕、新建页面正文均使用中文（与 [[CLAUDE]] 全局一致）。

---

## 5. 快速参考：决策树

```
收到资料
  │
  ├─ 多份？ → 拆分确认 → 逐份执行
  │
  ├─ < 200 字？ → 提示用户考虑 daily 备注
  │
  ├─ 来源类型？
  │   ├─ 代码文档 → 段 3（版本化）
  │   │   ├─ 无旧版 → Step 3a 首次版本化
  │   │   └─ 有旧版 → Step 3b 版本对账（含 ## 与旧版差异、冲突 callout）
  │   │
  │   └─ 文章/笔记/网页 → 段 2（标准）
  │       └─ Step 1~9 走完
  │
  └─ 通用约束（段 4）：失败回滚 / 不确定就问 / 单次打扰 ≤ 1
```

---

## 6. 与其他模式层文件的关系

- [[CLAUDE]] §3.1 — 摄入概述（指向本文件）
- [[CLAUDE]] §4 — 冲突处理 SOP（被本文件 Step 5 / 3b.5 调用）
- [[CLAUDE]] §5.1 — 同义收敛（被本文件 Step 4 调用）
- [[CLAUDE]] §5.2 — 追加优先（被本文件 Step 5 调用）
- [[CLAUDE]] §5.3 — 双重登记（被本文件 Step 6 调用）
- [[SCHEMA]] §1 — frontmatter 字段（含 version / supersedes / superseded_by）
- [[SCHEMA]] §4 — 各类型页面骨架
- [[SCHEMA]] §7 — 代码文档版本化字段语义（被本文件段 3 调用）
- [TEMPLATES/](TEMPLATES/) — 新建页面的模板
