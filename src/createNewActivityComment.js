

updateRecord();

function updateRecord() {
    var now_GR = new GlideRecord("incident");
    now_GR.addQuery("sys_id", getRecorSysId('incident', 'number', 'INC0018664'));
    now_GR.query();
    if (now_GR.next()) {
        now_GR.comments.setJournalEntry("Thanks for report the defect #456001.\nWe will investigate into the issue.", getRecorSysId('sys_user', 'user_name', 'jira.dev'));
        now_GR.update();
    }
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