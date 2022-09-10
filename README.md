# 这是干嘛的？

因为 Telegram 预览 Twitter 链接时好时坏的，所以做了一个 TG BOT 自动将频道中的链接都替换成 vx 前缀的 Twitter 链接，群组中的链接因为 bot 没有 edit 的权限，只能 reply 原消息。

## 使用方法

将你创建的 TG BOT 添加到需要的频道或群组中，默认将检查前 10 条消息

创建的 BOT 可能需要先到 BotFather 设置 /setprivacy 为 disable，才能获取到消息

clone repo 到本地，然后修改 `index.ts` 中的 `TOKEN` 为你的 BOT TOKEN，终端执行 `npm run build && npm run start`，需要先全局安装好 pm2 进程管理器 (也可以直接 `node dist/index.js` 随你喜欢啦)

如有疑问请提交 issues
