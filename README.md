# 小团 · 你的桌面小伙伴

基于 Electron、React 和 TypeScript 的 macOS / Windows 桌面宠物试用项目。平时用动作陪伴，主动打开聊天时才请求 AI。

## 本地运行

开发使用 Node.js 24 LTS（至少 24.13）。首次运行：

```sh
npm install
npm run setup:electron
npm run dev
```

若 Electron 官方下载源超时，可改用 `npm run setup:electron -- --mirror`。镜像下载仍由 Electron 安装器核对包内校验和。

运行已构建版本：

```sh
npm run build
npm start
```

第一次启动会引导起名、摸摸和喂食。单击桌面小猫打开操作条，拖动可调整位置。菜单栏或系统托盘可恢复被隐藏的小团、打开设置或退出。安静模式关闭自主走动及声音；减少动态效果可单独开启。

## AI 聊天

在“设置 → 聊天连接”填写完整 HTTPS 请求地址、模型名称和自己的连接密钥。服务需兼容 Chat Completions 的消息及回复结构；支持范围不等于全部模型服务。第一版只请求文本，不加载本地大模型。

密钥通过系统凭据保护能力加密，只保存在本机，不进入普通存档或渲染窗口。更换服务地址时必须重新填写密钥。请直接在应用中配置，不在聊天或源码中粘贴密钥。

每次主动发送才连接服务，无自动后台对话和自动重试。断网仍可摸摸、喂食和玩耍。模型费用由所配置服务计收。未配置真实服务时，不把离线互动或测试响应当作 AI 对话成功。

聊天请求使用 Electron 的系统网络接口，遵循操作系统的代理设置。若网络需要代理，请先确保系统代理已启用；不需要在小团中另填代理地址。

保存设置后可点击“检测连接”，用一条简短测试消息验证服务、密钥和模型是否可用。检测使用 API 额度，不包含聊天记录和回忆，也不会改变宠物关系。额度或余额不足时，需在所配置服务的控制台处理；反复发送不会恢复额度。临时限流与额度不足会分别提示，应用不会自动重试。

回忆由用户主动添加或在聊天中选择“记住”。删除回忆不等于删除原始聊天；对应消息可单独删除，也可在设置中清空聊天。已经发送给远端服务的内容无法通过本地删除撤回。

## 数据与恢复

默认目录是 Electron `userData` 下的小团目录：macOS 通常为 `~/Library/Application Support/小团`，Windows 通常为 `%APPDATA%/小团`。实际位置由系统配置决定。

- `pet.json`：宠物、设置、对话及已确认的回忆。
- `pet.backup.json`：上一次有效存档。
- `connection.key`：系统加密后的连接密钥。
- `.corrupt-*`：恢复时保留的损坏文件。

如需完全重置，先从托盘退出应用，再自行备份或删除上述应用专属目录。应用不会自动删除损坏存档。开发和自动测试可以通过 `XIAOTUAN_DATA_DIR` 使用独立目录；打包应用不接受该覆盖。

## 检查与打包

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run package:mac
# Windows 构建环境中运行：
npm run package:win
```

Mac 打包产出未签名 `.app`，用于本机和小范围试用，尚未完成开发者签名与公证。Windows 脚本目标为 x64 NSIS 安装包；在 Mac 构建通过不代表 Windows 原生验收通过。

Windows 免安装包可用 `npm run package:win:zip` 生成。应用图标源图和设计提示词见 [图标说明](docs/design/app-icon.md)，成品位于 `resources/icon.png`、`resources/icon.icns` 和 `resources/icon.ico`；在 macOS 上运行 `npm run icons` 可重新生成各尺寸文件。

测试覆盖范围及未完成项见 [原生验收记录](docs/qa/native-checklist.md)。产品与实施方案位于 `docs/superpowers/`。尚无账号同步、商城、社交、语音或屏幕读取功能。
