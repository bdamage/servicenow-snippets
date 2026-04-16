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
const groupITOMrockstars = groupNetwork; //getRecordSysId('sys_user_group', 'name', 'ITOM Rockstars Support');

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
var cmdb_ci_service_order = getRecordSysId('cmdb_ci_service', 'name', 'SAP Financial Accounting');
var cmdb_ci_service_logistics = getRecordSysId('cmdb_ci_service', 'name', 'SAP Materials Management');

// ============================================================================
// INCIDENT TEMPLATES
// ============================================================================

const incidentTemplates = [
    // ========================================
    // 1. PASSWORD & AUTHENTICATION (Security)
    // ========================================
    {
        short_desc: [
            "glömde mitt lösenord",
            "behöver återställa lösenordet",
            "utlåst efter 3 misslyckade inloggningsförsök",
            "lösenordet har gått ut och jag kan inte logga in",
            "MFA fungerar inte på mobilen",
            "kan inte ta emot autentiseringskod",
            "autentiseringsappen visar fel",
            "behöver återställa min MFA-enhet",
            "2FA-token fungerar inte",
            "länken för lösenordsåterställning har gått ut",
            "kontot är låst - behöver upplåsning",
            "lösenordsåterställning behövs",
            "kan inte logga in - glömde lösenordet"
        ],
        descr: [
            "Användaren kan inte komma åt kontot efter flera misslyckade inloggningsförsök.",
            "Användarens lösenord har gått ut och behöver återställas.",
            "MFA-enheten fungerar inte som den ska.",
            "Användaren kan inte ta emot verifieringskoder.",
            ""
        ],
        work_notes: [
            "Verifierade användarens identitet via alternativ e-post. Skickade länk för lösenordsåterställning.",
            "Bekräftade MFA-registrering. Användaren behöver registrera om enheten.",
            "Kontot låstes upp efter säkerhetsverifiering.",
            "Lösenordsåterställning klar via self-service-portalen."
        ],
        comments: [
            "Kontrollera din e-post för länken till lösenordsåterställning. Den går ut om 24 timmar.",
            "Kan du bekräfta vilken autentiseringsmetod du använder - SMS eller autentiseringsapp?",
            "Ditt konto har låsts upp. Försök logga in igen.",
            "Av säkerhetsskäl behöver du verifiera din identitet innan vi kan återställa ditt lösenord."
        ],
        resolution_notes: [
            "Användaren återställde lösenordet och loggade in.",
            "MFA-enheten registrerades om. Användaren bekräftade att åtkomst är återställd.",
            "Kontot låstes upp. Rådgav användaren om bästa praxis för lösenord."
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
            "kan inte komma åt Azure-portalen",
            "AWS-konsolen visar fel 403",
            "Azure-VM startar inte",
            "behörighet nekad till S3-bucket",
            "Azure-prenumeration avstängd",
            "AWS Lambda-funktionen tar timeout",
            "kan inte ansluta till RDS-databas",
            "Azure DevOps-pipeline misslyckas",
            "molnlagringens kvot överskriden",
            "EC2-instans svarar inte",
            "behöver åtkomst till Azure-resurser",
            "AWS IAM-behörighetsproblem"
        ],
        descr: [
            "Användaren kan inte komma åt molnresurser på grund av behörighetsproblem.",
            "Molntjänsten har anslutningsproblem.",
            "Resursgränserna har nåtts.",
            "Autentisering mot molnplattformen misslyckas.",
            ""
        ],
        work_notes: [
            "Kontrollerade IAM-policyer. Användaren saknar rollen CloudAdmin.",
            "Kontaktade cloud operations-teamet. Utreder resursgränser.",
            "Problem med betalning av prenumeration identifierat. Eskalerat till fakturering.",
            "Lade till användaren i Azure AD-säkerhetsgrupp för resursåtkomst."
        ],
        comments: [
            "Vi kontrollerar dina molnbehörigheter. Kan du bekräfta vilka resurser du behöver åtkomst till?",
            "Det verkar som att en kvotgräns har nåtts. Vi granskar med cloud ops-teamet.",
            "Din åtkomst har återställts. Bekräfta att du når resurserna.",
            "Vilken specifik AWS/Azure-tjänst försöker du nå?"
        ],
        resolution_notes: [
            "Lade till användaren i nödvändig Azure AD-grupp. Åtkomst bekräftad.",
            "Kvoten ökades. Tjänsten återställd.",
            "Faktureringsproblem löst. Prenumerationen återaktiverad.",
            "IAM-behörigheter uppdaterade. Användaren kan nu komma åt molnresurser."
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
            "företags-iPhone tar inte emot e-post",
            "kan inte installera företagsappen på Android",
            "mobilenheten säger att den inte är kompatibel",
            "Intune-registrering misslyckades",
            "Company Portal-appen kraschar",
            "tappade bort företagsmobilen behöver fjärrradering",
            "mobil hotspot fungerar inte",
            "kan inte komma åt SharePoint från mobilen",
            "mobil VPN kopplar ner hela tiden",
            "surfplattans pekskärm svarar inte",
            "telefonen synkar inte med Exchange",
            "fel i hantering av mobila enheter"
        ],
        descr: [
            "Användaren har problem med registrering i MDM.",
            "Företagsappar fungerar inte på mobilenheten.",
            "Enhetens efterlevnadskontroll misslyckas.",
            "E-postsynk slutade fungera på mobilenheten.",
            ""
        ],
        work_notes: [
            "Kontrollerade MDM-konsolen. Enheten checkade senast in för 3 dagar sedan.",
            "Startade fjärrsynk. Väntar på att enheten ska komma online.",
            "Efterlevnadspolicys uppdaterades förra veckan. Kan behöva omregistrering.",
            "Fjärrradering startad enligt säkerhetspolicy för borttappad enhet."
        ],
        comments: [
            "Kan du bekräfta om du är på WiFi eller mobildata?",
            "Prova att ta bort och lägga till ditt arbetskonto igen.",
            "Vi kan behöva avregistrera och omregistrera din enhet. Detta raderar inte personlig data.",
            "Har du installerat senaste uppdateringen av Company Portal-appen?"
        ],
        resolution_notes: [
            "Enheten omregistrerades i Intune. Alla policys tillämpades.",
            "E-postprofilen konfigurerades om. Användaren får e-post.",
            "Enheten markerades som borttappad och fjärrraderades enligt policy.",
            "Company Portal-appen installerades om. Enheten är nu kompatibel."
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
            "databasfråga tar evigheter",
            "timeout-fel i SQL Server",
            "Oracle-databasen är väldigt långsam",
            "kan inte ansluta till produktions-DB",
            "applikationen hänger vid databasanrop",
            "får deadlock-fel",
            "databasbackup misslyckades",
            "anslutningspoolen är uttömd",
            "frågan får slut på minne",
            "databasreplikering släpar",
            "lagrad procedur tar timeout",
            "DB-anslutning nekad"
        ],
        descr: [
            "Användare rapporterar långsam applikation kopplad till databasfrågor.",
            "Databasanslutningsfel som påverkar flera applikationer.",
            "Prestandaförsämring under högbelastning.",
            "Misslyckade databasunderhållsjobb.",
            ""
        ],
        work_notes: [
            "Granskade exekveringsplaner. Saknar index på tabellen customer_orders.",
            "Databas-CPU på 98%. Lång körning från rapportverktyg identifierad.",
            "Anslutningspoolens inställningar behöver justeras. Nuvarande max är 100.",
            "Eskalerade till DBA-teamet för prestandajustering."
        ],
        comments: [
            "Vi har identifierat en långsam fråga. Databas-teamet optimerar.",
            "Kan du bekräfta vilken applikation du använder när detta händer?",
            "Prestandan bör förbättras snart. Vi implementerar indexoptimering.",
            "Påverkar detta alla användare eller bara specifika moment?"
        ],
        resolution_notes: [
            "Skapade nytt index. Frågetiden minskade från 45 s till 2 s.",
            "Avbröt lång körning. Justerade anslutningspoolen till 200.",
            "Databasstatistik uppdaterad. Prestanda återställd.",
            "Frågan optimerad av DBA-teamet. Applikationens prestanda förbättrades."
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
            "e-post fastnar i utkorgen",
            "tar inte emot externa e-postmeddelanden",
            "Outlook ber hela tiden om lösenord",
            "kalenderinbjudningar skickas inte",
            "postlådekvoten överskriden",
            "distributionslista fungerar inte",
            "e-post hamnar i skräppost",
            "kan inte komma åt delad postlåda",
            "kalenderdelning fungerar inte",
            "e-postbilagor laddas inte ner",
            "mötesinbjudningar visas inte",
            "Outlook är frånkopplat från servern"
        ],
        descr: [
            "Användaren kan inte skicka eller ta emot e-post korrekt.",
            "Problem med kalender-synk mellan enheter.",
            "Postlådekvoten är nådd och hindrar nya meddelanden.",
            "E-postdelegering och behörigheter fungerar inte som förväntat.",
            ""
        ],
        work_notes: [
            "Kontrollerade Exchange admin center. Postlådan är 98% full.",
            "Granskade regler för e-postflöde. Inga blockeringar hittades för denna användare.",
            "Kalenderbehörigheter är satta till endast 'Ledig/Upptagen'. Behöver justeras.",
            "Återskapade Outlook-profil. Synkar nu."
        ],
        comments: [
            "Din postlåda är nästan full. Arkivera gamla mejl. Jag kan hjälpa till om det behövs.",
            "Kan du kontrollera skräppostmappen? Mejlen kan ha filtrerats där.",
            "Jag har justerat dina inställningar för kalenderdelning. Testa och bekräfta.",
            "Vilken storlek har bilagorna du försöker ladda ner?"
        ],
        resolution_notes: [
            "Användaren arkiverade 2 GB gamla mejl. Postlådan fungerar normalt.",
            "Tog bort felaktig regel för e-postflöde. Extern leverans återställd.",
            "Kalenderbehörigheter uppdaterade. Delning fungerar som förväntat.",
            "Outlook-profilen byggdes om. E-postsynk återställd."
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
            "Excel kraschar när stora filer öppnas",
            "Teams fryser hela tiden",
            "SAP GUI svarar inte",
            "Chrome kraschar upprepade gånger",
            "PDF-läsaren stängs oväntat",
            "Salesforce-sidan laddas inte",
            "applikationen ger felkod 0x80070005",
            "programvaran fryser vid start",
            "appen kraschar vid utskrift",
            "får blåskärm när appen körs",
            "fel: applikationen har slutat fungera",
            "programmet svarar inte"
        ],
        descr: [
            "Applikationen kraschar eller fryser vid normal användning.",
            "Felmeddelanden visas när programvaran startas.",
            "Applikationens prestanda har försämrats kraftigt.",
            "Programvaran svarar inte på användarens inmatning.",
            ""
        ],
        work_notes: [
            "Kontrollerade händelseloggar. Applikationsfel i msvcrt.dll.",
            "Användaren kör föråldrad version 2.1.3. Aktuell är 2.2.1.",
            "Antivirus kan störa. Lade till undantag för test.",
            "Rensade applikationscache och temporära filer."
        ],
        comments: [
            "Kan du beskriva vad du gör precis innan det kraschar?",
            "Vi hittade en uppdatering. Installerar nu.",
            "Spara gärna arbetet ofta medan vi felsöker detta.",
            "Har du installerat någon ny programvara nyligen?"
        ],
        resolution_notes: [
            "Uppdaterade applikationen till senaste version. Problemet löst.",
            "Reparerade Office-installationen. Excel är stabilt igen.",
            "Rensade webbläsarens cache och inaktiverade tillägg. Chrome fungerar normalt.",
            "Applikationen installerades om. Krascherna upphörde."
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
            "hör inget ljud i Teams-möte",
            "Zoom skärmdelning fungerar inte",
            "Teams-video fryser",
            "Slack-notiser visas inte",
            "kan inte ansluta till Webex-möte",
            "mikrofonen fungerar inte i Teams",
            "skärmdelning visar svart skärm",
            "får eko i konferenssamtal",
            "Zooms väntrum fastnar",
            "kan inte ladda upp filer till Teams-kanal",
            "videosamtal kopplas ner hela tiden",
            "Teams-status uppdateras inte"
        ],
        descr: [
            "Användaren kan inte delta fullt ut i videomöten.",
            "Ljud- eller videoproblem under digitala möten.",
            "Skärmdelning fungerar inte.",
            "Notiser eller funktioner i samarbetsplattformen fungerar inte.",
            ""
        ],
        work_notes: [
            "Kontrollerade Teams-diagnostik. Codec-fel upptäckt.",
            "Användarens kamerabehörighet är avstängd i Windows-inställningar.",
            "Nätverksbandbredd ser bra ut. Troligen problem med lokal ljudenhet.",
            "Uppdaterade Teams till senaste version. Testar nu."
        ],
        comments: [
            "Kan du prova att byta ljudenhet i Teams-inställningarna?",
            "Se till att Teams har kamera- och mikrofonbehörighet i systeminställningarna.",
            "Prova att ansluta via webbläsaren som en tillfällig lösning.",
            "Har andra deltagare samma problem?"
        ],
        resolution_notes: [
            "Uppdaterade Teams till senaste version. Ljud och video fungerar.",
            "Konfigurerade om ljudenhetsinställningar. Eko försvann.",
            "Kamerabehörighet aktiverad. Video fungerar igen.",
            "Bytte ut trasigt headset. Ljudkvaliteten är nu bra."
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
            "skrivaren är offline kan inte skriva ut",
            "skannern hittas inte",
            "utskriftsjobb fastnar i kön",
            "skrivaren visar pappersstopp men inget stopp",
            "trådlöst tangentbord ansluter inte",
            "muspekaren hoppar erratiskt",
            "USB-enhet känns inte igen",
            "skrivaren skriver ut tomma sidor",
            "skannerprogramvaran hittar inte enheten",
            "dockningsstationen fungerar inte",
            "fel i utskriftsspooler",
            "bluetooth-mus paras inte"
        ],
        descr: [
            "Utskriftstjänster fungerar inte korrekt.",
            "Kringutrustning ansluter inte eller fungerar inte.",
            "Utskriftsjobb köas men slutförs inte.",
            "Hårdvaruenheter känns inte igen av datorn.",
            ""
        ],
        work_notes: [
            "Kontrollerade printservern. Skrivaren visar offline.",
            "Utskriftsspooler-tjänsten var stoppad. Startade om tjänsten.",
            "USB-drivrutinsproblem upptäckt. Uppdaterar drivrutiner.",
            "Rensade utskriftskön och startade om skrivaren."
        ],
        comments: [
            "Kan du prova att stänga av och slå på skrivaren igen?",
            "Kontrollera att skrivarkabeln sitter ordentligt.",
            "Jag startar om utskriftstjänsten på din dator. Ett ögonblick.",
            "Har du provat en annan USB-port?"
        ],
        resolution_notes: [
            "Utskriftsspoolern rensades och startades om. Användaren kan skriva ut.",
            "Skrivarens firmware uppdaterad. Pappersstoppfel rensat.",
            "USB-drivrutiner installerades om. Enheten känns igen och fungerar.",
            "Bytte ut trasig USB-kabel. Skrivaren fungerar nu."
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
            "fick misstänkt e-post som ber om lösenord",
            "fick e-post som påstår att mitt konto stängs av",
            "konstig e-post med brådskande begäran om banköverföring",
            "e-post med misstänkt bilaga",
            "möjligt phishingförsök",
            "VD:n ber om presentkort via e-post?",
            "e-post som ber mig verifiera Office 365-uppgifter",
            "misstänkt länk i textmeddelande",
            "e-post säger att jag vunnit lotteri och måste klicka på länk",
            "leverantörsmejl ser falskt ut",
            "ovanlig inloggningsvarning",
            "säkerhetsvarning på mitt konto"
        ],
        descr: [
            "Användaren rapporterar misstänkt phishing eller social engineering.",
            "Misstänkt e-post som begär känslig information eller åtgärder.",
            "Möjligt säkerhetshot identifierat av användaren.",
            "Misstänkt e-postförfalskning eller spoofing.",
            ""
        ],
        work_notes: [
            "Granskade e-posthuvuden. Avsändardomänen är spoofad.",
            "Lade till avsändaren i blocklistan. Skickat till threat intel-teamet.",
            "Kontrollerade användarens inkorg. 3 liknande mejl hittades och raderades.",
            "Bekräftade phishingkampanj. Säkerhetsvarning skickad i hela företaget."
        ],
        comments: [
            "Tack för att du rapporterar! Klicka INTE på några länkar eller öppna bilagor.",
            "Du gjorde rätt som rapporterade detta. Vi utreder.",
            "Radera mejlet och svara inte på det.",
            "Vidarebefordra detta till security@company.com och radera det sedan."
        ],
        resolution_notes: [
            "Bekräftat phishingförsök. Mejlet blockerades i hela företaget. Användaren informerades om hur phishing känns igen.",
            "Skadliga mejl togs bort från alla berörda postlådor. Säkerhetsvarning skickad.",
            "Falsklarm - legitimt leverantörsmejl. Avsändaren vitlistad för framtiden.",
            "Phishingmejl i karantän. Användaren utbildad i säkerhetsmedvetenhet."
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
            "internetanslutningen är väldigt långsam",
            "kan inte ansluta till delade enheter",
            "nätverksenheten kopplas ner hela tiden",
            "ingen nätverksanslutning",
            "DNS kan inte slå upp interna sidor",
            "får fel 'servern hittades inte'",
            "fjärrskrivbordsanslutning misslyckades",
            "intranätsidan laddas inte",
            "intermittenta nätverksavbrott",
            "får fel 'nätverkssökvägen hittades inte'",
            "kan inte pinga servern",
            "nätverkskortet fungerar inte"
        ],
        descr: [
            "Användaren har nätverksanslutningsproblem.",
            "Kan inte komma åt nätverksresurser.",
            "Intermittenta avbrott påverkar produktiviteten.",
            "Problem med DNS eller nätverksrouting.",
            ""
        ],
        work_notes: [
            "Pingade användarens arbetsstation. 40% paketförlust upptäckt.",
            "Kontrollerade switchport. Gränssnittet visar CRC-fel.",
            "DNS-cache rensad på distans. Testar anslutning.",
            "Nätverkskabel testad - verkar vara defekt."
        ],
        comments: [
            "Kan du bekräfta om du använder trådad eller trådlös anslutning?",
            "Laddas andra webbplatser normalt, eller gäller det bara interna sidor?",
            "Vi ser nätverksproblem i ditt område. Vi utreder med nätverksteamet.",
            "Kan du prova att dra ur och sätta i nätverkskabeln igen?"
        ],
        resolution_notes: [
            "Nätverkskabeln byttes. Anslutningen är stabil.",
            "DNS-konfiguration korrigerad. Alla sidor är tillgängliga.",
            "Switchport återställd. Nätverksanslutning återställd.",
            "Drivrutiner för nätverkskort uppdaterade. Anslutningen är stabil."
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
            "behöver åtkomst till Power BI",
            "jag vill begära åtkomst till Power BI",
            "hur får jag åtkomst till Power BI?",
            "utlåst från Logistics",
            "utlåst från Logistics-systemet",
            "är Logistics-systemet nere?",
            "kan inte komma åt Logistics-systemet",
            "ingen respons från Logistics-systemet",
            "jag vill ha åtkomst till Logistics-systemet",
            "kan inte komma åt Corporate Logistics System",
            "Logistics-systemet är väldigt långsamt när data uppdateras",
            "logistics-portalen visar fel",
            "kan inte logga in i logistics",
            "timeout i logistics-systemet"
        ],
        descr: [
            "Användaren är utlåst.",
            "",
            "Användaren är nyanställd och vill ha åtkomst till Logistics-systemet.",
            "Användaren rapporterar att de inte kommer åt Logistics-systemet från sin plats men kan nå internet.",
            "Användaren upplever prestandaproblem med Logistics-portalen."
        ],
        work_notes: [
            "Informerade användaren att använda self-service-portalen.",
            "Verifierade användarkontots status. Lägger till i Logistics-åtkomstgrupp.",
            "Kontrollerade systemstatus. Inga kända driftstörningar.",
            "Prestandaproblem loggat hos applikationssupportteamet."
        ],
        comments: [
            "Använd self-service vid kontolåsning.",
            "Vilka specifika funktioner i Logistics-systemet behöver du åtkomst till?",
            "Har du fått åtkomstgodkännande av din chef?",
            "Påverkar detta alla sidor eller specifika funktioner?"
        ],
        resolution_notes: [
            "Användaren lades till i Logistics-åtkomstgruppen. Åtkomst bekräftad.",
            "Kontot låstes upp. Användaren kan logga in.",
            "Länk till self-service-portalen skickad. Användaren slutförde åtkomstbegäran.",
            "Prestandaproblemet löstes av applikationsteamet. Systemet svarar normalt."
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
            "kan inte ansluta till Order Status från vår plats i Sverige",
            "kan inte ansluta till Order Status",
            "ingen respons från Order Status",
            "Order Status är tom",
            "Order Status visar tom skärm",
            "Order Status verkar nere",
            "Order Status-systemet är nere",
            "kan inte komma åt ordersystemet",
            "användare rapporterar att Order Status inte fungerar",
            "behöver åtkomst till Order Status",
            "begär åtkomst till Order Status",
            "orderportalen visar fel 500",
            "ordrar laddas inte"
        ],
        descr: [
            "Användaren rapporterar att Order Status är långsamt eller nere.",
            "",
            "Användaren rapporterar att Order Status är nere.",
            "Regional anslutningsstörning till Order Status-systemet.",
            "Användaren kan inte se orderinformation."
        ],
        work_notes: [
            "Informerade användaren om att vi utreder kända driftstörningar.",
            "Kontrollerade applikationsloggar. Timeout i databasanslutning upptäckt.",
            "Eskalerade till jourteamet för utredning.",
            "VPN-tunneln till Sverige verkar nere. Nätverksteamet är inkopplat."
        ],
        comments: [
            "Tack för att du kontaktar supporten. Vi utreder om det finns kända fel eller driftstörningar i orderportalen.",
            "Kan du bekräfta vilken plats du ansluter från?",
            "Kan du komma åt andra interna system?",
            "Vi ser förhöjda svarstider. Vi arbetar med applikationsteamet."
        ],
        resolution_notes: [
            "Eskalerat till jourteamet som löste det genom att starta om en bakgrundsprocess.",
            "VPN-tunnel återställd. Order Status är tillgängligt från alla platser.",
            "Databasens anslutningspool ökades. Portalen svarar normalt.",
            "Omstart av applikationsservern löste problemet med tom skärm."
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
            "ser ingen bild på skärmen",
            "min laptopskärm är trasig",
            "trasigt tangentbord",
            "datorskärmen är svart",
            "ingen bild på laptopen",
            "tappade min laptop, nu är skärmen trasig",
            "laptopen startar inte",
            "blåskärm",
            "hårddisken klickar",
            "laptopbatteriet laddar inte",
            "laptopen överhettar",
            "ingen ström till stationär dator",
            "hårdvarudiagnostik misslyckades"
        ],
        descr: [
            "Användaren sa att kabeln mellan laptop och skärm är gammal.",
            "",
            "Misstänkt hårdvarufel.",
            "Fysisk skada på enheten.",
            "Ström- eller skärmproblem med datorn."
        ],
        work_notes: [
            "Informerade användaren om att vi kontrollerar lager av ny hårdvara.",
            "Körde hårdvarudiagnostik. Grafikadapter misslyckades.",
            "Kontrollerade garanti. Enheten omfattas fortfarande.",
            "Beställde ersättningsenhet. Leverans väntas inom 2 arbetsdagar."
        ],
        comments: [
            "Tack för att du kontaktar supporten. Vi undersöker lagret för möjlig ny hårdvara.",
            "Kan du bekräfta om problemet började plötsligt eller gradvis?",
            "Har du provat att ansluta en extern skärm?",
            "Vi behöver byta ut enheten. Jag kontrollerar lagret nu."
        ],
        resolution_notes: [
            "Laptopen ersattes med en ny laptop och en ny HDMI-kabel.",
            "Enheten skickades på garanti-reparation. Låneenhet tillhandahölls.",
            "Hårddisken byttes. Data återställdes.",
            "Batteriet byttes. Laptopen laddar normalt."
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
            "problem med VPN-anslutning",
            "problem med VPN",
            "vpn-klienten visar fel 30012",
            "ett felmeddelande visas när VPN startas",
            "VPN och fel",
            "vpn fungerar inte",
            "vpn-problem",
            "jag har vpn 3.0",
            "VPN kopplas ner hela tiden",
            "kan inte ansluta till VPN",
            "timeout i VPN-anslutning",
            "VPN-autentisering misslyckades",
            "vpn långsam anslutning"
        ],
        descr: [
            "Användaren sa att kabeln mellan nätverksport och laptop fungerar men inte via wifi.",
            "",
            "Försökte starta om laptopen utan framgång.",
            "Installerade om samma VPN-version.",
            "VPN-anslutningen är instabil eller etableras inte."
        ],
        work_notes: [
            "Informerade användaren om att vi utreder kända VPN-störningar och bad också om bekräftelse av VPN-klientversion.",
            "Kontrollerade VPN-koncentratorn. Inga problem upptäckta.",
            "Användaren kör föråldrad VPN-klientversion 3.0. Uppgradering krävs.",
            "VPN-loggar visar mismatch i autentiseringstoken."
        ],
        comments: [
            "Kan du bekräfta om du kör VPN-klientversion 3.0?",
            "Prova att koppla ner och ansluta till VPN igen.",
            "Ansluter du från hemmet eller en annan plats?",
            "Säg till om du ser några specifika felkoder."
        ],
        resolution_notes: [
            "Slutanvändaren uppgraderade till VPN-klientversion 3.1 och det löste problemet.",
            "VPN-profil återskapad. Anslutningen är stabil.",
            "Brandväggsregel justerad. VPN ansluter utan problem.",
            "Certifikat förnyat. VPN-autentisering fungerar."
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
            "begäran om ERP-programvarulicens",
            "har vi extra användarlicens för vårt ERP?",
            "vårt ERP-system visar tom skärm",
            "ERP-inloggning fungerar inte",
            "ERP-klienten kraschade",
            "kan inte komma åt ERP-rapporter",
            "ERP-prestanda är mycket långsam",
            "får ERP-databasfel",
            "timeout i ERP-session",
            "behöver utbildning i ERP-systemet"
        ],
        descr: [
            "Slutanvändaren kan inte komma åt ERP-systemet.",
            "",
            "Användaren begär ytterligare ERP-licens.",
            "Prestandaproblem med ERP-klienten.",
            "ERP-klientapplikationen fungerar inte korrekt."
        ],
        work_notes: [
            "Informerade användaren om att vi utreder kända licensproblem kopplade till ERP-åtkomst.",
            "Kontrollerade SAP-licensservern. 5 licenser tillgängliga.",
            "ERP-klientversionen är föråldrad. Uppgradering rekommenderas.",
            "Tilldelade tillgänglig ERP-licens till användaren."
        ],
        comments: [
            "Kan du bekräfta om du kör ERP-klientversion 10.0 eller nyare?",
            "Vilken ERP-modul försöker du komma åt?",
            "Har du använt ERP-systemet tidigare eller är det första gången?",
            "Jag kontrollerar licenstillgänglighet."
        ],
        resolution_notes: [
            "Slutanvändaren uppgraderade till ERP-klientversion 10.1 och det löste problemet.",
            "ERP-licens tilldelad. Användaren kan nu komma åt systemet.",
            "ERP-klienten reparerad. Applikationen startar korrekt.",
            "Prestandajustering genomförd. ERP svarar normalt."
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
            "wifi-anslutningsproblem på min laptop",
            "problem med wi-fi på min MacBook",
            "wi-fi-klienten visar fel: ingen signal",
            "ett felmeddelande visas när Wifi startas",
            "Wifi och fel",
            "Wifi fungerar inte",
            "WiFi-problem",
            "jag har WiFi 802.11ax",
            "ingen wifi-signal eller låg signal",
            "wifi kopplas ner hela tiden",
            "kan inte ansluta till företags-wifi",
            "wifi-autentisering misslyckades",
            "begränsad anslutning på wifi"
        ],
        descr: [
            "Användaren sa att kabelanslutning fungerar, men ser problem med nätverket. Access points visar allt OK.",
            "",
            "Slutanvändaren har startat om laptopen.",
            "Slutanvändaren har provat att stänga av och på wifi i systeminställningarna.",
            "WiFi-anslutningen är instabil eller ansluter inte."
        ],
        work_notes: [
            "Informerade användaren om att vi utreder kända wifi-firmwareproblem och bad om bekräftelse på Wifi-klientversion.",
            "Kontrollerade trådlösa access points. Alla fungerar normalt.",
            "WiFi-drivrutinen verkar föråldrad. Uppdaterar nu.",
            "Tog bort sparat wifi-nätverk och lade till igen med ny autentisering."
        ],
        comments: [
            "Kan du bekräfta om du kör Wifi-klientversion 2.0?",
            "Ser du företags-WiFi i listan över tillgängliga nätverk?",
            "Har du provat att glömma nätverket och ansluta igen?",
            "Hur långt är det ungefär till den trådlösa access pointen?"
        ],
        resolution_notes: [
            "Slutanvändaren uppgraderade till wifi-klientversion 2.6.3 och det löste problemet.",
            "WiFi-drivrutinen uppdaterades. Anslutningen är stabil.",
            "Firmware för access point uppdaterad. Signalkvaliteten förbättrades.",
            "WiFi-profilen återskapad. Användaren ansluter nu utan problem."
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
    var closeCodes = [
        CLOSE_CODE.SOLVED,
        CLOSE_CODE.SOLVED_PERMANENTLY,
        CLOSE_CODE.SOLVED_REMOTELY,
        CLOSE_CODE.NOT_SOLVED,
        CLOSE_CODE.NOT_SOLVED_TOO_COSTLY,
        CLOSE_CODE.CLOSED_BY_CALLER
    ];
    _rec.close_code = closeCodes[Math.floor(Math.random() * closeCodes.length)];

    // Use resolution notes from template if available
    if (recTemplate.resolution_notes && recTemplate.resolution_notes.length > 0) {
        _rec.close_notes = recTemplate.resolution_notes[Math.floor(Math.random() * recTemplate.resolution_notes.length)];
    } else {
        _rec.close_notes = 'Användaren startade om sin dator för att lösa detta. De återkommer om problemet kvarstår.';
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
