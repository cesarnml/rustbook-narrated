#!/bin/bash
# Runs narrate.mjs for the whole book, unattended, with two publish points:
# one checkpoint commit+push after ~8h (whatever pages are done by then),
# and a final commit+push once narrate.mjs actually finishes (or is judged
# stalled). Safe to run concurrently with nothing else touching public/audio.
set -uo pipefail
cd "$(dirname "$0")/.."

LOG=/tmp/rustbook-overnight.log
CHECKPOINT_SECS=$((8 * 3600))
START=$(date +%s)

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

publish() {
  local label="$1"
  log "publish($label): building site to pick up new audio..."
  if ! npm run build >>"$LOG" 2>&1; then
    log "publish($label): BUILD FAILED — skipping this publish, narration continues"
    return 1
  fi
  git add public/audio
  if git diff --cached --quiet; then
    log "publish($label): nothing new to commit"
    return 0
  fi
  local n
  n=$(git diff --cached --name-only | grep -c '\.mp3$' || true)
  git commit -m "Narrate: publish overnight progress ($label, $n chapter(s) audio)

Unattended run via scripts/overnight-run.sh. See /tmp/rustbook-overnight.log
on the Mac for full progress." >>"$LOG" 2>&1
  if git push >>"$LOG" 2>&1; then
    log "publish($label): pushed $n chapter(s)"
  else
    log "publish($label): PUSH FAILED — will retry at next checkpoint"
  fi
}

log "=== overnight run starting, checkpoint at 8h ==="
node scripts/narrate.mjs >>"$LOG" 2>&1 &
NARRATE_PID=$!
log "narrate.mjs pid=$NARRATE_PID"

checkpointed=0
while kill -0 "$NARRATE_PID" 2>/dev/null; do
  sleep 300
  elapsed=$(( $(date +%s) - START ))
  if [ "$checkpointed" -eq 0 ] && [ "$elapsed" -ge "$CHECKPOINT_SECS" ]; then
    log "8h elapsed (${elapsed}s) — checkpoint publish"
    publish "8h-checkpoint"
    checkpointed=1
  fi
done

wait "$NARRATE_PID"
NARRATE_EXIT=$?
log "narrate.mjs exited with code $NARRATE_EXIT"
publish "final"
log "=== overnight run done, total $(( ($(date +%s) - START) / 60 )) min ==="
