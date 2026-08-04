# Open GitHub Repos

在 Raycast 中搜索自己的 GitHub 仓库, 并默认在浏览器中打开.

## 使用方式

1. 在项目根目录运行 `bun install`.
2. 运行 `bun run dev`, 让 Raycast 导入本地扩展.
3. 在 Raycast 中搜索 `Search GitHub Repos`.

```shell
bun install
bun run dev
```

## GitHub Token

打开 https://github.com/settings/tokens 创建 token, 并填入 Raycast 的扩展偏好设置.

- classic token: 需要 `repo` scope 才能读取私有仓库, 只读公开仓库时可用 `public_repo`.
- fine-grained token: 选择需要的仓库, 并授予 `Metadata` 的 read 权限.

如果未填写 token, 扩展会尝试调用 `gh api`; 使用前请先运行 `gh auth login`.
