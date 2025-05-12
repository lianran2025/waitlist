# 三毛Prime会员预售

这是一个使用 Next.js 14 构建的等待名单网站。

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL (Neon)

## 开发环境设置

1. 克隆项目
```bash
git clone <repository-url>
cd waitlist
```

2. 安装依赖
```bash
npm install
```

3. 设置环境变量
创建 `.env` 文件并添加以下内容：
```
DATABASE_URL="postgresql://your-username:your-password@your-host:5432/your-database"
```

4. 初始化数据库
```bash
npx prisma db push
```

5. 启动开发服务器
```bash
npm run dev
```

## 部署

1. 在 Vercel 上创建新项目
2. 连接 GitHub 仓库
3. 在 Vercel 项目设置中添加环境变量：
   - `DATABASE_URL`: 你的 Neon 数据库连接 URL

## 功能

- 等待名单表单
- 邮箱验证
- 重复提交检查
- 响应式设计

## 贡献

欢迎提交 Pull Request 或创建 Issue。
