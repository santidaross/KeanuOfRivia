#!/usr/bin/env bash
# DOCS-SYNC drift detector (PreToolUse hook).
#
# Recuerda correr DOCS-SYNC cuando un commit/PR toca CÓDIGO sin tocar DOCUMENTACIÓN.
# Es un AVISO, nunca un bloqueo: emite `systemMessage` (al usuario) + `additionalContext`
# (al modelo) y SIEMPRE termina con exit 0 (exit 2 bloquearía la tool — jamás lo hacemos).
#
# Dispara sobre `git commit` y `gh pr create` (detectados en el comando que llega por stdin):
#  - git commit  → avisa UNA vez por rama (stamp en .git/) para no ser ruidoso entre commits.
#  - gh pr create→ avisa siempre (es el gate real de Definition of Done: "doc en el mismo PR").
#
# Señal de drift = se tocó código (src/, wrangler.toml) en la rama (vs main) o staged, y NO se
# tocó ninguna superficie de doc (docs/, specs/, .env.example, CLAUDE.md, constitución). Coarse
# a propósito: es un cinturón, no una prueba.

set +e  # nunca abortar con error: el hook debe poder terminar en exit 0 pase lo que pase

payload="$(cat)"

# ¿El comando es un commit o un PR? (grep crudo sobre el JSON; suficiente y robusto)
is_commit=0; is_pr=0
printf '%s' "$payload" | grep -q "git commit"   && is_commit=1
printf '%s' "$payload" | grep -q "gh pr create" && is_pr=1
if [ "$is_commit" -eq 0 ] && [ "$is_pr" -eq 0 ]; then
  exit 0  # no es un momento de cierre → no hacemos nada
fi

repo="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$repo" ] && exit 0
cd "$repo" 2>/dev/null || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ -z "$branch" ] && exit 0

# Archivos en juego: la rama vs main (commiteado) + staged + sin stagear. Dedup.
changed="$(
  { git diff --name-only main...HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git diff --name-only 2>/dev/null
  } | sort -u
)"
[ -z "$changed" ] && exit 0

code_changed=0
docs_changed=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    src/*|wrangler.toml) code_changed=1 ;;
  esac
  case "$f" in
    docs/*|specs/*|.specify/memory/constitution.md|CLAUDE.md|*.env.example) docs_changed=1 ;;
  esac
done <<EOF
$changed
EOF

# Sin drift si no hubo código, o si ya se tocó doc en la rama.
if [ "$code_changed" -eq 0 ] || [ "$docs_changed" -eq 1 ]; then
  exit 0
fi

# git commit: avisar una sola vez por rama (stamp); gh pr create: avisar siempre.
stamp_dir="$repo/.git/docs-sync"
stamp="$stamp_dir/warned-$(printf '%s' "$branch" | tr '/' '_')"
if [ "$is_pr" -eq 0 ]; then
  [ -f "$stamp" ] && exit 0
  mkdir -p "$stamp_dir" 2>/dev/null && : > "$stamp" 2>/dev/null
fi

momento=$([ "$is_pr" -eq 1 ] && echo "Estás por abrir el PR" || echo "Estás commiteando")
msg="DOCS-SYNC: $momento con cambios de código (src/ o wrangler.toml) sin tocar documentación (docs/, specs/, .env.example, CLAUDE.md). Si el comportamiento o la config cambió, corré /docs-sync antes de cerrar."

# JSON de salida (exit 0 = no bloquea): systemMessage al usuario, additionalContext al modelo.
printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' \
  "$msg" "$msg"
exit 0
