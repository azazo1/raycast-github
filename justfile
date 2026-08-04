[private]
default:
    @just --list

# 安装依赖.
install:
    bun install

# 开发模式导入到 Raycast.
dev:
    bun run dev

# 构建扩展产物.
build:
    bun run build

# 运行测试.
test:
    bun test

# 运行 lint.
lint:
    bun run lint
