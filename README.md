# 欠薪支持起诉智能办案平台（检察端）

欠薪支持起诉智能办案平台，基于 Vue 3 + NestJS + PostgreSQL 构建，为检察机关提供欠薪线索管理、AI辅助审查、批量办案等功能。

## 项目结构

```
tiaozhanbei/
├── docker-compose.yml         # 容器编排（PostgreSQL + Redis + 后端 + 前端）
├── backend/                    # NestJS 后端
│   ├── src/
│   │   ├── common/           # 公共模块（Prisma, Redis, 加密, 拦截器等）
│   │   ├── modules/          # 功能模块（auth, clue, review, document, batch, dashboard, statistics, system, ai）
│   │   └── main.ts           # 入口
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型（20+ 表）
│   │   └── seed.ts           # 初始化数据脚本
│   ├── Dockerfile
│   └── package.json
├── frontend/                  # Vue 3 前端
│   ├── src/
│   │   ├── api/              # API 接口定义
│   │   ├── assets/           # 静态资源/CSS
│   │   ├── components/       # 公共组件（MainLayout 布局）
│   │   ├── router/           # 路由配置
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── utils/            # 工具函数（axios 封装）
│   │   └── views/            # 页面视图（16+ 个页面）
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## 启动命令

### 方式一：Docker Compose（推荐，一次启动全部服务）

```bash
# 启动所有服务（后端 + 前端 + PostgreSQL + Redis）
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down

# 停止并删除数据卷（慎用，会清除数据库）
docker-compose down -v
```

### 方式二：本地开发（前后端分开启动）

#### 1. 确保 Docker 中的数据库和后端在运行

```bash
# 仅启动后端依赖（PostgreSQL + Redis）
docker-compose up -d postgres redis

# 等待数据库就绪后，初始化数据（只需执行一次）
docker exec tiaozhanbei-backend npx prisma db push --accept-data-loss
docker cp backend/scripts/seed.js tiaozhanbei-backend:/app/seed.js
docker exec tiaozhanbei-backend node seed.js

# 启动后端
docker-compose up -d backend
```

#### 2. 启动前端开发服务器

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 http://localhost:3000，会自动代理 `/api` 请求到 `http://localhost:8080`。

## 初始化数据

首次启动时，seed 脚本会自动创建：

- **5 个角色**：系统管理员、承办检察官、部门负责人、分管副检察长、审计员
- **3 个机构**：省/市/区人民检察院
- **4 个用户**：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 系统管理员 |
| prosecutor | 123456 | 承办检察官 |
| dept_head | 123456 | 部门负责人 |
| deputy_chief | 123456 | 分管副检察长 |

- **20 条字典数据**（线索状态、诉求类型、风险等级等）
- **3 条示例线索数据**

## 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端页面（Docker） | http://localhost | 登录页，账号 admin/123456 |
| 前端页面（本地开发） | http://localhost:3000 | 同上，但需确保后端容器运行 |
| 后端 API | http://localhost:8080 | RESTful API |
| API 文档 | http://localhost:8080/api/docs | Swagger/OpenAPI 文档 |
| PostgreSQL | localhost:5432 | 用户名/密码：postgres/postgres |
| Redis | localhost:6379 | 无密码 |

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts
- **后端**：NestJS + Prisma + PostgreSQL + Redis + JWT
- **容器化**：Docker + Docker Compose
- **AI 集成**：支持接入 DeepSeek API（需配置 AI_API_KEY）

## 常见问题

### Q: 前端空白页？
确保后端服务已启动：`docker-compose ps` 确认 backend 状态为 healthy。

### Q: 登录失败？
执行初始化脚本：
```bash
docker cp backend/scripts/seed.js tiaozhanbei-backend:/app/seed.js
docker exec tiaozhanbei-backend node seed.js
```

### Q: 端口被占用？
修改 `docker-compose.yml` 中的端口映射，或修改 `frontend/vite.config.ts` 中的 server.port。

### Q: 重置数据库？
```bash
docker-compose down -v          # 删除数据卷
docker-compose up -d            # 重新创建并启动
# 重新执行 seed 脚本
docker exec tiaozhanbei-backend node seed.js
```
