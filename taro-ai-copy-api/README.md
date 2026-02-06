# taro-ai-copy-api

文创小新小程序的后端 API 服务，对接 DeepSeek 生成文案。与前端项目 `taro-ai-copy` 分离，独立仓库/目录运行。

## 环境

- Node.js >= 18

## 使用

1. 安装依赖

   ```bash
   npm install
   ```

2. 配置环境变量

   ```bash
   cp .env.example .env
   # 编辑 .env，填入 DEEPSEEK_API_KEY（https://platform.deepseek.com/）
   ```

3. 启动

   ```bash
   npm run dev
   ```

   默认地址：`http://localhost:3000`

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| POST | /api/ai/copy | 通用文案，Body: `{ prompt, scene?, tone?, length? }`，返回 `{ text }` |
| POST | /api/ai/xhs | 小红书文案，Body: `{ noteType, outline, keywords?, versionIndex: 1\|2\|3 }`，返回 `{ text }` |
| POST | /api/ai/moments | 朋友圈文案，Body: `{ scene, persona, outline, festival?, hotTopic? }`，返回 `{ text }` |
| POST | /api/ai/video | 短视频脚本，Body: `{ platform, hookStyle, idea }`，返回 `{ outline, script, bgmSuggestion }` |

## 如何测试接口

**1. 浏览器**

- 健康检查：浏览器打开 `http://localhost:3000/api/health`，应看到 `{"ok":true,"service":"taro-ai-copy-api","deepseekConfigured":true/false}`。

**2. curl（命令行）**

先确保后端已启动（`npm run dev`），在终端执行：

```bash
# 健康检查
curl http://localhost:3000/api/health

# 小红书文案（单版本）
curl -X POST http://localhost:3000/api/ai/xhs -H "Content-Type: application/json" -d "{\"noteType\":\"穿搭\",\"outline\":\"秋冬通勤显瘦搭配\",\"versionIndex\":1}"

# 朋友圈文案
curl -X POST http://localhost:3000/api/ai/moments -H "Content-Type: application/json" -d "{\"scene\":\"日常\",\"persona\":\"精致\",\"outline\":\"周末喝了一杯很好喝的咖啡\"}"

# 短视频脚本
curl -X POST http://localhost:3000/api/ai/video -H "Content-Type: application/json" -d "{\"platform\":\"抖音\",\"hookStyle\":\"痛点共鸣\",\"idea\":\"新手三步完成日常妆\"}"
```

**3. Postman / Apifox / Insomnia**

- 新建请求，方法选 GET 或 POST，URL 填 `http://localhost:3000/api/health` 或对应 POST 路径。
- POST 请求在 Body 选 raw、JSON，按上表填写请求体后发送。

## 前端对接

在 Taro 项目 `taro-ai-copy` 中构建时指定本服务地址，例如：

```bash
set TARO_APP_AI_API_BASE=http://localhost:3000
npm run build:weapp
```

微信开发者工具中需勾选「不校验合法域名」以便本地请求。
