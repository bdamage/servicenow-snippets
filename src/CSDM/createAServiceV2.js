/**
 * ============================================================
 * CSDM-ALIGNED SERVICE POPULATION SCRIPT
 * ServiceNow Background Script
 * ============================================================
 * Purpose : Creates a fully wired demo service following CSDM
 *           best practices — Business App → Application Service
 *           → Technical Service → Service Offering → SLAs →
 *           CMDB CIs → Relationships → Catalog Item
 *
 * Run in  : System Definition > Scripts - Background
 * Release : Yokohama / Xanadu / Washington / Australia
 * Author  : Demo / Presales Engineering
 * ============================================================
 *
 * WHAT THIS SCRIPT CREATES
 * ─────────────────────────
 *  [1] Business Application CI        (cmdb_ci_business_app)
 *  [2] Application Service CI         (cmdb_ci_service_auto)      ← links to Business App
 *  [3] Technical Service CI           (cmdb_ci_service_technical)  ← links to App Service
 *  [4] Service Offering               (service_offering)           ← child of Tech Service
 *  [5] SLA Definition – P1 (1 hr)     (contract_sla)
 *  [6] SLA Definition – P2 (4 hr)     (contract_sla)
 *  [7] SLA Definition – Resolution    (contract_sla)
 *  [8] Support Group                  (sys_user_group)
 *  [9] Service Owner = System Administrator (sys_user, looked up — not created)
 * [10] Server CI                      (cmdb_ci_server)             ← supports App Service
 * [11] Database CI                    (cmdb_ci_database)           ← supports App Service
 * [12] Network Switch CI              (cmdb_ci_ip_switch)          ← supports Server
 * [13] CI Relationships               (cmdb_rel_ci)                ← full dependency chain
 * [14] Catalog Category + Item        (sc_category / sc_cat_item)  ← category find-or-created
 * [15] Demo Incident batch           (incident)                   ← N incidents mapped to service (DPM stats)
 *
 * RE-RUNNABLE: every record is created via findOrCreate (match by name /
 * correlation_id), so re-running reuses existing records instead of duplicating.
 * Change CFG.serviceName to spin up an independent, fresh set.
 * ============================================================
 * ╔══════════════════════════════════════════════════════════════════════════════╗
║                    CSDM SERVICE ARCHITECTURE — OVERVIEW                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  LAYER 1 · CONCEPTUAL                                                        ║
║  ┌─────────────────────────────────────┐                                     ║
║  │       Business Application CI       │  cmdb_ci_business_app               ║
║  │     "Enterprise HR Portal – App"    │  Owned By: EHP Owner                ║
║  └──────────────────┬──────────────────┘                                     ║
║                     │ Owns::Owned by                                         ║
║  LAYER 2 · DESIGN   ▼                                                        ║
║  ┌─────────────────────────────────────┐                                     ║
║  │       Application Service CI        │  cmdb_ci_service_auto               ║
║  │   "Enterprise HR Portal – App Svc"  │  Oper. Status: Operational          ║
║  └──────────────────┬──────────────────┘                                     ║
║                     │ Depends on::Used by                                    ║
║  LAYER 3 · MANAGE TECHNICAL SERVICES   ▼                                     ║
║  ┌─────────────────────────────────────┐                                     ║
║  │        Technical Service CI         │  cmdb_ci_service                    ║
║  │       "Enterprise HR Portal"        │  Classification: Business Service   ║
║  └───┬──────────────┬──────────────────┘  Used For: Production               ║
║      │              │                                                         ║
║      ▼              ▼                                                         ║
║  ┌───────────┐  ┌───────────┐   SLA Definitions (contract_sla)               ║
║  │ Offering  │  │ Offering  │   ├─ P1 Response   · 1 hr  · priority=1        ║
║  │ Standard  │  │ Premium   │   ├─ P2 Response   · 4 hr  · priority=2        ║
║  │ Published │  │ Published │   └─ OLA Resolution · 8 hr · stop=Resolved     ║
║  └───────────┘  └───────────┘                                                ║
║      │                                                                        ║
║      ▼  Linked to                                                             ║
║  ┌─────────────────────────────────────┐                                     ║
║  │         Service Catalog Item        │  sc_cat_item                        ║
║  │    "Request Access to EH Portal"    │  service_offering → Standard        ║
║  └─────────────────────────────────────┘                                     ║
║                                                                              ║
║  LAYER 4 · MANAGE TECHNICAL INFRASTRUCTURE                                   ║
║                                                                              ║
║  [Technical Service]                                                         ║
║         │ Depends on::Used by                                                ║
║         ├──────────────────────┬───────────────────────────┐                ║
║         ▼                      ▼                            ▼                ║
║  ┌─────────────┐       ┌──────────────┐          ┌──────────────────┐       ║
║  │  Server CI  │       │ Database CI  │          │ Network Switch   │       ║
║  │cmdb_ci_serv │       │cmdb_ci_datab │          │ cmdb_ci_ip_switch│       ║
║  │EHP-APP-SRV-1│       │  EHP-DB-01   │          │ EHP-SW-CORE-01   │       ║
║  │RHEL9 · 32GB │       │PostgreSQL 15 │          │  10.10.1.1       │       ║
║  └──────┬──────┘       └──────────────┘          └──────────────────┘       ║
║         │ Runs on::Runs      ▲  Connected by::Connects ▲                    ║
║         └────────────────────┘                         │                    ║
║         └──────────────────────────────────────────────┘                    ║
║                                                                              ║
║  LAYER 5 · SERVICE OPERATIONS WORKSPACE (auto-populated)                     ║
║  ┌──────────────┬──────────────┬───────────────┬──────────────────────┐     ║
║  │Service Health│  SLA Timers  │Active Incidents│  Service Map / Topo  │     ║
║  │oper_status CI│ contract_sla │ incident.biz_  │     cmdb_rel_ci      │     ║
║  │   on CI      │  P1/P2/OLA   │    service     │  full dep. chain     │     ║
║  └──────────────┴──────────────┴───────────────┴──────────────────────┘     ║
║                                                                              ║
║  KEY RELATIONSHIPS (cmdb_rel_ci)                                             ║
║  BizApp  ──[Owns]──────────────────▶  Application Service                   ║
║  AppSvc  ──[Depends on]────────────▶  Technical Service                     ║
║  TechSvc ──[Depends on]────────────▶  Server CI                             ║
║  TechSvc ──[Depends on]────────────▶  Database CI                           ║
║  Server  ──[Runs on]───────────────▶  Database CI                           ║
║  Server  ──[Connected by]──────────▶  Network Switch CI                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ── CONFIG ──────────────────────────────────────────────────
var CFG = {
    serviceName: 'Enterprise HR Portal',
    servicePrefix: 'EHP',         // used in CI names
    environment: 'Production',
    company: 'Global Enterprises Inc',  // set to your demo company name
    domain: 'global',                  // leave 'global' if domain sep is off
    catalogCategory: 'IT Services',
    createTestIncident: true,
    incidentCount: 10,           // number of demo incidents to generate (for DPM stats)
    dryRun: true                 // true = simulate only, no records written
};
// ────────────────────────────────────────────────────────────

var log = [];
function out(msg) { log.push(msg); gs.print(msg); }

// Dry-run helper: returns a fake sys_id when CFG.dryRun is true,
// otherwise performs a real insert. Read-only queries are unaffected.
var dryRunCounter = 0;
function doInsert(gr, label) {
    if (CFG.dryRun) {
        dryRunCounter++;
        var fakeId = 'DRYRUN_' + gr.getTableName() + '_' + dryRunCounter;
        out('      [DRY RUN] Would insert into ' + gr.getTableName() + ' — ' + label);
        return fakeId;
    }
    return gr.insert();
}

// Find-or-create helper: makes the script re-runnable. Looks up a record by
// matchField=matchValue; if found, reuses its sys_id (no duplicate, no overwrite).
// Otherwise initializes a new record, sets the match field, runs the populate
// callback to set the remaining fields, and inserts it (respecting dry-run mode).
// Changing the names in CFG therefore produces a fresh set without touching the old.
function findOrCreate(table, matchField, matchValue, populate, label) {
    if (!CFG.dryRun) {
        var grFind = new GlideRecord(table);
        grFind.addQuery(matchField, matchValue);
        grFind.setLimit(1);
        grFind.query();
        if (grFind.next()) {
            out('      [EXISTS] ' + table + ' "' + matchValue + '" — reusing ' + grFind.getUniqueValue());
            return grFind.getUniqueValue();
        }
    }
    var gr = new GlideRecord(table);
    gr.initialize();
    gr.setValue(matchField, matchValue);
    if (populate) { populate(gr); }
    return doInsert(gr, label);
}

try {

    if (CFG.dryRun) {
        out('╔══════════════════════════════════════════════════════════════╗');
        out('║  DRY RUN MODE — no records will be written to the database  ║');
        out('╚══════════════════════════════════════════════════════════════╝');
    }

    // ── STEP 1: Support Group ──────────────────────────────────
    out('\n[1/15] Creating Support Group...');
    var groupSysId = findOrCreate('sys_user_group', 'name', CFG.servicePrefix + ' - Service Operations', function (gr) {
        gr.setValue('description', 'Operational support team for ' + CFG.serviceName);
        gr.setValue('type', 'itil');
        gr.setValue('active', true);
    }, 'Support Group');
    out('      Group sys_id: ' + groupSysId);

    // ── STEP 2: Service Owner = System Administrator (looked up, not created) ──
    out('\n[2/15] Resolving Service Owner (System Administrator)...');
    var grAdmin = new GlideRecord('sys_user');
    grAdmin.addQuery('user_name', 'admin');
    grAdmin.setLimit(1);
    grAdmin.query();
    if (!grAdmin.next()) {
        grAdmin = new GlideRecord('sys_user');
        grAdmin.addQuery('name', 'System Administrator');
        grAdmin.setLimit(1);
        grAdmin.query();
        grAdmin.next();
    }
    var ownerSysId = grAdmin.getUniqueValue();
    if (!ownerSysId) {
        throw new Error('Could not resolve System Administrator (user_name=admin / name="System Administrator"). Aborting so owner is never left blank.');
    }
    out('      Owner = System Administrator, sys_id: ' + ownerSysId);

    // ── STEP 3: Business Application CI ───────────────────────
    // CSDM Layer: Conceptual (Sell/Consume view)
    out('\n[3/15] Creating Business Application CI (CSDM Conceptual layer)...');
    var bizAppId = findOrCreate('cmdb_ci_business_app', 'name', CFG.serviceName + ' - Business App', function (gr) {
        gr.setValue('short_description', 'Business capability delivering ' + CFG.serviceName + ' to end users');
        gr.setValue('operational_status', '1');   // 1 = Operational
        gr.setValue('busines_criticality', '1');    // 1 = Critical
        gr.setValue('owned_by', ownerSysId);
        gr.setValue('support_group', groupSysId);
    }, 'Business Application');
    out('      Business App sys_id: ' + bizAppId);

    // ── STEP 4: Application Service CI ────────────────────────
    // CSDM Layer: Conceptual → Design (application-level view)
    out('\n[4/15] Creating Application Service CI (CSDM Design layer)...');
    var appSvcId = findOrCreate('cmdb_ci_service_auto', 'name', CFG.serviceName + ' - Application Service', function (gr) {
        gr.setValue('short_description', 'Application-level service for ' + CFG.serviceName);
        gr.setValue('operational_status', '1');
        gr.setValue('owned_by', ownerSysId);
        gr.setValue('support_group', groupSysId);
        gr.setValue('busines_criticality', '1');
    }, 'Application Service');
    out('      Application Service sys_id: ' + appSvcId);

    // ── STEP 5: Technical Service CI ──────────────────────────
    // CSDM Layer: Manage Technical Services
    out('\n[5/15] Creating Technical (Business) Service CI (CSDM Manage Technical Services layer)...');
    var techSvcId = findOrCreate('cmdb_ci_service', 'name', CFG.serviceName, function (gr) {
        gr.setValue('short_description', 'Primary IT service delivering ' + CFG.serviceName + ' capabilities');
        gr.setValue('operational_status', '1');
        gr.setValue('owned_by', ownerSysId);
        gr.setValue('support_group', groupSysId);
        gr.setValue('busines_criticality', '1');
        gr.setValue('used_for', 'Production');
        gr.setValue('service_classification', 'Business Service');
    }, 'Technical Service');
    out('      Technical Service sys_id: ' + techSvcId);

    // ── STEP 6: Service Offering ───────────────────────────────
    out('\n[6/15] Creating Service Offering (Standard tier)...');
    var offeringSysId = findOrCreate('service_offering', 'name', CFG.serviceName + ' - Standard', function (gr) {
        gr.setValue('description', 'Standard-tier offering with 99.5% availability SLA');
        gr.setValue('parent', techSvcId);
        gr.setValue('status', 'published');
        gr.setValue('billing_unit', 'monthly');
    }, 'Standard Service Offering');
    out('      Service Offering sys_id: ' + offeringSysId);

    // ── STEP 7: Premium Service Offering ──────────────────────
    out('\n[7/15] Creating Service Offering (Premium tier)...');
    var offeringPremId = findOrCreate('service_offering', 'name', CFG.serviceName + ' - Premium', function (gr) {
        gr.setValue('description', 'Premium-tier offering with 99.9% availability SLA and 24/7 support');
        gr.setValue('parent', techSvcId);
        gr.setValue('status', 'published');
        gr.setValue('billing_unit', 'monthly');
    }, 'Premium Service Offering');
    out('      Premium Offering sys_id: ' + offeringPremId);

    // ── STEP 8: SLA Definitions ────────────────────────────────
    out('\n[8/15] Creating SLA Definitions...');

    // P1 Response SLA
    var slaP1Id = findOrCreate('contract_sla', 'name', CFG.serviceName + ' - P1 Response SLA (1hr)', function (gr) {
        gr.setValue('type', 'SLA');
        gr.setValue('table', 'incident');
        gr.setValue('target_field', 'resolve_time');
        gr.setValue('duration_type', 'relative');
        gr.setValue('stage', 'In Progress');
        gr.setValue('active', true);
        gr.setValue('description', 'P1 incidents must be responded to within 1 hour');
        // Duration: 1 hour (D HH:MM:SS:mmm)
        gr.setValue('duration', '0 00:01:00:00');
        // Start condition: Priority = 1 Critical AND Service = this service
        gr.setValue('start_condition', 'priority=1^business_service=' + techSvcId);
        gr.setValue('pause_condition', 'state=3');  // pause on Hold
        gr.setValue('stop_condition', 'state=6');  // stop on Resolved
    }, 'P1 Response SLA');
    out('      P1 SLA sys_id: ' + slaP1Id);

    // P2 Response SLA
    var slaP2Id = findOrCreate('contract_sla', 'name', CFG.serviceName + ' - P2 Response SLA (4hr)', function (gr) {
        gr.setValue('type', 'SLA');
        gr.setValue('table', 'incident');
        gr.setValue('duration', '0 00:04:00:00');  // 4 hours
        gr.setValue('active', true);
        gr.setValue('start_condition', 'priority=2^business_service=' + techSvcId);
        gr.setValue('pause_condition', 'state=3');
        gr.setValue('stop_condition', 'state=6');
    }, 'P2 Response SLA');
    out('      P2 SLA sys_id: ' + slaP2Id);

    // Resolution SLA (P1+P2)
    var slaResId = findOrCreate('contract_sla', 'name', CFG.serviceName + ' - Resolution SLA (8hr P1 / 24hr P2)', function (gr) {
        gr.setValue('type', 'OLA');
        gr.setValue('table', 'incident');
        gr.setValue('duration', '0 00:08:00:00');  // 8 hours for P1 resolution
        gr.setValue('active', true);
        gr.setValue('start_condition', 'priority=1^business_service=' + techSvcId);
        gr.setValue('pause_condition', 'state=3');
        gr.setValue('stop_condition', 'state=6');
    }, 'Resolution SLA');
    out('      Resolution SLA sys_id: ' + slaResId);

    // ── STEP 9: Server CI ──────────────────────────────────────
    // CSDM Layer: Manage Technical Infrastructure
    out('\n[9/15] Creating Server CI (CSDM Manage Technical Infrastructure)...');
    var serverSysId = findOrCreate('cmdb_ci_server', 'name', CFG.servicePrefix + '-APP-SRV-01', function (gr) {
        gr.setValue('short_description', 'Primary application server for ' + CFG.serviceName);
        gr.setValue('operational_status', '1');
        gr.setValue('environment', 'Production');
        gr.setValue('ip_address', '10.10.1.101');
        gr.setValue('os', 'Red Hat Enterprise Linux 9');
        gr.setValue('cpu_count', '8');
        gr.setValue('ram', '32768');  // MB
        gr.setValue('support_group', groupSysId);
    }, 'Server CI');
    out('      Server sys_id: ' + serverSysId);

    // ── STEP 10: Database CI ───────────────────────────────────
    out('\n[10/15] Creating Database CI...');
    var dbSysId = findOrCreate('cmdb_ci_database', 'name', CFG.servicePrefix + '-DB-01', function (gr) {
        gr.setValue('short_description', 'Primary PostgreSQL database for ' + CFG.serviceName);
        gr.setValue('operational_status', '1');
        gr.setValue('type', 'PostgreSQL');
        gr.setValue('version', '15.4');
        gr.setValue('support_group', groupSysId);
    }, 'Database CI');
    out('      Database sys_id: ' + dbSysId);

    // ── STEP 11: Network Switch CI ─────────────────────────────
    out('\n[11/15] Creating Network Switch CI...');
    var switchSysId = findOrCreate('cmdb_ci_ip_switch', 'name', CFG.servicePrefix + '-SW-CORE-01', function (gr) {
        gr.setValue('short_description', 'Core network switch supporting ' + CFG.serviceName + ' infrastructure');
        gr.setValue('operational_status', '1');
        gr.setValue('ip_address', '10.10.1.1');
        gr.setValue('support_group', groupSysId);
    }, 'Network Switch CI');
    out('      Switch sys_id: ' + switchSysId);

    // ── STEP 12: CI Relationships ──────────────────────────────
    // CSDM requires explicit relationships between layers
    out('\n[12/15] Creating CI Relationships...');

    /**
     * Helper: create a cmdb_rel_ci relationship
     * @param {string} parent  - sys_id of the parent CI
     * @param {string} child   - sys_id of the child CI
     * @param {string} type    - relationship type name (cmdb_rel_type.name)
     */
    function createRelationship(parent, child, typeName) {
        // Look up relationship type
        var grType = new GlideRecord('cmdb_rel_type');
        grType.addQuery('name', typeName);
        grType.setLimit(1);
        grType.query();
        if (!grType.next()) {
            out('      WARN: Relationship type not found: ' + typeName + ' — skipping');
            return null;
        }
        var typeId = grType.getUniqueValue();
        // Idempotency: reuse an existing parent/child/type relationship if present
        if (!CFG.dryRun) {
            var grExisting = new GlideRecord('cmdb_rel_ci');
            grExisting.addQuery('parent', parent);
            grExisting.addQuery('child', child);
            grExisting.addQuery('type', typeId);
            grExisting.setLimit(1);
            grExisting.query();
            if (grExisting.next()) {
                out('      [EXISTS] Rel [' + typeName + ']: ' + grExisting.getUniqueValue());
                return grExisting.getUniqueValue();
            }
        }
        var grRel = new GlideRecord('cmdb_rel_ci');
        grRel.initialize();
        grRel.setValue('parent', parent);
        grRel.setValue('child', child);
        grRel.setValue('type', typeId);
        var relId = doInsert(grRel, 'Relationship ' + typeName);
        out('      Rel [' + typeName + ']: ' + relId);
        return relId;
    }

    // Business App → Application Service   (Owns::Owned by)
    createRelationship(bizAppId, appSvcId, 'Owns::Owned by');

    // Application Service → Technical Service  (Depends on::Used by)
    createRelationship(appSvcId, techSvcId, 'Depends on::Used by');

    // Technical Service → Server  (Depends on::Used by)
    createRelationship(techSvcId, serverSysId, 'Depends on::Used by');

    // Technical Service → Database  (Depends on::Used by)
    createRelationship(techSvcId, dbSysId, 'Depends on::Used by');

    // Server → Database  (Runs on::Runs)
    createRelationship(serverSysId, dbSysId, 'Runs on::Runs');

    // Server → Switch  (Connected by::Connects)
    createRelationship(serverSysId, switchSysId, 'Connected by::Connects');

    // ── STEP 13: Catalog Item ──────────────────────────────────
    out('\n[13/15] Creating Service Catalog Item...');

    // Resolve the default Service Catalog to attach the category to
    var catalogId = '';
    var grCatalog = new GlideRecord('sc_catalog');
    grCatalog.addQuery('title', 'Service Catalog');
    grCatalog.setLimit(1);
    grCatalog.query();
    if (grCatalog.next()) {
        catalogId = grCatalog.getUniqueValue();
    } else {
        // Fallback: first active catalog
        var grCatalogFallback = new GlideRecord('sc_catalog');
        grCatalogFallback.addQuery('active', true);
        grCatalogFallback.setLimit(1);
        grCatalogFallback.query();
        if (grCatalogFallback.next()) { catalogId = grCatalogFallback.getUniqueValue(); }
    }

    // Find-or-create the catalog category (was previously query-or-empty)
    var catId = findOrCreate('sc_category', 'title', CFG.catalogCategory, function (gr) {
        gr.setValue('description', 'Demo category for ' + CFG.serviceName + ' service offerings');
        gr.setValue('active', true);
        if (catalogId) { gr.setValue('sc_catalog', catalogId); }
    }, 'Catalog Category');
    out('      Catalog Category sys_id: ' + catId);

    var catItemId = findOrCreate('sc_cat_item', 'name', 'Request Access to ' + CFG.serviceName, function (gr) {
        gr.setValue('short_description', 'Request access to the ' + CFG.serviceName + ' service');
        gr.setValue('description', 'Use this item to request access to the ' + CFG.serviceName + ' service. Access will be provisioned within 1 business day.');
        gr.setValue('category', catId);
        gr.setValue('active', true);
        gr.setValue('availability', '1');  // Available on portal
        // Link the offering to the catalog item
        gr.setValue('service_offering', offeringSysId);
    }, 'Catalog Item');
    out('      Catalog Item sys_id: ' + catItemId);

    // ── STEP 14: Demo Incident batch (for DPM stats) ──────────
    // Generates a small, varied batch of incidents all mapped to the technical
    // service, so Digital Portfolio Management shows real "Opened Incidents" stats.
    // Each is idempotent via a unique correlation_id, so re-runs reuse rather than
    // multiply.
    var incidentCount = 0;
    if (CFG.createTestIncident) {
        out('\n[14/15] Generating ' + CFG.incidentCount + ' demo Incidents for DPM stats...');

        // ES5 variation arrays (Rhino-safe — no arrow fns / template literals)
        var INC_SYMPTOMS = [
            'Login page unresponsive',
            'Slow page load times reported',
            'Intermittent 500 errors on submit',
            'Password reset emails not arriving',
            'Reports failing to generate',
            'Search returns no results',
            'Mobile app cannot sync',
            'Session timeouts after a few minutes',
            'File uploads failing',
            'Dashboard widgets not rendering',
            'API integration returning timeouts',
            'Notifications not being delivered'
        ];
        var INC_DESC = [
            'Users are reporting inability to log into the ' + CFG.serviceName + ' portal. Affects users in the EMEA region.',
            'End users report degraded performance across the ' + CFG.serviceName + ' service since this morning.',
            'A subset of transactions in ' + CFG.serviceName + ' are failing intermittently. Under investigation.',
            'Automated workflow in ' + CFG.serviceName + ' is not completing as expected for affected users.'
        ];
        // priority / urgency / impact triples (1=High .. 3=Low) and state values
        var INC_PRIORITY = ['1', '2', '2', '3', '3'];
        var INC_STATES = ['1', '2', '2', '3', '6'];   // New, In Progress x2, On Hold, Resolved
        var INC_CATEGORY = ['software', 'hardware', 'network', 'inquiry'];

        for (var i = 1; i <= CFG.incidentCount; i++) {
            var corr = 'DPM_DEMO_' + CFG.servicePrefix + '_' + i;
            var stateVal = INC_STATES[i % INC_STATES.length];
            var prio = INC_PRIORITY[i % INC_PRIORITY.length];
            var incId = findOrCreate('incident', 'correlation_id', corr, function (gr) {
                gr.setValue('short_description', '[DEMO] ' + CFG.serviceName + ' #' + i + ' - ' + INC_SYMPTOMS[i % INC_SYMPTOMS.length]);
                gr.setValue('description', INC_DESC[i % INC_DESC.length]);
                gr.setValue('priority', prio);
                gr.setValue('urgency', prio);
                gr.setValue('impact', prio);
                gr.setValue('business_service', techSvcId);
                gr.setValue('service_offering', offeringSysId);
                gr.setValue('cmdb_ci', serverSysId);
                gr.setValue('assignment_group', groupSysId);
                gr.setValue('category', INC_CATEGORY[i % INC_CATEGORY.length]);
                gr.setValue('state', stateVal);
                // Stagger opened_at across the last two weeks so DPM time-series has spread
                var gdt = new GlideDateTime();
                gdt.addDaysLocalTime(-(i % 14));
                gr.setValue('opened_at', gdt.getValue());
            }, 'Demo Incident #' + i);
            incidentCount++;
            out('      Incident #' + i + ' [' + corr + ']: ' + incId);
        }
    }

    // ── STEP 15: Summary ──────────────────────────────────────
    out('\n[15/15] SUMMARY — ' + (CFG.dryRun
        ? 'DRY RUN complete (no records were written)'
        : 'All records created successfully'));
    out('────────────────────────────────────────────────');
    out('  Business Application  : ' + bizAppId);
    out('  Application Service   : ' + appSvcId);
    out('  Technical Service     : ' + techSvcId);
    out('  Service Offering (Std): ' + offeringSysId);
    out('  Service Offering (Prm): ' + offeringPremId);
    out('  SLA – P1 Response     : ' + slaP1Id);
    out('  SLA – P2 Response     : ' + slaP2Id);
    out('  SLA – Resolution      : ' + slaResId);
    out('  Support Group         : ' + groupSysId);
    out('  Service Owner         : System Administrator (' + ownerSysId + ')');
    out('  Server CI             : ' + serverSysId);
    out('  Database CI           : ' + dbSysId);
    out('  Network Switch CI     : ' + switchSysId);
    out('  Catalog Category      : ' + catId);
    out('  Catalog Item          : ' + catItemId);
    if (CFG.createTestIncident) {
        out('  Demo Incidents        : ' + incidentCount + ' created/reused (mapped to Technical Service)');
    }
    out('────────────────────────────────────────────────');
    out('Next steps:');
    out('  1. Open Service Ops Workspace and verify service appears in the service selector');
    out('  2. Navigate to the Technical Service CI and confirm the service map is populated');
    out('  3. Open Digital Portfolio Management → the application service → review the');
    out('     "Opened Incidents" insight to confirm the count reflects the generated batch');
    out('  4. Open a demo incident and verify SLA timers are firing');
    out('  5. Publish the Service Offering via Service Catalog > Offerings if not auto-published');
    out('  6. Safe to re-run: same names reuse records ([EXISTS]); change CFG.serviceName for a fresh set');

} catch (e) {
    gs.print('ERROR: ' + e.message);
    gs.print(e.stack);
}