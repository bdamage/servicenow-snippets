/**
 * CSDM Service Generator — Config-Driven
 *
 * Edit the CONFIG block below and run as a Background Script.
 * Re-run with different CONFIG values to generate additional services.
 *
 * Foundation (Capabilities + Tech Mgmt Service) is idempotent — safe to re-run.
 * Per-service records (Business App, Service, Offerings, Instances, CIs) are
 * created/updated by name (upsert), so changing names creates new records.
 *
 * Compatible with v4/v5 CSDM model. ES5/Rhino-safe (no ES6+ syntax).
 */

(function () {
    'use strict';

    // ============================================================================
    // CONFIG — Edit these to generate a service. Re-run to add more.
    // ============================================================================

    var CONFIG = {

        // ------ SHARED FOUNDATION (created once, reused across runs) ------

        COMPANY: 'Neat Corp',

        // Business capabilities — the full library. Upserted on every run.
        CAPABILITIES: [
            { name: 'Customer Onboarding',  description: 'End-to-end customer onboarding and account setup' },
            { name: 'Order Management',     description: 'Order processing, fulfillment, and tracking' },
            { name: 'Billing & Payments',   description: 'Invoice generation, payment processing, and revenue recognition' },
            { name: 'Customer Support',     description: 'Customer service, ticketing, and issue resolution' }
        ],

        // Shared technology platform (PostgreSQL service + offerings)
        TECH_SERVICE_NAME:        'Managed PostgreSQL',
        TECH_SERVICE_DESC:        'Managed PostgreSQL database service',
        TECH_OFFERING_PROD:       'PostgreSQL – Production (HA)',
        TECH_OFFERING_PROD_DESC:  'High-availability production PostgreSQL with auto-failover',
        TECH_OFFERING_NONPROD:    'PostgreSQL – Non-Prod (Standard)',
        TECH_OFFERING_NONPROD_DESC: 'Standard PostgreSQL for development and testing',

        // ------ THIS SERVICE — change these per run ------

        // Must match one of CAPABILITIES.name above
        LINKED_CAPABILITY: 'Customer Onboarding',

        // Business Application (the product)
        BUSINESS_APP_NAME: 'Neat Customer Portal',
        BUSINESS_APP_DESC: 'Self-service portal for customer account management and orders',

        // Business Service (customer-facing service)
        BUSINESS_SERVICE_NAME: 'Neat Customer Portal',
        BUSINESS_SERVICE_DESC: 'Business service for customer self-service portal',

        // Service Offerings (tiers/SKUs of the business service)
        OFFERING_A_NAME: 'Customer Portal – Standard',
        OFFERING_A_DESC: 'Standard self-service portal access with basic features',
        OFFERING_B_NAME: 'Customer Portal – Premium',
        OFFERING_B_DESC: 'Premium portal access with advanced features and priority support',

        // Application Service Instances (one per environment)
        CREATE_UAT: true,                                         // set false to skip UAT
        PROD_NAME: 'Portal – PROD',
        PROD_DESC: 'Production instance of customer portal',
        UAT_NAME:  'Portal – UAT',
        UAT_DESC:  'UAT instance of customer portal',

        // Underpinning CIs (set name to '' to skip a CI)
        CI_LB_NAME:  'Portal Load Balancer',
        CI_LB_DESC:  'Load balancer for portal web tier',
        CI_WEB_NAME: 'Portal Web Cluster PROD',
        CI_WEB_DESC: 'Web tier cluster for customer portal',
        CI_API_NAME: 'Portal API Gateway',
        CI_API_DESC: 'API gateway for portal backend services',
        CI_DB_NAME:  'Portal DB Instance',
        CI_DB_DESC:  'PostgreSQL database for portal'
    };

    // ----------------------------------------------------------------------------
    // Alternative presets — copy one over the per-service block above to switch.
    // ----------------------------------------------------------------------------
    //
    // --- BILLING SERVICE ---
    // LINKED_CAPABILITY:     'Billing & Payments',
    // BUSINESS_APP_NAME:     'Neat Billing',
    // BUSINESS_APP_DESC:     'Billing engine and payment processing platform',
    // BUSINESS_SERVICE_NAME: 'Neat Billing & Payments',
    // BUSINESS_SERVICE_DESC: 'Business service for billing and payment processing',
    // OFFERING_A_NAME: 'Billing – Internal Users',
    // OFFERING_A_DESC: 'Internal billing platform access for finance team',
    // OFFERING_B_NAME: 'Billing – External Partners (API)',
    // OFFERING_B_DESC: 'API-based billing integration for external partners',
    // CREATE_UAT: false,
    // PROD_NAME: 'Billing – PROD',
    // PROD_DESC: 'Production instance of billing service',
    // CI_LB_NAME:  '',                          // no LB
    // CI_WEB_NAME: 'Billing Web Cluster PROD',
    // CI_WEB_DESC: 'Web tier cluster for billing service',
    // CI_API_NAME: '',                          // no API
    // CI_DB_NAME:  'Billing DB Instance',
    // CI_DB_DESC:  'PostgreSQL database for billing'
    //
    // --- SUPPORT CONSOLE ---
    // LINKED_CAPABILITY:     'Customer Support',
    // BUSINESS_APP_NAME:     'Neat Support Console',
    // BUSINESS_SERVICE_NAME: 'Neat Support Console',
    // ... etc.

    // ============================================================================
    // HELPERS
    // ============================================================================

    function upsertRecord(table, data) {
        var gr = new GlideRecord(table);
        gr.addQuery('name', data.name);
        gr.query();

        var sysId;
        if (gr.next()) {
            for (var f in data) {
                if (data.hasOwnProperty(f) && f !== 'name') {
                    gr.setValue(f, data[f]);
                }
            }
            gr.update();
            sysId = gr.sys_id.toString();
            gs.info('[UPDATE] ' + table + ': ' + data.name + ' (' + sysId + ')');
        } else {
            gr.initialize();
            for (var f2 in data) {
                if (data.hasOwnProperty(f2)) {
                    gr.setValue(f2, data[f2]);
                }
            }
            sysId = gr.insert();
            gs.info('[CREATE] ' + table + ': ' + data.name + ' (' + sysId + ')');
        }
        return sysId;
    }

    function getRelationshipType(typeName) {
        var gr = new GlideRecord('cmdb_rel_type');
        gr.addQuery('name', typeName);
        gr.query();
        if (gr.next()) {
            return gr.sys_id.toString();
        }
        gs.warn('[WARN] Relationship type not found: ' + typeName);
        return null;
    }

    function createRelationship(parentId, childId, relTypeName) {
        if (!parentId || !childId) {
            return null;
        }
        var typeId = getRelationshipType(relTypeName);
        if (!typeId) {
            return null;
        }

        var gr = new GlideRecord('cmdb_rel_ci');
        gr.addQuery('parent', parentId);
        gr.addQuery('child', childId);
        gr.addQuery('type', typeId);
        gr.query();

        if (gr.next()) {
            gs.info('[EXISTS] Relationship: ' + relTypeName);
            return gr.sys_id.toString();
        }

        gr.initialize();
        gr.setValue('parent', parentId);
        gr.setValue('child', childId);
        gr.setValue('type', typeId);
        var relId = gr.insert();
        gs.info('[CREATE] Relationship: ' + relTypeName + ' (' + relId + ')');
        return relId;
    }

    // ============================================================================
    // EXECUTION
    // ============================================================================

    gs.info('========================================');
    gs.info('CSDM Generator — ' + CONFIG.COMPANY + ' — ' + CONFIG.BUSINESS_SERVICE_NAME);
    gs.info('========================================');

    // ---- 1. Business Capabilities (shared library) ----
    gs.info('\n--- Business Capabilities ---');
    var capabilityIds = {};
    for (var i = 0; i < CONFIG.CAPABILITIES.length; i++) {
        var cap = CONFIG.CAPABILITIES[i];
        capabilityIds[cap.name] = upsertRecord('cmdb_ci_business_capability', {
            name: cap.name,
            short_description: cap.description,
            operational_status: '1'
        });
    }
    var linkedCapId = capabilityIds[CONFIG.LINKED_CAPABILITY];
    if (!linkedCapId) {
        gs.error('[ERROR] LINKED_CAPABILITY "' + CONFIG.LINKED_CAPABILITY + '" not in CAPABILITIES list');
        return;
    }

    // ---- 2. Business Application ----
    gs.info('\n--- Business Application ---');
    var businessAppId = upsertRecord('cmdb_ci_business_app', {
        name: CONFIG.BUSINESS_APP_NAME,
        short_description: CONFIG.BUSINESS_APP_DESC,
        operational_status: '1'
    });

    // ---- 3. Business Service ----
    gs.info('\n--- Business Service ---');
    var businessServiceId = upsertRecord('cmdb_ci_service', {
        name: CONFIG.BUSINESS_SERVICE_NAME,
        short_description: CONFIG.BUSINESS_SERVICE_DESC,
        operational_status: '1',
        service_classification: 'Business Service'
    });

    // ---- 4. Service Offerings ----
    gs.info('\n--- Service Offerings ---');
    var offeringAId = upsertRecord('service_offering', {
        name: CONFIG.OFFERING_A_NAME,
        short_description: CONFIG.OFFERING_A_DESC,
        operational_status: '1',
        service: businessServiceId
    });
    var offeringBId = upsertRecord('service_offering', {
        name: CONFIG.OFFERING_B_NAME,
        short_description: CONFIG.OFFERING_B_DESC,
        operational_status: '1',
        service: businessServiceId
    });

    // ---- 5. Technology Management Service + Offerings (shared) ----
    gs.info('\n--- Technology Management Service ---');
    var techServiceId = upsertRecord('cmdb_ci_service_technical', {
        name: CONFIG.TECH_SERVICE_NAME,
        short_description: CONFIG.TECH_SERVICE_DESC,
        operational_status: '1',
        service_classification: 'Technical Service'
    });
    var techProdId = upsertRecord('service_offering', {
        name: CONFIG.TECH_OFFERING_PROD,
        short_description: CONFIG.TECH_OFFERING_PROD_DESC,
        operational_status: '1',
        service: techServiceId
    });
    var techNonProdId = upsertRecord('service_offering', {
        name: CONFIG.TECH_OFFERING_NONPROD,
        short_description: CONFIG.TECH_OFFERING_NONPROD_DESC,
        operational_status: '1',
        service: techServiceId
    });

    // ---- 6. Application Service Instances ----
    gs.info('\n--- Application Service Instances ---');
    var prodInstanceId = upsertRecord('cmdb_ci_service_discovered', {
        name: CONFIG.PROD_NAME,
        short_description: CONFIG.PROD_DESC,
        operational_status: '1',
        service_classification: 'Application Service',
        environment: 'Production'
    });
    var uatInstanceId = null;
    if (CONFIG.CREATE_UAT) {
        uatInstanceId = upsertRecord('cmdb_ci_service_discovered', {
            name: CONFIG.UAT_NAME,
            short_description: CONFIG.UAT_DESC,
            operational_status: '1',
            service_classification: 'Application Service',
            environment: 'Test'
        });
    }

    // ---- 7. Underpinning CIs (skip any with empty name) ----
    gs.info('\n--- Underpinning CIs ---');
    var ciIds = {};
    var ciSpecs = [
        { key: 'lb',  table: 'cmdb_ci_lb_simple', name: CONFIG.CI_LB_NAME,  desc: CONFIG.CI_LB_DESC  },
        { key: 'web', table: 'cmdb_ci_computer',  name: CONFIG.CI_WEB_NAME, desc: CONFIG.CI_WEB_DESC },
        { key: 'api', table: 'cmdb_ci_appl',      name: CONFIG.CI_API_NAME, desc: CONFIG.CI_API_DESC },
        { key: 'db',  table: 'cmdb_ci_database',  name: CONFIG.CI_DB_NAME,  desc: CONFIG.CI_DB_DESC  }
    ];
    for (var j = 0; j < ciSpecs.length; j++) {
        var ci = ciSpecs[j];
        if (ci.name && ci.name.length > 0) {
            ciIds[ci.key] = upsertRecord(ci.table, {
                name: ci.name,
                short_description: ci.desc,
                operational_status: '1',
                install_status: '1'
            });
        }
    }

    // ============================================================================
    // RELATIONSHIPS
    // ============================================================================
    gs.info('\n========================================');
    gs.info('Creating Relationships');
    gs.info('========================================');

    // App → Capability
    createRelationship(businessAppId, linkedCapId, 'Supports::Supported by');

    // Service → App
    createRelationship(businessServiceId, businessAppId, 'Delivers::Delivered by');

    // Service → Offerings
    createRelationship(businessServiceId, offeringAId, 'Contains::Contained by');
    createRelationship(businessServiceId, offeringBId, 'Contains::Contained by');

    // PROD instance → Offerings (realizes both)
    createRelationship(prodInstanceId, offeringAId, 'Realizes::Realized by');
    createRelationship(prodInstanceId, offeringBId, 'Realizes::Realized by');

    // PROD instance → All CIs (depends on)
    for (var k in ciIds) {
        if (ciIds.hasOwnProperty(k)) {
            createRelationship(prodInstanceId, ciIds[k], 'Depends on::Used by');
        }
    }

    // PROD instance → Prod tech offering
    createRelationship(prodInstanceId, techProdId, 'Consumes::Consumed by');

    // UAT (if created) → Offering A only, shares API+DB, consumes non-prod tech
    if (uatInstanceId) {
        createRelationship(uatInstanceId, offeringAId, 'Realizes::Realized by');
        if (ciIds.api) {
            createRelationship(uatInstanceId, ciIds.api, 'Depends on::Used by');
        }
        if (ciIds.db) {
            createRelationship(uatInstanceId, ciIds.db, 'Depends on::Used by');
        }
        createRelationship(uatInstanceId, techNonProdId, 'Consumes::Consumed by');
    }

    // Tech service → Tech offerings
    createRelationship(techServiceId, techProdId, 'Contains::Contained by');
    createRelationship(techServiceId, techNonProdId, 'Contains::Contained by');

    // ============================================================================
    // SUMMARY
    // ============================================================================
    gs.info('\n========================================');
    gs.info('Done: ' + CONFIG.BUSINESS_SERVICE_NAME);
    gs.info('========================================');
    gs.info('To generate another service, edit the per-service CONFIG block and re-run.');
    gs.info('Foundation records (capabilities, tech service) will be reused.');

})();
