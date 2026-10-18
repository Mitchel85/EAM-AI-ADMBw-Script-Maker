# Beispiel-Prosa → IR → EA-Skript (Testlauf für Sparx EA 17.x)

Diese Beispielkette dient als **Laufbeweis**: Sie zeigt die vollständige Pipeline
von einem Stück Architektur-Prosa bis zum fertigen, ausführbaren EA-Skript.

## 1 · Prosa (Eingabe für das LLM)

> Das Unternehmen betreibt ein Verteilzentrum in Hamburg und einen Kühlbereich in Hannover.
> Das Verteilzentrum ist verantwortlich für die Kühllogistik. Beide Standorte sind über
> die Lieferkette miteinander verbunden. Die Kühllogistik stellt das Serviceangebot
> „Temperaturgeführte Lieferung" bereit.

## 2 · IR-JSON (Ausgabe des LLM, Eingabe des Skripts)

Siehe [`ir_beispiel.json`](ir_beispiel.json).

## 3 · Fertiges EA-Skript

Siehe [`build_skript.js`](build_skript.js) — das ist `templates/create_model_from_ir.js`
mit eingebettetem IR-Beispiel.

## So prüfst du den Lauf (ca. 10 Minuten)

1. Sparx EA 17 öffnen (MDG NAFv4/ADMBw aktiv — einmal `Tools → MDG Technologies` prüfen).
2. `Tools → Scripting` (Gruppe **JavaScript**), neues Skript anlegen.
3. Inhalt von [`build_skript.js`](build_skript.js) einfügen, speichern.
4. Skript ausführen (Rechtsklick → `Run Script`).
5. `System Output → Script`-Tab: die Zeilen ab `=== BUILD START ===` bis `=== BUILD ENDE ===` kopieren.
6. Inhalt von [`../templates/verify_model.js`](../templates/verify_model.js) in ein zweites Skript einfügen und ausführen.
7. Den `--- VERIFY REPORT ---`-Block ebenfalls kopieren.

**Beide Ausgaben an Michael schicken** — sie werden als Laufprotokoll ins Repo aufgenommen
(`examples/laufprotokoll.md`). Sollwerte: 1 Paket, 3 Elemente, 2 Connectors, 0 Fehlerzeilen.
