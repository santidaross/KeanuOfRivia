# PRODUCT.md — KeanuOfRivia Website

## Qué es
La web personal de Keanu Of Rivia: una landing tipo "link-in-bio" que centraliza los enlaces
públicos (server de Minecraft, Steam, Buy Me A Coffee) y muestra el estado en vivo del server de
Minecraft. Corre como Cloudflare Worker.

## Para quién
Visitantes que llegan buscando los enlaces del creador y quieren ver si el server de Minecraft está
online antes de conectarse.

## Objetivos
- Cargar rápido desde el edge, en cualquier dispositivo (mobile-first).
- Mostrar los enlaces siempre, aunque un servicio externo (mcstatus.io) falle (degradar con gracia).
- Permitir editar la configuración (título, descripción, enlaces) vía una API admin protegida, sin
  redeploy.

## No-objetivos
- No es una app con cuentas de usuario ni base de datos relacional.
- No busca ser un CMS general: la config es un JSON simple en KV.

## Principios
- Simplicidad sobre features. Cero secretos en el repo. Seguridad por defecto (headers, auth en admin).
