PREFIX ?= $(HOME)/.claude/bin
APP_DIR := $(PREFIX)/Haptic.app
BIN := $(APP_DIR)/Contents/MacOS/haptic

.PHONY: all build install clean test

all: build

build:
	@mkdir -p $(APP_DIR)/Contents/MacOS $(APP_DIR)/Contents/Resources
	@cp resources/Info.plist $(APP_DIR)/Contents/Info.plist
	swiftc src/haptic.swift -o $(BIN)
	@codesign --force --deep --sign - $(APP_DIR)
	@echo "Built: $(APP_DIR)"

install: build
	@ln -sf $(BIN) $(PREFIX)/haptic
	@echo "Installed: $(PREFIX)/haptic"
	@echo "Run: open -W $(APP_DIR)  # for proper haptic"
	@echo "Or:  $(PREFIX)/haptic    # direct CLI"

test: build
	open -W $(APP_DIR)

clean:
	rm -rf $(APP_DIR) $(PREFIX)/haptic
