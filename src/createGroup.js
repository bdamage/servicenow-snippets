// Function to create a new group
function createGroup(groupName, groupDescription) {
    var group = new GlideRecord('sys_user_group');
    group.initialize();
    group.name = groupName;
    group.description = groupDescription;
    var groupId = group.insert();

    if (groupId) {
        gs.info('Group ' + groupName + ' created with Sys ID: ' + groupId);
        return groupId;
    } else {
        gs.error('Failed to create group ' + groupName);
        return null;
    }
}
//createGroup("Software", "Department that handles all software related incidents");
//createGroup("Hardware", "Department that handles all hardware related incidents");
//createGroup("IT Securities", "Department that handles all hardware related incidents");
createGroup("IT Service Desk", "Department that handles all hardware related incidents");
