
// Function to add a role to a user
function addRoleToUser(userId, roleName) {
    var role = new GlideRecord('sys_user_role');
    role.addQuery('name', roleName);
    role.query();

    if (role.next()) {
        var userRole = new GlideRecord('sys_user_has_role');
        userRole.initialize();
        userRole.user = userId;
        userRole.role = role.sys_id;
        var userRoleId = userRole.insert();

        if (userRoleId) {
            gs.info('Role ' + roleName + ' assigned to user with Sys ID: ' + userId);
            return userRoleId;
        } else {
            gs.error('Failed to assign role ' + roleName + ' to user with Sys ID: ' + userId);
            return null;
        }
    } else {
        gs.error('Role ' + roleName + ' not found');
        return null;
    }
}