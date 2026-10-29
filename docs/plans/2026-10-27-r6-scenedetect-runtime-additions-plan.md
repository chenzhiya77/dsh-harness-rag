# R6 分镜依赖随包 —— plan

**Status:** 实施完成（2026-10-27；R6=乙；只覆盖 spec §9 R6/K1；`0.1.0-4` 已重建并通过正控/负控，发布候令；未提交）
**Date:** 2026-10-27
**配套 spec:** [2026-10-24-single-download-distribution-spec.md §9 R6/K1](../specs/2026-10-24-single-download-distribution-spec.md)

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 零写入；`engine/` 零 diff——只动运行时 pack 的 extra 依赖、构建冒烟与 notices；不把 funasr/torch 打进包；`runtime.json` 仍指 `0.1.0-3`，发布候令；token/API key 不落日志与提交面；构建与证据落 `E:\hrag-r5`，临时验收根 `E:\hrag-r6`。

## 决策

- **R6 乙**：把 `scenedetect==0.7.1` + `opencv-python==5.0.0.93` + `platformdirs==4.10.0` 打进 `0.1.0-4`；`funasr/torch/torchaudio` 继续不打包。
- 理由：ASR 有服务档替代（可选实现），分镜没有服务替身；缺 scenedetect 会让每个视频静默退回等距窗口，是持续质量损失。体积代价解压约 +114 MB（cv2 113 MB + scenedetect 0.9 MB + platformdirs 很小），远小于本地 ASR 的 GB 级。
- 校验：OpenCV 5.0.0.93（Apache-2.0）/ PySceneDetect 0.7.1（BSD-3-Clause）/ platformdirs 4.10.0（MIT）；均在主树 venv 有现成版本；`engine/backend/uv.lock` 的 export 不含三者（platformdirs 虽在锁内但未被 export 选中），走 extra requirements 不重复。

## Task 0 — 落点核实（只读）

- [x] 主树 venv：`scenedetect 0.7.1`（925 KB）、`cv2`（113 MB）、`platformdirs 4.10.0`；`scenedetect` 依赖 `click~=8.0`、`numpy`、`opencv-python`、`platformdirs`、`tqdm`。
- [x] 当前 pack：`numpy`/`click`/`tqdm` 已在 `0.1.0-3` 的 site-packages；`platformdirs`/`scenedetect`/`cv2` 均无。
- [x] `uv export` 不含 `platformdirs`/`scenedetect`/`opencv-python`；extra 可加，不触发 build 的“已在锁内”拒绝。
- [x] 引擎惰性导入 `scenedetect`（`worker.py:145`），缺失只降级为 `segment=degraded`；OpenCV 是 PySceneDetect 的帧读取依赖，不是引擎直连。
- [x] 上一版 `0.1.0-4` 候选：447,481,687 B / sha256 `feec4ffb…f64814`，无 scenedetect；验收后已删除（被本版取代）。

## Task 1 — 构建输入

> 动到的文件：`scripts/runtime-extra-requirements.txt`、`scripts/build-runtime-pack.mjs`。

- [x] extra：加 `platformdirs==4.10.0`、`scenedetect==0.7.1`、`opencv-python==5.0.0.93`（一包一精确 pin）。
- [x] 构建冒烟：pack Python + pack site-packages 导入 `cv2`、`scenedetect.ContentDetector`/`SceneManager`，断言三者版本；失败即构建失败。
- [x] notices：补 PySceneDetect（BSD-3-Clause）/ OpenCV（Apache-2.0）/ platformdirs（MIT）来源与许可，说明无模型、无网络。

## Task 2 — 重建 `0.1.0-4`

> 产物：`E:\hrag-r5\dist\harness-rag-runtime-win32-x64-0.1.0-4.zip`。

- [x] `node scripts/build-runtime-pack.mjs --engine ./engine --out E:\hrag-r5\dist --runtime-version 0.1.0-4 --engine-commit a4942966b`（复用同一 engine 快照；不 `--clean`）。
- [x] 记录 zip size/sha256/unpackedSize/entries，核对 `site-packages/scenedetect`、`site-packages/cv2`、`site-packages/platformdirs`、`ffmpeg/`、`tiktoken-cache/`、`langfuse` 均在包内。
- [x] 不改 `runtime.json`。

**实测**：

- Zip：`E:\hrag-r5\dist\harness-rag-runtime-win32-x64-0.1.0-4.zip`，493,631,491 B（470.8 MiB zipped），sha256 `867056230ccee40330f8582b93780e6899449b402192eb484a06ff29724a8ed5`，解包 1220.0 MiB、21,215 条目。
- 包内关键条目：`site-packages/scenedetect` 925K、`site-packages/cv2` 113M、`site-packages/platformdirs` 121K（+dist-info）、`ffmpeg/` 258M、`tiktoken-cache/` 1.7M、`langfuse 4.5.1`/`backoff 2.2.1`；manifest `runtimeVersion 0.1.0-4`、`engineCommit a4942966b`、python 3.12.13、qdrant 1.20.0、ffmpeg `n9.0-lgpl`、configVersion 44。
- 冒烟：`scenedetect 0.7.1, opencv 5.0.0, platformdirs 4.10.0`；notices 增 `PySceneDetect / OpenCV (BSD-3-Clause / Apache-2.0)` 段（含 platformdirs MIT）。
- 构建偏差：BtbN rolling 资产已更新，首跑因 size/sha 不匹配失败；重新钉 `FFMPEG_SIZE=172_592_617`、`FFMPEG_SHA256=bac7c98811b44cbf3536f2fd8438851446f42b56e379125648212c9e98e3dc07` 后重建通过。10-28 重建时该 rolling 资产再次更新，重钉 `FFMPEG_SIZE=172_591_700`、`FFMPEG_SHA256=d551c682fb0ba39512a58fd0c2f9d40eae1e7d04a9eb3120605a50e4f826c221`。
- 构建日志：`E:\hrag-r5\evidence\build-0.1.0-4-r6.log`

## Task 3 — 多镜头隔离验收

> 动到的文件：无（夹具/证据在 `E:\hrag-r6` 与 `E:\hrag-r5\evidence`）。

- [x] 解包到 `E:\hrag-r6\pack`；用 pack 内的 Qdrant + Python 直接起引擎（独立端口 6335/6336/8021），不碰用户当前 `D:\Hrag\1` 的 8020/6333。
- [x] `rag.video.enabled=true`、`asr_provider=funasr`、`asr_model=paraformer-zh`（故意缺 funasr，验证 ASR 失败不阻塞文档）；embedding/rerank 走本地 fake provider（9101）。
- [x] 合成 3 段颜色镜头 MP4（6 秒 / 30fps / 每段 2 秒，pack 内 ffmpeg mpeg4 生成），经引擎 API 上传；断言 `shot_count=3`、`segment=done`、切片数 3 且每片带 `media=video`/`shot_index`/`frame_url`。
- [x] 负控：临时改名包内 `site-packages/scenedetect` → 同一视频回 `segment=degraded` 且 `shot_count=1`（证明是包内依赖生效，不是系统环境）。
- [x] 收尾：杀测试进程树、删 `E:\hrag-r6` 临时包/配置/Qdrant，只留证据。

**实测**：

- 正控：`status=ready`、`shot_count=3`、`segment=done`、切片窗 `0–2000/2000–4000/4000–6000` ms（三片均 `media=video`、带 `frame_url`）；`asr=failed`（包内无 funasr，预期）、`caption/vector/graph=done`。
- 负控：`status=ready`、`shot_count=1`、`segment=degraded`、单窗 `0–6000` ms；引擎日志 `video segment leg failed ... (No module named 'scenedetect'); falling back to uniform windows`。
- 夹具修正：初版 3 秒 / 10fps / 1 秒场景被 PySceneDetect 默认 `min_scene_len=15` 帧全部丢弃（0 场景）；改为 30fps / 2 秒后检出 3 场景。
- 环境坑：Qdrant 会读取 cwd 下的 `config/config.yaml`（撞上引擎配置报 duplicated key），启动 cwd 固定为 `pack/qdrant`；引擎 video 段已自带 `asr_provider`，注入配置时只改 `enabled` 与 `asr_model`。
- 证据：`E:\hrag-r5\evidence\r6-scenedetect-acceptance.md`、`r6-pos-{docs,chunks,summary}.json`、`r6-neg-{docs,chunks,summary}.json`。

## Task 4 — 文档与收口

- [x] 回填 spec §9.2 R6 行、R6 实施结果、§9.4 摘要与 K1 状态（由“不处理”改为“已由 R6 关闭”）。
- [x] 回填本 plan Status/实测；README/手册只在发布时改（当前仍描述已发布 `0.1.0-3`）。
- [x] 门禁：`node --check client.js`、`node --check scripts/build-runtime-pack.mjs` 0；`tsc -p tsconfig.json` 0；`node --test tests/*.test.ts` 349/349；`engine/` 零 diff。
- [x] 不提交（等他点名）；发布仍候令。

## 风险与回退

- **OpenCV 5 兼容**：PySceneDetect 0.7.1 声明 `opencv-python` 无版本上界；主树用 5.0.0.93，先按同版本；若多镜头验收异常，回退到主树可用的 4.x 并重新钉版本。**实测通过**：pack 内 `cv2 5.0.0` 可解码夹具并检出 3 场景。
- **包体积**：zip 预计 +50–60 MB；实测 +46,149,804 B（44.0 MiB，447,481,687 → 493,631,491 B），在预算内。
- **许可**：新增 BSD-3-Clause/Apache-2.0/MIT，notices 必须随包；不引入 GPL 组件。
- **engine 零 diff**：不改 `worker.py`；只靠包内依赖让惰性导入成功。**2026-10-28 补记**：服务档 ASR 修复与嵌入拆批自愈（`video/asr.py`、`knowledge/embedder.py` + 测试，见 engine spec 2026-09-28 §10 / 2026-09-26 §7）按用户裁定另行改动 `engine/`；R6 本身仍零 diff，但 `0.1.0-4` zip 需在这两笔修复提交后重建（桌面运行时已手工同步同一批文件并完成真机验收）。
