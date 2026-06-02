## ADDED Requirements

### Requirement: 透過 LLMClient 驅動多 provider

Agent 的推理與內容生成 SHALL 透過 `daodao-ai-backend` 既有的 `LLMClient` 驅動，支援多 provider（OpenRouter / Gemini / Ollama 等），並以開源模型為主，不依賴 Anthropic / OpenAI。

#### Scenario: 經 LLMClient 生成
- **WHEN** Agent 需要任何 LLM 生成
- **THEN** 系統 MUST 透過 LLMClient 進行，而非直接呼叫特定 provider SDK

### Requirement: 預設 provider 與模型

系統 SHALL 預設使用 provider `openrouter` 與模型 `deepseek/deepseek-v4-flash`。`config.py` 的 `openrouter.model` MUST 更新為此值，並確認各 provider API key 已設定。

#### Scenario: 未指定時使用預設
- **WHEN** 對話未明確指定模型
- **THEN** 系統 SHALL 使用 `openrouter` + `deepseek/deepseek-v4-flash`

### Requirement: 對話中切換模型

系統 SHALL 允許在對話中以自然語言指令切換模型（如「用 deepseek pro」「用 gemini flash」「免費模式」「本地」），切換後的 provider 設定 MUST 保留於 AppState。

#### Scenario: 指令切換 provider
- **WHEN** 用戶在對話中說「用 gemini flash」
- **THEN** 系統 SHALL 後續改用 `google/gemini-3-flash-preview`，並於 AppState 記錄此選擇

#### Scenario: 免費模式
- **WHEN** 用戶要求「免費模式」
- **THEN** 系統 SHALL 切換至完全免費的開權重模型（如 `nvidia/nemotron-3-super`）
