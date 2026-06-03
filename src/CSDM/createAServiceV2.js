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
 *  [9] Service Owner (user)           (sys_user)
 * [10] Server CI                      (cmdb_ci_server)             ← supports App Service
 * [11] Database CI                    (cmdb_ci_database)           ← supports App Service
 * [12] Network Switch CI              (cmdb_ci_ip_switch)          ← supports Server
 * [13] CI Relationships               (cmdb_rel_ci)                ← full dependency chain
 * [14] Catalog Item                   (sc_cat_item)                ← linked to Offering
 * [15] Service Now Incident Form mapping (task_ci)                 ← sample test incident
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

try {

    if (CFG.dryRun) {
        out('╔══════════════════════════════════════════════════════════════╗');
        out('║  DRY RUN MODE — no records will be written to the database  ║');
        out('╚══════════════════════════════════════════════════════════════╝');
    }

    // ── STEP 1: Support Group ──────────────────────────────────
    out('\n[1/15] Creating Support Group...');
    var grGroup = new GlideRecord('sys_user_group');
    grGroup.initialize();
    grGroup.setValue('name', CFG.servicePrefix + ' - Service Operations');
    grGroup.setValue('description', 'Operational support team for ' + CFG.serviceName);
    grGroup.setValue('type', 'itil');
    grGroup.setValue('active', true);
    var groupSysId = doInsert(grGroup, 'Support Group');
    out('      Group sys_id: ' + groupSysId);

    // ── STEP 2: Service Owner user ─────────────────────────────
    out('\n[2/15] Creating Service Owner user...');
    var grUser = new GlideRecord('sys_user');
    grUser.initialize();
    grUser.setValue('first_name', 'Demo');
    grUser.setValue('last_name', CFG.servicePrefix + ' Owner');
    grUser.setValue('user_name', (CFG.servicePrefix + '.owner').toLowerCase());
    grUser.setValue('email', (CFG.servicePrefix + '.owner@demo.com').toLowerCase());
    grUser.setValue('active', true);
    grUser.setValue('title', 'Service Owner');
    var userSysId = doInsert(grUser, 'Service Owner user');
    out('      User sys_id: ' + userSysId);

    // ── STEP 3: Business Application CI ───────────────────────
    // CSDM Layer: Conceptual (Sell/Consume view)
    out('\n[3/15] Creating Business Application CI (CSDM Conceptual layer)...');
    var grBizApp = new GlideRecord('cmdb_ci_business_app');
    grBizApp.initialize();
    grBizApp.setValue('name', CFG.serviceName + ' - Business App');
    grBizApp.setValue('short_description', 'Business capability delivering ' + CFG.serviceName + ' to end users');
    grBizApp.setValue('operational_status', '1');   // 1 = Operational
    grBizApp.setValue('busines_criticality', '1');    // 1 = Critical
    grBizApp.setValue('owned_by', userSysId);
    grBizApp.setValue('support_group', groupSysId);
    var bizAppId = doInsert(grBizApp, 'Business Application');
    out('      Business App sys_id: ' + bizAppId);

    // ── STEP 4: Application Service CI ────────────────────────
    // CSDM Layer: Conceptual → Design (application-level view)
    out('\n[4/15] Creating Application Service CI (CSDM Design layer)...');
    var grAppSvc = new GlideRecord('cmdb_ci_service_auto');
    grAppSvc.initialize();
    grAppSvc.setValue('name', CFG.serviceName + ' - Application Service');
    grAppSvc.setValue('short_description', 'Application-level service for ' + CFG.serviceName);
    grAppSvc.setValue('operational_status', '1');
    grAppSvc.setValue('owned_by', userSysId);
    grAppSvc.setValue('support_group', groupSysId);
    grAppSvc.setValue('busines_criticality', '1');
    var appSvcId = doInsert(grAppSvc, 'Application Service');
    out('      Application Service sys_id: ' + appSvcId);

    // ── STEP 5: Technical Service CI ──────────────────────────
    // CSDM Layer: Manage Technical Services
    out('\n[5/15] Creating Technical (Business) Service CI (CSDM Manage Technical Services layer)...');
    var grTechSvc = new GlideRecord('cmdb_ci_service');
    grTechSvc.initialize();
    grTechSvc.setValue('name', CFG.serviceName);
    grTechSvc.setValue('short_description', 'Primary IT service delivering ' + CFG.serviceName + ' capabilities');
    grTechSvc.setValue('operational_status', '1');
    grTechSvc.setValue('owned_by', userSysId);
    grTechSvc.setValue('support_group', groupSysId);
    grTechSvc.setValue('busines_criticality', '1');
    grTechSvc.setValue('used_for', 'Production');
    grTechSvc.setValue('service_classification', 'Business Service');
    var techSvcId = doInsert(grTechSvc, 'Technical Service');
    out('      Technical Service sys_id: ' + techSvcId);

    // ── STEP 6: Service Offering ───────────────────────────────
    out('\n[6/15] Creating Service Offering (Standard tier)...');
    var grOffer = new GlideRecord('service_offering');
    grOffer.initialize();
    grOffer.setValue('name', CFG.serviceName + ' - Standard');
    grOffer.setValue('description', 'Standard-tier offering with 99.5% availability SLA');
    grOffer.setValue('parent', techSvcId);
    grOffer.setValue('status', 'published');
    grOffer.setValue('billing_unit', 'monthly');
    var offeringSysId = doInsert(grOffer, 'Standard Service Offering');
    out('      Service Offering sys_id: ' + offeringSysId);

    // ── STEP 7: Premium Service Offering ──────────────────────
    out('\n[7/15] Creating Service Offering (Premium tier)...');
    var grOfferPrem = new GlideRecord('service_offering');
    grOfferPrem.initialize();
    grOfferPrem.setValue('name', CFG.serviceName + ' - Premium');
    grOfferPrem.setValue('description', 'Premium-tier offering with 99.9% availability SLA and 24/7 support');
    grOfferPrem.setValue('parent', techSvcId);
    grOfferPrem.setValue('status', 'published');
    grOfferPrem.setValue('billing_unit', 'monthly');
    var offeringPremId = doInsert(grOfferPrem, 'Premium Service Offering');
    out('      Premium Offering sys_id: ' + offeringPremId);

    // ── STEP 8: SLA Definitions ────────────────────────────────
    out('\n[8/15] Creating SLA Definitions...');

    // P1 Response SLA
    var grSlaP1 = new GlideRecord('contract_sla');
    grSlaP1.initialize();
    grSlaP1.setValue('name', CFG.serviceName + ' - P1 Response SLA (1hr)');
    grSlaP1.setValue('type', 'SLA');
    grSlaP1.setValue('table', 'incident');
    grSlaP1.setValue('target_field', 'resolve_time');
    grSlaP1.setValue('duration_type', 'relative');
    grSlaP1.setValue('stage', 'In Progress');
    grSlaP1.setValue('active', true);
    grSlaP1.setValue('description', 'P1 incidents must be responded to within 1 hour');
    // Duration: 1 hour
    grSlaP1.setValue('duration', '0 00:01:00:00');  // D HH:MM:SS:mmm → 1 hour
    // Start condition: Priority = 1 Critical AND Service = this service
    grSlaP1.setValue('start_condition',
        'priority=1^business_service=' + techSvcId);
    grSlaP1.setValue('pause_condition', 'state=3');  // pause on Hold
    grSlaP1.setValue('stop_condition', 'state=6');  // stop on Resolved
    var slaP1Id = doInsert(grSlaP1, 'P1 Response SLA');
    out('      P1 SLA sys_id: ' + slaP1Id);

    // P2 Response SLA
    var grSlaP2 = new GlideRecord('contract_sla');
    grSlaP2.initialize();
    grSlaP2.setValue('name', CFG.serviceName + ' - P2 Response SLA (4hr)');
    grSlaP2.setValue('type', 'SLA');
    grSlaP2.setValue('table', 'incident');
    grSlaP2.setValue('duration', '0 00:04:00:00');  // 4 hours
    grSlaP2.setValue('active', true);
    grSlaP2.setValue('start_condition', 'priority=2^business_service=' + techSvcId);
    grSlaP2.setValue('pause_condition', 'state=3');
    grSlaP2.setValue('stop_condition', 'state=6');
    var slaP2Id = doInsert(grSlaP2, 'P2 Response SLA');
    out('      P2 SLA sys_id: ' + slaP2Id);

    // Resolution SLA (P1+P2)
    var grSlaRes = new GlideRecord('contract_sla');
    grSlaRes.initialize();
    grSlaRes.setValue('name', CFG.serviceName + ' - Resolution SLA (8hr P1 / 24hr P2)');
    grSlaRes.setValue('type', 'OLA');
    grSlaRes.setValue('table', 'incident');
    grSlaRes.setValue('duration', '0 00:08:00:00');  // 8 hours for P1 resolution
    grSlaRes.setValue('active', true);
    grSlaRes.setValue('start_condition', 'priority=1^business_service=' + techSvcId);
    grSlaRes.setValue('pause_condition', 'state=3');
    grSlaRes.setValue('stop_condition', 'state=6');
    var slaResId = doInsert(grSlaRes, 'Resolution SLA');
    out('      Resolution SLA sys_id: ' + slaResId);

    // ── STEP 9: Server CI ──────────────────────────────────────
    // CSDM Layer: Manage Technical Infrastructure
    out('\n[9/15] Creating Server CI (CSDM Manage Technical Infrastructure)...');
    var grServer = new GlideRecord('cmdb_ci_server');
    grServer.initialize();
    grServer.setValue('name', CFG.servicePrefix + '-APP-SRV-01');
    grServer.setValue('short_description', 'Primary application server for ' + CFG.serviceName);
    grServer.setValue('operational_status', '1');
    grServer.setValue('environment', 'Production');
    grServer.setValue('ip_address', '10.10.1.101');
    grServer.setValue('os', 'Red Hat Enterprise Linux 9');
    grServer.setValue('cpu_count', '8');
    grServer.setValue('ram', '32768');  // MB
    grServer.setValue('support_group', groupSysId);
    var serverSysId = doInsert(grServer, 'Server CI');
    out('      Server sys_id: ' + serverSysId);

    // ── STEP 10: Database CI ───────────────────────────────────
    out('\n[10/15] Creating Database CI...');
    var grDb = new GlideRecord('cmdb_ci_database');
    grDb.initialize();
    grDb.setValue('name', CFG.servicePrefix + '-DB-01');
    grDb.setValue('short_description', 'Primary PostgreSQL database for ' + CFG.serviceName);
    grDb.setValue('operational_status', '1');
    grDb.setValue('type', 'PostgreSQL');
    grDb.setValue('version', '15.4');
    grDb.setValue('support_group', groupSysId);
    var dbSysId = doInsert(grDb, 'Database CI');
    out('      Database sys_id: ' + dbSysId);

    // ── STEP 11: Network Switch CI ─────────────────────────────
    out('\n[11/15] Creating Network Switch CI...');
    var grSwitch = new GlideRecord('cmdb_ci_ip_switch');
    grSwitch.initialize();
    grSwitch.setValue('name', CFG.servicePrefix + '-SW-CORE-01');
    grSwitch.setValue('short_description', 'Core network switch supporting ' + CFG.serviceName + ' infrastructure');
    grSwitch.setValue('operational_status', '1');
    grSwitch.setValue('ip_address', '10.10.1.1');
    grSwitch.setValue('support_group', groupSysId);
    var switchSysId = doInsert(grSwitch, 'Network Switch CI');
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
        var grRel = new GlideRecord('cmdb_rel_ci');
        grRel.initialize();
        grRel.setValue('parent', parent);
        grRel.setValue('child', child);
        grRel.setValue('type', grType.getUniqueValue());
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

    // Find catalog category
    var grCat = new GlideRecord('sc_category');
    grCat.addQuery('title', CFG.catalogCategory);
    grCat.setLimit(1);
    grCat.query();
    var catId = grCat.next() ? grCat.getUniqueValue() : '';

    var grCatItem = new GlideRecord('sc_cat_item');
    grCatItem.initialize();
    grCatItem.setValue('name', 'Request Access to ' + CFG.serviceName);
    grCatItem.setValue('short_description', 'Request access to the ' + CFG.serviceName + ' service');
    grCatItem.setValue('description', 'Use this item to request access to the ' + CFG.serviceName + ' service. Access will be provisioned within 1 business day.');
    grCatItem.setValue('category', catId);
    grCatItem.setValue('active', true);
    grCatItem.setValue('availability', '1');  // Available on portal
    grCatItem.setValue('delivery_plan', '');
    // Link the offering to the catalog item
    grCatItem.setValue('service_offering', offeringSysId);
    var catItemId = doInsert(grCatItem, 'Catalog Item');
    out('      Catalog Item sys_id: ' + catItemId);

    // ── STEP 14: Test Incident (optional) ─────────────────────
    if (CFG.createTestIncident) {
        out('\n[14/15] Creating sample Incident to validate service mapping...');
        var grInc = new GlideRecord('incident');
        grInc.initialize();
        grInc.setValue('short_description', '[DEMO] ' + CFG.serviceName + ' - Login page unresponsive');
        grInc.setValue('description', 'Users are reporting inability to log into the ' + CFG.serviceName + ' portal. Affects all users in EMEA region.');
        grInc.setValue('priority', '1');  // Critical
        grInc.setValue('urgency', '1');
        grInc.setValue('impact', '1');
        grInc.setValue('business_service', techSvcId);
        grInc.setValue('service_offering', offeringSysId);
        grInc.setValue('cmdb_ci', serverSysId);
        grInc.setValue('assignment_group', groupSysId);
        grInc.setValue('category', 'software');
        grInc.setValue('state', '1');  // New
        var incId = doInsert(grInc, 'Sample Incident');
        out('      Sample Incident sys_id: ' + incId);
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
    out('  Service Owner User    : ' + userSysId);
    out('  Server CI             : ' + serverSysId);
    out('  Database CI           : ' + dbSysId);
    out('  Network Switch CI     : ' + switchSysId);
    out('  Catalog Item          : ' + catItemId);
    if (CFG.createTestIncident) {
        out('  Sample Incident       : ' + incId);
    }
    out('────────────────────────────────────────────────');
    out('Next steps:');
    out('  1. Open Service Ops Workspace and verify service appears in the service selector');
    out('  2. Navigate to the Technical Service CI and confirm the service map is populated');
    out('  3. Open the sample incident and verify SLA timers are firing');
    out('  4. Assign IT Service Owner role to the demo user created above');
    out('  5. Publish the Service Offering via Service Catalog > Offerings if not auto-published');

} catch (e) {
    gs.print('ERROR: ' + e.message);
    gs.print(e.stack);
}