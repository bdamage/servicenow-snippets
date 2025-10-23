var originalAssignee = 'Beth Anglin'; // Replace with current assignee's name
// Get the sys_id of the new assignee
var oldUserGR = new GlideRecord('sys_user');
oldUserGR.addQuery('name', originalAssignee);
oldUserGR.query();
if (oldUserGR.next()) {
    var oldUserSysId = oldUserGR.getValue('sys_id');
    var workItem = new GlideRecord('awa_work_item');
    workItem.addEncodedQuery('assigned_to=' + oldUserSysId);
    workItem.query();
    while (workItem.next()) {
        workItem.deleteMultiple();
    }
} else {
    gs.print('User "' + originalAssignee + '" not found.');
}

