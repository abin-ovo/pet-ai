# AI Desktop Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可在 macOS 与 Windows 试用的单只 2D 桌面宠物，包含离线照顾、关系变化、真实 AI 文字聊天及本地记忆。

**Architecture:** Electron 主进程管理窗口、存档和网络，React 渲染宠物及按需打开的面板。纯 TypeScript 状态机独立于 Electron 和模型；两个窗口共享主进程中的唯一状态。首版无账号后端，模型由试用者配置连接。

**Tech Stack:** Electron、TypeScript、React、Vite、Vitest、React Testing Library、Playwright Electron 驱动、electron-builder。执行时先查官方文档，选择相互兼容的稳定版本并提交 lockfile，不在计划中猜测版本号。

**Spec:** [已确认产品方案](../specs/2026-10-18-desktop-pet-design.md)。执行者必须同时阅读方案和本计划。

## Global Constraints

- “平台：macOS、Windows。”
- “第一版只有一只宠物、一个生活空间、每天几分钟的照顾和交流。”
- “首版中文界面、文字聊天；声音默认关闭，可单独开启少量动物音效。”
- “一台设备保存一只宠物，不要求注册，不提供跨设备同步。”
- “首版不主动发文字消息，不弹系统通知，不自动抢占输入焦点。”
- “离线期间亲近程度不下降。”
- “单次只允许一个生成请求，支持取消；失败不改变亲近程度。”
- “开机启动默认关闭，由用户主动开启。”
- “语音、3D、读取屏幕、自动操作电脑、商城和社交均不纳入第一版。”
- 不在客户端内置共享密钥；不把示例回复当作模型接入成功。
- 当前只有设计文档、尚无代码和首次 Git 提交。执行前读取适用的 AGENTS.md；需要隔离时遵循 using-git-worktrees。没有可解析提交时不强行创建基于 HEAD 的 worktree。
- 当前权限将 .git 设为只读；不得绕过权限写入 Git 元数据。逐任务保留验证结果，Git 提交仅在允许写入时进行。

## Review Focus

1. 双显示器断开或缩放改变：宠物和面板回到可见工作区，不能丢在屏幕外。Task 5 的坐标用例与原生验收覆盖。
2. 系统时间回拨、跨时区及休眠：关系不下降，不能靠重复跨日刷取增长。Task 2 的时间用例覆盖。
3. 写盘中断和损坏 JSON：不覆盖最后有效备份，能够恢复并告知用户。Task 3 的故障注入覆盖。
4. 取消后迟到的模型响应和重复发送：不重复追加消息、不误记长期事实，输入可恢复。Task 6 的延迟响应测试覆盖。
5. 透明窗口的空白区域与拖动：底层应用可操作；拖动不会展开聊天或触发抚摸。Task 5 的事件测试和原生验收覆盖。

## 文件布局与公共约定

```text
src/shared/         types.ts、bridge.ts：数据模型和受限进程接口
src/main/           index.ts、windows.ts、ipc.ts、tray.ts：桌面宿主
src/main/storage/   repository.ts、credentials.ts：存档和密钥
src/main/ai/        client.ts、context.ts、controller.ts：真实模型连接
src/pet/            engine.ts、rules.ts：纯函数养成与动作规则
src/renderer/pet/   PetView.tsx、Cat.tsx、pet.css：原创小猫与小窝
src/renderer/panel/ Panel.tsx、Onboarding.tsx、Chat.tsx、Memories.tsx、Settings.tsx
src/renderer/       main.tsx、styles.css：入口和共享视觉
assets/             tray 图标及可选本地动物音效
tests/              pet/、storage/、desktop/、ai/、ui/、e2e/
docs/qa/            原生验收记录及性能记录
```

数据契约在 Task 1 定义；后续任务直接导入，不自行复制字段：

- `Action = 'pet' | 'feed' | 'play'`；`Stage = 'new' | 'familiar' | 'close'`。
- `Animation = 'idle' | 'walk' | 'sleep' | 'stretch' | 'groom' | 'look' | 'petted' | 'eat' | 'play' | 'lifted' | 'land' | 'greet'`。
- `PetState`：`name`、`energy`、`contentment`、`bond`、`stage`、`animation`、`preferences: Record<Action, number>`、`lastSeenAt`、`maxObservedAt`、`creditedDays: string[]`、`lastActionAt: Partial<Record<Action, number>>`。
- `Settings`：`quiet`、`sound`、`reducedMotion`、`alwaysOnTop`、`launchAtLogin`；均为布尔值。仅 `alwaysOnTop` 默认 true。
- `Message`：`id`、`role: 'user' | 'assistant'`、`text`、`createdAt`。
- `Memory`：`id`、`kind: 'name' | 'preference' | 'moment'`、`text`、`sourceMessageId?: string`、`createdAt`。写入即代表用户已确认。
- `Connection`：`endpoint`、`model`；密钥永不出现在对渲染层暴露的状态中。
- `Snapshot`：`version: 1`、`pet: PetState`、`settings: Settings`、`messages: Message[]`、`memories: Memory[]`、`connection: Connection | null`、`position: { x: number; y: number } | null`、`onboardingComplete: boolean`。
- `PetCommand`：带 `type` 判别的联合，支持 `care`、`rename`、`settings`、`complete-onboarding`、`memory-add`、`memory-update`、`memory-delete`、`message-delete`、`messages-clear`；各字段须运行时校验。
- `PetBridge`：`getSnapshot(): Promise<Snapshot>`、`dispatch(command: PetCommand): Promise<Snapshot>`、`subscribe(listener: (snapshot: Snapshot) => void): () => void`、`openPanel(tab: 'chat' | 'pet' | 'memories' | 'settings'): Promise<void>`、`hide(): Promise<void>`、`sendChat(text: string): Promise<ChatResult>`、`cancelChat(): Promise<void>`、`saveConnection(connection: Connection, key?: string): Promise<void>`。Task 5 增加受限拖动与命中区域接口。
- `ChatResult`：`{ status: 'ok'; message: Message } | { status: 'cancelled' | 'error'; reason: string }`。
- 时间一律用毫秒时间戳；跨日额度按 UTC 日键计算，UI 按本地时间展示。
- `Point = { x: number; y: number }`、`Size = { width: number; height: number }`、`Rect = Point & Size`，坐标单位为 Electron 的逻辑像素。

## Task 1：可启动的桌面宿主与受限进程接口

**Files:** 创建 `package.json`、lockfile、TypeScript/Vite/Vitest 配置、HTML 入口、`src/shared/{types,bridge}.ts`、`src/main/{index,windows,ipc}.ts`、preload 及最小 renderer 入口；测试 `tests/desktop/ipc.test.ts`。

**Interfaces:** 产出以上共享类型和 `registerIpc(deps: HostDependencies): void`；`HostDependencies` 注入 snapshot、dispatch、面板、隐藏和聊天处理器，测试可替换。未接入聊天时返回明确的未连接错误。不得在 preload 暴露通用 IPC 或文件访问。

- [x] 配置最小工具链和 `dev`、`build`、`typecheck`、`test`、`test:e2e` 脚本，安装依赖并生成 lockfile。
- [x] 编写失败测试：非法 action、非有限坐标、非可信发送窗口均被拒绝；公共 snapshot 序列化后不存在密钥字段。
- [x] 运行 `npm test -- tests/desktop/ipc.test.ts`，确认失败源于未实现的校验，不是工具配置错误。
- [x] 实现主窗口生命周期和受限 bridge：启用 context isolation、renderer sandbox，关闭 Node integration；仅加载本地页面，限制导航和新窗口。
- [x] 运行同一测试及 `npm run typecheck`，要求全部通过；`npm run dev` 可启动宠物占位窗口和一个可关闭的面板。记录系统及依赖版本，不将占位窗口标为产品完成。

## Task 2：离线宠物规则与可见关系变化

**Files:** 创建 `src/pet/{engine,rules}.ts`、`tests/pet/engine.test.ts`。

**Interfaces:** 消费共享类型；产出 `createPet(now: number): PetState`、`applyCare(pet: PetState, action: Action, now: number): PetState`、`creditConnection(pet: PetState, now: number): PetState`、`tickPet(pet: PetState, now: number, quiet: boolean): PetState`、`pickIdle(pet: PetState, random: number): Animation`。`creditConnection` 由有效照顾及成功对话共用，执行同一份每天一次的关系增长限制。

本次实现默认数值：精力与满足感 0–100，初值 70；bond 初值 0，当天首次有效照顾或成功对话增加 1、每日合计最多 1；bond 达到 3 为 familiar、7 为 close。同一 action 两秒冷却；feed 增加 10 满足感，pet 增加 5，play 增加 8 并消耗 5 精力。所有值钳制到范围内；离线不减少 bond。精力和满足感每十分钟至多变化 1，单次恢复只计算最多三十分钟，超出时间作为休息处理。维护最大已观察时间，回拨期间不发放新的日期额度。

- [x] 编写失败测试：`createPet(0)` 的固定初值；两秒内重复 care 不增长；照顾和对话同一天合计只增长一次；跨三天、七天的有效互动进入正确 stage；七天离线 bond 不下降；时钟回拨、跨时区、超长休眠不重复发额度或出现 NaN。
- [x] 运行 `npm test -- tests/pet/engine.test.ts`，确认规则尚未实现导致失败。
- [x] 实现上述纯函数与命名常量；random 作为入参，quiet 禁止 walk；动作结束回归合适 idle/sleep。亲近阶段通过问候和被摸后的动作序列体现；偏好影响相应闲置动作权重。
- [x] 运行同一测试并检查所有状态值边界。不得使用系统真实等待来测试跨日行为。

## Task 3：可靠存档与独立凭据保存

**Files:** 创建 `src/main/storage/{repository,credentials}.ts`、`tests/storage/repository.test.ts`、`tests/storage/credentials.test.ts`；修改主进程状态宿主。

**Interfaces:** `Repository.load(): Promise<{ snapshot: Snapshot; recovered: boolean }>`、`Repository.save(snapshot: Snapshot): Promise<void>`；`CredentialStore.read(): Promise<string | null>`、`write(key: string): Promise<void>`、`clear(): Promise<void>`。存储位置使用 Electron userData。文件操作和系统加密以适配器注入，测试不碰用户真实凭据。

- [x] 编写失败测试：保存后恢复全部 snapshot；主存档损坏回退有效备份；临时文件写失败保留原件；主文件及备份均损坏时隔离损坏文件并返回带恢复提示的新存档；不接受未知高版本并静默覆盖。
- [x] 编写凭据失败测试：加密不可用时返回可解释错误，不退回明文；普通存档和日志不包含测试密钥。
- [x] 运行 `npm test -- tests/storage` 确认失败。
- [x] 实现 schema 校验、串行写队列、临时文件写入后原子替换和最近有效备份；退出前刷新，周期性保存变化；凭据使用当前 Electron 版本支持的系统保护接口。
- [x] 运行同一测试及类型检查。手动重启后昵称、关系和设置保持，恢复事件可被 UI 显示且不会反复弹出。

## Task 4：原创 2D 小猫、初次引导与日常面板

**Files:** 创建 `src/renderer/pet/{PetView,Cat}.tsx`、`pet.css`、`src/renderer/panel/{Panel,Onboarding,Chat,Memories,Settings}.tsx`、共享样式、本地音效；测试 `tests/ui/pet.test.tsx`、`onboarding.test.tsx`。

**Interfaces:** `Cat({ animation, stage, reducedMotion }: CatProps)` 只渲染；`PetView({ snapshot, bridge }: PetViewProps)` 负责交互；`Panel({ snapshot, tab, bridge }: PanelProps)` 负责面板；共享状态通过 bridge 订阅，组件销毁必须解绑。

- [x] 对照已确认方案制作一份小猫与桌面操作条的视觉稿，保持动作轮廓清晰和中文易读；执行时加载适用的前端设计技能。素材须原创或有明确可用授权，宠物独立于动画引擎。
- [x] 编写失败交互测试：单击仅显示操作条；照顾按钮发送正确 command；聊聊才打开 chat；引导需命名/采用默认名、摸摸、喂食后完成；quiet 与 reducedMotion 对实际动作生效。
- [x] 运行 `npm test -- tests/ui` 确认失败。
- [x] 实现小猫、小窝及固定玩具；覆盖全部 Animation，抚摸、吃饭与玩耍有不同反馈；实现引导和面板 tab。普通模式提供本地动物音效开关，quiet 优先于声音设置，隐藏时停止视觉动画。
- [x] 运行同一测试；通过可用浏览器工具检查布局、键盘、Escape、中文换行和截图。此阶段 Chat 明确显示“聊天尚未连接”，不输出模拟 AI 回复。

## Task 5：原生桌面行为、显示器与托盘

**Files:** 修改 `src/main/{windows,ipc}.ts`；创建 `src/main/{tray,geometry}.ts`、`assets/` 图标；修改 pet renderer；测试 `tests/desktop/{geometry,interactions}.test.ts`、`tests/e2e/desktop.spec.ts`。

**Interfaces:** `clampPosition(position: Point, window: Size, workAreas: Rect[]): Point`、`createTray(deps: TrayDependencies): Tray`；bridge 增加 `setHitRegions(regions: Rect[]): Promise<void>` 和 `drag(command: { phase: 'start' | 'move' | 'end'; screenX: number; screenY: number }): Promise<void>`。主进程只接受来自 pet 窗口的有限坐标，窗口内命中矩形限制在当前窗口尺寸内。

- [x] 编写失败测试：负坐标第二屏、缩放改变、显示器断开均返回可见位置；拖动超过 5 个逻辑像素不产生 click；quiet 禁止自主位移；隐藏/恢复不重置 snapshot；透明区域路由不触发宠物操作。
- [x] 运行 `npm test -- tests/desktop` 确认相关失败。
- [x] 实现固定尺寸透明宠物窗口和独立面板；尺寸由美术范围确定，不能假设透明窗口可任意原生缩放。根据实际命中区切换鼠标事件忽略，使用平台支持的转发机制恢复 hover；不得用全屏不可见窗口拦截桌面。
- [x] 实现屏幕工作区约束、位置保存、窗口置顶开关、托盘/菜单栏、显示/隐藏、安静模式、设置和退出；开机启动仅随用户设置改变。宠物日常更新使用不激活窗口的方式，面板只在用户操作后聚焦。
- [ ] 运行单测、`npm run test:e2e -- tests/e2e/desktop.spec.ts`，再在 Mac 上用真实底层编辑器验证穿透和焦点。Windows 保留相同原生检查，未实际运行时在记录中明确写“未验证”。

## Task 6：真实 AI 聊天、手动记忆与连接设置

**Files:** 创建 `src/main/ai/{client,context,controller}.ts`；完成 Chat、Memories、Settings；测试 `tests/ai/{client,controller,context}.test.ts`、`tests/ui/chat.test.tsx`。

**Interfaces:** `buildContext(snapshot: Snapshot, input: string): ProviderMessage[]`；`requestReply(config: Connection, key: string, messages: ProviderMessage[], signal: AbortSignal): Promise<{ text: string; animation?: Animation }>`；`ChatController.send(text: string): Promise<ChatResult>`、`cancel(): void`。`ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string }`。主进程持有 controller 和 CredentialStore，不向 renderer 返回密钥。

连接首版限定为兼容 Chat Completions 消息结构的 HTTPS 端点，endpoint 是完整请求地址；用户填写模型名和密钥。不声称适配所有厂商。非流式请求，30 秒超时，近期对话最多 20 条，每条用户输入最多 2000 字；历史长期保存，发送上下文有长度上限。默认不自动重试。

- [x] 编写失败测试：未配置连接不发请求；401/429/超时保留输入；取消后迟到的响应不能追加 assistant 消息；请求期间再发送被拒绝；重试复用未完成消息而不重复追加；失败和取消不增加 bond。
- [x] 编写上下文测试：只包含近期 20 条及已保存记忆；删除记忆后不再作为记忆发送；删除原始消息后不再作为近期消息发送；模型文本不触发 memory-add 或任意系统操作。
- [x] 运行 `npm test -- tests/ai tests/ui/chat.test.tsx` 确认失败。
- [x] 实现真实 HTTP 适配器、校验、AbortController 和请求代次标识。仅成功提交 assistant 消息后调用 Task 2 的 `creditConnection`。宠物口吻限定短回复；未返回合法 animation 时使用 idle，不将任意模型文本作为 HTML 执行。
- [x] 完成连接设置、连接错误提示、取消/重试、手动记忆的新增/修改/删除和清空对话；密钥只能替换或删除，设置页只显示是否已配置。记忆删除入口说明近期上下文和远端已发送数据的边界。
- [ ] 运行同一测试及类型检查；使用获得授权的试用连接做一次真实对话和重启后记忆验证。若缺少服务地址或密钥，继续其他工作，最后明确列为尚未完成的验收项，不伪造结果。

## Task 7：安装包、端到端验收与性能记录

**Files:** 创建 `electron-builder.yml`、`tests/e2e/journey.spec.ts`、`docs/qa/{native-checklist,performance}.md`、`README.md`；完成 build/打包脚本。

**Interfaces:** `npm run package:mac` 与 `npm run package:win` 产出当前平台可用试用包；跨平台构建不替代目标平台运行。Mac 首轮为当前开发机器架构，Windows 首轮为 x64；另一个 Mac 架构与 Windows ARM 不声称已验证。签名和公证需要实际证书，未获得时仅作为明确标注的未签名试用包交付。

- [x] 添加失败的端到端旅程：初次启动 → 照顾 → 改名 → 开启安静 → 重启恢复 → 手动保存/删除记忆；测试用模型服务仅用于可控故障注入，不能替代 Task 6 的真实连接验收。
- [x] 运行 `npm run test:e2e -- tests/e2e/journey.spec.ts`，记录失败及原因。
- [x] 完成打包资源路径、托盘图标、开发/生产入口差异及退出刷新；README 写清启动、连接、存档位置、删除方式、未签名限制和已验证平台。
- [x] 运行 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e` 及当前系统打包命令；逐项记录实际结果。
- [ ] 按产品方案第 10 节在 macOS 和 Windows 分别记录原生检查。没有 Windows 运行环境时交付可验证构建及待验清单，最终状态为“Windows 原生验收未完成”。
- [ ] 在同一设备记录闲置、动画、聊天、隐藏各五分钟的应用进程树 CPU 和内存、模型调用次数；记录机器、系统和工具。先完成单次采样再写基线，隐藏停止动画、闲置零模型请求必须成立。
- [ ] 最终审查：确认密钥不在包、存档或日志中，未添加超出范围的屏幕/音频访问；总结已通过检查、未验证项目和已知缺陷，满足条件后才称第一版完成。

## 方案覆盖与自检

| 产品要求 | 对应任务 |
| --- | --- |
| 首次命名、照顾引导、单只原创宠物和小窝 | 2、4 |
| 非惩罚养成、关系阶段、偏好、离线使用 | 2、3、4 |
| 日常动作、安静、音效、减少动态 | 2、4、5 |
| 本地存档、备份和恢复告知 | 3、4 |
| 真模型连接、失败处理、取消与重试 | 6 |
| 记忆确认、查看、修改、删除和上下文边界 | 3、6 |
| 焦点、透明命中、拖动、显示器、托盘、开机启动 | 1、5 |
| 双平台运行、打包、性能和试用说明 | 7 |

本计划已逐项检查方案覆盖、接口名称、时间与失败情形。执行更新：用户已选择 Electron 并授权继续；按当前聊天直接实施。已完成步骤用勾选标注，未完成的原生/真实服务验收保留未勾选状态，实际验证见 docs/qa/native-checklist.md。
