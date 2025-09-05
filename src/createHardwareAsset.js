


createHardwareAsset("MacBook 15", "S123456789", "A1005", getRecordSysId("cmn_location", "name", "San Diego"));

function createHardwareAsset(assetName, serialNumber, assetTag, locationId) {

    // Create a new record in the cmdb_ci_hardware table
    var hardwareAsset = new GlideRecord('cmdb_ci_computer');
    hardwareAsset.initialize();
    // Set field values
    hardwareAsset.name = assetName;            // Name of the hardware asset
    hardwareAsset.serial_number = serialNumber; // Serial number
    hardwareAsset.asset_tag = assetTag;         // Asset tag
    hardwareAsset.location = locationId;        // Location (sys_id of the location record)
    // Insert the new record into the database
    var sys_id = hardwareAsset.insert();

    if (sys_id) {
        gs.info("New hardware asset created with Sys ID: " + sys_id);
        return sys_id; // Return the Sys ID of the new hardware asset CI
    } else {
        gs.error("Failed to create hardware asset.");
        return null;
    }

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
