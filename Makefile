.PHONY: install run build package test

# NOTE: VS Code (itself Electron) exports this to child shells; it makes electron.exe run as plain Node and no window opens.
unexport ELECTRON_RUN_AS_NODE

install:
	npm install

run:
	npm run dev

build:
	npm run build

package:
	npm run package

test:
	npm test
