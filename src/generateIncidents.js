
var SIMULATE = true;  //No insert of new record - FALSE to check no missing references to inserting new records
var RESOLVED_ONLY = true;     //enable this for creating records for Task Intelligence / Predictive Intelligence
var NUMBER_OF_INCIDENTS = 20;
var MAX_MAJOR_INCIDENTS = 1;
var MAX_DAYS_BACK_IN_TIME = 34;
var MAX_OPEN_DAYS = 14;
var short_desc = [];
var assign = [];
var caller = [];
var agent = [];
var category = [];
//Cache for faster loopkup
const groupServiceDesk = getRecordSysId('sys_user_group', 'name', 'Service Desk');


const groupSecurity = getRecordSysId('sys_user_group', 'name', 'IT Securities');
const groupHardware = getRecordSysId('sys_user_group', 'name', 'Hardware');
const groupSoftware = getRecordSysId('sys_user_group', 'name', 'Software');
const groupNetwork = getRecordSysId('sys_user_group', 'name', 'Network');
const groupITOMrockstars = getRecordSysId('sys_user_group', 'name', 'ITOM Rockstars Support');


caller[0] = getRecordSysId('sys_user', 'user_name', 'abraham.lincoln');
caller[1] = getRecordSysId('sys_user', 'user_name', 'abel.tuter');
caller[2] = getRecordSysId('sys_user', 'user_name', 'fred.luddy');
agent[0] = getRecordSysId('sys_user', 'user_name', 'beth.anglin');
agent[1] = getRecordSysId('sys_user', 'user_name', 'david.loo');
agent[2] = getRecordSysId('sys_user', 'user_name', 'laxmi.analyst');
agent[3] = getRecordSysId('sys_user', 'user_name', 'amelia.bryant');
var admin = getRecordSysId('sys_user', 'user_name', 'admin');
var cmdb_ci_dell = getRecordSysId('cmdb_ci', 'name', 'Dell Wireless WLAN Utility');
var cmdb_ci_sap = getRecordSysId('cmdb_ci', 'name', 'SAP AppSRV01');
var cmdb_ci_email = getRecordSysId('cmdb_ci', 'name', 'EXCH-SD-05');
var cmdb_ci_computer = getRecordSysId('cmdb_ci_computer', 'name', 'Apple - MacBook Pro 15" for Technical Staff');
//var cmdb_ci_computer = getRecordSysId('cmdb_ci_computer', 'name', 'Apple - MacBook Pro 15"');
var cmdb_ci_service_email = getRecordSysId('cmdb_ci_service', 'name', 'Email');
var cmdb_ci_service_erp = getRecordSysId('cmdb_ci_service', 'name', 'IT Services');
var cmdb_ci_service_order = getRecordSysId('cmdb_ci_service', 'name', 'Order Status');
var cmdb_ci_service_logistics = getRecordSysId('cmdb_ci_service', 'name', 'Logistics');

var _channel = ["email", "phone", "self-service", "chat", "virtual_agent"];

const record = [
    {
        short_desc: ["need access to power bi", "I want to request access to Power BI", "how do I get access to power bi?", "locked out from Logistics", "Locked out from Logistics system", "Is Logistics system down?", "Can't access to Logistics System", "no respone from logistics system", "I want access to Logistics system", "Can't access to Corporate Logistics System", "Logistics system is very slow when updating records of data"],
        descr: ["user is locked out.", "", "User is a new hire and want to access to Logistics system", "User is reporting that from their location that they don't have access to Logistics system but can connect outside internet."],
        work_notes: 'Informed the user to use the self service portal.',
        comments: 'Please use self service for account lock out.',
        resolution_notes: '',
        category: "software",
        assignment_group: groupSoftware,
        caller: '', agent: '', services: cmdb_ci_service_logistics, ci: cmdb_ci_service_logistics
    },
    {
        short_desc: ["can't connect to order status from our location in Sweden", "can not connect to order status", "no respone from Order Status", "Order Status is blank", "Order status is showing blank screen", "Order Status seems down", "Order Status system is down", "can't access order system", "User reporting that order status is not working.", "need access to Order Status", "request access to order Status"],
        descr: ["User reporting that order status is slow or down.", "", "User reporting that order status is down."],
        work_notes: 'Informed the user we investigating if there any known outages.',
        comments: 'Thank. you for reaching out to support, we are investigating the issue of order portal system if there any known errorr or outages.',
        resolution_notes: 'Escalted to the on call team and they did resolve with a restart of background process.',
        category: "software",
        assignment_group: groupITOMrockstars,
        caller: '', agent: '', services: cmdb_ci_service_order, ci: ''
    },
    {
        short_desc: ["Can't see any image on the monitor.", "My laptop screen is broken", "Locked out from Logistics", "broken keyboard", "computer display is blank", "no image on the laptop", "dropped my laptop now the screen is broken"],
        descr: ["User said the cable between laptop and screen is old.", ""],
        work_notes: 'Informed the user we investigating the inventory of new hardware.',
        comments: 'Thank. you for reaching out to support, we are looking into the inventory for possible new hardware.',
        resolution_notes: 'Replaced the laptop with a new laptop and a new replaced HDMI cable.',
        category: "hardware",
        assignment_group: groupHardware,
        caller: '', agent: '', services: '', ci: cmdb_ci_computer
    },
    {
        short_desc: ["VPN connectivity issue.", "problem with VPN", "vpn client shows an error 30012", "a error message appears wehn starting VPN", "VPN and error", "vpn doesn't work", "vpn problem", "vpn doesn't work", "I have vpn 3.0"],
        descr: ["User said the cable between laptop and screen is old.", ""],
        work_notes: 'Informed the user we investigating if there any known outages of VPN services but alsow asked for confirmation around VPN client version.',
        comments: 'Can you please confirm if you are running VPN client version 3.0?',
        resolution_notes: 'End user upgraded to VPN client version 3.1 and that resolved the issue.',
        category: "software",
        assignment_group: groupSoftware,
        caller: '', agent: '', services: '', ci: cmdb_ci_computer
    },
    {
        short_desc: ["Request for ERP software license", "do we have additional user license fo our ERP?"],
        descr: ["End user can't access the ERP system software ", ""],
        work_notes: 'Informed the user we investigating if there any known licenses issues related to ERP access.',
        comments: 'Can you please confirm if you are running ERP client version 10.0 or newer?',
        resolution_notes: 'End user upgraded to erp client version 10.1 and that resolved the issue.',
        category: "software",
        assignment_group: groupSoftware,
        caller: '', agent: '', services: '', ci: cmdb_ci_computer
    },
    {
        short_desc: ["wifi connectivity issue.", "problem with wi-fi", "wi-fi client shows an error 30012", "a error message appears wehn starting Wifi", "Wifi and error", "Wifi doesn't work", "WiFi problem", "WiFi doesn't work", "I have a WiFi 802.11ax", "no wifi signal"],
        descr: ["User said the cable between laptop and physical newtork cabel is working. But are seeing an issue related to network. Access Points indicates all good.", ""],
        work_notes: 'Informed the user we investigating if there any known wifi firmware issues but alsow asked for confirmation around Wifi client version.',
        comments: 'Can you please confirm if you are running Wifi client version 2.0?',
        resolution_notes: 'End user upgraded to wifi client version 2.6.3 and that resolved the issue.',
        category: "software",
        assignment_group: groupNetwork,
        caller: '', agent: '', services: '', ci: cmdb_ci_computer
    },
];


for (var i = 0; i < NUMBER_OF_INCIDENTS; i++) {
    idx = Math.floor(Math.random() * record.length);
    rec = record[idx];
    var newRecord = new GlideRecord('incident');
    newRecord.setWorkflow(false); //skip business rules and notifications
    //   newRecord.autoSysFields(false);
    //newRecord.initialize();  //slow
    newRecord.newRecord();     // fast
    //Create new date and time with random date back in time
    var gdt = new GlideDateTime();
    var days = Math.floor(Math.random() * MAX_DAYS_BACK_IN_TIME);
    gdt.addDaysUTC(-days);
    newRecord.sys_created_on = gdt.getDisplayValue();
    newRecord.opened_at = gdt.getDisplayValue();
    //  gs.debug("opened: "+days + " " + gdt)
    if (RESOLVED_ONLY) {
        newRecord.state = 7;  //Closed for use with Automation Discovery
    } else {
        newRecord.state = Math.floor(Math.random() * 7) + 1; // 7;  // 6 - Resolved.       7 - Closed    
        //don't use unknown states and set it to In Progress
        if (newRecord.state == 4 || newRecord.state == 5)
            newRecord.state = 2;
    }
    newRecord.short_description = rec.short_desc[Math.floor(Math.random() * rec.short_desc.length)]; // rec.short_desc;
    newRecord.description = rec.descr[Math.floor(Math.random() * rec.descr.length)]; //rec.desc;
    newRecord.category = rec.category;
    newRecord.caller_id = (rec.caller === '') ? caller[Math.floor(Math.random() * caller.length)] : getRecordSysId('sys_user', 'user_name', rec.caller);
    newRecord.assignment_group = rec.assignment_group;

    newRecord.reassignment_count = (idx % 3 == 0) ? Math.floor(Math.random() * 10) : 0;  //generate reassing data for dashboards
    newRecord.contact_type = _channel[Math.floor(Math.random() * _channel.length)];
    newRecord.assigned_to = (rec.caller === '') ? agent[Math.floor(Math.random() * agent.length)] : getRecordSysId('sys_user', 'user_name', rec.agent);
    newRecord.business_service = rec.services;
    newRecord.cmdb_ci = rec.ci;

    newRecord.work_notes = (rec.work_notes !== '') ? rec.work_notes : "Technician updated hardware configuration.";
    newRecord.comments = (rec.comments !== '') ? rec.comments : "User is informed about the update of VPN client to 3.1.";

    newRecord.impact = Math.floor(Math.random() * 3) + 1;
    newRecord.urgency = Math.floor(Math.random() * 3) + 1;
    //If state is Resolved or Closed update record data
    if (newRecord.state >= 6) {
        // setIncidentToResolvedClosed(newRecord,gdt,days);
        var closedays = -1;
        //if(days>=MAX_SPAN_OPEN_DAYS) { //10 days in past lets randomize close day
        closedays = Math.floor(Math.random() * (days % MAX_OPEN_DAYS)) % MAX_DAYS_BACK_IN_TIME;  //max 15 days
        closeDate = gdt;  //update close date 
        closeDate.addDaysUTC(closedays);
        //}
        newRecord.active = false;
        newRecord.sys_updated_on = closeDate.getDisplayValue(); //required for Fixed Cost Metric to trigger
        newRecord.closed_at = closeDate.getDisplayValue();
        newRecord.resolved_at = closeDate.getDisplayValue();
        newRecord.close_code = 'Solution provided';
        newRecord.close_notes = (rec.resolution_notes === '') ? 'User rebooted their PC to fix this. They will get back if the issue persist.' : rec.resolution_notes;
        gs.debug("RESOLVED open: " + newRecord.opened_at + " close : " + closedays + " " + closeDate);
    } else {
        newRecord.active = true;
    }
    gs.debug(idx + ': ' + newRecord.short_description + ' cat:[' + newRecord.category + ']' + ' assign:[' + newRecord.assignment_group + ']');
    if (SIMULATE != true)
        newRecord.insert();
}
//Set Incident to Resolved or Closed with PA support
function setIncidentToResolvedClosed(_rec, gdt, days) {
    var closedays = -1;
    //if(days>=MAX_SPAN_OPEN_DAYS) { //10 days in past lets randomize close day
    closedays = Math.floor(Math.random() * (days % MAX_OPEN_DAYS)) % MAX_DAYS_BACK_IN_TIME;  //max 15 days
    closeDate = gdt;  //update close date 
    closeDate.addDaysUTC(closedays);
    //}
    _rec.active = false;
    _rec.sys_updated_on = closeDate.getDisplayValue(); //required for Fixed Cost Metric to trigger
    _rec.closed_at = closeDate.getDisplayValue();
    _rec.resolved_at = closeDate.getDisplayValue();
    _rec.close_code = 'Solution provided';
    _rec.close_notes = rec.resolution_notes;
    gs.debug(': ' + _rec.short_description + "open: " + _rec.opened_at + " close : " + closedays + " " + closeDate);
}

function getRecordSysId(tableName, fieldName, fieldValue) {
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
