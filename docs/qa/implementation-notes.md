# 实现取舍与已知限制

以下保留本轮实现的全部关键取舍及影响，便于后续继续开发。

- Ruling: Repository has no HEAD, so native worktree cannot be based on a commit; user-approved escalation created codex/desktop-pet in this empty checkout. No other code exists to isolate. Cost if wrong: changes live in this checkout rather than a second checkout.

- Ruling: Keep task ledger and QA evidence in project scratch rather than commit-based task scripts, because repository started without commits and .git writes require separate approval. No automatic commit. Cost: progress is file-backed until user commits.

- Ruling: Browser plugin/skill is not available. Use Playwright Electron to validate the actual desktop app. CUA is available for native inspection. Cost: no Browser-plugin session playback.

- Ruling: Generate a visual concept, then implement its kitten in SVG as explicitly specified by the user-approved plan; use the existing approved product scope and reversible visual choices without a new approval checkpoint. Cost: the kitten's final visual styling may need adjustment after the user tries it.

- Final: fixed cancellation commit reporting — real Store delayed-save test RED→GREEN. Ruling: cancellation ends at reply-acceptance commit boundary; after that the saved reply reports success, never cancelled. Cost if wrong: users can no longer cancel the brief persistence phase; network waiting remains cancellable.

- Final: minor (deferred): an undecryptable credential must be removed via Settings before replacement. Workaround exists; opaque encrypted rollback/replacement deferred.

- Final: Ruling: Windows host, real-provider compatibility, physical monitor transitions, external-app native focus, signing and chat performance cannot be inferred from unit tests. Keep them explicitly unverified. Cost if wrong: prototype may still require platform/provider fixes before release.

- Ruling: Current Node 24.13 cannot run latest jsdom 30; selected jsdom 26.1 and pinned every direct dependency plus lockfile. Cost if wrong: test environment needs future upgrade independently of production Electron.

- Ruling: GitHub Electron binary source times out locally; explicit mirror installer uses package-bundled checksums. Cost if wrong: mirror availability affects setup; official-source setup remains available.

- Ruling: Interaction sounds are original local synthesized chirps (no bundled animal recording). Cost if wrong: sound realism may need an asset pass, default remains silent.

35 项自动测试和四条原生 Electron 流程已通过。双平台最终验收、真实 AI 服务和签名发行不属于已完成项。
