.PHONY: install setup dev

install:
	npm install
	npm run build:web
	npm link

setup: install

dev:
	npm run dev:web
