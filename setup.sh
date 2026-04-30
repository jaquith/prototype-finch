#!/bin/bash
# Restore builder-ui-kit tgz from git history if missing
if [ ! -f builder-ui-kit-1.0.0.tgz ]; then
  git show f409d3e:builder-ui-kit-1.0.0.tgz > builder-ui-kit-1.0.0.tgz 2>/dev/null || true
fi
pnpm install --no-frozen-lockfile
