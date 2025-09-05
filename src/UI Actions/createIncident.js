


function generateIncident() {
    g_form.addInfoMessage("Populating data into fields.");

    //set description and short description with text
    g_form.setValue('description', 'Now it has happened again. We need urgent fix of this. At approximately 9:00 AM on October 21, 2023, multiple remote employees reported they were unable to connect to the company\'s internal network using the corporate VPN (Virtual Private Network). These employees were distributed in various geographical regions, indicating that the issue wasn\'t localized to one specific area. Extremly frustrating problem.');
    g_form.setValue('short_description', 'Problem with my VPN connection');
    g_form.setValue('description', g_form.getValue('description') + '\n\nUsers received an error message stating, "Connection Timeout" when trying to establish a VPN connection.' +
        'Repeated attempts to connect were unsuccessful.' +
        'Internet connections were verified to be working, as users could access other online resources without issues.' +
        'The VPN client software didn\'t report any updates or patches needed.');
    //set caller id to Abel Tutor
    g_form.setValue('caller_id', '62826bf03710200044e0bfc8bcbe5df1');
    //set priority to 1 - Critical
    g_form.setValue('priority', '1');
    //set state to New
    g_form.setValue('state', '1');
    //set category to Hardware
    g_form.setValue('category', 'Software');
    //set assigned to to Abel Tuter
    //g_form.setValue('assigned_to', 'dummysysid012345dummysysid012345');
    //set assignment group to Hardware
    g_form.setValue('assignment_group', '8a4dde73c6112278017a6a4baf547aa7');

}
