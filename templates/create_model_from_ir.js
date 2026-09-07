/*
 * create_model_from_ir.js — baut aus einem IR-JSON (Prosa-Parser-Output) ein EA-Repository.
 * Review-Fixes (EAP 07.09. & Sparx Doku Check): ZWEI-PHASEN-Build (erst alle Elemente, dann alle Connectors,
 * damit paketuebergreifende Beziehungen funktionieren), findConnector-Idempotenz,
 * setTaggedValue statt AddNew-Duplikaten, BatchAppend vor Connector-Phase deaktiviert,
 * pkg.Element.Update() fuer Paket-Stereotype.
 * Ausfuehrung: EA-Scripting-Fenster (JavaScript).
 */

var IR = {
    modelName: "ADMBw-Architektur",
    packages: [
        {
            name: "C1 - Capability Taxonomy",
            stereo: "ArchitecturalDescription",
            elements: [
                { name: "Weltraumaufklärung",   type: "Class", stereo: "Capability", tags: { MoE: "bewertet" } },
                { name: "Sensornetz",           type: "Class", stereo: "Capability" }
            ],
            connectors: [
                { from: "Sensornetz", to: "Weltraumaufklärung", meta: "Generalization", stereo: "CapabilityGeneralization" }
            ]
        }
    ]
};

function log(msg) { Session.Output(msg); }

function findElement(pkg, name) {
    for (var i = 0; i < pkg.Elements.Count; i++) {
        var e = pkg.Elements.GetAt(i);
        if (e.Name === name) return e;
    }
    return null;
}

function addPackage(parentPkg, name, stereo) {
    for (var i = 0; i < parentPkg.Packages.Count; i++) {
        var p = parentPkg.Packages.GetAt(i);
        if (p.Name === name) return p;
    }
    var pkg = parentPkg.Packages.AddNew(name, "");
    if (!pkg.Update()) { log("PKG FEHLER " + name + ": " + pkg.GetLastError()); return null; }
    parentPkg.Packages.Refresh();
    if (stereo) {
        // Offizielle Sparx EA API: Paket-Stereotyp liegt am zugehoerigen Element!
        pkg.Element.StereotypeEx = stereo;
        if (!pkg.Element.Update()) { log("PKG EL FEHLER " + name + ": " + pkg.Element.GetLastError()); }
    }
    return pkg;
}

function setTaggedValue(el, name, value) {
    var tv = null;
    for (var i = 0; i < el.TaggedValues.Count; i++) {
        var t = el.TaggedValues.GetAt(i);
        if (t.Name === name) { tv = t; break; }
    }
    if (!tv) { tv = el.TaggedValues.AddNew(name, ""); }
    tv.Value = String(value);
    tv.Update();
    el.TaggedValues.Refresh();
}

function addElement(pkg, spec) {
    var el = findElement(pkg, spec.name);
    if (el) return el;
    el = pkg.Elements.AddNew(spec.name, spec.type);
    if (!el.Update()) { log("EL FEHLER " + spec.name + ": " + el.GetLastError()); return null; }
    if (spec.stereo) { el.StereotypeEx = spec.stereo; el.Update(); }
    if (spec.tags) {
        for (var k in spec.tags) { setTaggedValue(el, k, spec.tags[k]); }
    }
    pkg.Elements.Refresh();
    return el;
}

function findConnector(src, tgt, metaType, stereo) {
    for (var i = 0; i < src.Connectors.Count; i++) {
        var c = src.Connectors.GetAt(i);
        if (c.SupplierID === tgt.ElementID && c.Type === metaType) {
            if (!stereo || (c.Stereotype || '') === stereo || (c.StereotypeEx || '').indexOf(stereo) !== -1) {
                return c;
            }
        }
    }
    return null;
}

function addConnector(src, tgt, metaType, stereo) {
    if (!src || !tgt) { log("CON FEHLER (unbekanntes Element): " + metaType); return null; }
    var existing = findConnector(src, tgt, metaType, stereo);
    if (existing) { log("Connector existiert, übersprungen: " + metaType); return existing; }
    var con = src.Connectors.AddNew("", metaType);
    con.SupplierID = tgt.ElementID;
    if (stereo) con.StereotypeEx = stereo;
    if (!con.Update()) { log("CON FEHLER: " + con.GetLastError()); return null; }
    src.Connectors.Refresh();
    return con;
}

function main() {
    Session.Output("=== BUILD START ===");
    var built = { elements: 0, connectors: 0, packages: 0 };
    Repository.BatchAppend = true;
    Repository.EnableUIUpdates = false;
    var allElements = {};
    try {
        // Modell suchen/anlegen
        var model = null;
        for (var i = 0; i < Repository.Models.Count; i++) {
            if (Repository.Models.GetAt(i).Name === IR.modelName) { model = Repository.Models.GetAt(i); break; }
        }
        if (!model) {
            model = Repository.Models.AddNew(IR.modelName, "");
            model.Update();
            Repository.Models.Refresh();
        }

        // PHASE 1: Pakete + Elemente (ElementID-Referenzen müssen vor Connectors stehen)
        for (var p = 0; p < IR.packages.length; p++) {
            var pspec = IR.packages[p];
            var pkg = addPackage(model, pspec.name, pspec.stereo);
            if (!pkg) continue;
            built.packages++;
            for (var e = 0; e < pspec.elements.length; e++) {
                var el = addElement(pkg, pspec.elements[e]);
                if (el) { allElements[pspec.elements[e].name] = el; built.elements++; }
            }
        }

        // PHASE 2: Connectors (BatchAppend aus, damit ElementIDs garantiert final sind)
        Repository.BatchAppend = false;
        for (var p2 = 0; p2 < IR.packages.length; p2++) {
            var pspec2 = IR.packages[p2];
            if (!pspec2.connectors) continue;
            for (var c = 0; c < pspec2.connectors.length; c++) {
                var cs = pspec2.connectors[c];
                if (addConnector(allElements[cs.from], allElements[cs.to], cs.meta, cs.stereo)) built.connectors++;
            }
        }
    } catch (ex) {
        Session.Output("EXCEPTION: " + ex);
    } finally {
        Repository.BatchAppend = false;
        Repository.EnableUIUpdates = true;
    }
    Session.Output("=== BUILD ENDE: " + built.packages + " Pakete, " + built.elements + " Elemente, " + built.connectors + " Connectors ===");
    Session.Output("ACHTUNG: Re-Read mit verify_model.js — nie dem Build-Log allein vertrauen!");
}

main();
