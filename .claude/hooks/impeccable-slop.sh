#!/usr/bin/env bash
# IMPECCABLE anti-slop detector (PreToolUse hook).
#
# Corre el detector local de impeccable (`.claude/skills/impeccable/scripts/detect.mjs`, sin red, sin
# npx) sobre los archivos de UI cambiados cuando un commit/PR toca UI. Es la red de seguridad del gate
# VERIFY & POLISH para AI-slop (side-stripes, gradient text, glass decorativo, eyebrows por seccion,
# escala/typo plana, etc.): el skill /impeccable critique lo EVALUA en profundidad; este hook solo
# DETECTA lo grueso y AVISA. Es un AVISO, nunca un bloqueo: emite `systemMessage` + `additionalContext`
# y SIEMPRE termina en exit 0 (exit 2 bloquearia la tool, jamas lo hacemos).
#
# Dispara sobre `git commit` y `gh pr create`:
#  - git commit  -> avisa UNA vez por rama (stamp en .git/) para no ser ruidoso.
#  - gh pr create-> avisa siempre (es el momento de cierre).
#
# Senal de drift = se tocaron componentes/paginas (.tsx) o estilos (.css) en la rama (vs main) o staged,
# y el detector encuentra >=1 hit en ellos. Si falta node o el script, no-opea en silencio.

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

detector="$repo/.claude/skills/impeccable/scripts/detect.mjs"
[ -f "$detector" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ -z "$branch" ] && exit 0

changed="$(
  { git diff --name-only main...HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git diff --name-only 2>/dev/null
  } | sort -u
)"
[ -z "$changed" ] && exit 0

# Solo archivos de UI existentes (.tsx/.css) bajo src/{app,components}.
targets=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    src/app/*|src/components/*)
      case "$f" in
        *.tsx|*.css) [ -f "$repo/$f" ] && targets="$targets $repo/$f" ;;
      esac
      ;;
  esac
done <<EOF
$changed
EOF
[ -z "$targets" ] && exit 0

# Correr el detector (JSON). Si falla o devuelve vacio, no avisar.
hits="$(node "$detector" --json $targets 2>/dev/null)"
[ -z "$hits" ] && exit 0
printf '%s' "$hits" | grep -q '\[\s*\]' && exit 0   # "[]" => limpio
printf '%s' "$hits" | grep -q '{' || exit 0          # sin objetos => nada que reportar

# De-ruido en commit: una vez por rama.
stamp_dir="$repo/.git/impeccable-slop"
stamp="$stamp_dir/warned-$(printf '%s' "$branch" | tr '/' '_')"
if [ "$is_pr" -eq 0 ]; then
  [ -f "$stamp" ] && exit 0
  mkdir -p "$stamp_dir" 2>/dev/null && : > "$stamp" 2>/dev/null
fi

momento=$([ "$is_pr" -eq 1 ] && echo "Estas por abrir el PR" || echo "Estas commiteando")
msg="IMPECCABLE: $momento con UI que el detector marca como posible AI-slop. Corre /impeccable critique sobre la superficie tocada (o 'node .claude/skills/impeccable/scripts/detect.mjs <archivos>' para ver los hits) antes de cerrar VERIFY & POLISH."

printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' \
  "$msg" "$msg"
exit 0
