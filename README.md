# 欠薪支持起诉智能办案平台（检察端）

欠薪支持起诉智能办案平台面向检察机关办理欠薪支持起诉业务，提供线索管理、AI 辅助审查、案件办理、批量办案、文书生成、数据看板和系统管理等能力。

## 技术栈

### 前端

- Vue 3 + TypeScript
- Vite 5
- Vue Router 4
- Pinia
- Element Plus
- ECharts
- Axios
- Day.js、lodash-es
- Sass、ESLint、Prettier、vue-tsc

### 后端

- NestJS 10 + TypeScript
- Prisma 6
- PostgreSQL 16 + PostGIS
- Redis + Bull 队列
- JWT + Passport
- Swagger/OpenAPI
- class-validator、class-transformer
- bcrypt、node-forge
- ExcelJS
- Jest

### 部署与运行

- Docker
- Docker Compose
- Nginx（前端容器）

### AI 集成

- 后端提供 AI 模块，支持通过环境变量配置外部大模型服务。
- 如使用 DeepSeek 等兼容服务，请在 `backend/.env` 中配置对应的 API 地址、模型和密钥。

## 项目结构

```text
tiaozhanbei/
├── docker-compose.yml          # PostgreSQL + Redis + 后端 + 前端编排
├── backend/                    # NestJS 后端服务
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma 数据模型，启用 PostGIS 扩展
│   │   └── seed.ts             # 初始化数据脚本
│   ├── scripts/                # 容器内可执行的辅助脚本
│   ├── src/
│   │   ├── common/             # 通用能力：Prisma、Redis、加密、过滤器、拦截器等
│   │   ├── modules/            # 业务模块：auth、clue、review、document、batch、dashboard、statistics、system、ai 等
│   │   └── main.ts             # 应用入口、CORS、API 版本、Swagger 配置
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # Vue 3 前端应用
│   ├── src/
│   │   ├── api/                # API 请求封装
│   │   ├── assets/             # 样式与静态资源
│   │   ├── components/         # 通用组件
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── utils/              # 工具函数
│   │   └── views/              # 页面视图
│   ├── vite.config.ts          # Vite 配置，本地开发代理 /api 到后端
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## 环境要求

- Node.js 20+
- npm
- Docker 与 Docker Compose

## 快速启动

### 方式一：Docker Compose 启动全部服务

```bash
docker-compose up -d
```

查看服务状态：

```bash
docker-compose ps
```

查看日志：

```bash
docker-compose logs -f
```

停止服务：

```bash
docker-compose down
```

如需同时清空数据库和 Redis 数据卷：

```bash
docker-compose down -v
```

## 本地开发

### 1. 启动基础依赖

```bash
docker-compose up -d postgres redis
```

### 2. 配置后端环境变量

复制并按需修改后端环境变量：

```bash
cd backend
cp .env.example .env
```

本地连接 Docker PostgreSQL 时，`DATABASE_URL` 通常使用：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tiaozhanbei"
```

### 3. 启动后端

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run start:dev
```

后端默认监听 `http://localhost:8080`，接口统一使用 URI 版本前缀 `/api/v1`。

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务默认运行在 `http://localhost:3000`，`/api` 请求会代理到 `http://localhost:8080/api/v1`。

## 常用脚本

### 后端

```bash
npm run start:dev        # 开发模式启动
npm run build            # 构建后端
npm run start:prod       # 运行构建产物
npm run lint             # ESLint 自动修复
npm run test             # 单元测试
npm run test:e2e         # E2E 测试
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:push      # 同步数据库结构
npm run prisma:seed      # 初始化种子数据
```

### 前端

```bash
npm run dev      # 开发服务器
npm run build    # 类型检查并构建
npm run preview  # 预览构建产物
npm run lint     # ESLint 自动修复
npm run format   # Prettier 格式化 src
```

## 访问地址

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| 前端页面（Docker） | http://localhost | 登录页 |
| 前端页面（本地开发） | http://localhost:3000 | Vite 开发服务器 |
| 后端 API | http://localhost:8080/api/v1 | REST API |
| API 文档 | http://localhost:8080/api/docs | Swagger/OpenAPI |
| PostgreSQL | localhost:5432 | 默认用户/密码：postgres/postgres |
| Redis | localhost:6379 | 默认无密码 |

## 初始化账号

种子数据会创建角色、机构、字典和示例业务数据，并提供以下测试账号：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| admin | 123456 | 系统管理员 |
| prosecutor | 123456 | 承办检察官 |
| dept_head | 123456 | 部门负责人 |
| deputy_chief | 123456 | 分管副检察长 |

## 主要功能模块

- 首页数据看板
- 欠薪线索登记、分流、聚合与流转
- AI 辅助审查与风险分析
- 案件办理与任务管理
- 批量办案
- 法律文书生成、编辑与审批
- 统计分析
- 用户、角色、机构、字典等系统管理

## 常见问题

### 前端页面无法访问或空白

确认前后端服务是否正常：

```bash
docker-compose ps
```

本地开发时还需要确认 Vite 代理目标 `http://localhost:8080` 可访问。

### 登录失败

确认数据库已同步并执行过种子脚本：

```bash
cd backend
npm run prisma:push
npm run prisma:seed
```

如果使用 Docker 后端容器，可执行：

```bash
docker cp backend/scripts/seed.js tiaozhanbei-backend:/app/seed.js
docker exec tiaozhanbei-backend node seed.js
```

### 端口被占用

- 修改 `docker-compose.yml` 中的端口映射。
- 或修改 `frontend/vite.config.ts` 中的 `server.port`。
- 后端端口可通过 `backend/.env` 中的 `PORT` 配置。

### 重置数据库

```bash
docker-compose down -v
docker-compose up -d postgres redis
cd backend
npm run prisma:push
npm run prisma:seed
```
