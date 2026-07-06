<!-- Conventional Commits en el título (feat:, fix:, docs:, chore:…). Sin atribución de IA. -->

## Qué cambia
<!-- Resumen del cambio y por qué. Linkeá la spec: specs/NNN-… o el issue #NN -->

## Checklist
- [ ] Sigue la spec (`specs/NNN-…`) si es una feature
- [ ] Tests en verde (`pnpm test`)
- [ ] Sin secretos en el diff (la key va por `wrangler secret`, no en el repo)
- [ ] Security headers presentes en respuestas nuevas/modificadas
- [ ] Docs actualizadas si cambió comportamiento o config (DOCS-SYNC)
- [ ] Si toca UI: verificado en mobile 375px + desktop, claro/oscuro
