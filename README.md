# EchoFlow（声流时空）

EchoFlow 是一个多模态智能音频解析工作台。用户可以注册、登录并上传自己的录音，围绕健康日程、流程规程、语言精听、知识纪要、面试复盘和原文转写六类场景查看字幕、结构化内容、音频溯源与提醒日程。

## 当前实现

- 前端使用 Vue 3、TypeScript、Vite 和 Vue Router，页面已拆分为认证、顶部导航、统计、近期录音、播放器、上传弹窗与六类场景组件。
- 后端使用 Express 和 TypeScript，按 routes、controllers、services、repositories、middlewares、schemas 分层。
- 前后端通过 Axios 通信；登录后请求拦截器自动添加 `Authorization: Bearer <token>`。
- 已实现注册、邮箱或用户名登录、图形验证码、当前用户信息、资料修改、修改密码及忘记密码流程。
- 用户密码使用 bcrypt 哈希；后端负责 JWT 签发和校验。登录验证码保存在 Redis 中且读取后失效，不写入 JWT。
- 已实现音频上传、列表、详情、状态、删除、重新解析和受保护的音频流接口。
- 工作台播放器已接入真实录音，支持播放、暂停、进度跳转和倍速。
- 已提供场景结果、字幕和日程事件 API。
- 录音通过 `user_id` 归属于用户，录音、播放、场景、字幕和日程接口均校验当前用户。
- ASR/LLM 目前仍是演示解析器，正式服务商和密钥配置尚未启用。

## 场景类型

| 场景 | 分类值 | 识别方式 | 输出内容 |
| --- | --- | --- | --- |
| 健康日程 | `MEDICATION` | 药品、服用、剂量、复诊等关键词 | 用药信息、服药时间线、安全提醒 |
| 流程规程 | `SOP` | 步骤、流程、操作等关键词 | 有序步骤、时长、注意事项 |
| 语言精听 | `QUIZ` | 英语、听力、选择题等关键词 | 中英对照、题目与答案解析 |
| 知识纪要 | `MEMO` | 会议、纪要、总结、讨论、待办等关键词 | 摘要、要点、行动事项、主题脉络 |
| 面试复盘 | `INTERVIEW` | 面试、候选人、岗位、自我介绍等关键词 | 问答回顾、整体复盘、关键亮点 |
| 原文转写 | `TRANSCRIPT` | 未命中上述场景的普通录音（默认） | 带时间戳的原文段落 |

场景由 `backend/src/agents/router.agent.ts` 根据转写文本排序匹配，关键词越靠前优先级越高。普通录音只做语音转写，`parseAudio` 会直接由转写片段生成 `TRANSCRIPT` 场景结果并跳过 LLM 调用，避免对纯转写内容做多余的结构化分析。新增的 `INTERVIEW` 和 `TRANSCRIPT` 分类已同步到 MySQL 的 `audio_records.category` 与 `scene_payloads.category` 枚举，旧数据库启动时会自动扩展枚举值。

## 工程结构

| 路径 | 职责 |
| --- | --- |
| `frontend/` | Vue 3 前端独立工程 |
| `backend/` | Node.js 后端独立工程 |
| `backend/storage/uploads/` | 原始音频运行时文件，不提交 Git |
| `backend/storage/processed/` | 音频处理缓存，不提交 Git |
| `docker-compose.yml` | 前端、后端、MySQL 和 Redis 编排 |
| `.gitmodules` | 前后端 Submodule 映射 |

按照 PRD，最终应由 `frontend` 和 `backend` 两个独立 Git 仓库组成，并由 EchoFlow-Main 聚合仓库通过 Git Submodule 管理。当前 `.gitmodules` 中如仍为 `your-org` 占位地址，正式使用前需要替换为真实仓库地址。

## 本地开发

后端：

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

默认地址：

- 前端：`http://localhost:5174`
- 后端：`http://localhost:3001`
- 健康检查：`http://localhost:3001/api/health`

Vite 会把 `/api` 代理到 `http://localhost:3001`。分离部署时可通过 `VITE_API_BASE_URL` 修改 API 根地址。

## 环境配置

后端统一通过 `backend/src/config/env.ts` 读取和校验环境变量，其他模块只使用分组后的 `config` 对象。

```dotenv
PORT=3001
CORS_ORIGIN=http://localhost:5174
STORAGE_DIR=storage
MAX_UPLOAD_MB=100

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=echoflow

REDIS_URL=redis://127.0.0.1:6380
AUDIO_QUEUE_NAME=audio-processing
AUDIO_QUEUE_CONCURRENCY=2
AUDIO_QUEUE_ATTEMPTS=3

JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account
SMTP_PASSWORD=your-password
SMTP_FROM=no-reply@example.com
```

生产环境必须替换开发 JWT 密钥。忘记密码功能依赖 SMTP；未配置时接口返回 `MAIL_NOT_CONFIGURED`。Redis 使用 `REDIS_URL`，本地开发默认端口为 `6380`；Docker Compose 中后端通过 `redis://redis:6379` 访问容器内 Redis，宿主机映射端口为 `6380`。

## 数据库与用户数据隔离

后端使用 MySQL Repository。启动时执行 `backend/src/models/migrations/001_initial.sql`，并检查已有 `audio_records` 表是否缺少 `user_id`；旧库会自动增加字段、所有者索引和用户外键。

隔离规则：

1. JWT 的 subject 保存用户 ID，认证中间件写入 `req.user.id`。
2. 上传录音时，`user_id` 只能来自 JWT，前端不能指定或覆盖所有者。
3. 录音列表仅查询当前用户记录。
4. 录音详情、播放、状态、删除和重新解析使用 `audio_id + user_id` 双重校验。
5. 场景、字幕和日程先验证所属录音归当前用户，再执行读写。
6. 日程列表和状态更新通过 `audio_records` 关联用户过滤。
7. 删除用户时，录音通过 `ON DELETE CASCADE` 删除，相关场景和日程按音频外键继续级联删除。

已有数据库中无法确认所有者的历史录音会保留 `user_id=NULL`，不会展示给任何用户。若需保留，应确认归属后手动回填有效的 `users.id`。

## API

统一前缀为 `/api`。除健康检查、注册、登录、验证码、忘记密码和重置密码外，业务接口都需要 Bearer Token。

### 认证接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/auth/captcha` | 创建 Redis 图形验证码 |
| POST | `/api/auth/register` | 注册并签发 JWT |
| POST | `/api/auth/login` | 邮箱或用户名、密码和验证码登录 |
| POST | `/api/auth/forgot-password` | 发送密码重置验证码 |
| POST | `/api/auth/reset-password` | 重置密码 |
| GET | `/api/auth/me` | 查询当前用户 |
| PATCH | `/api/auth/me` | 修改当前用户资料 |
| PUT | `/api/auth/me/password` | 修改当前用户密码 |

### 录音、场景和日程接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET / POST | `/api/audios` | 当前用户录音列表 / 上传 `multipart file` |
| GET / DELETE | `/api/audios/:audioId` | 录音详情 / 删除 |
| GET | `/api/audios/:audioId/stream` | 受保护的音频流 |
| GET | `/api/audios/:audioId/status` | 解析状态 |
| POST | `/api/audios/:audioId/reprocess` | 重新解析 |
| POST | `/api/transcribe` | 调用本地 FunASR 转写录音（传 `audioId`） |
| GET / PUT | `/api/scenes/:audioId` | 获取 / 保存场景结构 |
| POST | `/api/scenes/:audioId/transcript` | 保存时间戳字幕 |
| POST | `/api/scenes/:audioId/parse` | 触发解析 |
| GET | `/api/schedule` | 查询当前用户日程，可传 `audioId` |
| POST | `/api/schedule/:audioId/events` | 创建日程 |
| PATCH | `/api/schedule/events/:eventId` | 更新日程状态 |

成功响应采用 `{ success, code, data, requestId }`。错误响应包含 HTTP 状态、稳定错误码、信息和 `requestId`。前端在收到 401 后清除本地 Token。

## 音频播放流程

原生 `<audio src>` 不方便附加 Axios Bearer 请求头，因此目前采用以下流程：

1. 用户选择自己的录音。
2. Axios 请求 `/api/audios/:audioId/stream`，拦截器附加 JWT。
3. 后端校验 JWT 和录音所有权后返回二进制。
4. 前端创建 Blob URL 并交给 `WorkbenchPlayer`。
5. 切换录音或离开页面时调用 `URL.revokeObjectURL` 释放资源。

这种实现会先下载完整音频。大文件后续可改为短期签名 URL或其他支持 Range 的认证方案。

## Docker

```powershell
docker compose up --build
```

Compose 会启动 frontend、backend、MySQL 8.4 和 Redis 7。首次启动前应设置安全的 `MYSQL_ROOT_PASSWORD`，并在 `backend/.env` 中提供数据库、JWT 和邮件配置。

## 验证

```powershell
cd backend
npm run build

cd ../frontend
npx vue-tsc -b
npm run build
```

当前已确认后端 TypeScript 构建和前端 `vue-tsc` 检查通过。在部分受限 Windows 环境中，Vite 可能因子进程权限出现 `spawn EPERM`，需要在允许创建子进程的终端中重试。

## 尚未完成

- 正式 ASR/LLM Provider 尚未选定，相关配置和调用保持禁用。
- 六类场景 UI 仍有演示内容，需要继续使用真实 scene payload、transcript 和 schedule 数据替换。
- Blob 播放会下载完整音频，大文件播放仍可优化。
- 生产环境仍需补充速率限制、审计日志、日志脱敏、上传内容检测、Token 刷新/撤销和正式版本化迁移工具。

## 安全提示

不要提交 `.env`、JWT 密钥、SMTP 密码、第三方 API 密钥、数据库密码或 `backend/storage` 中的用户录音。生产环境必须使用随机高强度 `JWT_SECRET` 并限制 CORS 来源。
