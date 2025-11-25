/*
*  Create Change from Demand UI Action Script

Instead of using the out-of-box UI Action "Create Change from Demand" which creates a change request from a demand record in the "dmn_demand" table,
*  this custom UI Action creates a change request from a demand record in the "sn_align_core_demand" table.
*
*  This UI Action is intended to be used in ServiceNow instances where the Demand Management application is installed and the "sn_align_core_demand" table is used for demand records.
*
*  Note: Ensure that the Demand Management application is properly configured to work with the "sn_align_core_demand" table.
*
*  Table: sn_align_core_demand

*/

if (true) {
    var resultAsObject = true;
    var changeObj = createChange(current.sys_id, resultAsObject);
    var changeId = changeObj.sys_id;
    var number = changeObj.number;
    var displayLabel = changeObj.label;
    var change;
    var message;
    var link;

    if (changeId) {
        change = new GlideRecord('change_request');
        change.addQuery("sys_id", changeId);
        change.query();

        if (change.next()) {
            link = ' <a href ="/change_request.do?sysparm_query=number%3D' + number + '">' + number + '</a>';
            message = gs.getMessage("{0} {1} has been created");
            message = message.replace("{0}", displayLabel);
            message = message.replace("{1}", link);
            gs.addInfoMessage(message);

        }
    } else {
        message = gs.getMessage("Error creating {0}");
        message = message.replace("{0}", displayLabel);
        gs.addErrorMessage(message);
    }
    action.setRedirectURL(current);
}

function _getDemand(sys_id) {
    var demand = new GlideRecord('sn_align_core_demand');  //dmn_demand
    if (demand.get(sys_id))
        return demand;

    return null;
}

function createChange(demand_id, resultAsObject) {
    var demand;
    var change;
    var changeId;
    var changeNumber;
    var tableDisplayName;

    demand = _getDemand(demand_id);
    if (!demand) {
        gs.log("Error creating demand");
        return;
    }

    change = new GlideRecord('change_request');
    change.initialize();
    change.setValue("short_description", demand.short_description);
    change.setValue("parent", demand.sys_id);
    change.setValue('sys_domain', demand.sys_domain);
    changeId = change.insert();
    changeNumber = change.getValue('number');
    tableDisplayName = change.getClassDisplayValue();

    //update demand with change details
    if (JSUtil.nil(demand.related_records))
        demand.related_records = changeId;
    else
        demand.related_records = demand.related_records + "," + changeId;

    demand.u_change = changeId;
    demand.u_change_number = changeNumber;
    demand.state = '8';
    demand.stage = 'change';
    demand.update();

    return _inExpectedFormat({
        'sys_id': changeId,
        'number': changeNumber,
        'label': tableDisplayName
    }, resultAsObject);
}

function _inExpectedFormat(obj, resultAsObject) {
    return (resultAsObject) ? obj : _JSONEncode(obj);
}

function _JSONEncode(obj) {
    return (new JSON()).encode(obj);
}