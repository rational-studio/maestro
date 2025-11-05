# Motif/Core 演示（Vite + React + Tailwind）

本项目用于全面演示 `@motif-ts/core` 的核心能力：步骤定义、工作流编排、边（默认/条件/转换）、过渡钩子与副作用等。

## 开发与运行

- 安装依赖（在仓库根目录）：

```bash
pnpm install
```

- 启动开发服务器（在演示包目录）：

```bash
cd packages/demo
pnpm dev
```

访问浏览器提示的本地地址进行交互式演示。

## 构建

```bash
pnpm build
```

产物位于 `packages/demo/dist/`。

## 主要技术栈

- `Vite` + `React` + `TypeScript`
- `Tailwind CSS v4`（通过 `@tailwindcss/vite` 集成）
- `@motif-ts/core`（来自当前 workspace）
- `zod` 与 `zustand`（`@motif-ts/core` 的 peer 依赖）

## 演示模块

- 步骤与工作流：定义 `step`，注册与启动 `workflow`，查看当前步骤与事件订阅。
- 边的条件与转换：使用 `conditionalEdge` 与 `transformEdge` 控制流向与输入转换。
- 过渡钩子与副作用：`transitionIn` / `transitionOut` 钩子与依赖驱动的 `effect`。

> 注：`exportWorkflow` / `importWorkflow` 的导入导出格式仍在演进中，当前演示不包含该模块。

## 目录结构（演示包）

- `src/demos/*`：独立功能演示组件
- `src/components/CodeBlock.tsx`：示例代码展示组件
- `src/App.tsx`：导航与路由

## 许可

MIT
