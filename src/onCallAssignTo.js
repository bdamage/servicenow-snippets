//*****************************************************************************
// Assign unassigned incident to the current on-call person for the specified
// group.
//*****************************************************************************
onCallAssign();
function onCallAssign() {
    var userID;
    var userName;
    var number = 'INC0018927';
    var incidentGR = new GlideRecord("incident");
    incidentGR.addQuery('number', number);
    incidentGR.query();
    if (incidentGR.next()) {
        var rota = new OnCallRotation();
        rota.who(incidentGR.assignment_group);
        if (rota.next()) {
            // if this is a device notification, we can only assign if there is a primary user
            // there is no primary user if this is a manual rota, so just skip it in that case
            if (rota.getType() == 'device') {
                userID = rota.getPrimaryUser();
                userName = rota.getPrimaryUserName();
            } else {
                userID = rota.getUser();
                userName = rota.getUserName();
            }

            if (!userID) {
                return;
            }

            incidentGR.assigned_to = userID;
            incidentGR.update();
            gs.addInfoMessage("Automatically assigned to on-call: " + userName);
        }
    }
}   