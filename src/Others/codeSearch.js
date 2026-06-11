/**
 * codeSearch.js
 *
 * Background Script (Scripts - Background) that uses the Code Search API
 * (sn_codesearch.CodeSearch) to search a string across all scriptable
 * tables/fields and print a reference to every finding for follow-up.
 *
 * IMPORTANT: Run in the GLOBAL scope (Scripts - Background, scope = global).
 * Code Search must be activated on the instance (plugin: Code Search,
 * com.glide.code_search). ES5 only (Rhino engine).
 *
 * Output: a flat list of findings with table, record name, field, sys_id
 * and a clickable record URL you can paste into the browser.
 */

(function () {
    // ----------------------------------------------------------------------
    // CONFIG -- change this string to whatever you want to find.
    // ----------------------------------------------------------------------
    var SEARCH_TERM = 'gs.log';   // <-- the string to search for
    var MAX_RESULTS = 500;        // safety cap on rows printed
    var SEARCH_GROUP = '';        // optional sys_codesearch_group sys_id;
                                  // leave '' to auto-pick / search everything

    // Instance base URL for building clickable links
    var BASE_URL = gs.getProperty('glide.servlet.uri');
    if (BASE_URL && BASE_URL.charAt(BASE_URL.length - 1) === '/') {
        BASE_URL = BASE_URL.substring(0, BASE_URL.length - 1);
    }

    // ----------------------------------------------------------------------
    // Resolve a search group (defines which tables/fields are searched).
    // If none is supplied, pick the first active group; if there are none,
    // the API will search its default set.
    // ----------------------------------------------------------------------
    function resolveSearchGroup() {
        if (SEARCH_GROUP) {
            return SEARCH_GROUP;
        }
        var grp = new GlideRecord('sys_codesearch_group');
        if (grp.isValid()) {
            grp.orderByDesc('sys_updated_on');
            grp.setLimit(1);
            grp.query();
            if (grp.next()) {
                return grp.getUniqueValue();
            }
        }
        return ''; // let the API use its defaults
    }

    // ----------------------------------------------------------------------
    // Run the search.
    // ----------------------------------------------------------------------
    var searchGroup = resolveSearchGroup();
    var cs = new sn_codesearch.CodeSearch();
    var raw = cs.search(SEARCH_TERM, searchGroup);

    // The API may return a JSON string or an already-parsed object,
    // depending on instance version -- normalize to an object.
    var data = raw;
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw);
        } catch (e) {
            gs.print('Could not JSON.parse the search result. Raw output:');
            gs.print(raw);
            return;
        }
    }

    // ----------------------------------------------------------------------
    // Walk the result structure defensively (field names have shifted
    // between releases). We look for a list of table groups, each holding
    // a list of matching records.
    // ----------------------------------------------------------------------
    var tableGroups =
        (data && (data.groupSearchResults || data.searchResults || data.results)) || [];

    if (!tableGroups || !tableGroups.length) {
        gs.print('No findings for "' + SEARCH_TERM + '".');
        gs.print('Raw result (for structure inspection):');
        gs.print(JSON.stringify(data));
        return;
    }

    gs.print('==========================================================');
    gs.print('Code Search findings for: "' + SEARCH_TERM + '"');
    gs.print('Search group: ' + (searchGroup || '(default set)'));
    gs.print('==========================================================');

    var printed = 0;
    var total = 0;

    for (var g = 0; g < tableGroups.length; g++) {
        var tg = tableGroups[g];
        var tableName = tg.tableName || tg.table || tg.name || '(unknown table)';
        var tableLabel = tg.tableLabel || tg.label || tableName;

        var records =
            tg.recordSearchResults || tg.records || tg.matches || tg.searchResults || [];

        if (!records || !records.length) {
            continue;
        }

        gs.print('');
        gs.print('--- ' + tableLabel + ' (' + tableName + ') : ' +
                 records.length + ' match(es) ---');

        for (var r = 0; r < records.length; r++) {
            total++;
            if (printed >= MAX_RESULTS) {
                continue;
            }

            var rec = records[r];
            var sysId = rec.sysId || rec.sys_id || rec.id || '';
            var name = rec.name || rec.recordName || rec.label || '(no name)';
            var field = rec.fieldName || rec.field || rec.column || '';

            var link = BASE_URL && sysId
                ? BASE_URL + '/' + tableName + '.do?sys_id=' + sysId
                : '(no link)';

            gs.print('  [' + total + '] ' + name +
                     (field ? '  (field: ' + field + ')' : ''));
            gs.print('       sys_id: ' + sysId);
            gs.print('       link:   ' + link);

            printed++;
        }
    }

    gs.print('');
    gs.print('==========================================================');
    gs.print('Total findings: ' + total +
             (total > printed ? '  (printed first ' + printed + ')' : ''));
    gs.print('==========================================================');
})();
