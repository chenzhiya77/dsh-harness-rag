# 图片描述腿的协议分派（先做 Anthropic） —— 设计

**Parent:** [2026-09-14-rag-model-provider-adaptation-design.md](2026-09-14-rag-model-provider-adaptation-design.md)（那条线把图片描述腿的模型/端点/密钥收到"条目三元组"里；本 spec 接在它后面，处理**三元组之外的第三个问题：这条腿说哪种协议**）
**Status:** 未开工（2026-09-18 起草）

## 1. 问题

图片描述（caption）这条腿是**手写的 HTTP 调用**，不是 LangChain 模型，所以它自己决定请求长什么样。而它今天只认**一种协议**：

| 现状（按代码逐字）                                                                                                                                                                                                                                                    | 位置                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `POST {base_url}/chat/completions`、`Authorization: Bearer <key>`、body `{model, messages:[{role:user, content:[{type:image_url, image_url:{url:data:<mime>;base64,…}}, {type:text, text:…}]}], max_tokens:1024, temperature:0.15}` ⇒ 读 `choices[0].message.content` | `knowledge/captioner.py:45-68`（文档图片，1 张/次）          |
| **同一形状被抄了第二份**（content 里放 N 张 JPEG）                                                                                                                                                                                                                    | `knowledge/video/captioner.py:56-70`（视频关键帧，≤3 张/次） |
| 条目只提供三元组（`model` / `base_url` / `api_key`），**不提供协议**                                                                                                                                                                                                  | `knowledge/vlm_target.py:41-65`                              |

于是：**配置层不拦**（`vlm_model` 是普通字符串，命名一个 anthropic 条目照样存得下），但请求只会说 OpenAI 那一套 ⇒ 打过去必然失败。**具体形态以本机已装的 SDK 为准**（`anthropic` 0.97.0 / `langchain_anthropic` 1.4.1，Task 0 第 3 项核）：路径是 `/v1/messages`（不是 `/chat/completions`）⇒ 打过去是 **404**；而且这条腿用的是 `Authorization: Bearer`，该家要的是 **`X-Api-Key`** ⇒ 即便路径对上也不通。前端只好把 anthropic 条目**从候选项里过滤掉**（`config-form.ts::isCaptionCapable` 的 `provider !== "anthropic"`），并在文案里明说这件事（zh-CN / en-US 各一句）。

**这是"两条腿不一致"的同一族问题的第三个面**：图抽取、评测裁判走 `create_chat_model`（协议由 LangChain 的类决定 ⇒ 选 anthropic 免费可用），只有这两条 caption 腿是手写的 ⇒ 只有它们需要自己实现协议分派。

## 2. 决定

### D1 —— 协议从**条目的 `use`** 判定（甲），认不出就沿用 OpenAI 形状

`resolve_vlm_target` 已经拿得到条目（`config.get_model_config(declared)`），而条目里存着 `use:`——所以协议**可以推出来，不需要新增用户可见的配置字段**。新增一个方言字段：

```
VlmTarget(dialect = _DIALECT_BY_PROVIDER.get(reverse_lookup_provider(entry.use), "openai"))
```

- `_DIALECT_BY_PROVIDER = {"anthropic": "anthropic"}`，其余（含 `None`）⇒ `"openai"`。
- **为什么复用 `reverse_lookup_provider`**：它是现成的（`config/models_config.py:66`，`/api/models` 就是用它给条目算 `provider` 的）⇒ 零新机制，且"这条腿说哪种协议"与 API 报的 `provider` 同源，不会漂。
- **认不出 ⇒ `openai`**：`config.yaml` 里手写的条目可以填任意 `use:` 类路径（自研类、vLLM 类），认不出**不等于**它不说 OpenAI 形状 ⇒ 保持今天的行为，**不报错**。
- **legacy 分支**（`vlm_model` 命名不到任何条目）⇒ 同样是 `openai`（它的端点来自 `rag.vlm_base_url`，历史上就是 OpenAI 兼容形状）。
- **甲 vs 乙**：乙（新增一个用户可见的 `caption_provider` 字段，像重排腿那样显式声明）被否——那要动 config 模型 + `Literal` + 界面 + 保存期，而它问的是管理员一个"我们本来就能从条目推出来"的问题。

### D2 —— 两个方言的**逐字形状**（`anthropic-version` 是模块常量）

|        | `openai`（今天的行为，**一字不改**）                                                | `anthropic`（新增）                                                                                       |
| ------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 路径   | `POST {base}/chat/completions`                                                      | `POST {base}/v1/messages`（**两条腿必须拼出同一个 URL**，见下）                                           |
| 鉴权   | `Authorization: Bearer <key>`                                                       | **`X-Api-Key: <key>`**（逐字取 SDK；**没有 `Authorization`**——见下注）+ `anthropic-version: "2023-06-01"` |
| 图片块 | `{"type":"image_url","image_url":{"url":"data:<mime>;base64,<b64>"}}`               | `{"type":"image","source":{"type":"base64","media_type":"<mime>","data":"<b64>"}}`                        |
| 文字块 | `{"type":"text","text":…}`（放图片之后）                                            | 同左（放图片之后）                                                                                        |
| body   | `{model, messages, max_tokens:1024, temperature:0.15}`                              | `{model, max_tokens:1024, messages, temperature:0.15}`（`max_tokens` 在这家是**必填**，我们本来就发）     |
| 取答复 | `choices[0].message.content`                                                        | `content[]` 里**所有 `type=="text"` 块拼接**（该家可能返回非文本块）                                      |
| 失败   | 非 2xx ⇒ `raise_for_status`；空文本 ⇒ `ValueError`（两条腿各自的异常/降级语义不变） | 同左                                                                                                      |

- **"没有 `Authorization`"是对我们这条实现而言**：SDK 里 api_key 走 `X-Api-Key`（`_client.py:165` 逐字）、另有一条 `auth_token` ⇒ `Authorization: Bearer` 的路子（`:172`，OAuth 用）。**本期只实现 api_key 那条**，所以我们发出的头里没有 `Authorization`；将来若要支持 auth_token，是同一张表加一列，不是新方言。
- **上表按本机已装的 SDK 逐条核过**（`anthropic` 0.97.0 / `langchain_anthropic` 1.4.1；Task 0 第 3 项给出行号），不是按记忆写的。
- `anthropic-version` **以模块常量**给出，取值 **`"2023-06-01"`**（= SDK 的默认头值），不进配置；要换版本时改常量。
- ⚠️ **`base_url` 的拼法照 SDK 逐字来：原始路径相接，不做任何"聪明"的规范化**。`langchain_anthropic` 把条目的 `base_url` **原样**交给 SDK（别名就是 `base_url`，`chat_models.py:777`），而 SDK 拼路径是 `base_url.raw_path + "/v1/messages".lstrip("/")`（`anthropic/_base_client.py:482`，**本次开工实测**，不是按记忆写的）⇒
  | 条目里的 `base_url` | 两条腿实际请求的 URL |
  | -------------------- | -------------------- |
  | `https://api.anthropic.com` / `…/` | `…/v1/messages` ✅ |
  | `…/v1` / `…/v1/` | **`…/v1/v1/messages`** ❌（聊天腿今天就是这样） |
  所以我们**照抄这个行为**（`base.rstrip("/") + "/v1/messages"`），**不剥尾部 `/v1`**。**"同一个条目在两条腿上必须是同一个 URL"是硬要求，优先于"帮管理员兜住笔误"**：剥掉 `/v1` 会造出"同一条目、图片描述能用而图谱抽取不能用"的非对称，而这正是这条线一路在消的东西。管理员填了 `/v1` 是**条目本身的问题**，两条腿一起报错才可诊断——修一次条目，两条腿一起好。

### D3 —— **一个客户端，两个调用点**（顺手消掉现有的重复）

把"拼请求 + POST + 取答复"抽成一个共用入口（例如 `knowledge/caption_client.py::request_caption(client, *, target, prompt, images) -> str`，`images` 是 `(bytes, media_type)` 序列），两条腿各自只保留**自己的 prompt 与自己的降级语义**：

- 文档腿：1 张图 + `_CAPTION_PROMPT`（`captioner.py`）；
- 视频腿：≤3 张 JPEG + `_SHOT_CAPTION_PROMPT`（`video/captioner.py`）。

**为什么必须共用**：今天这两处已经各写了一份**逐字相同**的请求；再按方言分派一次就是**两份分派**——本线刚在重排行上治过这个病（"两条腿可以共享一份判断，不能共享一份副本"）。

### D4 —— 界面：拿掉 anthropic 的排除，并改掉那句文案

- `isCaptionCapable`：`Boolean(model.supports_vision) && model.provider !== "anthropic"` ⇒ **只留 `supports_vision`**；它的 docstring 也要改（"an Anthropic entry could never work however it is configured" 从此不成立）。
- i18n 那句（zh-CN / en-US）："仅列出支持视觉的 OpenAI 兼容条目——Anthropic 条目无法用于这条腿" ⇒ 改成"仅列出支持视觉的条目（Anthropic 条目按其 Messages 协议调用）"这一类的说法（**键名不动**，只改文案）。
- 前端**不需要**新字段、新控件：这一行仍然只选条目，协议由条目决定（与后端 D1 同一条判据）。

### D5 —— 不做

- 不新增用户可见的 provider 字段（D1 的甲）。
- 不做第三种方言（只 `openai` / `anthropic` 两种；将来要加是同一张表加一行）。
- 不动视频腿的 ≤3 帧策略、不动 prompt 文案、不动 `max_tokens` / `temperature` 的取值。
- 不动**降级语义**：VLM 失败仍只留占位、绝不中止文档（失败即降级是这条腿既有的契约）。
- 不改 `/api/models` 的响应、不加端点、不动默认值。

## 3. 接口契约

| 契约                                                               | 变化                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `VlmTarget`                                                        | 新增一个方言字段（**内部类型**，不出 API）                                       |
| `resolve_vlm_target`                                               | 多一个判定（条目 `use` ⇒ provider ⇒ 方言），签名不变                             |
| caption 两条腿的**出网形状**                                       | `anthropic` 方言按 D2 那张表（路径/鉴权/body/解析）；`openai` 方言**逐字节不变** |
| `GET /api/models`、`PUT /api/rag/config`、`rag_config.json` schema | **无变化**（不带新字段）                                                         |
| i18n                                                               | 那句文案改（zh-CN / en-US），键名不变                                            |
| 表 / 迁移 / 默认值                                                 | **无**                                                                           |

## 4. 验收

**后端**

1. **方言判定**（`test_vlm_target.py`）：条目 `use="langchain_anthropic:ChatAnthropic"` ⇒ `anthropic`；`use="langchain_openai:ChatOpenAI"` ⇒ `openai`；**认不出的 `use`（自研类）⇒ `openai`**；legacy（命名不到条目）⇒ `openai`。
2. **形状守卫（文档腿）**：桩一个假 Anthropic 端点（**桩法照 `test_vlm_target.py:115` 的 `test_image_caption_posts_to_the_selected_entry`**——它已经在断言 URL 拼法与 `choices` 解析）⇒ 断言请求**路径 `/v1/messages`**、头里有 `X-Api-Key` 与 `anthropic-version` 且**没有 `Authorization`**、body 的 `content[0]` 是 `{"type":"image","source":{"type":"base64","media_type":…,"data":…}}` 且 `content[-1]` 是文本块、`max_tokens` 存在；桩返回 Anthropic 形状 ⇒ 断言取到的 caption 文本正确。
3. **形状守卫（视频腿）**：同一桩，`frames=3` ⇒ 断言 body 里有**3 个 `image` 块 + 1 个文本块**（顺序：图在前、文本在后），且**只发一次请求**。
4. **`base_url` 的拼接与 SDK 逐字一致（两条腿同 URL）**：四种写法 `https://api.anthropic.com` / `…/` / `…/v1` / `…/v1/` ⇒ 我们拼出的 URL 必须**逐个字符等于** SDK 自己算出来的那条（前两者 `…/v1/messages`，后两者 **`…/v1/v1/messages`**）——即"原始路径相接"（`_base_client.py:482`）的语义，**不许自作聪明地剥尾 `/v1`**。
5. **回归（`openai` 方言逐字节不变）**：既有的形状断言在**两个文件**里：`test_vlm_target.py`（**`:115`** 文档腿、**`:136`** 视频腿——URL 拼法 + `Authorization`）与 **`test_parser.py`**（**`:219`** `Authorization: Bearer`、**`:224`** `image_url` + `data:image/jpeg;base64,` 前缀、**`:281`** `max_tokens == 1024`）——它们是这两条腿真正的形状用例，别去找不存在的 `test_captioner.py`；连同 `video/test_captioner.py` / `video/test_recaption.py` 在改成共用客户端后**仍绿**；并补一条"认不出的条目仍发 OpenAI 形状"（防止 D1 的兜底被改掉）。
6. **非文本块**：桩返回 `content=[{type:"thinking",…},{type:"text",text:"X"}]` ⇒ 取到 `"X"`（不是空、也不是异常）。
7. **降级不变**：VLM 返回 500/空文本 ⇒ 仍是"占位 + 该图/该镜头失败"，**不中止**文档（既有用例覆盖，确认未回归）。

**前端**

8. `visionReferenceOptions` / `isCaptionCapable`：**anthropic 条目现在出现在候选里**。**三处既有断言会红**：`:404-411` 的 `toEqual` 列表（`claude` 插进 `vl` 与 `legacy` 之间）、`:413-418` 的反向断言 `not.toContain("claude")`（连注释与用例名，见 §5）、`:428` 由 `false` 改 `true`；并按新语义补一条"不支持视觉的仍被排除"。
9. 那句文案（zh-CN / en-US）不再说"Anthropic 条目无法用于这条腿"。
10. **顺带的行为面**（同一判据的第二个消费点）：`functional-models-view.tsx:498` 的 `hasVisionModel = managedModels.some(isCaptionCapable)` 驱动 `vlmNoVisionModel` 提示 ⇒ D4 之后"只有 anthropic 视觉模型"的工作区**不再**提示"还没配置支持视觉的模型"（这是对的：它现在真能用）。补一条用例钉住，今天零覆盖。

**真栈**

11. **本地桩假装 Anthropic 端点**（一次性脚本，跑完即删）：加/改一个指向该桩的 anthropic 条目 ⇒ 这一行能选到它 ⇒ 保存成功 ⇒ 用桩验"实际发出的形状"（路径/头/body）与"取回的 caption 文本"。⇒ **没有真 Anthropic key 也能收口**；结论要写成"桩验过、未打真端点"。
    **触发路径要点名**（caption 只在 ingest 流水线里跑，不是随手一个请求）：**首选文档腿**——往可写库上传一个**带小图的 `.docx`**，让 worker 走 parse → `caption_images`（`worker.py:443`）⇒ 桩收到请求；**备选视频腿**——对已有视频文档调 `POST /{kb_id}/documents/{doc_id}/video/recaption`（202），它只重跑 caption+materialize、不重解析。两条都**有前提**（前者需要 MinerU 可达、后者需要该库已有一份到达 `video_shots` 的视频），Task 3 要在动手前先确认前提，别临场找路。
12. 收尾：配置**逐字节还原**（md5 与动手前相同，动手前**先 `cp` 一份原始字节**）、密钥不落盘、不新建文件、页面重载丢弃表单。

## 5. 影响面

- `backend/packages/harness/deerflow/knowledge/vlm_target.py`（方言字段 + 判定；**并把 `:3` 那句 "Both caption legs are raw OpenAI-compatible calls (`POST {base_url}/chat/completions`)" 改准**——它本期之后不再成立）
- `backend/packages/harness/deerflow/knowledge/caption_client.py`（新：共用的一个出网入口）
- `backend/packages/harness/deerflow/knowledge/captioner.py` 与 `knowledge/video/captioner.py`（改调共用入口；各自的 prompt 与降级不变）
- `backend/tests/knowledge/test_vlm_target.py`（**两条腿的形状断言的真正载体**：`:115` 文档腿、`:136` 视频腿）、**`backend/tests/knowledge/test_parser.py`**（文档腿的形状钉子：`:219` `Authorization`、`:224` `image_url` 形状、`:281` `max_tokens`）、`video/test_captioner.py`、`video/test_recaption.py`（⚠️ **`tests/knowledge/test_captioner.py` 不存在**，别照名字去找）
- `frontend/src/core/rag/config-form.ts`（`isCaptionCapable` 去掉排除 + docstring）
- `frontend/src/core/i18n/locales/{zh-CN,en-US}.ts`（那句文案，键名 `captionModelHint` 不动）
- `frontend/tests/unit/rag/config-form.test.ts`（**三处**：`:404-411` 的 `toEqual` 列表、`:413-418` 那条既有**反向**断言 `not.toContain("claude")` + 它那句 `// Anthropic is not OpenAI-compatible` 注释与用例名"could never call"、`:428` 那条布尔；外加按界面词汇扫出来的其他断言）
- `frontend/tests/unit/settings/`（**新增**：`hasVisionModel` / `vlmNoVisionModel` 那条行为面，今天零覆盖）
- 文档：`backend/AGENTS.md` **两处**（`:653` 那句 "the two caption legs are raw OpenAI-compatible calls"；**`:800` 那句 "…labels the caption rows as OpenAI-compatible only."** ⇒ 界面不再这样标了）、`frontend/AGENTS.md`（`:171` 那处"all plain pickers"**本处无排除措辞、大概率不用动，但要顺手核一遍**）
- **无迁移、无 schema 变更、不动任何默认值、不给 `openai` 方言加任何新行为**

## 6. 已知缺口（写在案上）

- **`anthropic-version` 是写死的常量**：将来官方要求换版本时要改代码（本期按"与既有形状钉子同风格"处理）。
- **认不出的 `use` 仍按 OpenAI 形状发**：这是 D1 的有意的兜底，不是遗漏；若某天真出现"第三种形状"的自研类，那是同一张表加一行。
- **没有真 Anthropic key 时验不到真端点**（验收第 11 条用桩代替）；"打真 Anthropic"要等有一把 key。
- **条目里写了尾 `/v1` 就两条腿一起拼成 `/v1/v1/messages`（本期**故意**不治）**：这是"照 SDK 逐字"的直接后果（见 D2 那条⚠️）。要让管理员填 `/v1` 也能用，得先改聊天腿（LangChain 那侧由 SDK 决定，我们改不动）——那是"条目地址校验"的独立一条，不在本期。
- **`image/bmp` 我们产、两家都可能不收（本期登记、不治）**：`parser.py:111-118` 的 `_MEDIA_TYPES` 里有 `.bmp`，而 **Anthropic 的 `media_type` 只收 jpeg / png / gif / webp**（SDK 的 `Literal` 逐字）；OpenAI 那侧同样只列这四种。⇒ 这不是本期引入的（今天就已经可能被拒、表现为该图降级成占位），但**方言分派会让它更显眼**；要治的话是"遇到不支持的格式先转码或直接不送"这类的独立一条。
- **`vlm_model` 保存期仍不校验**（既有缺口，见 [[project-rag-functional-model-config]]）：本期只让"命名一个 anthropic 条目"从**必然失败**变成**能用**，并没有让保存期去检查这个条目存不存在/能不能用。
