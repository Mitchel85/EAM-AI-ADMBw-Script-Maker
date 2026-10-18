# EAM-AI-ADMBw-Script-Maker — EA-Skripte für das ADMBw/NAFv4-Profil

> **Generiert und verifiziert JavaScript-Skripte für Sparx Enterprise Architect (EA 17.x), die ADMBw/NAFv4-konforme Architekturmodelle erzeugen.**

Kern des Repos sind die **EA-Skript-Vorlagen** (Builder + Verifikation). Die **Wissensbasis** (Stereotype, Topologie, Viewpoints) ist der Treibstoff für das LLM, das Prosa in die Skript-Eingabe (IR-JSON) übersetzt.

---

## Pipeline

```
  [Prosa-Architektur] ──(LLM + Wissensbasis)──▶ [IR-JSON] ──(create_model_from_ir.js)──▶ [Sparx EA Repository] ──(verify_model.js)──▶ [Zählungen & Integrität OK]
```

## Wissensbasis — automatisch aus der offiziellen MDG

Die Regeldateien in `references/` werden **nicht mehr von Hand gepflegt**, sondern vom
**[EAM-ADMBw-MDG-Parser](https://github.com/Mitchel85/EAM-ADMBw-MDG-Parser)** aus der offiziellen
MDG-Technologie der Bundeswehr erzeugt (Stand: 2026.05):

- `references/admbw-knowledge-stereotypes.md` — **443 eindeutige Stereotype** (Name, Metatype, Vererbung, AppliesTo)
- `references/admbw-knowledge-topology.md` — **203 Beziehungsregeln** (Metaconstraints: erlaubte Ziele/Quellen)
- `references/admbw-knowledge-viewpoints.md` — **53 Viewpoints** mit Properties
- `references/admbw-knowledge-tagtypes.md` — Tagged-Value-Definitionen mit Typeregeln
- `references/admbw-meta.md` — Version, Quelle, Extraktionszeitpunkt

**Bei MDG-Update:** Parser ausführen, Dateien kopieren, committen — fertig.

### Kern-Features

- **ADMBw & NAFv4 Konformität:** 317 Stereotype, 53 Viewpoints, strikte Topologie (`Source -> Connector -> Target`) und Metatyp-Mapping (Class, Object, Activity, Dependency, Abstraction, Generalization etc.).
- **EA 17.x JavaScript Engine:** ES5/JScript-kompatible Vorlagen mit automatischer Fehlerbehandlung, Logging via `Session.Output` und Paket-/Element-/Connector-Erstellung.
- **Idempotenz & 2-Phasen-Build:** Wiederholtes Ausführen erzeugt keine Dubletten. Phase 1 erstellt alle Elemente und Caches; Phase 2 knüpft Connectors paketübergreifend.
- **Automatisierte Verifikation:** `verify_model.js` liest das Repository via `Repository.SQLQuery` re-read-sicher aus, prüft Stereotypen-Zählungen, Referenzintegrität und GUID-Eindeutigkeit.

---

## 🤖 Nutzung in Chatbots & LLM-Plattformen (OpenWebUI, ChatGPT, Custom GPTs, Claude)

Dieses Repository ist so strukturiert, dass es direkt in **jede beliebige Chatbot- oder RAG-Umgebung** eingebunden werden kann — ohne zusätzliche Python-Laufzeitumgebung oder externe Server:

1. **Wissensbasis (RAG / Knowledge) einrichten:**
   - Erstelle in deiner Plattform (z. B. OpenWebUI Workspace → Knowledge, Custom GPT → Knowledge, Claude Project) eine neue Wissensbasis.
   - Lade die Dateien aus `references/` und `templates/` hoch.
2. **System Prompt / Anweisungen setzen:**
   - Nutze den Inhalt von `references/admbw-extractor-system-prompt.md` als System-Instruction oder Agenten-Prompt.
3. **Prosa eingeben & Skript ausführen:**
   - Gib deine Architektur-Prosa im Chat ein.
   - Das LLM erzeugt das fertige **JavaScript** für Sparx EA.
   - Kopiere den JS-Code in Sparx Enterprise Architect (`Tools` → `Scripting` → `JavaScript`) und führe ihn aus.

---

## 📁 Repository-Struktur

```
.
├── README.md                          # Dieses Dokument
├── SKILL.md                           # Hermes Agent Skill-Spezifikation & Prompting-Regeln
├── templates/                         # Ausführbare EA JavaScript-Vorlagen
│   ├── ea_jscript_skeleton.js         # ES5-Grundgerüst mit idempotenten Helper-Funktionen
│   ├── create_model_from_ir.js        # 2-Phasen-Modellbauer aus IR-JSON-Strukturen
│   └── verify_model.js                # Re-Read Verifikations-Skript (SQLQuery-Parsing)
└── references/                        # KI-Wissensbasis & API-Dokumentation
    ├── admbw-extractor-system-prompt.md # System-Prompt für Prosa -> IR Extraction
    ├── admbw-knowledge-stereotypes.md  # 317 ADMBw-Stereotype mit AppliesTo-Metatypen
    ├── admbw-knowledge-connectors.md   # Connector-Metatypen & zugeordnete Stereotype
    ├── admbw-knowledge-topology.md     # Topologie-Regeln (Erlaubte Beziehungen)
    ├── admbw-knowledge-viewpoints.md   # 53 NAFv4 Viewpoints
    ├── ea-api-reference.md            # Kondensiertes EA Object Model (364S PDF-Auszug)
    └── ea-code-recipes.md             # 7 praxiserprobte JS-Code-Rezepte
```

---

## 🛠️ Benutzung in Sparx Enterprise Architect

1. **EA-Scripting-Fenster öffnen:**  
   In Sparx EA 17: `Tools` → `Scripting` (oder `Specialize` → `Scripting`).
2. **Neues JavaScript-Skript anlegen:**  
   Gruppe `JavaScript` wählen → `New Script` → Code aus `templates/create_model_from_ir.js` (oder angepasst aus Prosa) einfügen.
3. **Skript ausführen:**  
   Rechtsklick auf das Skript → `Run Script`.
4. **Verifizieren:**  
   Code aus `templates/verify_model.js` ausführen und Ausgaben in `Session.Output` prüfen.

---

## ⚠️ Wichtige API-Regeln (Review-Geprüft)

1. **Paket-Stereotype:** Das Stereotyp eines Pakets liegt am zugehörigen Element → Aufruf von `pkg.Element.StereotypeEx = stereo` und danach `pkg.Element.Update()` (nicht `pkg.Update()`).
2. **SQLQuery XML-Parsing:** EA liefert `<row><ALIAS>wert</ALIAS></row>` ohne `<Value>`-Tags. Regex auf Tag-Inhalte anpassen.
3. **Tagged Values bei MDG:** MDG-Stereotypen erzeugen Tagged Values automatisch. Vorhandene Tags per Name suchen und `.Value` aktualisieren (kein blindes `AddNew`).
4. **BatchAppend:** `Repository.BatchAppend = true` vor der Connector-Phase deaktivieren, damit ElementIDs garantiert vergeben sind.

---

## 👤 Autor & Lizenz

- **Autor:** Michael Estel ([Mitchel85](https://github.com/Mitchel85))
- **Lizenz:** MIT License
