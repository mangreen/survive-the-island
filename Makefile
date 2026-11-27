# 常用指令。需求：Docker（相容 Docker Desktop 4.12），主機不必安裝 Node。
# 相容性：GNU Make 3.81（macOS 內建）。

.PHONY: help dev down check

help:
	@echo "make dev    建置並啟動開發伺服器（http://localhost:5173）"
	@echo "make down   停止並移除容器"
	@echo "make check  在容器內跑完整檢查（format、lint、typecheck、test、build）"

dev:
	docker compose up --build

down:
	docker compose down

# 先重建映像，讓容器內的原始碼與設定是目前的版本
check:
	docker compose build web
	docker compose run --rm --no-deps web pnpm run check
