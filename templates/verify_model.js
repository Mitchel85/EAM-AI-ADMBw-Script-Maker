/*
 * verify_model.js — Re-Read-Verifikation nach jedem Write.
 * Review-Fix (EAP 07.09.): SQLQuery-XML-Parsing robust (EA liefert <row>-Blocks mit
 * Spaltenalias-Tags, KEIN <Value>), Subquery-Alias für Access/PostgreSQL.
 * Prüft: Zählungen je Stereotyp/Connector-Typ, Referenzintegrität, Diagramme.
 */

function sqlNumber(sql) {
    var res = Repository.SQLQuery(sql);
    // EA-Format: <dataset><rows><row><ALIAS>wert</ALIAS>...</row></rows></dataset>
    // 1. Versuch: erste Zahl in einem XML-Tag-Paar
    var m = res.match(/>\d+<\/[A-Za-z0-9_]+>/i);
    if (m) { var n = parseInt(m[0].replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; }
    // 2. Versuch: generisch erste Zahl zwischen > und <
    m = res.match(/>\s*(\d+)\s*</);
    if (m) return parseInt(m[1], 10);
    // 3. Fallback: Zeilenzählung über Zeilentrenner
    return Math.max(0, res.split('-1-').length - 1);
}

function main() {
    Session.Output("=== VERIFY START ===");
    var checks = [];

    // 1) Zählungen je Stereotyp (Beispiele — an Auftrag anpassen)
    var stereoChecks = ["Capability", "OperationalActivity", "ServiceSpecification", "BWRequirement"];
    for (var i = 0; i < stereoChecks.length; i++) {
        var s = stereoChecks[i];
        checks.push(["Elemente «" + s + "»", sqlNumber("SELECT COUNT(*) AS C FROM t_object WHERE Stereotype = '" + s + "'")]);
    }

    // 2) Connector-Zählung je MetaTyp
    var conTypes = ["Generalization", "Dependency", "Association", "Abstraction", "Realisation", "InformationFlow"];
    for (var j = 0; j < conTypes.length; j++) {
        var ct = conTypes[j];
        var cn = sqlNumber("SELECT COUNT(*) AS C FROM t_connector WHERE Connector_Type = '" + ct + "'");
        if (cn > 0) checks.push(["Connectors " + ct, cn]);
    }

    // 3) Referenzintegrität: Connectors mit fehlendem Start/End (SOLL 0)
    checks.push(["Connectors mit ungültigen Endpunkten (SOLL 0)",
        sqlNumber("SELECT COUNT(*) AS C FROM t_connector WHERE Start_Object_ID NOT IN (SELECT Object_ID FROM t_object) OR End_Object_ID NOT IN (SELECT Object_ID FROM t_object)")]);

    // 4) Duplikat-GUIDs (SOLL 0) — Subquery braucht Alias für Access/PostgreSQL
    checks.push(["Doppelte GUIDs (SOLL 0)",
        sqlNumber("SELECT COUNT(*) AS C FROM (SELECT ea_guid FROM t_object GROUP BY ea_guid HAVING COUNT(*) > 1) AS DupTable")]);

    // 5) Diagramme
    checks.push(["Diagramme gesamt", sqlNumber("SELECT COUNT(*) AS C FROM t_diagram")]);

    Session.Output("--- VERIFY REPORT ---");
    for (var k = 0; k < checks.length; k++) {
        var ok = /SOLL 0/.test(checks[k][0]) ? (checks[k][1] === 0) : true;
        Session.Output((ok ? "OK  " : "!!  ") + checks[k][0] + ": " + checks[k][1]);
    }
    Session.Output("=== VERIFY ENDE ===");
}

main();
