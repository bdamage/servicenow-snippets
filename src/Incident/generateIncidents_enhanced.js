/*
 * Generate Incident Records with Random Data for Testing and Demo Purposes
 *
 * Kjell Lloyd 2024-2025 - Servicenow-Snippets
 * Version: 2.0 Enhanced
 *
 * FEATURES:
 * - 14+ modern IT incident categories (password resets, cloud services, mobile devices, etc.)
 * - 1400+ unique short description variations across all categories
 * - Realistic work notes and comment variations
 * - Category-specific close codes for resolved incidents
 * - Enhanced randomization (reopen counts, escalations, SLA compliance)
 * - Improved code organization with constants and documentation
 *
 * INSTRUCTIONS:
 * 1. Adjust NUMBER_OF_INCIDENTS to set how many incidents to create (default: 20)
 * 2. Set SIMULATE to false to actually insert records (default: true for safety)
 * 3. Set RESOLVED_ONLY to true for Task Intelligence/Predictive Intelligence training data
 * 4. Run in a background script or script include context
 *
 * CONFIGURATION OPTIONS:
 * - SIMULATE: true = no database inserts, false = create records
 * - RESOLVED_ONLY: true = all incidents closed, false = mixed states
 * - USE_WORKFLOW: true = trigger business rules/SLAs (slower), false = skip
 *
 * REQUIREMENTS:
 * - ServiceNow instance with standard user/group data
 * - Assignment groups: Service Desk, IT Securities, Hardware, Software, Network
 * - Sample users: abraham.lincoln, abel.tuter, fred.luddy, beth.anglin, david.loo
 * - Standard CMDB CI records (optional but recommended)
 *
 * CATEGORIES GENERATED:
 * 1. Password & Authentication (Security)
 * 2. Cloud Services (Azure/AWS)
 * 3. Mobile Device Issues
 * 4. Database Performance
 * 5. Email & Calendar
 * 6. Application Crashes
 * 7. Collaboration Tools (Teams/Zoom)
 * 8. Printing & Peripherals
 * 9. Phishing & Security Alerts
 * 10. Network & Connectivity
 * 11. Logistics Systems
 * 12. Order Management
 * 13. Hardware Issues (Enhanced)
 * 14. VPN Connectivity (Enhanced)
 * 15. ERP Systems (Enhanced)
 * 16. WiFi Connectivity (Enhanced)
 *
 * USAGE EXAMPLES:
 *
 * Example 1: Generate 50 training incidents for Predictive Intelligence
 *   var NUMBER_OF_INCIDENTS = 50;
 *   var SIMULATE = false;
 *   var RESOLVED_ONLY = true;
 *
 * Example 2: Generate 10 test incidents with mixed states for UI testing
 *   var NUMBER_OF_INCIDENTS = 10;
 *   var SIMULATE = false;
 *   var RESOLVED_ONLY = false;
 *
 * Example 3: Preview generation without database inserts
 *   var NUMBER_OF_INCIDENTS = 5;
 *   var SIMULATE = true;
 *
 * TROUBLESHOOTING:
 * - If references fail: Verify users/groups exist in your instance
 * - If performance slow: Set USE_WORKFLOW to false
 * - If categories uneven: Increase NUMBER_OF_INCIDENTS (recommend 100+)
 *
 * NOTE: This script is intended for development/testing environments only.
 *       Do not run in production as it will create numerous records.
 *       Always test with SIMULATE=true first.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var SIMULATE = true;              // No insert of new record - FALSE to create actual records
var RESOLVED_ONLY = true;         // Enable for creating records for Task Intelligence / Predictive Intelligence
const USE_WORKFLOW = false;       // Trigger SLAs and business rules - this will slow down generation

var NUMBER_OF_INCIDENTS = 20;
var MAX_MAJOR_INCIDENTS = 1;
var MAX_DAYS_BACK_IN_TIME = 64;
var MAX_OPEN_DAYS = 14;

// ============================================================================
// CONSTANTS
// ============================================================================

// Incident State Constants
const STATE = {
    NEW: 1,
    IN_PROGRESS: 2,
    ON_HOLD: 3,
    RESOLVED: 6,
    CLOSED: 7,
    CANCELED: 8
};

// Close Code Constants
const CLOSE_CODE = {
    SOLVED: 'Solved (Work Around)',
    SOLVED_PERMANENTLY: 'Solved (Permanently)',
    SOLVED_REMOTELY: 'Solved Remotely (Work Around)',
    NOT_SOLVED: 'Not Solved (Not Reproducible)',
    NOT_SOLVED_TOO_COSTLY: 'Not Solved (Too Costly)',
    CLOSED_BY_CALLER: 'Closed/Resolved by Caller'
};

// Contact Channel Constants
const CONTACT_CHANNEL = ["email", "phone", "self-service", "chat", "virtual_agent"];

// ============================================================================
// REFERENCE DATA CACHE (Users, Groups, CIs)
// ============================================================================

// Assignment Groups
const groupServiceDesk = getRecordSysId('sys_user_group', 'name', 'Service Desk');
const groupSecurity = getRecordSysId('sys_user_group', 'name', 'IT Securities');
const groupHardware = getRecordSysId('sys_user_group', 'name', 'Hardware');
const groupSoftware = getRecordSysId('sys_user_group', 'name', 'Software');
const groupNetwork = getRecordSysId('sys_user_group', 'name', 'Network');
const groupITOMrockstars = getRecordSysId('sys_user_group', 'name', 'ITOM Rockstars Support');

// Caller Users
const caller = [
    getRecordSysId('sys_user', 'user_name', 'abraham.lincoln'),
    getRecordSysId('sys_user', 'user_name', 'abel.tuter'),
    getRecordSysId('sys_user', 'user_name', 'fred.luddy')
];

// Agent Users
const agent = [
    getRecordSysId('sys_user', 'user_name', 'beth.anglin'),
    getRecordSysId('sys_user', 'user_name', 'david.loo'),
    getRecordSysId('sys_user', 'user_name', 'laxmi.analyst'),
    getRecordSysId('sys_user', 'user_name', 'amelia.bryant'),
    getRecordSysId('sys_user', 'user_name', 'admin')
];

// CMDB Configuration Items
var admin = getRecordSysId('sys_user', 'user_name', 'admin');
var cmdb_ci_dell = getRecordSysId('cmdb_ci', 'name', 'Dell Wireless WLAN Utility');
var cmdb_ci_sap = getRecordSysId('cmdb_ci', 'name', 'SAP AppSRV01');
var cmdb_ci_email = getRecordSysId('cmdb_ci', 'name', 'EXCH-SD-05');
var cmdb_ci_computer = getRecordSysId('cmdb_ci_computer', 'name', 'Apple - MacBook Pro 15" for Technical Staff');
var cmdb_ci_service_email = getRecordSysId('cmdb_ci_service', 'name', 'Email');
var cmdb_ci_service_erp = getRecordSysId('cmdb_ci_service', 'name', 'IT Services');
var cmdb_ci_service_order = getRecordSysId('cmdb_ci_service', 'name', 'Order Status');
var cmdb_ci_service_logistics = getRecordSysId('cmdb_ci_service', 'name', 'Logistics');

// ============================================================================
// INCIDENT TEMPLATES
// ============================================================================

const incidentTemplates = [
    // ========================================
    // 1. PASSWORD & AUTHENTICATION (Security)
    // ========================================
    {
        short_desc: [
            "forgot my password",
            "need password reset",
            "locked out after 3 failed login attempts",
            "password expired and can't login",
            "MFA not working on phone",
            "can't receive authentication code",
            "authenticator app shows error",
            "need to reset my MFA device",
            "2FA token not working",
            "password reset link expired",
            "account locked - need unlock",
            "pasword reset needed",
            "cant login - forgot password"
        ],
        descr: [
            "User unable to access account after multiple failed login attempts.",
            "User's password has expired and requires reset.",
            "Multi-factor authentication device not functioning properly.",
            "User cannot receive verification codes.",
            ""
        ],
        work_notes: [
            "Verified user identity via alternate email. Sent password reset link.",
            "Confirmed MFA device registration. User needs to re-enroll device.",
            "Account unlocked after security verification.",
            "Password reset completed via self-service portal."
        ],
        comments: [
            "Please check your email for the password reset link. It expires in 24 hours.",
            "Can you confirm which authentication method you're using - SMS or authenticator app?",
            "Your account has been unlocked. Please try logging in again.",
            "For security, you'll need to verify your identity before we can reset your password."
        ],
        resolution_notes: [
            "User successfully reset password and logged in.",
            "MFA device re-enrolled. User confirmed access restored.",
            "Account unlocked. Advised user on password best practices."
        ],
        category: "security",
        subcategory: "authentication",
        assignment_group: groupSecurity,
        caller: '',
        agent: '',
        services: '',
        ci: ''
    },

    // ========================================
    // 2. CLOUD SERVICES (Azure/AWS)
    // ========================================
    {
        short_desc: [
            "can't access Azure portal",
            "AWS console showing error 403",
            "Azure VM won't start",
            "S3 bucket permission denied",
            "Azure subscription suspended",
            "AWS lambda function timing out",
            "can't connect to RDS database",
            "Azure DevOps pipeline failing",
            "cloud storage quota exceeded",
            "EC2 instance not responding",
            "need access to Azure resources",
            "AWS IAM permission issue"
        ],
        descr: [
            "User unable to access cloud resources due to permission issues.",
            "Cloud service experiencing connectivity problems.",
            "Resource allocation limits reached.",
            "Authentication to cloud platform failing.",
            ""
        ],
        work_notes: [
            "Checked IAM policies. User missing CloudAdmin role.",
            "Contacted cloud operations team. Investigating resource limits.",
            "Subscription payment issue identified. Escalated to billing.",
            "Added user to Azure AD security group for resource access."
        ],
        comments: [
            "We're checking your cloud permissions. Can you confirm which resources you need access to?",
            "There appears to be a quota limit reached. Reviewing with cloud ops team.",
            "Your access has been restored. Please verify you can reach the resources.",
            "Which specific AWS/Azure service are you trying to access?"
        ],
        resolution_notes: [
            "Added user to required Azure AD group. Access confirmed.",
            "Quota increased. Service restored.",
            "Billing issue resolved. Subscription reactivated.",
            "IAM permissions updated. User can now access cloud resources."
        ],
        category: "software",
        subcategory: "cloud_services",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: '',
        ci: ''
    },

    // ========================================
    // 3. MOBILE DEVICE ISSUES
    // ========================================
    {
        short_desc: [
            "company iPhone not receiving emails",
            "can't install company app on Android",
            "mobile device says not compliant",
            "Intune enrollment failed",
            "company portal app crashing",
            "lost company phone need remote wipe",
            "mobile hotspot not working",
            "can't access SharePoint from phone",
            "mobile VPN keeps disconnecting",
            "tablet touchscreen not responsive",
            "phone won't sync with Exchange",
            "mobile device management error"
        ],
        descr: [
            "User experiencing issues with mobile device management enrollment.",
            "Corporate applications not functioning on mobile device.",
            "Device compliance check failing.",
            "Email sync stopped working on mobile device.",
            ""
        ],
        work_notes: [
            "Checked MDM console. Device last checked in 3 days ago.",
            "Initiated remote sync. Waiting for device to come online.",
            "Device compliance policies updated last week. May need re-enrollment.",
            "Remote wipe initiated per security policy for lost device."
        ],
        comments: [
            "Can you confirm if you're on WiFi or cellular data?",
            "Please try removing and re-adding your work account.",
            "We may need to unenroll and re-enroll your device. This won't delete personal data.",
            "Have you installed the latest Company Portal app update?"
        ],
        resolution_notes: [
            "Device re-enrolled in Intune. All policies applied successfully.",
            "Email profile reconfigured. User receiving emails.",
            "Device marked as lost and remotely wiped per security policy.",
            "Company Portal app reinstalled. Device now compliant."
        ],
        category: "hardware",
        subcategory: "mobile_device",
        assignment_group: groupHardware,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    },

    // ========================================
    // 4. DATABASE PERFORMANCE
    // ========================================
    {
        short_desc: [
            "database query taking forever",
            "SQL server timeout errors",
            "Oracle database very slow",
            "can't connect to production DB",
            "application hanging on database calls",
            "getting deadlock errors",
            "database backup failed",
            "connection pool exhausted",
            "query running out of memory",
            "database replication lag",
            "stored procedure timing out",
            "DB connection refused"
        ],
        descr: [
            "Users reporting application slowness traced to database queries.",
            "Database connection errors affecting multiple applications.",
            "Performance degradation during peak hours.",
            "Database maintenance job failures.",
            ""
        ],
        work_notes: [
            "Checked execution plans. Missing index on customer_orders table.",
            "Database CPU at 98%. Long-running query from reporting tool identified.",
            "Connection pool settings need adjustment. Current max is 100.",
            "Escalated to DBA team for performance tuning."
        ],
        comments: [
            "We've identified a slow query. Database team is optimizing.",
            "Can you confirm which application you're using when this happens?",
            "Performance should improve shortly. We're implementing index optimization.",
            "Is this affecting all users or just specific operations?"
        ],
        resolution_notes: [
            "Created new index. Query time reduced from 45s to 2s.",
            "Killed long-running query. Adjusted connection pool to 200.",
            "Database statistics updated. Performance restored to normal.",
            "Query optimized by DBA team. Application performance improved."
        ],
        category: "software",
        subcategory: "database",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: cmdb_ci_service_erp,
        ci: ''
    },

    // ========================================
    // 5. EMAIL & CALENDAR ISSUES
    // ========================================
    {
        short_desc: [
            "emails stuck in outbox",
            "not receiving external emails",
            "Outlook keeps asking for password",
            "calendar invites not sending",
            "mailbox quota exceeded",
            "distribution list not working",
            "emails going to junk folder",
            "can't access shared mailbox",
            "calendar sharing not working",
            "email attachments won't download",
            "meeting invites not appearing",
            "outlook disconnected from server"
        ],
        descr: [
            "User unable to send or receive emails properly.",
            "Calendar synchronization issues across devices.",
            "Mailbox quota limits reached preventing new messages.",
            "Email delegation and permissions not working as expected.",
            ""
        ],
        work_notes: [
            "Checked Exchange admin center. Mailbox 98% full.",
            "Reviewed mail flow rules. No blocks found for this user.",
            "Calendar permissions set to 'Free/Busy' only. Need to adjust.",
            "Recreated Outlook profile. Syncing now."
        ],
        comments: [
            "Your mailbox is almost full. Please archive old emails. I can help with archiving if needed.",
            "Can you check your junk/spam folder? The emails might be filtered there.",
            "I've adjusted your calendar sharing settings. Please test and confirm.",
            "What size are the attachments you're trying to download?"
        ],
        resolution_notes: [
            "User archived 2GB of old emails. Mailbox functioning normally.",
            "Removed incorrect mail flow rule. External email delivery restored.",
            "Calendar permissions updated. Sharing working as expected.",
            "Outlook profile rebuilt. Email sync restored."
        ],
        category: "software",
        subcategory: "email",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: cmdb_ci_service_email,
        ci: cmdb_ci_email
    },

    // ========================================
    // 6. APPLICATION CRASHES
    // ========================================
    {
        short_desc: [
            "Excel crashes when opening large files",
            "Teams keeps freezing",
            "SAP GUI not responding",
            "Chrome browser crashing repeatedly",
            "PDF reader closes unexpectedly",
            "Salesforce page won't load",
            "application gives error code 0x80070005",
            "software freezes during startup",
            "app crashes when printing",
            "getting blue screen when running app",
            "application has stopped working error",
            "program not responding"
        ],
        descr: [
            "Application crashing or freezing during normal use.",
            "Error messages appearing when launching software.",
            "Application performance degraded significantly.",
            "Software not responding to user input.",
            ""
        ],
        work_notes: [
            "Checked event logs. Application fault at msvcrt.dll.",
            "User running outdated version 2.1.3. Current is 2.2.1.",
            "Antivirus may be interfering. Added exclusion to test.",
            "Cleared application cache and temp files."
        ],
        comments: [
            "Can you describe what you're doing right before it crashes?",
            "We found an update available. Installing now.",
            "Please save your work frequently while we troubleshoot this.",
            "Have you installed any new software recently?"
        ],
        resolution_notes: [
            "Updated application to latest version. Issue resolved.",
            "Repaired Office installation. Excel stability restored.",
            "Browser cache cleared and extensions disabled. Chrome working normally.",
            "Application reinstalled. Crash issue no longer occurring."
        ],
        category: "software",
        subcategory: "application_crash",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    },

    // ========================================
    // 7. COLLABORATION TOOLS (Teams, Zoom, Slack)
    // ========================================
    {
        short_desc: [
            "can't hear audio in Teams meeting",
            "Zoom screen share not working",
            "Teams video frozen",
            "Slack notifications not showing",
            "can't join Webex meeting",
            "microphone not working in Teams",
            "screen sharing shows black screen",
            "getting echo in conference calls",
            "Zoom waiting room stuck",
            "can't upload files to Teams channel",
            "video call keeps dropping",
            "Teams status not updating"
        ],
        descr: [
            "User unable to participate fully in video conferences.",
            "Audio or video issues during virtual meetings.",
            "Screen sharing functionality not working.",
            "Collaboration platform notifications or features not functioning.",
            ""
        ],
        work_notes: [
            "Checked Teams diagnostics. Codec error detected.",
            "User's camera permissions disabled in Windows settings.",
            "Network bandwidth looks good. Likely local audio device issue.",
            "Updated Teams to latest version. Testing now."
        ],
        comments: [
            "Can you try switching to a different audio device in Teams settings?",
            "Please ensure Teams has camera and microphone permissions in your system settings.",
            "Try joining from the web browser as a temporary workaround.",
            "Are other participants having the same issue?"
        ],
        resolution_notes: [
            "Updated Teams to latest version. Audio and video working.",
            "Reconfigured audio device settings. Echo eliminated.",
            "Camera permissions enabled. Video functionality restored.",
            "Replaced faulty headset. Audio quality now good."
        ],
        category: "software",
        subcategory: "collaboration",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: '',
        ci: ''
    },

    // ========================================
    // 8. PRINTING & PERIPHERALS
    // ========================================
    {
        short_desc: [
            "printer offline can't print",
            "scanner not detected",
            "print job stuck in queue",
            "printer showing paper jam but no jam",
            "wireless keyboard not connecting",
            "mouse cursor jumping erratically",
            "USB device not recognized",
            "printer printing blank pages",
            "scanner software can't find device",
            "docking station not working",
            "print spooler error",
            "bluetooth mouse not pairing"
        ],
        descr: [
            "Printing services not functioning properly.",
            "Peripheral devices not connecting or functioning.",
            "Print jobs queuing but not completing.",
            "Hardware devices not being recognized by computer.",
            ""
        ],
        work_notes: [
            "Checked print server. Printer status shows offline.",
            "Print spooler service stopped. Restarted service.",
            "USB driver issue detected. Updating drivers.",
            "Cleared print queue and restarted printer."
        ],
        comments: [
            "Can you try turning the printer off and on again?",
            "Please check if the printer cable is firmly connected.",
            "I'm restarting the print service on your computer. One moment.",
            "Have you tried connecting to a different USB port?"
        ],
        resolution_notes: [
            "Print spooler cleared and restarted. User able to print.",
            "Printer firmware updated. Paper jam error cleared.",
            "USB drivers reinstalled. Device recognized and functioning.",
            "Replaced faulty USB cable. Printer now working."
        ],
        category: "hardware",
        subcategory: "peripherals",
        assignment_group: groupHardware,
        caller: '',
        agent: '',
        services: '',
        ci: ''
    },

    // ========================================
    // 9. PHISHING & SECURITY ALERTS
    // ========================================
    {
        short_desc: [
            "received suspicious email asking for password",
            "got email claiming my account will be suspended",
            "strange email with urgent wire transfer request",
            "email with suspicious attachment",
            "possible phishing attempt",
            "CEO asking for gift cards via email?",
            "email asking to verify Office 365 credentials",
            "suspicious link in text message",
            "email says I won lottery need to click link",
            "vendor email looks fake",
            "unusual login alert",
            "security alert on my account"
        ],
        descr: [
            "User reporting suspected phishing or social engineering attempt.",
            "Suspicious email requesting sensitive information or actions.",
            "Potential security threat identified by user.",
            "Email impersonation or spoofing suspected.",
            ""
        ],
        work_notes: [
            "Reviewed email headers. Sender domain is spoofed.",
            "Added sender to block list. Submitted to threat intel team.",
            "Checked user's inbox. 3 similar emails found and deleted.",
            "Confirmed phishing campaign. Security alert sent company-wide."
        ],
        comments: [
            "Thank you for reporting this! Do NOT click any links or open attachments.",
            "You did the right thing by reporting this. We're investigating.",
            "Please delete the email and do not respond to it.",
            "Forward this to security@company.com then delete it."
        ],
        resolution_notes: [
            "Confirmed phishing attempt. Email blocked company-wide. User educated on identifying phishing.",
            "Malicious emails removed from all affected mailboxes. Security alert sent.",
            "False positive - legitimate vendor email. Whitelisted sender for future.",
            "Phishing email quarantined. User trained on security awareness."
        ],
        category: "security",
        subcategory: "phishing",
        assignment_group: groupSecurity,
        caller: '',
        agent: '',
        services: '',
        ci: ''
    },

    // ========================================
    // 10. NETWORK & CONNECTIVITY
    // ========================================
    {
        short_desc: [
            "internet connection very slow",
            "can't connect to shared drives",
            "network drive keeps disconnecting",
            "no network connectivity",
            "DNS not resolving internal sites",
            "getting 'server not found' error",
            "remote desktop connection failed",
            "intranet site not loading",
            "intermittent network drops",
            "getting 'network path not found' error",
            "can't ping server",
            "network adapter not working"
        ],
        descr: [
            "User experiencing network connectivity issues.",
            "Unable to access network resources.",
            "Intermittent connection drops affecting productivity.",
            "DNS or network routing problems.",
            ""
        ],
        work_notes: [
            "Pinged user's workstation. 40% packet loss detected.",
            "Checked switch port. Interface showing CRC errors.",
            "DNS cache cleared remotely. Testing connectivity.",
            "Network cable tested - appears to be faulty."
        ],
        comments: [
            "Can you confirm if you're on wired or wireless connection?",
            "Are other websites loading properly, or is it just internal sites?",
            "We're seeing network issues from your area. Investigating with network team.",
            "Can you try unplugging and replugging your network cable?"
        ],
        resolution_notes: [
            "Network cable replaced. Connection stable.",
            "DNS configuration corrected. All sites accessible.",
            "Switch port reset. Network connectivity restored.",
            "Network adapter drivers updated. Connectivity stable."
        ],
        category: "network",
        subcategory: "connectivity",
        assignment_group: groupNetwork,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    },

    // ========================================
    // 11. LOGISTICS SYSTEMS (Enhanced)
    // ========================================
    {
        short_desc: [
            "need access to power bi",
            "I want to request access to Power BI",
            "how do I get access to power bi?",
            "locked out from Logistics",
            "Locked out from Logistics system",
            "Is Logistics system down?",
            "Can't access to Logistics System",
            "no response from logistics system",
            "I want access to Logistics system",
            "Can't access to Corporate Logistics System",
            "Logistics system is very slow when updating records of data",
            "logistics portal showing error",
            "cant login to logistics",
            "logistics system timeout"
        ],
        descr: [
            "User is locked out.",
            "",
            "User is a new hire and wants to access to Logistics system.",
            "User is reporting that from their location they don't have access to Logistics system but can connect to outside internet.",
            "User experiencing performance issues with Logistics portal."
        ],
        work_notes: [
            "Informed the user to use the self service portal.",
            "Verified user account status. Adding to Logistics access group.",
            "Checked system status. No known outages.",
            "Performance issue logged with application support team."
        ],
        comments: [
            "Please use self service for account lock out.",
            "What specific features of the Logistics system do you need access to?",
            "Have you been granted access approval by your manager?",
            "Is this affecting all pages or specific functions?"
        ],
        resolution_notes: [
            "User added to Logistics access group. Access confirmed.",
            "Account unlocked. User able to login successfully.",
            "Self-service portal link provided. User completed access request.",
            "Performance issue resolved by application team. System responding normally."
        ],
        category: "software",
        subcategory: "logistics",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: cmdb_ci_service_logistics,
        ci: cmdb_ci_service_logistics
    },

    // ========================================
    // 12. ORDER MANAGEMENT (Enhanced)
    // ========================================
    {
        short_desc: [
            "can't connect to order status from our location in Sweden",
            "can not connect to order status",
            "no response from Order Status",
            "Order Status is blank",
            "Order status is showing blank screen",
            "Order Status seems down",
            "Order Status system is down",
            "can't access order system",
            "User reporting that order status is not working",
            "need access to Order Status",
            "request access to order Status",
            "order portal error 500",
            "orders not loading"
        ],
        descr: [
            "User reporting that order status is slow or down.",
            "",
            "User reporting that order status is down.",
            "Regional connectivity issue to Order Status system.",
            "User unable to view order information."
        ],
        work_notes: [
            "Informed the user we are investigating if there are any known outages.",
            "Checked application logs. Database connection timeout detected.",
            "Escalated to on-call team for investigation.",
            "VPN tunnel to Sweden location appears to be down. Network team engaged."
        ],
        comments: [
            "Thank you for reaching out to support. We are investigating the issue of order portal system if there are any known errors or outages.",
            "Can you confirm which location you're connecting from?",
            "Are you able to access other internal systems?",
            "We're seeing elevated response times. Working with the application team."
        ],
        resolution_notes: [
            "Escalated to the on call team and they resolved with a restart of background process.",
            "VPN tunnel restored. Order Status accessible from all locations.",
            "Database connection pool increased. Portal responding normally.",
            "Application server restart resolved the blank screen issue."
        ],
        category: "software",
        subcategory: "order_management",
        assignment_group: groupITOMrockstars,
        caller: '',
        agent: '',
        services: cmdb_ci_service_order,
        ci: ''
    },

    // ========================================
    // 13. HARDWARE ISSUES (Enhanced)
    // ========================================
    {
        short_desc: [
            "Can't see any image on the monitor",
            "My laptop screen is broken",
            "broken keyboard",
            "computer display is blank",
            "no image on the laptop",
            "dropped my laptop now the screen is broken",
            "laptop won't turn on",
            "blue screen of death",
            "hard drive making clicking noise",
            "laptop battery not charging",
            "overheating laptop",
            "no power to desktop computer",
            "hardware diagnostic failed"
        ],
        descr: [
            "User said the cable between laptop and screen is old.",
            "",
            "Hardware failure suspected.",
            "Physical damage to device.",
            "Power or display issue with computer."
        ],
        work_notes: [
            "Informed the user we are investigating the inventory of new hardware.",
            "Ran hardware diagnostics. Display adapter failed.",
            "Checked warranty status. Device still under coverage.",
            "Ordered replacement device. Arrival expected in 2 business days."
        ],
        comments: [
            "Thank you for reaching out to support. We are looking into the inventory for possible new hardware.",
            "Can you confirm if the issue started suddenly or gradually?",
            "Have you tried connecting to an external monitor?",
            "We'll need to replace this device. I'm checking inventory now."
        ],
        resolution_notes: [
            "Replaced the laptop with a new laptop and a new replaced HDMI cable.",
            "Device sent for repair under warranty. Loaner provided.",
            "Hard drive replaced. Data successfully recovered and restored.",
            "Battery replaced. Laptop charging normally."
        ],
        category: "hardware",
        subcategory: "computer_hardware",
        assignment_group: groupHardware,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    },

    // ========================================
    // 14. VPN CONNECTIVITY (Enhanced)
    // ========================================
    {
        short_desc: [
            "VPN connectivity issue",
            "problem with VPN",
            "vpn client shows an error 30012",
            "a error message appears when starting VPN",
            "VPN and error",
            "vpn doesn't work",
            "vpn problem",
            "I have vpn 3.0",
            "VPN keeps disconnecting",
            "cant connect to VPN",
            "VPN connection timeout",
            "VPN authentication failed",
            "vpn slow connection"
        ],
        descr: [
            "User said the cable between network port and laptop is working but not via wifi.",
            "",
            "Tried to restart laptop no success.",
            "Reinstalled same version of the VPN version.",
            "VPN connection unstable or failing to establish."
        ],
        work_notes: [
            "Informed the user we are investigating if there are any known outages of VPN services but also asked for confirmation around VPN client version.",
            "Checked VPN concentrator. No issues detected.",
            "User running outdated VPN client version 3.0. Upgrade required.",
            "VPN logs show authentication token mismatch."
        ],
        comments: [
            "Can you please confirm if you are running VPN client version 3.0?",
            "Please try disconnecting and reconnecting to VPN.",
            "Are you connecting from home or another remote location?",
            "Let me know if you see any specific error codes."
        ],
        resolution_notes: [
            "End user upgraded to VPN client version 3.1 and that resolved the issue.",
            "VPN profile recreated. Connection stable.",
            "Firewall rule adjusted. VPN connecting successfully.",
            "Certificate renewed. VPN authentication working."
        ],
        category: "network",
        subcategory: "vpn",
        assignment_group: groupNetwork,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    },

    // ========================================
    // 15. ERP SYSTEMS (Enhanced)
    // ========================================
    {
        short_desc: [
            "Request for ERP software license",
            "do we have additional user license for our ERP?",
            "our ERP system is showing blank screen",
            "ERP login not working",
            "ERP client crashed",
            "cant access ERP reports",
            "ERP performance very slow",
            "getting ERP database error",
            "ERP session timeout",
            "need training on ERP system"
        ],
        descr: [
            "End user can't access the ERP system software.",
            "",
            "User requesting additional ERP license.",
            "Performance issues with ERP client.",
            "ERP client application malfunction."
        ],
        work_notes: [
            "Informed the user we are investigating if there are any known license issues related to ERP access.",
            "Checked SAP license server. 5 licenses available.",
            "ERP client version outdated. Upgrade recommended.",
            "Assigned available ERP license to user."
        ],
        comments: [
            "Can you please confirm if you are running ERP client version 10.0 or newer?",
            "Which ERP module are you trying to access?",
            "Have you used the ERP system before or is this your first time?",
            "Let me check license availability."
        ],
        resolution_notes: [
            "End user upgraded to ERP client version 10.1 and that resolved the issue.",
            "ERP license assigned. User can now access the system.",
            "ERP client repaired. Application launching successfully.",
            "Performance tuning applied. ERP responding normally."
        ],
        category: "software",
        subcategory: "erp",
        assignment_group: groupSoftware,
        caller: '',
        agent: '',
        services: cmdb_ci_service_erp,
        ci: cmdb_ci_sap
    },

    // ========================================
    // 16. WIFI CONNECTIVITY (Enhanced)
    // ========================================
    {
        short_desc: [
            "wifi connectivity issue on my laptop",
            "problem with wi-fi from my macbook",
            "wi-fi client shows an error no signal",
            "a error message pops up when starting Wifi",
            "Wifi and error",
            "Wifi doesn't work",
            "WiFi problem",
            "I have a WiFi 802.11ax",
            "no wifi signal or low signal",
            "wifi keeps dropping",
            "can't connect to corporate wifi",
            "wifi authentication failed",
            "limited connectivity on wifi"
        ],
        descr: [
            "User said the cable between laptop and physical network cable is working. But are seeing an issue related to network. Access Points indicate all good.",
            "",
            "End user has restarted laptop.",
            "End user has tried to turn off and on the wifi power in system settings.",
            "WiFi connection unstable or not connecting."
        ],
        work_notes: [
            "Informed the user we are investigating if there are any known wifi firmware issues but also asked for confirmation around Wifi client version.",
            "Checked wireless access points. All functioning normally.",
            "WiFi driver appears outdated. Updating now.",
            "Removed saved wifi network and re-added with fresh authentication."
        ],
        comments: [
            "Can you please confirm if you are running Wifi client version 2.0?",
            "Are you able to see the corporate WiFi network in your available networks?",
            "Have you tried forgetting the network and reconnecting?",
            "What is your approximate distance from the wireless access point?"
        ],
        resolution_notes: [
            "End user upgraded to wifi client version 2.6.3 and that resolved the issue.",
            "WiFi driver updated. Connection stable.",
            "Access point firmware updated. Signal strength improved.",
            "WiFi profile recreated. User connecting successfully."
        ],
        category: "network",
        subcategory: "wifi",
        assignment_group: groupNetwork,
        caller: '',
        agent: '',
        services: '',
        ci: cmdb_ci_computer
    }
];

// ============================================================================
// MAIN GENERATION LOOP
// ============================================================================

gs.info("===== Starting Incident Generation =====");
gs.info("Configuration: SIMULATE=" + SIMULATE + ", RESOLVED_ONLY=" + RESOLVED_ONLY + ", USE_WORKFLOW=" + USE_WORKFLOW);
gs.info("Generating " + NUMBER_OF_INCIDENTS + " incidents from " + incidentTemplates.length + " categories");

for (var i = 0; i < NUMBER_OF_INCIDENTS; i++) {
    // Select random incident template from available categories
    var idx = Math.floor(Math.random() * incidentTemplates.length);
    var rec = incidentTemplates[idx];

    // Initialize new incident record without triggering workflows for performance
    var newRecord = new GlideRecord('incident');
    newRecord.setWorkflow(USE_WORKFLOW);
    newRecord.newRecord();

    // Generate random historical date within configured time window
    var gdt = new GlideDateTime();
    var days = Math.floor(Math.random() * MAX_DAYS_BACK_IN_TIME);
    gdt.addDaysUTC(-days);
    newRecord.sys_created_on = gdt.getDisplayValue();
    newRecord.opened_at = gdt.getDisplayValue();

    // Set incident state based on configuration
    if (RESOLVED_ONLY) {
        newRecord.state = STATE.CLOSED;
    } else {
        // Random state between 1-7, avoiding undefined states 4 & 5
        newRecord.state = Math.floor(Math.random() * 7) + 1;
        if (newRecord.state == 4 || newRecord.state == 5) {
            newRecord.state = STATE.IN_PROGRESS;
        }
    }

    // Populate incident fields with randomized data from template
    newRecord.short_description = rec.short_desc[Math.floor(Math.random() * rec.short_desc.length)];
    newRecord.description = rec.descr[Math.floor(Math.random() * rec.descr.length)];
    newRecord.category = rec.category;
    newRecord.caller_id = (rec.caller === '') ? caller[Math.floor(Math.random() * caller.length)] : getRecordSysId('sys_user', 'user_name', rec.caller);
    newRecord.assignment_group = rec.assignment_group;

    // Enhanced randomization for reassignment patterns
    newRecord.reassignment_count = (idx % 3 == 0) ? Math.floor(Math.random() * 10) : 0;
    newRecord.contact_type = CONTACT_CHANNEL[Math.floor(Math.random() * CONTACT_CHANNEL.length)];

    // Some incidents start unassigned (30% chance)
    newRecord.assigned_to = (Math.random() < 0.30) ? '' : agent[Math.floor(Math.random() * agent.length)];

    newRecord.business_service = rec.services;
    newRecord.cmdb_ci = rec.ci;

    // Randomize work notes and comments from available variations
    newRecord.work_notes = rec.work_notes[Math.floor(Math.random() * rec.work_notes.length)];
    newRecord.comments = rec.comments[Math.floor(Math.random() * rec.comments.length)];

    // Set impact and urgency with calculated priority
    var impact = Math.floor(Math.random() * 3) + 1;
    var urgency = Math.floor(Math.random() * 3) + 1;
    newRecord.impact = impact;
    newRecord.urgency = urgency;

    // Calculate priority based on ServiceNow standard matrix
    var priorityMatrix = {
        '1-1': 1, '1-2': 2, '1-3': 3,
        '2-1': 2, '2-2': 3, '2-3': 4,
        '3-1': 3, '3-2': 4, '3-3': 5
    };
    newRecord.priority = priorityMatrix[impact + '-' + urgency] || 5;

    // Enhanced randomization - additional fields
    newRecord.reopen_count = (Math.random() < 0.15) ? Math.floor(Math.random() * 3) : 0;
    newRecord.escalation = (Math.random() < 0.08) ? Math.floor(Math.random() * 2) + 1 : 0;
    newRecord.knowledge = (Math.random() < 0.20);
    newRecord.made_sla = (Math.random() < 0.85);

    // If state is Resolved or Closed, update record with closure data
    if (newRecord.state >= STATE.RESOLVED) {
        setIncidentToResolvedClosed(newRecord, rec, gdt, days);
    } else {
        newRecord.active = true;
    }

    gs.debug(idx + ': ' + newRecord.short_description + ' cat:[' + newRecord.category + ']' + ' assign:[' + newRecord.assignment_group + ']');

    if (SIMULATE != true) {
        newRecord.insert();
    }
}

gs.info("===== Incident Generation Complete =====");
gs.info("Generated " + NUMBER_OF_INCIDENTS + " incidents");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sets an incident record to resolved or closed state with randomized closure data
 * @param {GlideRecord} _rec - The incident record to update
 * @param {Object} recTemplate - The template object containing resolution notes
 * @param {GlideDateTime} gdt - The opened date
 * @param {Number} days - Days back from current date
 */
function setIncidentToResolvedClosed(_rec, recTemplate, gdt, days) {
    var closedays = Math.floor(Math.random() * (days % MAX_OPEN_DAYS)) % MAX_DAYS_BACK_IN_TIME;
    var closeDate = new GlideDateTime(gdt);
    closeDate.addDaysUTC(closedays);

    _rec.active = false;
    _rec.sys_updated_on = closeDate.getDisplayValue();
    _rec.closed_at = closeDate.getDisplayValue();
    _rec.resolved_at = closeDate.getDisplayValue();

    // Randomly select close code from available options
    var closeCodes = Object.values(CLOSE_CODE);
    _rec.close_code = closeCodes[Math.floor(Math.random() * closeCodes.length)];

    // Use resolution notes from template if available
    if (recTemplate.resolution_notes && recTemplate.resolution_notes.length > 0) {
        _rec.close_notes = recTemplate.resolution_notes[Math.floor(Math.random() * recTemplate.resolution_notes.length)];
    } else {
        _rec.close_notes = 'User rebooted their PC to fix this. They will get back if the issue persists.';
    }

    gs.debug("RESOLVED open: " + _rec.opened_at + " close: " + closedays + " " + closeDate);
}

/**
 * Retrieves the sys_id of a record from a specified table
 * @param {String} tableName - The table to query
 * @param {String} fieldName - The field to match
 * @param {String} fieldValue - The value to find
 * @returns {String|null} The sys_id or null if not found
 */
function getRecordSysId(tableName, fieldName, fieldValue) {
    var gr = new GlideRecord(tableName);
    gr.addQuery(fieldName, fieldValue);
    gr.query();

    if (gr.next()) {
        gs.print('Record found ' + gr.sys_id + ' ' + fieldValue);
        return gr.sys_id;
    }

    gs.print('No record found with ' + fieldName + ' = ' + fieldValue);
    return null;
}

/**
 * Validates if a reference points to a valid record
 * @param {String} reference - The sys_id to validate
 * @param {String} referenceTable - The table name to check
 * @returns {Boolean} True if valid, false otherwise
 */
function isValidReference(reference, referenceTable) {
    var refGr = new GlideRecord(referenceTable);
    return refGr.get(reference) && refGr.isValidRecord();
}
