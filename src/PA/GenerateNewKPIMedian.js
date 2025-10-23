# Create a background script file that the user can run in ServiceNow to set up
# two PA indicators (Median MTTR and Std Dev MTTR) and a time series widget.
#
# NOTE: ServiceNow does not natively import PA widgets/indicators via JSON.
# This script is intended to be pasted into "System Definition → Scripts - Background"
# (in the global scope or your target application scope). It will:
# 1) Ensure a derived field "resolution_time_hours" exists on Incident (as a Dictionary entry)
#    via a Dynamic calculation (if you already have it, the script will skip creation).
# 2) Create two PA Automated Indicators (Median and Std Dev) using that field.
#    If "Median" aggregation is not supported in your version, it will create a Scripted
#    Indicator for Median instead.
# 3) Create a PA Time Series widget that displays both indicators with a dual Y-axis.
#
# DISCLAIMER: Field names on PA tables can vary by version. The script includes checks and
# fallbacks, and logs detailed info to help you adjust if needed.

// ----------------------------
// MTTR PA Setup – Median + Std Dev
// Paste into: System Definition → Scripts - Background
// Run in: global (or your app scope)
// ----------------------------

(function setupMTTR_PA() {
    var LOG_PREFIX = "[MTTR PA Setup] ";
    gs.print(LOG_PREFIX + "Starting…");

    // ----------------------------
    // Helper: ensure "resolution_time_hours" calculated field exists
    // ----------------------------
    function ensureResolutionTimeHoursField() {
        var fieldName = "u_resolution_time_hours";
        var dict = new GlideRecord("sys_dictionary");
        dict.addQuery("name", "incident");
        dict.addQuery("element", fieldName);
        dict.query();
        if (dict.next()) {
            gs.print(LOG_PREFIX + "Field 'incident." + fieldName + "' already exists. Skipping creation.");
            return fieldName;
        }

        // Create dictionary entry
        dict.initialize();
        dict.setValue("name", "incident");
        dict.setValue("element", fieldName);
        dict.setValue("internal_type", "float");
        dict.setValue("column_label", "Resolution Time (Hours)");
        dict.setValue("mandatory", "false");
        dict.setValue("max_length", "40");
        dict.setValue("calculated", "true");
        dict.setValue("calculation", "answer = (resolveTimeHours(current));");
        dict.setValue("attributes", "");
        var dictSysId = dict.insert();
        gs.print(LOG_PREFIX + "Created calculated field 'incident." + fieldName + "' (sys_id=" + dictSysId + ").");

        // Create supporting Script Include for the calculation if not present
        var siName = "resolveTimeHours";
        var si = new GlideRecord("sys_script_include");
        si.addQuery("name", siName);
        si.query();
        if (!si.next()) {
            si.initialize();
            si.setValue("name", siName);
            si.setValue("access", "public");
            si.setValue("active", "true");
            si.setValue("api_name", "global." + siName);
            si.setValue("script", ""
                + "var resolveTimeHours = Class.create();\n"
                + "resolveTimeHours.prototype = {\n"
                + "    initialize: function() {},\n"
                + "    type: 'resolveTimeHours'\n"
                + "};\n"
                + "// Used as a function in Dictionary Calculation context\n"
                + "function resolveTimeHours(current) {\n"
                + "    try {\n"
                + "        if (!current.opened_at || !current.resolved_at) return 0;\n"
                + "        var opened = new GlideDateTime(current.opened_at);\n"
                + "        var resolved = new GlideDateTime(current.resolved_at);\n"
                + "        var ms = resolved.getNumericValue() - opened.getNumericValue();\n"
                + "        return ms / (1000 * 60 * 60);\n"
                + "    } catch (e) {\n"
                + "        gs.warn('" + LOG_PREFIX + "Calc error: ' + e);\n"
                + "        return 0;\n"
                + "    }\n"
                + "}\n"
            );
            var siId = si.insert();
            gs.print(LOG_PREFIX + "Created Script Include '" + siName + "' (sys_id=" + siId + ").");
        } else {
            gs.print(LOG_PREFIX + "Script Include 'resolveTimeHours' already exists. Skipping.");
        }

        return fieldName;
    }

    var resTimeField = ensureResolutionTimeHoursField();

    // ----------------------------
    // Helper: find or create PA Automated Indicator
    // ----------------------------
    function ensureAutoIndicator(name, agg, field, filterEncoded) {
        var ai = new GlideRecord("pa_indicators");
        ai.addQuery("name", name);
        ai.query();
        if (ai.next()) {
            gs.print(LOG_PREFIX + "Indicator '" + name + "' already exists. (" + ai.getUniqueValue() + ")");
            return ai.getUniqueValue();
        }

        ai.initialize();
        ai.setValue("name", name);
        ai.setValue("indicator_type", "automated"); // automated vs scripted
        ai.setValue("table", "incident");
        ai.setValue("direction", "minimize");
        ai.setValue("unit", "hours");
        ai.setValue("aggregate", agg); // try 'median' or 'stddev' depending on arg
        ai.setValue("aggregate_field", field);
        ai.setValue("frequency", "daily");
        if (filterEncoded) ai.setValue("filter", filterEncoded);
        var id = ai.insert();
        gs.print(LOG_PREFIX + "Created automated indicator '" + name + "' with aggregate=" + agg + " (sys_id=" + id + ").");
        return id;
    }

    // ----------------------------
    // Helper: create Scripted Indicator (for Median fallback)
    // ----------------------------
    function ensureScriptedIndicatorMedian(name, filterEncoded, field) {
        var si = new GlideRecord("pa_scripted_indicators");
        si.addQuery("name", name);
        si.query();
        if (si.next()) {
            gs.print(LOG_PREFIX + "Scripted Indicator '" + name + "' already exists. (" + si.getUniqueValue() + ")");
            return si.getUniqueValue();
        }

        si.initialize();
        si.setValue("name", name);
        si.setValue("table", "incident");
        si.setValue("frequency", "daily");
        si.setValue("direction", "minimize");
        si.setValue("unit", "hours");
        if (filterEncoded) si.setValue("filter", filterEncoded);

        var script = ""
            + "(function scriptedMedianMTTR() {\n"
            + "  var gr = new GlideRecord('incident');\n"
            + "  if ('" + (filterEncoded || "") + "'.length > 0) gr.addEncodedQuery('" + (filterEncoded || "") + "');\n"
            + "  gr.addNotNullQuery('" + field + "');\n"
            + "  gr.query();\n"
            + "  var arr = [];\n"
            + "  while (gr.next()) {\n"
            + "    var v = parseFloat(gr.getValue('" + field + "'));\n"
            + "    if (!isNaN(v)) arr.push(v);\n"
            + "  }\n"
            + "  arr.sort(function(a,b){return a-b;});\n"
            + "  if (arr.length === 0) return 0;\n"
            + "  var mid = Math.floor(arr.length/2);\n"
            + "  if (arr.length % 2) return arr[mid];\n"
            + "  return (arr[mid-1] + arr[mid]) / 2;\n"
            + "})();\n";

        si.setValue("script", script);
        var id = si.insert();
        gs.print(LOG_PREFIX + "Created Scripted Indicator (Median) '" + name + "' (sys_id=" + id + ").");
        return id;
    }

    // ----------------------------
    // Create Indicators
    // ----------------------------
    var closedFilter = "state=6"; // resolved/closed; adjust for your workflow
    var medianName = "MTTR (Median)";
    var stdName    = "MTTR (Standard Deviation)";
    var medianId, stdId;

    // Try automated indicator for Median first
    try {
        medianId = ensureAutoIndicator(medianName, "median", resTimeField, closedFilter);
    } catch (e1) {
        gs.warn(LOG_PREFIX + "Automated 'median' aggregate failed or unsupported; creating scripted indicator. Error: " + e1);
        medianId = ensureScriptedIndicatorMedian(medianName, closedFilter, resTimeField);
    }

    // Std Dev as automated
    try {
        stdId = ensureAutoIndicator(stdName, "stddev", resTimeField, closedFilter);
    } catch (e2) {
        gs.warn(LOG_PREFIX + "Automated 'stddev' aggregate failed. Error: " + e2 + " — You may need to adjust aggregate key for your version (e.g., 'standard_deviation').");
    }

    // ----------------------------
    // Create Time Series widget combining both
    // ----------------------------
    function ensureTimeSeriesWidget(widgetName, primaryIndicatorName, secondaryIndicatorName) {
        var w = new GlideRecord("pa_widgets");
        w.addQuery("name", widgetName);
        w.query();
        if (w.next()) {
            gs.print(LOG_PREFIX + "PA Widget '" + widgetName + "' already exists. (" + w.getUniqueValue() + ")");
            return w.getUniqueValue();
        }

        w.initialize();
        w.setValue("name", widgetName);
        w.setValue("widget_type", "time_series");
        w.setValue("title", "MTTR Trend with Variability");
        // Basic config JSON; may vary by version – adjust if needed in UI after creation
        var cfg = {
            indicators: [
                { name: primaryIndicatorName, axis: "left",  type: "line",  show_data_labels: false },
                { name: secondaryIndicatorName, axis: "right", type: "line", dashed: true, show_data_labels: false }
            ],
            timeframe: "last_12_weeks",
            show_legend: true,
            goal_line: { value: 4, enabled: true, label: "SLA (hrs)" },
            smoothing: false
        };
        w.setValue("config", JSON.stringify(cfg));
        var wid = w.insert();
        gs.print(LOG_PREFIX + "Created PA Time Series Widget '" + widgetName + "' (sys_id=" + wid + ").");
        return wid;
    }

    var widgetId = ensureTimeSeriesWidget("MTTR Trend with Variability", medianName, stdName);

    gs.print(LOG_PREFIX + "Done. Indicators and widget created.");
})();