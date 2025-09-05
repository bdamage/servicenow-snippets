
// Define the table and reference fields
var tableName = 'incident'; // Replace with your table name
var referenceFields = {
    'assignment_group': 'sys_user_group', // Replace with your reference fields and corresponding reference tables
    'cmdb_ci': 'cmdb_ci',
    'business_service': 'cmdb_ci_service'
};
// Function to check if a reference is valid
function isValidReference(reference, referenceTable) {
    var refGr = new GlideRecord(referenceTable);
    return refGr.get(reference) && refGr.isValidRecord();
}
// GlideRecord to query the table
var gr = new GlideRecord(tableName);
gr.query();
var count = 0;
// Iterate through the records
while (gr.next() && count < 7000) {
    var isInvalid = false;

    // Check each reference field
    for (var field in referenceFields) {
        if (gr.getValue(field) != null) {
            if (!isValidReference(gr.getValue(field), referenceFields[field])) {
                isInvalid = true;
                gs.print('' + gr.getDisplayValue("number") + ' Invalid reference : ' + field + '(' + gr.getValue(field) + ') for record sys_id: ' + gr.sys_id);
                break;
            }
        }
    }

    // Delete the record if any reference is invalid
    if (isInvalid) {
        gr.deleteRecord();
        count++;
    }
}
gs.print('Total records deleted: ' + count);
