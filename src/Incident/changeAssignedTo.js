// Define the original and new assignee names
var originalAssignee = 'Beth Anglin'; // Replace with current assignee's name
var newAssignee = 'Laxmi Analyst';    // Replace with new assignee's name

var originalAssigneeSysId = '46d44a23a9fe19810012d100cca80666'; // Replace with current assignee's name
var newAssigneeSysId = '85c11d65dba254501eebd514ca961933';    // Replace with new assignee's name



// Get the sys_id of the new assignee
var newUserGR = new GlideRecord('sys_user');
newUserGR.addQuery('name', newAssignee);
newUserGR.query();

if (newUserGR.next()) {
    var newUserSysId = newUserGR.getValue('sys_id');

    // Query incidents assigned to the original assignee
    var incidentGR = new GlideRecord('incident');
    //  incidentGR.addQuery('assigned_to.name', originalAssignee);
    incidentGR.addQuery('assigned_to', originalAssigneeSysId);
    incidentGR.query();

    var count = 0;
    while (incidentGR.next()) {
        incidentGR.setWorkflow(false); //skip business rules and notifications
        //incidentGR.assigned_to = newUser;
        incidentGR.assigned_to = newUserSysId;
        incidentGR.update();
        count++;
    }

    gs.print('Updated ' + count + ' incidents from "' + originalAssignee + '" to "' + newAssignee + '".');
} else {
    gs.print('New assignee "' + newAssignee + '" not found.');
}
