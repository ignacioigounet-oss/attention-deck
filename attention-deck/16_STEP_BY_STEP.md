# IMPLEMENTACIÓN PASO A PASO CON FABLE 5.1

## Antes de empezar
1. Crear repositorio `attention-deck`.
2. Descomprimir este paquete dentro del repo.
3. Abrir Fable 5.1 en Claude Code / entorno de coding elegido.
4. Conservar los archivos de especificación en el repo.

## SESIÓN 1
Pegar el Prompt 1 de `15_FABLE_FIRST_PROMPTS.md`.
No pedir código todavía.

## SESIÓN 2
Si el análisis es correcto, pedir Phase 1.
Revisar tests, typecheck, lint y build.

## SESIÓN 3
Ejecutar Review Gate antes de continuar.

## SESIONES 4–10
Repetir el patrón: una fase → validación → review gate.

Orden:
Foundation → Project OS → Attention → Behavior → Habits → Memory → Calendar → Chief of Staff → Voice → Daily/Weekly → Visual → Hardening.

## REGLA PARA NO QUEMAR CONTEXTO
Cuando una fase termine correctamente, no continuar automáticamente con la siguiente en la misma instrucción. Abrir un nuevo turno con el objetivo de la nueva fase y revisar primero el estado del repo.

## REGLA DE PRODUCTO
Si Fable propone una feature nueva, preguntar: ¿protege atención, reduce fricción, sostiene un proyecto, mejora memoria o mejora el calendario? Si no, no entra en MVP.

## PRIMERA VERTICAL SLICE RECOMENDADA
Antes de integrar voz y Calendar, conseguir que esto funcione end-to-end:
Dashboard → Attention State → Primary Project → Today's Directive → conversational activation strategy → 10-minute focus timer → record outcome.

No llamar “Ugly Start” a un modo visible obligatorio. Puede aparecer como lenguaje del asistente cuando corresponda.
