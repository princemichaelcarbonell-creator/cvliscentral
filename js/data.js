/* =====================================================================
   CVLIS CENTRAL — shared data & defaults
   Lahat ng default na nilalaman ng website ay nandito.
   ===================================================================== */

/* Email na makikita sa "email the registrar" links */
const REGISTRAR_EMAIL = "registrar@cvlis.edu.ph";

/* Default school settings. Pwedeng palitan sa Admin Panel → Settings. */
const DEFAULT_SETTINGS = {
  schoolName: "CVLIS Central",
  shortName: "Camp Vicente Lim Integrated School",
  tagline: "Camp Vicente Lim Integrated School",
  registrarEmail: "registrar@cvlis.edu.ph",
  phone: "(049) 555-1234",
  address: "Brgy. Mayapa, Calamba City, Laguna",
  hours: "Monday to Friday, 8:00 AM – 4:00 PM",
  logo: "",
  pollQuestion: "Which event should we hold next?",
  pollOptions: ["Sports Fest", "Science Fair", "Cultural Day"]
};

/* Naka-cache na settings. Pinapalitan ng loadSettings(). */
let SETTINGS = { ...DEFAULT_SETTINGS };

/* Default announcements (ginagamit kapag wala pang server/local data) */
const DEFAULT_NEWS = [
  ["JUL", "28", "Brigada Eskwela wrap-up and thank you to volunteers",
   "Classrooms across all grade levels have been repainted and repaired ahead of the term.", "General"],
  ["JUL", "22", "Second quarter exam schedule now posted",
   "Junior High and Senior High schedules are up under Events — check your section's time block.", "Academics"],
  ["JUL", "15", "Registrar office closed for inventory, July 18",
   "Document requests filed that day will be processed starting July 19.", "Registrar"]
];

/* Default events */
const DEFAULT_EVENTS = [
  ["AUG", "04", "First day, 2nd quarter", "All grade levels", ""],
  ["AUG", "11", "Parent-Teacher conference", "Covered court", ""],
  ["AUG", "21", "Filipino Language Month opening program", "School grounds", ""]
];

/* Live data (pinapalitan mula sa server/local storage) */
let NEWS = DEFAULT_NEWS.map((n, i) => [...n, i + 1]);
let EVENTS = DEFAULT_EVENTS.map((e, i) => [...e, i + 1]);

/* Document catalog: name, processing days, description */
const DOCS = [
  { name: "Good Moral Certificate", days: 2,
    desc: "Proof of good conduct, usually required for scholarships, work, or transfer." },
  { name: "Form 137 / SF10", days: 3,
    desc: "Permanent student record. Released only to the student or guardian." },
  { name: "Certificate of Enrollment", days: 1,
    desc: "Confirms that you are currently enrolled for the school year." },
  { name: "Other / Special request", days: 3,
    desc: "Any other registrar document. Describe it in the purpose box." }
];

/* Request statuses, in order */
const STATUS_FLOW = [
  { key: "pending", label: "Pending review", icon: "🕒", note: "Your request was received and is waiting for the registrar." },
  { key: "processing", label: "Processing", icon: "📝", note: "The registrar is preparing your document." },
  { key: "ready", label: "Ready for pickup", icon: "✅", note: "You can claim the document at the registrar's office." },
  { key: "released", label: "Released", icon: "📦", note: "The document has been claimed." },
  { key: "rejected", label: "Needs attention", icon: "⚠️", note: "The request could not be processed. Check the admin note." }
];

/* Grade levels */
const GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Graduate"];

/* Enrollment student types */
const STUDENT_TYPES = [
  ["new", "New student"],
  ["transferee", "Transferee"],
  ["returning", "Returning student"]
];

/* SHS strands available at CVLIS */
const SHS_STRANDS = [
  ["ICT", "Information & Communications Technology"],
  ["STEM", "Science, Technology, Engineering & Mathematics"],
  ["ABM", "Accountancy, Business & Management"],
  ["Cookery", "Cookery NC II"],
  ["EIM", "Electrical Installation & Maintenance"],
  ["SMAW", "Shielded Metal Arc Welding"],
  ["CSS", "Computer Systems Servicing"]
];

/* [id, label, hint, required for which student types] */
const ENROLL_DOCS = [
  ["birth", "PSA Birth Certificate", "Original and photocopy", ["new", "transferee"]],
  ["card", "Report Card (Form 138)", "Latest report card, signed by the previous school", ["new", "transferee", "returning"]],
  ["sf10", "Form 137 / SF10", "Permanent record from your previous school", ["new", "transferee"]],
  ["moral", "Good Moral Certificate", "Issued by your previous school", ["transferee"]],
  ["id", "2x2 ID Photo", "Plain background, recent photo (2 copies)", []]
];

const ENROLL_OFFICE = "Registrar's Office, Camp Vicente Lim Integrated School, Brgy. Mayapa, Calamba City";
const ENROLL_HOURS = "Monday to Friday, 8:00 AM – 4:00 PM";

const ENROLL_PROCEDURE = [
  ["Check the enrollment schedule",
   "Read the Announcements page for the enrollment period and any special instructions from the school."],
  ["Prepare your requirements",
   "Gather the documents for your student type (listed in the interactive checklist). Bring the original and a photocopy of each."],
  ["Go to the school",
   "The student should come with a parent or guardian. Bring a valid ID and the student's LRN."],
  ["Proceed to the registrar's office",
   "Submit your documents for checking. For Grade 11 and 12, tell the registrar which SHS strand you choose."],
  ["Fill out the enrollment form",
   "The registrar will give you the official enrollment form. Fill it out completely and sign it."],
  ["Get your section and schedule",
   "Once your documents are complete, the registrar will assign the student a section and give the class schedule."],
  ["Settle any remaining requirements",
   "If a document is missing, ask the registrar how and when to submit it. Keep your copy of the enrollment form."]
];

/* Staff directory: [role, office, email, phone]
   Original na roles/offices pa rin ito — dinagdagan lang ng contact details. */
const STAFF = [
  ["Registrar", "Registrar's Office", "registrar@cvlis.edu.ph", "(049) 555-1234"],
  ["School Principal", "Office of the Principal", "principal@cvlis.edu.ph", "(049) 555-1235"],
  ["Junior High Coordinator", "Grades 7–10", "jhs@cvlis.edu.ph", "(049) 555-1236"],
  ["Senior High Coordinator", "Grades 11–12", "shs@cvlis.edu.ph", "(049) 555-1237"],
  ["Guidance Counselor", "Guidance Office", "guidance@cvlis.edu.ph", "(049) 555-1238"],
  ["Clinic / Nurse", "School Clinic", "clinic@cvlis.edu.ph", "(049) 555-1239"]
];

/* School history milestones */
const TIMELINE = [
  ["1952", "The school opens as a school for enlisted personnel at Camp Vicente Lim, under the Armed Forces of the Philippines."],
  ["1986", "Turned over to the Department of Education and renamed Camp Vicente Lim National High School."],
  ["2016", "Senior High School opens, adding Grades 11 and 12 to the campus."],
  ["2017", "Renamed Camp Vicente Lim Integrated School to reflect the Junior and Senior High programs."],
  ["Today", "A public secondary school serving the Limian community of Brgy. Mayapa, Calamba City."]
];

/* Frequently asked questions */
const FAQS = [
  ["How do I request a document?", "Open Document Requests, select Start a request, complete the 3-step form, and submit. You will receive a reference code that you can use to track the request anytime."],
  ["Do I need to pay online?", "No. This website does not collect payments. Please coordinate with the registrar's office for any school requirements."],
  ["How long does it take to get a document?", "It usually takes 1–5 school days depending on the document. The processing estimate is shown on the request form and receipt. When the status is Ready for pickup, you can claim it at the registrar's office."],
  ["Do I need an account?", "An account is not required to submit a request, but logging in makes it easier to track your requests. Requests filed while logged in appear under My requests."],
  ["I lost my reference code.", "If you are logged in, open Document Requests → My requests. If not, request a new code from the registrar or email them using the address you used in your request."],
  ["How do I enroll?", "Enrollment is done in person at the registrar's office. See the Enrollment page for the step-by-step procedure and an interactive requirements checklist."],
  ["How do I become an admin?", "Admin accounts are created only by the school head. In the demo, an admin account is available on the Help page. In a real deployment, change the password immediately."],
  ["Why is the Admin Panel not showing?", "The Admin Panel appears only when you are logged in with an admin account. See the Help page for the demo credentials."]
];

/* Default poll options */
const POLL_QUESTION = DEFAULT_SETTINGS.pollQuestion;
const POLL_OPTIONS = DEFAULT_SETTINGS.pollOptions;

/* Admin tabs metadata */
const ADMIN_TABS = [
  ["overview", "Overview", "📊"],
  ["requests", "Requests", "📨"],
  ["ann", "Announcements", "📣"],
  ["ev", "Events", "📅"],
  ["messages", "Messages", "✉️"],
  ["users", "Users", "👥"],
  ["settings", "Settings", "⚙️"]
];

/* Help guides */
const HELP = [
  ["Getting around the website", [
    "Tap the menu button (three lines, top-left) to open the side menu, or press M.",
    "Choose a page such as School Info, Announcements, or Events. The menu closes by itself.",
    "Use the search box on Announcements and Staff Directory to find things fast.",
    "Press / anywhere to jump to the nearest search box, and Esc to close menus."
  ], "home", "Go to Home"],
  ["Create an account and log in", [
    "Tap Sign up at the top right of the page.",
    "Enter your full name, email, and a password with at least 8 characters.",
    "Next time, tap Log in and use the same email and password.",
    "When logged in, your name and email are filled in automatically on the request form."
  ], "request", "Go to Document Requests"],
  ["How to enroll", [
    "Enrollment is done in person at the school. There is no online enrollment.",
    "Open Enrollment from the menu to see the steps and the interactive requirements checklist.",
    "Choose your student type (new, transferee, returning) to see exactly which documents you need.",
    "Tick each requirement as you prepare it. Your progress is saved in this browser.",
    "Go to the registrar's office with the student and a parent or guardian."
  ], "enroll", "Go to Enrollment"],
  ["How to request a document", [
    "Open Document Requests from the menu and tap Start a request.",
    "Step 1: enter the student's name, LRN, email, and grade level.",
    "Step 2: choose the document, number of copies, and purpose.",
    "Step 3: review the processing time, then submit.",
    "Copy your reference code. Use Track a request anytime to check the status."
  ], "request", "Go to Document Requests"],
  ["Announcements and events", [
    "Open Announcements to read the latest school news. Use the search box and tag filters.",
    "Open Events to see the school calendar, including a month view with event dots.",
    "Tap any announcement or event card to read the full details.",
    "The Home page shows the newest announcements and the next events."
  ], "news", "See announcements"],
  ["Quick poll", [
    "Find the Quick poll on the Home page.",
    "Tap your choice. One vote per browser/account.",
    "The results animate right after you vote.",
    "Admins can change the poll question and options in Admin → Settings."
  ], "home", "Go to Home"],
  ["Who to contact", [
    "Open Staff Directory from the menu.",
    "Search by name, role, or office.",
    "Tap a staff card to see contact details, then use the email or call button.",
    "Bring a valid ID or your LRN when visiting an office."
  ], "staff", "Open Staff Directory"],
  ["Admin Panel (school head only)", [
    "The Admin Panel is for the school head to manage requests, announcements, events, messages, users, and settings.",
    "Tap Log in and use an admin account. The Admin Panel appears in the menu only for admins.",
    "Update a document request's status so the student sees it in Track a request.",
    "Upload a new school logo in Admin → Settings. It updates the whole site instantly."
  ], "admin", "Go to Admin Panel"],
  ["Having trouble?", [
    "Forgot your password: ask the school admin to reset it from Admin → Users.",
    "Page looks out of date: refresh the page or press Ctrl + F5.",
    "Offline demo mode: if you opened index.html directly, data is saved in this browser only. Run start.bat to use the shared server.",
    "The site works without MySQL. The server automatically uses a local JSON database when MySQL is not configured."
  ]]
];
