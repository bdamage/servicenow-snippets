/**
 * Neat Corp CSDM Sample Data Generator
 * Creates a complete CSDM-aligned service hierarchy with relationships
 * Compatible with v4/v5 CSDM model
 *
 * Run as: Background Script in ServiceNow
 */

(function () {
    'use strict';

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Upsert helper - creates or updates a record based on name
     * @param {string} table - Table name
     * @param {object} data - Record data (must include 'name' field)
     * @returns {string} sys_id of the record
     */
    function upsertRecord(table, data) {
        var gr = new GlideRecord(table);
        gr.addQuery('name', data.name);
        gr.query();

        var sysId;
        if (gr.next()) {
            // Update existing
            for (var field in data) {
                if (data.hasOwnProperty(field) && field !== 'name') {
                    gr.setValue(field, data[field]);
                }
            }
            gr.update();
            sysId = gr.sys_id.toString();
            gs.info('[UPDATE] ' + table + ': ' + data.name + ' (' + sysId + ')');
        } else {
            // Create new
            gr.initialize();
            for (var field in data) {
                if (data.hasOwnProperty(field)) {
                    gr.setValue(field, data[field]);
                }
            }
            sysId = gr.insert();
            gs.info('[CREATE] ' + table + ': ' + data.name + ' (' + sysId + ')');
        }

        return sysId;
    }

    /**
     * Get relationship type sys_id by name
     * @param {string} typeName - Relationship type name (e.g., "Depends on::Used by")
     * @returns {string|null} sys_id of relationship type or null if not found
     */
    function getRelationshipType(typeName) {
        var gr = new GlideRecord('cmdb_rel_type');
        gr.addQuery('name', typeName);
        gr.query();

        if (gr.next()) {
            return gr.sys_id.toString();
        }

        gs.warn('[WARN] Relationship type not found: ' + typeName + ' - please verify relationship type exists');
        return null;
    }

    /**
     * Create or update a CI relationship
     * @param {string} parentId - Parent CI sys_id
     * @param {string} childId - Child CI sys_id
     * @param {string} relTypeName - Relationship type name
     * @returns {string|null} sys_id of relationship or null if failed
     */
    function createRelationship(parentId, childId, relTypeName) {
        var typeId = getRelationshipType(relTypeName);
        if (!typeId) {
            gs.error('[ERROR] Cannot create relationship - type "' + relTypeName + '" not found');
            return null;
        }

        // Check if relationship already exists
        var gr = new GlideRecord('cmdb_rel_ci');
        gr.addQuery('parent', parentId);
        gr.addQuery('child', childId);
        gr.addQuery('type', typeId);
        gr.query();

        if (gr.next()) {
            gs.info('[EXISTS] Relationship: ' + relTypeName + ' (' + gr.sys_id + ')');
            return gr.sys_id.toString();
        }

        // Create new relationship
        gr.initialize();
        gr.setValue('parent', parentId);
        gr.setValue('child', childId);
        gr.setValue('type', typeId);
        var relId = gr.insert();

        gs.info('[CREATE] Relationship: ' + relTypeName + ' (' + relId + ')');
        return relId;
    }

    // ============================================================================
    // DATA CREATION
    // ============================================================================

    gs.info('========================================');
    gs.info('Starting Neat Corp CSDM Data Creation');
    gs.info('========================================');

    // ------------------------------------------------------------------------
    // 1. BUSINESS CAPABILITIES
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Business Capabilities ---');

    var capabilities = {
        customerOnboarding: upsertRecord('business_capability', {
            name: 'Customer Onboarding',
            short_description: 'End-to-end customer onboarding and account setup',
            operational_status: '1' // Operational
        }),
        orderManagement: upsertRecord('business_capability', {
            name: 'Order Management',
            short_description: 'Order processing, fulfillment, and tracking',
            operational_status: '1'
        }),
        billingPayments: upsertRecord('business_capability', {
            name: 'Billing & Payments',
            short_description: 'Invoice generation, payment processing, and revenue recognition',
            operational_status: '1'
        }),
        customerSupport: upsertRecord('business_capability', {
            name: 'Customer Support',
            short_description: 'Customer service, ticketing, and issue resolution',
            operational_status: '1'
        })
    };

    // ------------------------------------------------------------------------
    // 2. DIGITAL PRODUCTS
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Digital Products ---');

    var digitalProducts = {
        customerPortal: upsertRecord('cmdb_ci_product', {
            name: 'Neat Customer Portal',
            short_description: 'Self-service portal for customer account management and orders',
            operational_status: '1',
            product_type: 'digital_product'
        }),
        billing: upsertRecord('cmdb_ci_product', {
            name: 'Neat Billing',
            short_description: 'Billing engine and payment processing platform',
            operational_status: '1',
            product_type: 'digital_product'
        }),
        supportConsole: upsertRecord('cmdb_ci_product', {
            name: 'Neat Support Console',
            short_description: 'Internal support team case management system',
            operational_status: '1',
            product_type: 'digital_product'
        })
    };

    // ------------------------------------------------------------------------
    // 3. BUSINESS SERVICES
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Business Services ---');

    var businessServices = {
        portalService: upsertRecord('cmdb_ci_service_discovered', {
            name: 'Neat Customer Portal',
            short_description: 'Business service for customer self-service portal',
            operational_status: '1',
            service_classification: 'Business Service'
        }),
        billingService: upsertRecord('cmdb_ci_service_discovered', {
            name: 'Neat Billing & Payments',
            short_description: 'Business service for billing and payment processing',
            operational_status: '1',
            service_classification: 'Business Service'
        })
    };

    // ------------------------------------------------------------------------
    // 4. SERVICE OFFERINGS (Business Service Offerings)
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Service Offerings ---');

    var serviceOfferings = {
        portalStandard: upsertRecord('service_offering', {
            name: 'Customer Portal – Standard',
            short_description: 'Standard self-service portal access with basic features',
            operational_status: '1',
            service: businessServices.portalService
        }),
        portalPremium: upsertRecord('service_offering', {
            name: 'Customer Portal – Premium',
            short_description: 'Premium portal access with advanced features and priority support',
            operational_status: '1',
            service: businessServices.portalService
        }),
        billingInternal: upsertRecord('service_offering', {
            name: 'Billing – Internal Users',
            short_description: 'Internal billing platform access for finance team',
            operational_status: '1',
            service: businessServices.billingService
        }),
        billingAPI: upsertRecord('service_offering', {
            name: 'Billing – External Partners (API)',
            short_description: 'API-based billing integration for external partners',
            operational_status: '1',
            service: businessServices.billingService
        })
    };

    // ------------------------------------------------------------------------
    // 5. TECHNOLOGY MANAGEMENT SERVICE
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Technology Management Service ---');

    var techMgmtService = upsertRecord('cmdb_ci_service_discovered', {
        name: 'Managed PostgreSQL',
        short_description: 'Managed PostgreSQL database service',
        operational_status: '1',
        service_classification: 'Technical Service'
    });

    // ------------------------------------------------------------------------
    // 6. TECH MANAGEMENT SERVICE OFFERINGS
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Tech Management Service Offerings ---');

    var techOfferings = {
        postgresProd: upsertRecord('service_offering', {
            name: 'PostgreSQL – Production (HA)',
            short_description: 'High-availability production PostgreSQL with auto-failover',
            operational_status: '1',
            service: techMgmtService
        }),
        postgresNonProd: upsertRecord('service_offering', {
            name: 'PostgreSQL – Non-Prod (Standard)',
            short_description: 'Standard PostgreSQL for development and testing',
            operational_status: '1',
            service: techMgmtService
        })
    };

    // ------------------------------------------------------------------------
    // 7. SERVICE INSTANCES (Application Services / Runtime Instances)
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Service Instances ---');

    var serviceInstances = {
        portalProd: upsertRecord('cmdb_ci_service_auto', {
            name: 'Portal – PROD',
            short_description: 'Production instance of customer portal',
            operational_status: '1',
            environment: 'Production'
        }),
        portalUAT: upsertRecord('cmdb_ci_service_auto', {
            name: 'Portal – UAT',
            short_description: 'UAT instance of customer portal',
            operational_status: '1',
            environment: 'Test'
        }),
        billingProd: upsertRecord('cmdb_ci_service_auto', {
            name: 'Billing – PROD',
            short_description: 'Production instance of billing service',
            operational_status: '1',
            environment: 'Production'
        })
    };

    // ------------------------------------------------------------------------
    // 8. UNDERPINNING CIs (Infrastructure Components)
    // ------------------------------------------------------------------------
    gs.info('\n--- Creating Underpinning CIs ---');

    var cis = {
        portalWebCluster: upsertRecord('cmdb_ci_computer', {
            name: 'Portal Web Cluster PROD',
            short_description: 'Web tier cluster for customer portal',
            operational_status: '1',
            install_status: '1'
        }),
        portalAPI: upsertRecord('cmdb_ci_appl', {
            name: 'Portal API Gateway',
            short_description: 'API gateway for portal backend services',
            operational_status: '1',
            install_status: '1'
        }),
        portalDB: upsertRecord('cmdb_ci_database', {
            name: 'Portal DB Instance',
            short_description: 'PostgreSQL database for portal',
            operational_status: '1',
            install_status: '1'
        }),
        portalLB: upsertRecord('cmdb_ci_lb_simple', {
            name: 'Portal Load Balancer',
            short_description: 'Load balancer for portal web tier',
            operational_status: '1',
            install_status: '1'
        }),
        billingWebCluster: upsertRecord('cmdb_ci_computer', {
            name: 'Billing Web Cluster PROD',
            short_description: 'Web tier cluster for billing service',
            operational_status: '1',
            install_status: '1'
        }),
        billingDB: upsertRecord('cmdb_ci_database', {
            name: 'Billing DB Instance',
            short_description: 'PostgreSQL database for billing',
            operational_status: '1',
            install_status: '1'
        })
    };

    // ============================================================================
    // RELATIONSHIPS
    // ============================================================================

    gs.info('\n========================================');
    gs.info('Creating Relationships');
    gs.info('========================================');

    // ------------------------------------------------------------------------
    // Digital Product → Business Capability (Supports)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Digital Products to Business Capabilities ---');

    createRelationship(digitalProducts.customerPortal, capabilities.customerOnboarding, 'Supports::Supported by');
    createRelationship(digitalProducts.billing, capabilities.billingPayments, 'Supports::Supported by');
    createRelationship(digitalProducts.supportConsole, capabilities.customerSupport, 'Supports::Supported by');

    // ------------------------------------------------------------------------
    // Business Service → Digital Product (Delivered via)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Business Services to Digital Products ---');

    createRelationship(businessServices.portalService, digitalProducts.customerPortal, 'Delivers::Delivered by');
    createRelationship(businessServices.billingService, digitalProducts.billing, 'Delivers::Delivered by');

    // ------------------------------------------------------------------------
    // Service Offering → Business Service (Contains/Provided by)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Service Offerings to Business Services ---');

    createRelationship(businessServices.portalService, serviceOfferings.portalStandard, 'Contains::Contained by');
    createRelationship(businessServices.portalService, serviceOfferings.portalPremium, 'Contains::Contained by');
    createRelationship(businessServices.billingService, serviceOfferings.billingInternal, 'Contains::Contained by');
    createRelationship(businessServices.billingService, serviceOfferings.billingAPI, 'Contains::Contained by');

    // ------------------------------------------------------------------------
    // Service Instance → Service Offering (Realizes/Realized by)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Service Instances to Service Offerings ---');

    createRelationship(serviceInstances.portalProd, serviceOfferings.portalStandard, 'Realizes::Realized by');
    createRelationship(serviceInstances.portalProd, serviceOfferings.portalPremium, 'Realizes::Realized by');
    createRelationship(serviceInstances.portalUAT, serviceOfferings.portalStandard, 'Realizes::Realized by');
    createRelationship(serviceInstances.billingProd, serviceOfferings.billingInternal, 'Realizes::Realized by');
    createRelationship(serviceInstances.billingProd, serviceOfferings.billingAPI, 'Realizes::Realized by');

    // ------------------------------------------------------------------------
    // Service Instance → Underpinning CIs (Depends on)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Service Instances to Underpinning CIs ---');

    // Portal PROD dependencies
    createRelationship(serviceInstances.portalProd, cis.portalLB, 'Depends on::Used by');
    createRelationship(serviceInstances.portalProd, cis.portalWebCluster, 'Depends on::Used by');
    createRelationship(serviceInstances.portalProd, cis.portalAPI, 'Depends on::Used by');
    createRelationship(serviceInstances.portalProd, cis.portalDB, 'Depends on::Used by');

    // Portal UAT dependencies (shares some infrastructure)
    createRelationship(serviceInstances.portalUAT, cis.portalAPI, 'Depends on::Used by');
    createRelationship(serviceInstances.portalUAT, cis.portalDB, 'Depends on::Used by');

    // Billing PROD dependencies
    createRelationship(serviceInstances.billingProd, cis.billingWebCluster, 'Depends on::Used by');
    createRelationship(serviceInstances.billingProd, cis.billingDB, 'Depends on::Used by');

    // ------------------------------------------------------------------------
    // Service Instance → Tech Mgmt Service Offerings (Consumes)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Service Instances to Tech Management Offerings ---');

    // Production instances consume HA PostgreSQL
    createRelationship(serviceInstances.portalProd, techOfferings.postgresProd, 'Consumes::Consumed by');
    createRelationship(serviceInstances.billingProd, techOfferings.postgresProd, 'Consumes::Consumed by');

    // UAT instance consumes non-prod PostgreSQL
    createRelationship(serviceInstances.portalUAT, techOfferings.postgresNonProd, 'Consumes::Consumed by');

    // ------------------------------------------------------------------------
    // Tech Mgmt Service Offering → Tech Mgmt Service (Contains)
    // ------------------------------------------------------------------------
    gs.info('\n--- Linking Tech Offerings to Tech Management Service ---');

    createRelationship(techMgmtService, techOfferings.postgresProd, 'Contains::Contained by');
    createRelationship(techMgmtService, techOfferings.postgresNonProd, 'Contains::Contained by');

    // ============================================================================
    // SUMMARY
    // ============================================================================

    gs.info('\n========================================');
    gs.info('CSDM Data Creation Complete!');
    gs.info('========================================');
    gs.info('\nSummary:');
    gs.info('- Business Capabilities: 4');
    gs.info('- Digital Products: 3');
    gs.info('- Business Services: 2');
    gs.info('- Service Offerings (Business): 4');
    gs.info('- Technology Management Services: 1');
    gs.info('- Tech Service Offerings: 2');
    gs.info('- Service Instances: 3');
    gs.info('- Underpinning CIs: 6');
    gs.info('\nNavigate to:');
    gs.info('- Business Capabilities: /nav_to.do?uri=business_capability_list.do');
    gs.info('- Digital Products: /nav_to.do?uri=cmdb_ci_product_list.do');
    gs.info('- Business Services: /nav_to.do?uri=cmdb_ci_service_discovered_list.do');
    gs.info('- Service Offerings: /nav_to.do?uri=service_offering_list.do');
    gs.info('- Service Instances: /nav_to.do?uri=cmdb_ci_service_auto_list.do');
    gs.info('- Relationships: /nav_to.do?uri=cmdb_rel_ci_list.do');
    gs.info('========================================');

})();

