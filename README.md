# 挑战杯项目

## 项目结构

```
tiaozhanbei/
├── .git/                   # Git 仓库
├── .gitignore              # 全局忽略文件
├── README.md               # 项目主文档
├── .cursor/                # Cursor 规则
├── frontend/               # Vue 3 前端项目
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── router/
│   │   ├── utils/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── .prettierrc.json
│   ├── .env.development
│   └── yarn.lock
└── backend/               # 后端项目（空目录）
    └── .gitignore
```

## 快速开始

### 前端

```bash
cd frontend
yarn dev      # 开发服务器
yarn build    # 构建生产版本
yarn lint     # 代码检查
```

### 后端

（待配置）
