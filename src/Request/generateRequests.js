/*
 * Generate Service Catalog Request Records with Random Data for Testing and Demo Purposes
 *
 * Kjell Lloyd 2024-2026 - Servicenow-Snippets
 * Version: 1.0
 *
 * FEATURES:
 * - Generates sc_request (REQ) parent records with 1-N sc_req_item (RITM) child records
 * - 10+ typical service catalog request categories (hardware, software, access, onboarding, etc.)
 * - Realistic short descriptions, work notes and resolution notes per category
 * - Random opened dates within configurable lookback window
 * - Random open duration (how long requests remain open before completion)
 * - Random requestors (opened_by / requested_for) from sample user pool
 * - Typical assignment groups per request type
 * - SIMULATE mode for safe preview before actual record creation
 *
 * INSTRUCTIONS:
 * 1. Adjust NUMBER_OF_REQUESTS to set how many REQs to create (default: 20)
 * 2. Adjust MAX_DAYS_BACK_IN_TIME for the lookback window of opened dates
 * 3. Adjust MAX_OPEN_DAYS for the maximum duration a request stays open
 * 4. Set SIMULATE to false to actually insert records (default: true for safety)
 * 5. Run in a background script context
 *
 * CONFIGURATION OPTIONS:
 * - SIMULATE: true = no database inserts, false = create records
 * - CLOSED_ONLY: true = all requests closed/complete, false = mixed states
 * - USE_WORKFLOW: true = trigger business rules/approvals/SLAs (slower), false = skip
 *
 * REQUIREMENTS:
 * - ServiceNow instance with Service Catalog plugin (sc_request, sc_req_item)
 * - Sample assignment groups: Service Desk, Hardware, Software, Network, IT Securities
 * - Sample users: abraham.lincoln, abel.tuter, fred.luddy, beth.anglin, david.loo
 *
 * REQUEST CATEGORIES GENERATED:
 * 1. New Hire Onboarding (laptop + accounts + access)
 * 2. Hardware Request (laptop, monitor, peripherals)
 * 3. Software Installation / License
 * 4. Access Request (shared drives, applications, groups)
 * 5. Mobile Device Request (phone, tablet, plan)
 * 6. Office Move / Workspace Setup
 * 7. VPN / Remote Access Setup
 * 8. Cloud Resource Provisioning
 * 9. Conference Room / AV Equipment
 * 10. Offboarding / Account Termination
 *
 * USAGE EXAMPLES:
 *
 * Example 1: Generate 50 closed requests for reporting/training data
 *   var NUMBER_OF_REQUESTS = 50;
 *   var SIMULATE = false;
 *   var CLOSED_ONLY = true;
 *
 * Example 2: Generate 10 test requests with mixed states for UI testing
 *   var NUMBER_OF_REQUESTS = 10;
 *   var SIMULATE = false;
 *   var CLOSED_ONLY = false;
 *
 * Example 3: Preview generation without database inserts
 *   var NUMBER_OF_REQUESTS = 5;
 *   var SIMULATE = true;
 *
 * NOTE: This script is intended for development/testing environments only.
 *       Do not run in production. Always test with SIMULATE=true first.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var SIMULATE = true;              // No insert of new record - FALSE to create actual records
var CLOSED_ONLY = false;          // Enable to create only closed/complete requests
var USE_WORKFLOW = false;         // Trigger SLAs / approvals / business rules

var NUMBER_OF_REQUESTS = 20;      // Number of REQ records to generate
var MAX_DAYS_BACK_IN_TIME = 60;   // How many days back the opened_at can be
var MAX_OPEN_DAYS = 14;           // Max number of days a request stays open before close
var MAX_ITEMS_PER_REQUEST = 3;    // Max number of RITMs per REQ (min 1)

// ============================================================================
// CONSTANTS
// ============================================================================

// Request State Constants (sc_request)
// 1=Draft, 2=Submitted, -5=Pending, 1=Open, 3=Closed Complete, 4=Closed Incomplete, 7=Closed Cancelled
var REQUEST_STATE = {
    DRAFT: 1,
    OPEN: 2,
    CLOSED_COMPLETE: 3,
    CLOSED_INCOMPLETE: 4,
    CLOSED_CANCELLED: 7
};

// Request Item State Constants (sc_req_item)
// 1=Open, 2=In Process, 3=Closed Complete, 4=Closed Incomplete, 7=Closed Cancelled
var RITM_STATE = {
    OPEN: 1,
    IN_PROCESS: 2,
    CLOSED_COMPLETE: 3,
    CLOSED_INCOMPLETE: 4,
    CLOSED_CANCELLED: 7
};

// Approval Constants
var APPROVAL = {
    NOT_REQUESTED: 'not requested',
    REQUESTED: 'requested',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// Contact Channel Constants
var CONTACT_CHANNEL = ["email", "phone", "self-service", "chat", "virtual_agent"];

// Catalog item variable type IDs (item_option_new.type)
// 6=Single Line Text, 8=Reference, 9=Date
var VARIABLE_TYPE = {
    SINGLE_LINE_TEXT: 6,
    REFERENCE: 8,
    DATE: 9
};

// Pool of variable templates - 0-3 randomly chosen per newly created catalog item
var VARIABLE_TEMPLATES = [
    { name: 'comments',    question_text: 'Additional Comments',  type: VARIABLE_TYPE.SINGLE_LINE_TEXT, reference: '' },
    { name: 'reason',      question_text: 'Reason for Request',   type: VARIABLE_TYPE.SINGLE_LINE_TEXT, reference: '' },
    { name: 'cost_center', question_text: 'Cost Center',          type: VARIABLE_TYPE.SINGLE_LINE_TEXT, reference: '' },
    { name: 'manager',     question_text: 'Manager / Approver',   type: VARIABLE_TYPE.REFERENCE,        reference: 'sys_user' },
    { name: 'for_user',    question_text: 'For User',             type: VARIABLE_TYPE.REFERENCE,        reference: 'sys_user' },
    { name: 'required_by', question_text: 'Required By Date',     type: VARIABLE_TYPE.DATE,             reference: '' },
    { name: 'start_date',  question_text: 'Start Date',           type: VARIABLE_TYPE.DATE,             reference: '' }
];

// Sample text values for SINGLE_LINE_TEXT variables
var VARIABLE_TEXT_VALUES = [
    'Standard request - approved by manager',
    'Project Phoenix go-live - required by Q4',
    'New role requirement',
    'Replacement for damaged item',
    'Per HR onboarding checklist',
    'Cost center CC-4710',
    'Approved via email dated last week',
    'Refresh cycle - 4 year device'
];

// ============================================================================
// REFERENCE DATA CACHE (Users, Groups)
// ============================================================================

// Assignment Groups - auto-created if missing, seeded with the listed users (only existing users are added)
var groupServiceDesk = getOrCreateGroup('Service Desk',  ['beth.anglin', 'david.loo', 'admin']);
var groupSecurity    = getOrCreateGroup('IT Securities', ['laxmi.analyst', 'admin']);
var groupHardware    = getOrCreateGroup('Hardware',      ['amelia.bryant', 'beth.anglin', 'admin']);
var groupSoftware    = getOrCreateGroup('Software',      ['david.loo', 'fred.luddy', 'admin']);
var groupNetwork     = getOrCreateGroup('Network',       ['beth.anglin', 'david.loo', 'admin']);
var groupFacilities  = getOrCreateGroup('Facilities',    ['abel.tuter', 'admin']);

// Requestor / Opened By users
var requestors = [
    getRecordSysId('sys_user', 'user_name', 'abraham.lincoln'),
    getRecordSysId('sys_user', 'user_name', 'abel.tuter'),
    getRecordSysId('sys_user', 'user_name', 'fred.luddy'),
    getRecordSysId('sys_user', 'user_name', 'beth.anglin'),
    getRecordSysId('sys_user', 'user_name', 'david.loo')
];

// Agents / Assigned To users
var agents = [
    getRecordSysId('sys_user', 'user_name', 'beth.anglin'),
    getRecordSysId('sys_user', 'user_name', 'david.loo'),
    getRecordSysId('sys_user', 'user_name', 'admin')
];

// Catalog item cache - populated lazily by getOrCreateCatalogItem
var catalogItemCache = {};

// Catalog (sc_catalog) cache - populated lazily by getCatalogSysId
var catalogCache = {};

// ============================================================================
// REQUEST TEMPLATES
// ============================================================================

var requestTemplates = [
    // ========================================
    // 1. NEW HIRE ONBOARDING
    // ========================================
    {
        short_desc: [
            "New hire onboarding - equipment and access",
            "Onboarding request for new employee starting next week",
            "New starter setup - laptop, accounts, badge",
            "Provisioning request for new hire",
            "Day-1 setup for new team member"
        ],
        descr: [
            "Please provision all standard new-hire equipment and access for incoming employee.",
            "New employee starting on Monday. Needs laptop, email, AD account, building access, and standard application access.",
            "Onboarding ticket - please coordinate with HR for start date and manager for role-based access.",
            ""
        ],
        items: [
            { name: "Standard Laptop", price: 1499, qty: 1 },
            { name: "Active Directory Account", price: 0, qty: 1 },
            { name: "Email Mailbox", price: 0, qty: 1 },
            { name: "Building Access Badge", price: 25, qty: 1 },
            { name: "Office 365 License", price: 199, qty: 1 }
        ],
        work_notes: [
            "Confirmed start date with HR. Ordering laptop from preferred vendor.",
            "AD account created. Awaiting manager approval for application access.",
            "Coordinated with facilities for desk assignment and badge issue.",
            "Standard onboarding bundle assigned. Tracking delivery."
        ],
        resolution_notes: [
            "All onboarding items delivered. User confirmed access on day 1.",
            "Equipment provisioned. Accounts active. Badge picked up by user.",
            "Onboarding complete. User signed off on equipment receipt."
        ],
        category: "Onboarding",
        catalog: "Service Catalog",
        assignment_group: groupServiceDesk
    },

    // ========================================
    // 2. HARDWARE REQUEST
    // ========================================
    {
        short_desc: [
            "Request for new laptop - current device end of life",
            "Need second monitor for home office",
            "Replacement keyboard and mouse request",
            "Standard developer workstation request",
            "Docking station for hybrid work setup",
            "Need noise-cancelling headset for calls",
            "Webcam request for remote meetings"
        ],
        descr: [
            "User's current device is over 4 years old. Requesting standard refresh.",
            "Working from home and need additional monitor to improve productivity.",
            "Existing peripherals are worn out and need replacement.",
            ""
        ],
        items: [
            { name: "Standard Laptop", price: 1499, qty: 1 },
            { name: "External Monitor 27\"", price: 349, qty: 1 },
            { name: "USB-C Docking Station", price: 199, qty: 1 },
            { name: "Wireless Keyboard and Mouse", price: 89, qty: 1 },
            { name: "Noise-Cancelling Headset", price: 249, qty: 1 }
        ],
        work_notes: [
            "Checked inventory. Standard model in stock.",
            "Manager approval received. Placing order.",
            "Item shipped from warehouse. Tracking number provided.",
            "Verified asset returned for refresh request."
        ],
        resolution_notes: [
            "Hardware delivered to user. Asset record updated.",
            "Equipment configured and handed over. Old device collected.",
            "Item received and confirmed working by end user."
        ],
        category: "Hardware",
        catalog: "Technical Catalog",
        assignment_group: groupHardware
    },

    // ========================================
    // 3. SOFTWARE INSTALLATION / LICENSE
    // ========================================
    {
        short_desc: [
            "Request for Adobe Creative Cloud license",
            "Need Visio installed on my workstation",
            "Power BI Pro license request",
            "Visual Studio Professional license needed",
            "Tableau license for analytics team",
            "Install JetBrains IntelliJ for development work",
            "Need Microsoft Project license",
            "Snagit license request for documentation"
        ],
        descr: [
            "User requires software for ongoing project work.",
            "Standard software request for role-required tooling.",
            "Manager approved purchase of additional license.",
            ""
        ],
        items: [
            { name: "Adobe Creative Cloud License", price: 599, qty: 1 },
            { name: "Microsoft Visio License", price: 299, qty: 1 },
            { name: "Power BI Pro License", price: 120, qty: 1 },
            { name: "Visual Studio Professional", price: 499, qty: 1 },
            { name: "Tableau Creator License", price: 840, qty: 1 }
        ],
        work_notes: [
            "Verified license availability with vendor.",
            "Software pushed via SCCM. Awaiting user reboot.",
            "License key assigned. Installation scheduled.",
            "Confirmed manager approval. Provisioning license."
        ],
        resolution_notes: [
            "Software installed and activated. User confirmed working.",
            "License assigned in admin portal. User notified.",
            "Application deployed successfully. Closing request."
        ],
        category: "Software",
        catalog: "Technical Catalog",
        assignment_group: groupSoftware
    },

    // ========================================
    // 4. ACCESS REQUEST
    // ========================================
    {
        short_desc: [
            "Access request - Finance shared drive",
            "Need access to SAP production",
            "Request access to Salesforce reporting",
            "Add me to engineering distribution list",
            "Grant access to HR SharePoint site",
            "Need read access to Snowflake warehouse",
            "Request to join AD security group: VPN-Users",
            "Access to marketing analytics dashboards"
        ],
        descr: [
            "User requesting access to system as part of new role responsibilities.",
            "Manager has approved access request via email.",
            "Access needed to complete assigned project tasks.",
            ""
        ],
        items: [
            { name: "Shared Drive Access", price: 0, qty: 1 },
            { name: "SAP Production Access", price: 0, qty: 1 },
            { name: "Salesforce User License", price: 150, qty: 1 },
            { name: "AD Security Group Membership", price: 0, qty: 1 },
            { name: "SharePoint Site Access", price: 0, qty: 1 }
        ],
        work_notes: [
            "Verified manager approval. Adding user to security group.",
            "Access granted in source system. User notified to test.",
            "Confirmed business justification. Provisioning access.",
            "Reviewed RBAC policy. User eligible for requested role."
        ],
        resolution_notes: [
            "Access granted. User confirmed login and visibility.",
            "Group membership applied. Replication confirmed.",
            "Access provisioned per least-privilege principle. Closed."
        ],
        category: "Access",
        catalog: "Technical Catalog",
        assignment_group: groupSecurity
    },

    // ========================================
    // 5. MOBILE DEVICE REQUEST
    // ========================================
    {
        short_desc: [
            "Request for company iPhone",
            "Need replacement phone - lost in transit",
            "Tablet request for field work",
            "Mobile data plan upgrade",
            "Request for Android device with MDM",
            "International data roaming for upcoming travel",
            "Need eSIM activation on personal device"
        ],
        descr: [
            "User requires company-issued mobile device for role.",
            "Existing device damaged beyond repair, needs replacement.",
            "Travelling internationally and needs roaming added.",
            ""
        ],
        items: [
            { name: "iPhone (current model)", price: 999, qty: 1 },
            { name: "Mobile Voice and Data Plan", price: 65, qty: 1 },
            { name: "Tablet (iPad)", price: 829, qty: 1 },
            { name: "International Roaming Add-on", price: 50, qty: 1 },
            { name: "Protective Case and Screen Cover", price: 49, qty: 1 }
        ],
        work_notes: [
            "Manager approval received. Ordering device from carrier.",
            "Device shipped. MDM enrollment instructions emailed.",
            "Activated line on corporate plan. Awaiting handover.",
            "Roaming feature enabled. User notified of activation."
        ],
        resolution_notes: [
            "Device delivered and enrolled in MDM. User active.",
            "Phone handed over. User signed device receipt.",
            "Plan changes applied. User confirmed connectivity."
        ],
        category: "Mobile",
        catalog: "Technical Catalog",
        assignment_group: groupHardware
    },

    // ========================================
    // 6. OFFICE MOVE / WORKSPACE SETUP
    // ========================================
    {
        short_desc: [
            "Desk move to new floor",
            "Setup workstation in new office",
            "Relocation - move equipment to building B",
            "Need ergonomic chair and sit-stand desk",
            "Office setup for returning employee",
            "Move IT equipment to new desk location"
        ],
        descr: [
            "User relocating within campus. Need equipment moved and reconnected.",
            "New workspace assignment requires standard IT setup.",
            "Ergonomic assessment recommended adjustable furniture.",
            ""
        ],
        items: [
            { name: "Desk Relocation Service", price: 0, qty: 1 },
            { name: "Ergonomic Chair", price: 449, qty: 1 },
            { name: "Sit-Stand Desk", price: 699, qty: 1 },
            { name: "Network Cable and Patch", price: 25, qty: 1 },
            { name: "Workstation Reconnection", price: 0, qty: 1 }
        ],
        work_notes: [
            "Scheduled move with facilities for early morning.",
            "Equipment disconnected and tagged. Awaiting transport.",
            "Reconnected at new location. Testing connectivity.",
            "Coordinated with facilities for furniture delivery."
        ],
        resolution_notes: [
            "Move complete. User up and running at new desk.",
            "Furniture delivered and assembled. User comfortable.",
            "All equipment relocated. Network confirmed functional."
        ],
        category: "Facilities",
        catalog: "Service Catalog",
        assignment_group: groupFacilities
    },

    // ========================================
    // 7. VPN / REMOTE ACCESS SETUP
    // ========================================
    {
        short_desc: [
            "Need VPN access for working from home",
            "Setup remote access for traveling employee",
            "VPN profile request - new device",
            "Request access to Citrix remote desktop",
            "Need privileged remote access for admin tasks",
            "Bastion host access for production servers"
        ],
        descr: [
            "User needs remote connectivity to corporate network.",
            "Travelling and requires secure connection to internal resources.",
            "Newly issued device needs VPN profile installed.",
            ""
        ],
        items: [
            { name: "VPN Client License", price: 0, qty: 1 },
            { name: "VPN Profile Configuration", price: 0, qty: 1 },
            { name: "Citrix Remote Desktop License", price: 199, qty: 1 },
            { name: "Privileged Access (PAM) Account", price: 0, qty: 1 }
        ],
        work_notes: [
            "Manager approval received. Configuring VPN profile.",
            "MFA enrolled. Sending connection instructions.",
            "Added user to VPN-Users AD group. Replication pending.",
            "Citrix license assigned. Application published to user."
        ],
        resolution_notes: [
            "VPN setup complete. User connected and tested successfully.",
            "Remote access provisioned. User confirmed login.",
            "Profile installed. User authenticated and accessed resources."
        ],
        category: "Network",
        catalog: "Technical Catalog",
        assignment_group: groupNetwork
    },

    // ========================================
    // 8. CLOUD RESOURCE PROVISIONING
    // ========================================
    {
        short_desc: [
            "Provision Azure subscription for project X",
            "Need AWS S3 bucket for data team",
            "Request EC2 instance for development",
            "Azure DevOps project setup",
            "Need GCP project provisioned for ML workload",
            "Provision Snowflake schema for analytics",
            "Need a Kubernetes namespace for new service"
        ],
        descr: [
            "User requesting cloud resources for upcoming project.",
            "Standard cloud provisioning request with cost center attached.",
            "FinOps tagging requirements communicated.",
            ""
        ],
        items: [
            { name: "Azure Subscription Provisioning", price: 0, qty: 1 },
            { name: "AWS S3 Bucket", price: 0, qty: 1 },
            { name: "EC2 Instance (t3.medium)", price: 35, qty: 1 },
            { name: "Azure DevOps Project", price: 0, qty: 1 },
            { name: "Snowflake Schema", price: 0, qty: 1 }
        ],
        work_notes: [
            "Verified cost center and budget approval.",
            "Resource deployed via Terraform pipeline.",
            "IAM permissions configured. User added as contributor.",
            "Applied required tagging policy for chargeback."
        ],
        resolution_notes: [
            "Cloud resources provisioned. User has access confirmed.",
            "Subscription active. User added with required RBAC role.",
            "Deployment complete. Endpoints shared with requestor."
        ],
        category: "Cloud",
        catalog: "Technical Catalog",
        assignment_group: groupSoftware
    },

    // ========================================
    // 9. CONFERENCE ROOM / AV EQUIPMENT
    // ========================================
    {
        short_desc: [
            "AV equipment request for team meeting",
            "Conference room setup - need video conference cart",
            "Request projector for offsite training",
            "Need additional Teams Room device",
            "Setup hybrid meeting equipment in room 304",
            "Need wireless presentation system installed"
        ],
        descr: [
            "Setting up training session and need AV equipment.",
            "Hybrid meeting requirements need additional gear.",
            "Standing meeting room missing required equipment.",
            ""
        ],
        items: [
            { name: "Video Conference Cart", price: 0, qty: 1 },
            { name: "Projector and Screen", price: 0, qty: 1 },
            { name: "Teams Room Device", price: 1299, qty: 1 },
            { name: "Wireless Presentation Adapter", price: 199, qty: 1 },
            { name: "AV Setup Service", price: 0, qty: 1 }
        ],
        work_notes: [
            "Reserved AV equipment for date requested.",
            "Coordinated with AV team for setup and teardown.",
            "Device delivered to room. Configuration in progress.",
            "Tested call quality. Room ready for use."
        ],
        resolution_notes: [
            "AV equipment delivered and tested. User trained on use.",
            "Setup complete. Room ready for meeting.",
            "Hybrid setup operational. Sign-off from requestor."
        ],
        category: "Facilities",
        catalog: "Service Catalog",
        assignment_group: groupFacilities
    },

    // ========================================
    // 10. OFFBOARDING / ACCOUNT TERMINATION
    // ========================================
    {
        short_desc: [
            "Offboarding - last day next Friday",
            "Account termination for departing employee",
            "Offboarding request - retrieve equipment and disable access",
            "Employee leaving - process all access removal",
            "Termination - immediate access disable required"
        ],
        descr: [
            "Employee leaving the company. Please process standard offboarding.",
            "HR has confirmed last working day. Schedule access removal.",
            "Immediate offboarding required per HR instruction.",
            ""
        ],
        items: [
            { name: "Disable AD Account", price: 0, qty: 1 },
            { name: "Mailbox Forwarding / Archive", price: 0, qty: 1 },
            { name: "Equipment Return", price: 0, qty: 1 },
            { name: "Revoke Application Access", price: 0, qty: 1 },
            { name: "Badge Deactivation", price: 0, qty: 1 }
        ],
        work_notes: [
            "Scheduled disable for last working day end of business.",
            "Equipment return label sent to user.",
            "Mailbox set to forward to manager for 30 days.",
            "Coordinated with HR on final access removal timing."
        ],
        resolution_notes: [
            "Offboarding complete. All access revoked. Equipment returned.",
            "Account disabled. Mailbox archived. Badge deactivated.",
            "Employee fully offboarded. Asset records updated."
        ],
        category: "Offboarding",
        catalog: "Service Catalog",
        assignment_group: groupServiceDesk
    }
];

// ============================================================================
// MAIN GENERATION LOOP
// ============================================================================

gs.info("===== Starting Service Catalog Request Generation =====");
gs.info("Configuration: SIMULATE=" + SIMULATE + ", CLOSED_ONLY=" + CLOSED_ONLY + ", USE_WORKFLOW=" + USE_WORKFLOW);
gs.info("Generating " + NUMBER_OF_REQUESTS + " requests from " + requestTemplates.length + " categories");

var requestsCreated = 0;
var itemsCreated = 0;

for (var i = 0; i < NUMBER_OF_REQUESTS; i++) {
    // Select random request template
    var idx = Math.floor(Math.random() * requestTemplates.length);
    var rec = requestTemplates[idx];

    // Pick random requestor and assigned agent
    var requestedFor = requestors[Math.floor(Math.random() * requestors.length)];
    var openedBy = requestors[Math.floor(Math.random() * requestors.length)];
    var assignedTo = (Math.random() < 0.30) ? '' : agents[Math.floor(Math.random() * agents.length)];

    // Generate random opened date within configured lookback window
    var openedGdt = new GlideDateTime();
    var daysBack = Math.floor(Math.random() * MAX_DAYS_BACK_IN_TIME);
    openedGdt.addDaysUTC(-daysBack);

    // Generate random open duration
    var openDays = Math.floor(Math.random() * MAX_OPEN_DAYS) + 1;
    var closedGdt = new GlideDateTime(openedGdt);
    closedGdt.addDaysUTC(openDays);

    // Determine request state
    var reqState;
    if (CLOSED_ONLY) {
        reqState = REQUEST_STATE.CLOSED_COMPLETE;
    } else {
        // 60% closed complete, 10% closed incomplete, 5% cancelled, 25% still open
        var r = Math.random();
        if (r < 0.60) reqState = REQUEST_STATE.CLOSED_COMPLETE;
        else if (r < 0.70) reqState = REQUEST_STATE.CLOSED_INCOMPLETE;
        else if (r < 0.75) reqState = REQUEST_STATE.CLOSED_CANCELLED;
        else reqState = REQUEST_STATE.OPEN;
    }

    var isClosed = (reqState == REQUEST_STATE.CLOSED_COMPLETE ||
                    reqState == REQUEST_STATE.CLOSED_INCOMPLETE ||
                    reqState == REQUEST_STATE.CLOSED_CANCELLED);

    // ----------------------------------------
    // Create REQ (sc_request)
    // ----------------------------------------
    var req = new GlideRecord('sc_request');
    req.setWorkflow(USE_WORKFLOW);
    req.newRecord();

    req.short_description = rec.short_desc[Math.floor(Math.random() * rec.short_desc.length)];
    req.description = rec.descr[Math.floor(Math.random() * rec.descr.length)];
    req.requested_for = requestedFor;
    req.opened_by = openedBy;
    req.assignment_group = rec.assignment_group;
    req.assigned_to = assignedTo;
    req.opened_at = openedGdt.getDisplayValue();
    req.sys_created_on = openedGdt.getDisplayValue();
    req.contact_type = CONTACT_CHANNEL[Math.floor(Math.random() * CONTACT_CHANNEL.length)];
    req.state = reqState;
    req.request_state = reqState;
    req.approval = (reqState == REQUEST_STATE.CLOSED_CANCELLED) ? APPROVAL.REJECTED : APPROVAL.APPROVED;

    // Priority - randomize 1-4 with most being 3 or 4
    var prio = Math.random();
    if (prio < 0.05) req.priority = 1;
    else if (prio < 0.20) req.priority = 2;
    else if (prio < 0.65) req.priority = 3;
    else req.priority = 4;

    req.work_notes = rec.work_notes[Math.floor(Math.random() * rec.work_notes.length)];

    if (isClosed) {
        req.active = false;
        req.closed_at = closedGdt.getDisplayValue();
        req.closed_by = assignedTo || agents[0];
        req.sys_updated_on = closedGdt.getDisplayValue();
    } else {
        req.active = true;
    }

    var reqSysId = null;
    if (SIMULATE != true) {
        reqSysId = req.insert();
    }

    requestsCreated++;
    gs.debug('REQ[' + idx + ']: ' + req.short_description + ' state:[' + reqState + '] opened:[' + req.opened_at + ']');

    // ----------------------------------------
    // Create RITMs (sc_req_item) - 1 to MAX_ITEMS_PER_REQUEST per REQ
    // ----------------------------------------
    var itemCount = Math.floor(Math.random() * MAX_ITEMS_PER_REQUEST) + 1;
    if (itemCount > rec.items.length) {
        itemCount = rec.items.length;
    }

    // Pick a random subset of items from the template
    var availableItems = rec.items.slice();
    for (var j = 0; j < itemCount; j++) {
        var itemIdx = Math.floor(Math.random() * availableItems.length);
        var item = availableItems.splice(itemIdx, 1)[0];

        var ritm = new GlideRecord('sc_req_item');
        ritm.setWorkflow(USE_WORKFLOW);
        ritm.newRecord();

        var catItem = getOrCreateCatalogItem(item.name, item.price, rec.catalog);
        ritm.short_description = item.name + ' - ' + req.short_description;
        ritm.description = 'Requested item: ' + item.name + ' (qty: ' + item.qty + ')';
        ritm.cat_item = catItem.sys_id;
        ritm.request = reqSysId;
        ritm.requested_for = requestedFor;
        ritm.opened_by = openedBy;
        ritm.assignment_group = rec.assignment_group;
        ritm.assigned_to = assignedTo;
        ritm.opened_at = openedGdt.getDisplayValue();
        ritm.sys_created_on = openedGdt.getDisplayValue();
        ritm.quantity = item.qty;
        ritm.price = item.price;
        ritm.recurring_price = 0;
        ritm.approval = req.approval.toString();
        ritm.priority = req.priority.toString();

        // RITM state generally mirrors REQ state
        var ritmState;
        if (reqState == REQUEST_STATE.CLOSED_COMPLETE) ritmState = RITM_STATE.CLOSED_COMPLETE;
        else if (reqState == REQUEST_STATE.CLOSED_INCOMPLETE) ritmState = RITM_STATE.CLOSED_INCOMPLETE;
        else if (reqState == REQUEST_STATE.CLOSED_CANCELLED) ritmState = RITM_STATE.CLOSED_CANCELLED;
        else ritmState = (Math.random() < 0.5) ? RITM_STATE.OPEN : RITM_STATE.IN_PROCESS;

        ritm.state = ritmState;

        if (rec.work_notes && rec.work_notes.length > 0) {
            ritm.work_notes = rec.work_notes[Math.floor(Math.random() * rec.work_notes.length)];
        }

        if (isClosed) {
            ritm.active = false;
            ritm.closed_at = closedGdt.getDisplayValue();
            ritm.closed_by = assignedTo || agents[0];
            ritm.sys_updated_on = closedGdt.getDisplayValue();
            if (rec.resolution_notes && rec.resolution_notes.length > 0) {
                ritm.close_notes = rec.resolution_notes[Math.floor(Math.random() * rec.resolution_notes.length)];
            }
        } else {
            ritm.active = true;
        }

        var ritmSysId = null;
        if (SIMULATE != true) {
            ritmSysId = ritm.insert();
            if (ritmSysId && catItem.variables && catItem.variables.length > 0) {
                for (var v = 0; v < catItem.variables.length; v++) {
                    setRitmVariableValue(ritmSysId.toString(), catItem.variables[v]);
                }
            }
        }

        itemsCreated++;
        gs.debug('  RITM: ' + item.name + ' price:[' + item.price + '] qty:[' + item.qty + '] state:[' + ritmState + '] vars:[' + (catItem.variables ? catItem.variables.length : 0) + ']');
    }
}

gs.info("===== Service Catalog Request Generation Complete =====");
gs.info("Generated " + requestsCreated + " REQ records with " + itemsCreated + " RITM child records");
if (SIMULATE) {
    gs.info("SIMULATE mode was ON - no records were actually inserted. Set SIMULATE=false to create records.");
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
        return gr.sys_id.toString();
    }

    gs.print('No record found with ' + fieldName + ' = ' + fieldValue);
    return null;
}

/**
 * Finds a sys_user_group by name. If missing, creates it and adds the listed
 * users as members. Only users that actually exist are added.
 * Respects SIMULATE - in simulate mode no group/membership records are inserted.
 *
 * @param {String} groupName - Display name of the group
 * @param {Array<String>} memberUserNames - user_name values to add as members
 * @returns {String|null} The group sys_id (or null in SIMULATE when group missing)
 */
function getOrCreateGroup(groupName, memberUserNames) {
    var existing = getRecordSysId('sys_user_group', 'name', groupName);
    if (existing) {
        return existing;
    }

    if (SIMULATE) {
        gs.info('SIMULATE: would create group "' + groupName + '" with members ' + memberUserNames.join(','));
        return null;
    }

    // Create the group
    var grp = new GlideRecord('sys_user_group');
    grp.setWorkflow(false);
    grp.newRecord();
    grp.name = groupName;
    grp.description = 'Auto-created by generateRequests.js demo data script';
    grp.active = true;
    var groupSysId = grp.insert();
    gs.info('Created group "' + groupName + '" sys_id=' + groupSysId);

    // Add members that actually exist
    for (var m = 0; m < memberUserNames.length; m++) {
        var userName = memberUserNames[m];
        var userSysId = getRecordSysId('sys_user', 'user_name', userName);
        if (!userSysId) {
            gs.warn('Skipping group membership - user "' + userName + '" not found');
            continue;
        }
        var mem = new GlideRecord('sys_user_grmember');
        mem.setWorkflow(false);
        mem.newRecord();
        mem.group = groupSysId;
        mem.user = userSysId;
        mem.insert();
        gs.info('Added "' + userName + '" to group "' + groupName + '"');
    }

    return groupSysId.toString();
}

/**
 * Finds an sc_cat_item by name. If missing, creates an active catalog item
 * associated with the given catalog (sc_catalog), plus 0-3 random variable
 * definitions (item_option_new) so the RITM can have populated values.
 * Results are cached as {sys_id, variables} per item name.
 * Respects SIMULATE - in simulate mode no records are inserted.
 *
 * @param {String} itemName - Display name of the catalog item
 * @param {Number} price - Price for the catalog item
 * @param {String} catalogName - Name of the sc_catalog to associate the item with
 * @returns {Object} { sys_id: String|null, variables: Array<Object> }
 */
function getOrCreateCatalogItem(itemName, price, catalogName) {
    if (catalogItemCache[itemName]) {
        return catalogItemCache[itemName];
    }

    var existing = getRecordSysId('sc_cat_item', 'name', itemName);
    if (existing) {
        var entry = { sys_id: existing, variables: lookupCatalogItemVariables(existing) };
        catalogItemCache[itemName] = entry;
        return entry;
    }

    if (SIMULATE) {
        gs.info('SIMULATE: would create catalog item "' + itemName + '" price=' + price + ' catalog="' + catalogName + '"');
        var sim = { sys_id: null, variables: [] };
        catalogItemCache[itemName] = sim;
        return sim;
    }

    var cat = new GlideRecord('sc_cat_item');
    cat.setWorkflow(false);
    cat.newRecord();
    cat.name = itemName;
    cat.short_description = itemName;
    cat.description = 'Auto-created by generateRequests.js demo data script';
    cat.price = price;
    cat.active = true;
    var catalogSysId = getCatalogSysId(catalogName);
    if (catalogSysId) {
        cat.sc_catalogs = catalogSysId;
    }
    var sysId = cat.insert().toString();
    gs.info('Created catalog item "' + itemName + '" sys_id=' + sysId + ' in catalog "' + catalogName + '"');

    var variables = createRandomVariablesFor(sysId);
    var result = { sys_id: sysId, variables: variables };
    catalogItemCache[itemName] = result;
    return result;
}

/**
 * Reads existing variable definitions (item_option_new) for a catalog item.
 * Only returns types we know how to populate (text / reference / date).
 *
 * @param {String} catItemSysId - sys_id of the sc_cat_item
 * @returns {Array<Object>} Array of {sys_id, name, type, reference, question_text}
 */
function lookupCatalogItemVariables(catItemSysId) {
    var vars = [];
    var gr = new GlideRecord('item_option_new');
    gr.addQuery('cat_item', catItemSysId);
    gr.query();
    while (gr.next()) {
        var t = parseInt(gr.type.toString(), 10);
        if (t == VARIABLE_TYPE.SINGLE_LINE_TEXT || t == VARIABLE_TYPE.REFERENCE || t == VARIABLE_TYPE.DATE) {
            vars.push({
                sys_id: gr.sys_id.toString(),
                name: gr.name.toString(),
                type: t,
                reference: gr.reference.toString(),
                question_text: gr.question_text.toString()
            });
        }
    }
    return vars;
}

/**
 * Creates 0-3 random variable definitions on the catalog item by sampling
 * from VARIABLE_TEMPLATES.
 *
 * @param {String} catItemSysId - sys_id of the newly created sc_cat_item
 * @returns {Array<Object>} The created variable definitions
 */
function createRandomVariablesFor(catItemSysId) {
    var created = [];
    var numVars = Math.floor(Math.random() * 4); // 0..3 inclusive
    if (numVars == 0) {
        return created;
    }

    var pool = VARIABLE_TEMPLATES.slice();
    for (var v = 0; v < numVars && pool.length > 0; v++) {
        var pickIdx = Math.floor(Math.random() * pool.length);
        var tmpl = pool.splice(pickIdx, 1)[0];

        var opt = new GlideRecord('item_option_new');
        opt.setWorkflow(false);
        opt.newRecord();
        opt.cat_item = catItemSysId;
        opt.name = tmpl.name;
        opt.question_text = tmpl.question_text;
        opt.type = tmpl.type;
        if (tmpl.reference) {
            opt.reference = tmpl.reference;
        }
        opt.order = (v + 1) * 100;
        opt.active = true;
        opt.mandatory = false;
        var optSysId = opt.insert().toString();

        created.push({
            sys_id: optSysId,
            name: tmpl.name,
            type: tmpl.type,
            reference: tmpl.reference,
            question_text: tmpl.question_text
        });
        gs.info('  Variable created: "' + tmpl.question_text + '" type=' + tmpl.type + ' on cat_item=' + catItemSysId);
    }
    return created;
}

/**
 * Generates a random value appropriate to the variable type.
 * - SINGLE_LINE_TEXT: random sample text
 * - REFERENCE (sys_user): random user sys_id from requestors pool
 * - DATE: random date within +/- 30 days of today (yyyy-mm-dd)
 *
 * @param {Object} varDef - The variable definition
 * @returns {String} The generated value (may be empty string for unsupported types)
 */
function generateVariableValue(varDef) {
    if (varDef.type == VARIABLE_TYPE.SINGLE_LINE_TEXT) {
        return VARIABLE_TEXT_VALUES[Math.floor(Math.random() * VARIABLE_TEXT_VALUES.length)];
    }
    if (varDef.type == VARIABLE_TYPE.REFERENCE) {
        if (varDef.reference == 'sys_user') {
            return requestors[Math.floor(Math.random() * requestors.length)];
        }
        return '';
    }
    if (varDef.type == VARIABLE_TYPE.DATE) {
        var dt = new GlideDateTime();
        var offset = Math.floor(Math.random() * 60) - 30; // -30..+29 days
        dt.addDaysUTC(offset);
        return dt.getDate().toString(); // yyyy-mm-dd
    }
    return '';
}

/**
 * Persists a variable value for a RITM by creating an sc_item_option (answer)
 * and linking it to the request_item via sc_item_option_mtom.
 *
 * @param {String} ritmSysId - sys_id of the sc_req_item
 * @param {Object} varDef - The variable definition (from cache)
 */
function setRitmVariableValue(ritmSysId, varDef) {
    var value = generateVariableValue(varDef);

    var opt = new GlideRecord('sc_item_option');
    opt.setWorkflow(false);
    opt.newRecord();
    opt.item_option_new = varDef.sys_id;
    opt.value = value;
    var optSysId = opt.insert().toString();

    var mtom = new GlideRecord('sc_item_option_mtom');
    mtom.setWorkflow(false);
    mtom.newRecord();
    mtom.request_item = ritmSysId;
    mtom.sc_item_option = optSysId;
    mtom.insert();
}

/**
 * Looks up the sys_id of an sc_catalog by name. Cached for the run.
 * Logs a warning if the catalog is not found (caller can still proceed
 * without the catalog association).
 *
 * @param {String} catalogName - Display name of the sc_catalog
 * @returns {String|null} The catalog sys_id or null if not found
 */
function getCatalogSysId(catalogName) {
    if (!catalogName) {
        return null;
    }
    if (catalogCache[catalogName]) {
        return catalogCache[catalogName];
    }
    var sysId = getRecordSysId('sc_catalog', 'title', catalogName);
    if (!sysId) {
        gs.warn('Catalog "' + catalogName + '" not found - item will be created without catalog association');
        return null;
    }
    catalogCache[catalogName] = sysId;
    return sysId;
}
