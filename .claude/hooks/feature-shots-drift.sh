#!/usr/bin/env bash
# FEATURE-SHOTS drift detector (PreToolUse hook).
#
# Recuerda guardar la MATRIZ de screenshots de Playwright de la feature (mobile/desktop x claro/oscuro
# x estados) cuando un commit/PR toca UI sin que haya screenshots de la feature. Es la red de seguridad
# del paso obligatorio de VERIFY & POLISH (el skill /feature-shots lo CAPTURA; este hook solo DETECTA).
# Es un AVISO, nunca un bloqueo: emite `systemMessage` + `additionalContext` y SIEMPRE termina en exit 0
# (exit 2 bloquearia la tool, jamas lo hacemos).
#
# Dispara sobre `git commit` y `gh pr create`:
#  - git commit  -> avisa UNA vez por rama (stamp en .git/) para no ser ruidoso.
#  - gh pr create-> avisa siempre (es el momento de cierre: la feature deberia traer sus screenshots).
#
# Senal de drift = se toco UI (src/app, src/components) en la rama (vs main) o staged, y NO se toco
# ninguna screenshot de feature (specs/*/screenshots/). Coarse a proposito: es un cinturon.

set +e  # nunca abortar con error

payload="$(cat)"

is_commit=0; is_pr=0
printf '%s' "$payload" | grep -q "git commit"   && is_commit=1
printf '%s' "$payload" | grep -q "gh pr create" && is_pr=1
if [ "$is_commit" -eq 0 ] && [ "$is_pr" -eq 0 ]; then
  exit 0
fi

repo="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$repo" ] && exit 0
cd "$repo" 2>/dev/null || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ -z "$branch" ] && exit 0

changed="$(
  { git diff --name-only main...HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git diff --name-only 2>/dev/null
  } | sort -u
)"
[ -z "$changed" ] && exit 0

ui_changed=0
shots_changed=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    src/app/*|src/components/*|src/index.js) ui_changed=1 ;;
  esac
  case "$f" in
    specs/*/screenshots/*) shots_changed=1 ;;
  esac
done <<EOF
$changed
EOF

# Sin drift si no hubo UI, o si ya hay screenshots de feature en la rama.
if [ "$ui_changed" -eq 0 ] || [ "$shots_changed" -eq 1 ]; then
  exit 0
fi

stamp_dir="$repo/.git/feature-shots"
stamp="$stamp_dir/warned-$(printf '%s' "$branch" | tr '/' '_')"
if [ "$is_pr" -eq 0 ]; then
  [ -f "$stamp" ] && exit 0
  mkdir -p "$stamp_dir" 2>/dev/null && : > "$stamp" 2>/dev/null
fi

momento=$([ "$is_pr" -eq 1 ] && echo "Estas por abrir el PR" || echo "Estas commiteando")
msg="FEATURE-SHOTS: $momento con cambios de UI sin screenshots de la feature. En VERIFY & POLISH corre /feature-shots para guardar la matriz (mobile 375 + desktop x claro/oscuro x estados) en specs/NNN/screenshots/."

printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' \
  "$msg" "$msg"
exit 0
