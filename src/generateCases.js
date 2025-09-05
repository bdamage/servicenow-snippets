//NOTE: still in the beta - double check everything before using.
//TODO: Migrate the new generator source from generateIncident.js


var NUMBER_OF_INCIDENTS = 6;
var MAX_MAJOR_INCIDENTS = 1;
var MAX_DAYS_BACK_IN_TIME = 90;
var MAX_OPEN_DAYS = 14;
var short_desc = [];
var assign = [];
var caller = [];
var agent = [];
var category = [];
var account = [];
var contact = [];
var admin = getRecorSysId('sys_user', 'user_name', 'admin');
account[0] = getRecorSysId('customer_account', 'name', 'Boxeo');
contact[0] = getRecorSysId('customer_contact', 'user_name', 'julie.lewis');

short_desc[0] = ["Need access to Acme Cloud", "request for access", "can't access the Acme management panel", "no login screen", "access denied at the login screen", "login screen is blank"];
short_desc[1] = ["financial system is blank", "finance module is not working", "transaction issues with finance module", "no transactions from Acme", "server failed to download update", "no updates from the server"];
//short_desc[2] = ["lost my laptop during travel","lost my phone", "my laptop was stolen from the car", "need a new laptop"];

assign[0] = getRecorSysId('sys_user_group', 'name', 'Customer Service Support');
caller[0] = getRecorSysId('sys_user', 'user_name', 'abraham.lincoln');
caller[1] = getRecorSysId('sys_user', 'user_name', 'abel.tuter');
caller[2] = getRecorSysId('sys_user', 'user_name', 'fred.luddy');
agent[0] = getRecorSysId('sys_user', 'user_name', 'john.jason');
/*to agent[1] = getRecorSysId('sys_user', 'user_name', 'david.loo');
agent[2] = getRecorSysId('sys_user', 'user_name', 'laxmi.analyst');
*/
var states = [1, 10, 6, 18, 3]; //CSM states
var categories = [1]; //1 - Issue
var _channel = ["email", "phone", "self-service", "chat", "virtual_agent"];
/*
    incident = [
        { category: "network", assign_to:getRecorSysId('sys_user', 'user_name', 'john.jason'), short_desc: ["x","y","z"]},
        { category: "inquiry", assign_to:'d625dccec0a8016700a222a0f7900d06', short_desc: ["s","g","x"]},
];
*/
var cmdb_ci_dell = getRecorSysId('cmdb_ci', 'name', 'Dell Wireless WLAN Utility');
var cmdb_ci_sap = getRecorSysId('cmdb_ci', 'name', 'SAP AppSRV01');
var cmdb_ci_email = getRecorSysId('cmdb_ci', 'name', 'EXCH-SD-05');
var cmdb_ci_computer = getRecorSysId('cmdb_ci', 'name', '*DAVID-IBM');
var cmdb_ci_service_email = getRecorSysId('cmdb_ci_service', 'name', 'Email');
var cmdb_ci_service_erp = getRecorSysId('cmdb_ci_service', 'name', 'IT Services');
getRecorSysId('sys_user_group', 'name', 'IT Securities');
var idx = 0;
GlideSession.get().setTimeZoneName('Europe/Stockholm');
var closeDate = new GlideDateTime();
closeDate.setTimeZone('Europe/Stockholm');
for (var i = 0; i < NUMBER_OF_INCIDENTS; i++) {
    idx = Math.floor(Math.random() * short_desc.length);
    var records = new GlideRecord('sn_customerservice_case');
    records.setWorkflow(false); //skip business rules and notifications
    //   records.autoSysFields(false);
    //records.initialize();  //slow
    records.newRecord();     // fast
    //Create new date and time with random date back in time
    var gdt = new GlideDateTime();
    var days = Math.floor(Math.random() * MAX_DAYS_BACK_IN_TIME);
    gdt.addDaysUTC(-days);
    records.sys_created_on = gdt.getDisplayValue();
    records.opened_at = gdt.getDisplayValue();
    //  gs.debug("opened: "+days + " " + gdt)

    records.state = states[Math.floor(Math.random() * states.length)];
    var randShort = Math.floor(Math.random() * short_desc[idx].length);
    //gs.info("randShort: "+randShort);
    records.short_description = short_desc[idx][randShort];
    records.category = categories[Math.floor(Math.random() * categories.length)];
    records.caller_id = caller[Math.floor(Math.random() * 3)];
    records.assignment_group = assign[0]; //Customer Service Support
    records.description = '';
    records.reassignment_count = (idx % 5 == 0) ? 3 : 0;
    records.contact_type = _channel[Math.floor(Math.random() * _channel.length)];
    records.assigned_to = agent[Math.floor(Math.random() * agent.length)];

    records.comments = "Thank you for contacting the support desk. Could you please provide the support contract number for us?";
    records.work_notes = "While waiting for the contract number, I have contactec level 2 support desk for instance check and if there any issue related to customer server instance.";

    //CSM specific
    records.account = account[0];
    records.contact = contact[0];
    //If state is Resolved or Closed update record data
    if (records.state >= 6) {
        setIncidentToResolvedClosed(records, gdt, days);
    } else {
        records.active = true;
    }

    records.priority = Math.floor(Math.random() * 4) + 1;
    records.insert();
    gs.info("#" + i + " STATE: " + records.state + " " + records.short_description + " Opened at: " + records.opened_at + " - " + records.closed_at);
}


//Set Incident to Resolved or Closed with PA support
function setIncidentToResolvedClosed(rec, gdt, days) {
    var closedays = -1;
    //if(days>=MAX_SPAN_OPEN_DAYS) { //10 days in past lets randomize close day
    closedays = Math.floor(Math.random() * (days % MAX_OPEN_DAYS)) % MAX_DAYS_BACK_IN_TIME;  //max 15 days
    closeDate = gdt;  //update close date 
    closeDate.addDaysUTC(closedays);
    //}
    rec.active = false;
    rec.closed_at = closeDate.getDisplayValue();
    rec.resolved_at = closeDate.getDisplayValue();
    rec.close_code = 'Solution provided';
    rec.close_notes = 'Customer did a reboot to fix the issue. After the reboot everything is working as expected. User will contact the service desk again if the issue persist.';
    gs.debug(': ' + rec.short_description + "open: " + records.opened_at + " close : " + closedays + " " + closeDate);
}

function getRecorSysId(tableName, fieldName, fieldValue) {
    // GlideRecord to query the table
    var gr = new GlideRecord(tableName);
    gr.addQuery(fieldName, fieldValue);
    gr.query();
    // Check if the record exists and get the sys_id
    if (gr.next()) {
        gs.print('Record found ' + gr.sys_id + ' ' + fieldValue);
        return gr.sys_id;
    }
    gs.print('No record found with ' + fieldName + ' = ' + fieldValue);
    return null;
}

// Function to check if a reference is valid
function isValidReference(reference, referenceTable) {
    var refGr = new GlideRecord(referenceTable);
    return refGr.get(reference) && refGr.isValidRecord();
}
