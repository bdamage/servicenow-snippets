(function () {

    // ----------------------------
    // Helpers
    // ----------------------------
    function upsert(table, queryObj, initObj) {
        var gr = new GlideRecord(table);
        for (var k in queryObj) gr.addQuery(k, queryObj[k]);
        gr.query();
        if (gr.next()) return gr; // existing
        gr.initialize();
        for (var a in initObj) gr[a] = initObj[a];
        gr.insert();
        gr.get(gr.sys_id);
        return gr;
    }

    function getRelTypeSysIdByNameOrLabel(nameOrLabel) {
        // Different instances populate "name" and "label" differently; we try both.
        var rt = new GlideRecord('cmdb_rel_type');
        rt.addQuery('name', nameOrLabel).addOrCondition('label', nameOrLabel);
        rt.query();
        if (rt.next()) return rt.sys_id.toString();
        gs.warn('[NeatCorp] Relationship type not found: ' + nameOrLabel);
        return null;
    }

    function relate(parentSysId, childSysId, relTypeSysId) {
        if (!parentSysId || !childSysId || !relTypeSysId) return null;

        var rel = new GlideRecord('cmdb_rel_ci');
        rel.addQuery('parent', parentSysId);
        rel.addQuery('child', childSysId);
        rel.addQuery('type', relTypeSysId);
        rel.query();
        if (rel.next()) return rel; // already exists

        rel.initialize();
        rel.parent = parentSysId;
        rel.child = childSysId;
        rel.type = relTypeSysId;
        rel.insert();
        rel.get(rel.sys_id);
        return rel;
    }

    function info(gr, label) {
        gs.info('[NeatCorp] ' + label + ': ' + gr.getValue('name') + ' (' + gr.getUniqueValue() + ')');
    }

    // ----------------------------
    // Relationship Types (lookup)
    // Adjust these strings if your instance uses different labels.
    // ----------------------------
    var REL_DEPENDS_ON = getRelTypeSysIdByNameOrLabel('Depends on::Used by');     // common
    var REL_REALIZED_BY = getRelTypeSysIdByNameOrLabel('Realized by::Realizes'); // may vary
    var REL_CONSUMES = getRelTypeSysIdByNameOrLabel('Consumes::Consumed by');    // may vary

    // ----------------------------
    // 1) Business Capabilities
    // ----------------------------
    var caps = [
        'Customer Onboarding',
        'Order Management',
        'Billing & Payments',
        'Customer Support'
    ];

    // Table may exist depending on plugins/versions.
    // If your instance uses a different capability table, change it here.
    var capRecords = {};
    caps.forEach(function (c) {
        var cap = upsert('cmdb_ci_business_capability', { name: c }, { name: c });
        capRecords[c] = cap;
        info(cap, 'Business Capability');
    });

    // ----------------------------
    // 2) Digital Products / Business Applications
    // ----------------------------
    // Many orgs use cmdb_ci_business_app. If you use APM digital product tables, swap table here.
    var products = [
        'Neat Customer Portal',
        'Neat Billing',
        'Neat Support Console'
    ];

    var productRecords = {};
    products.forEach(function (p) {
        var app = upsert('cmdb_ci_business_app', { name: p }, { name: p });
        productRecords[p] = app;
        info(app, 'Digital Product (Business App)');
    });

    // ----------------------------
    // 3) Business Services
    // ----------------------------
    var svcPortal = upsert('cmdb_ci_service', { name: 'Neat Customer Portal' }, { name: 'Neat Customer Portal' });
    var svcBilling = upsert('cmdb_ci_service', { name: 'Neat Billing & Payments' }, { name: 'Neat Billing & Payments' });
    info(svcPortal, 'Business Service');
    info(svcBilling, 'Business Service');

    // ----------------------------
    // 4) Service Offerings
    // ----------------------------
    function createOffering(name, parentServiceGR) {
        // service_offering table exists when Service Portfolio / Service Offering is enabled.
        // Field is typically "service" referencing cmdb_ci_service.
        return upsert('service_offering', { name: name }, { name: name, service: parentServiceGR.getUniqueValue() });
    }

    var offPortalStd = createOffering('Customer Portal – Standard', svcPortal);
    var offPortalPrem = createOffering('Customer Portal – Premium', svcPortal);
    var offBillInt = createOffering('Billing – Internal Users', svcBilling);
    var offBillApi = createOffering('Billing – External Partners (API)', svcBilling);

    info(offPortalStd, 'Service Offering');
    info(offPortalPrem, 'Service Offering');
    info(offBillInt, 'Service Offering');
    info(offBillApi, 'Service Offering');

    // ----------------------------
    // 5) Technology Mgmt Service + Offerings
    // ----------------------------
    var svcPg = upsert('cmdb_ci_service', { name: 'Managed PostgreSQL' }, { name: 'Managed PostgreSQL' });
    info(svcPg, 'Technology Mgmt Service');

    var offPgProd = createOffering('PostgreSQL – Production (HA)', svcPg);
    var offPgNonProd = createOffering('PostgreSQL – Non-Prod (Standard)', svcPg);
    info(offPgProd, 'Tech Service Offering');
    info(offPgNonProd, 'Tech Service Offering');

    // ----------------------------
    // 6) Service Instances (Application Services / Service Instance pattern)
    // ----------------------------
    // Many instances use cmdb_ci_service_auto for Application Services lineage.
    var siPortalProd = upsert('cmdb_ci_service_auto', { name: 'Portal – PROD' }, { name: 'Portal – PROD' });
    var siPortalUat = upsert('cmdb_ci_service_auto', { name: 'Portal – UAT' }, { name: 'Portal – UAT' });
    var siBillingProd = upsert('cmdb_ci_service_auto', { name: 'Billing – PROD' }, { name: 'Billing – PROD' });

    info(siPortalProd, 'Service Instance');
    info(siPortalUat, 'Service Instance');
    info(siBillingProd, 'Service Instance');

    // ----------------------------
    // 7) Underpinning CIs (sample)
    // ----------------------------
    // Adjust CI classes to match what you use.
    var lbPortal = upsert('cmdb_ci_lb', { name: 'Neat Portal Load Balancer' }, { name: 'Neat Portal Load Balancer' });
    var srvPortalWeb1 = upsert('cmdb_ci_server', { name: 'neat-portal-web-01' }, { name: 'neat-portal-web-01' });
    var srvPortalApi1 = upsert('cmdb_ci_server', { name: 'neat-portal-api-01' }, { name: 'neat-portal-api-01' });
    var dbPortal = upsert('cmdb_ci_db_instance', { name: 'neat-portal-db' }, { name: 'neat-portal-db' });

    info(lbPortal, 'CI');
    info(srvPortalWeb1, 'CI');
    info(srvPortalApi1, 'CI');
    info(dbPortal, 'CI');

    // ----------------------------
    // 8) Relationships
    // ----------------------------

    // Offerings realized by instances (if you prefer, you can relate offerings->instances or services->instances)
    // This depends on your modeling rules; treat as example.
    // If REL_REALIZED_BY doesn't exist in your instance, it will warn and skip.
    relate(offPortalStd.getUniqueValue(), siPortalProd.getUniqueValue(), REL_REALIZED_BY);
    relate(offPortalPrem.getUniqueValue(), siPortalProd.getUniqueValue(), REL_REALIZED_BY);
    relate(offBillInt.getUniqueValue(), siBillingProd.getUniqueValue(), REL_REALIZED_BY);
    relate(offBillApi.getUniqueValue(), siBillingProd.getUniqueValue(), REL_REALIZED_BY);

    // Instances depend on CIs
    relate(siPortalProd.getUniqueValue(), lbPortal.getUniqueValue(), REL_DEPENDS_ON);
    relate(siPortalProd.getUniqueValue(), srvPortalWeb1.getUniqueValue(), REL_DEPENDS_ON);
    relate(siPortalProd.getUniqueValue(), srvPortalApi1.getUniqueValue(), REL_DEPENDS_ON);
    relate(siPortalProd.getUniqueValue(), dbPortal.getUniqueValue(), REL_DEPENDS_ON);

    // Instances consume Tech Offerings (example)
    relate(siPortalProd.getUniqueValue(), offPgProd.getUniqueValue(), REL_CONSUMES);
    relate(siPortalUat.getUniqueValue(), offPgNonProd.getUniqueValue(), REL_CONSUMES);
    relate(siBillingProd.getUniqueValue(), offPgProd.getUniqueValue(), REL_CONSUMES);

    gs.info('[NeatCorp] Done. Review warnings for missing relationship types and adjust labels as needed.');

})();