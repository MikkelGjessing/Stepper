/**
 * Enhanced Knowledge Article Data Model
 * 
 * This file contains the enhanced data model for knowledge articles with support for:
 * - Prechecks before starting troubleshooting
 * - Detailed step information with customer-facing text
 * - Fallback paths for when initial steps don't work
 * - Stop conditions and escalation paths
 * 
 * @typedef {Object} Step
 * @property {string} id - Unique identifier for the step
 * @property {string} text - Internal step description
 * @property {string} [expected] - Expected outcome after completing the step
 * @property {string} [say_to_customer] - Customer-facing instruction text
 * @property {'action'|'check'} [type] - Type of step (action to perform or check to verify)
 */

/**
 * @typedef {Object} FallbackPath
 * @property {string} id - Unique identifier for the fallback path
 * @property {string[]} trigger_keywords - Keywords that trigger this fallback
 * @property {string} reason_category - Category of why the main path failed
 * @property {Step[]} steps - Alternative steps to try
 */

/**
 * @typedef {Object} Escalation
 * @property {string} when - Condition for escalation
 * @property {string} target - Escalation target (team, person, or system)
 */

/**
 * @typedef {Object} KnowledgeArticle
 * @property {number} id - Unique article identifier
 * @property {string} title - Article title
 * @property {string[]} tags - Searchable tags for categorization
 * @property {string} product - Product name this article applies to
 * @property {string} [version] - Optional product version
 * @property {string} summary - Brief summary of the issue and solution
 * @property {string[]} prechecks - Pre-flight checks before starting troubleshooting
 * @property {Step[]} steps - Main troubleshooting steps
 * @property {FallbackPath[]} fallbacks - Alternative paths if main steps fail
 * @property {string[]} stop_conditions - Conditions that indicate resolution
 * @property {Escalation} escalation - Escalation information
 */

/**
 * Mock Knowledge Base with Enhanced Article Model
 * 
 * This dataset includes:
 * - 8 realistic support articles
 * - Overlapping content between articles 1 & 2 (email-related)
 * - Shared steps 1-3 between articles 3 & 4 (connectivity issues)
 * - Articles with multiple fallback paths
 * 
 * @type {KnowledgeArticle[]}
 */
const enhancedKnowledgeBase = [
  // Article 1: Email Not Sending - Outlook
  {
    id: 1,
    title: "Email Not Sending - Outlook",
    tags: ["email", "outlook", "send", "smtp", "not-working", "delivery"],
    product: "Microsoft Outlook",
    version: "2019/2021/365",
    summary: "Troubleshooting steps for when emails fail to send in Microsoft Outlook",
    prechecks: [
      "Verify internet connection is active",
      "Check if other applications can access the network",
      "Confirm email account credentials are correct"
    ],
    steps: [
      {
        id: "step-1-1",
        text: "Check internet connectivity",
        expected: "Internet connection is stable and active",
        say_to_customer: "First, let's verify your internet connection is working. Can you open a web browser and access any website?",
        type: "check"
      },
      {
        id: "step-1-2",
        text: "Verify Outbox for stuck emails",
        expected: "Outbox is empty or emails are sending",
        say_to_customer: "Please check your Outbox folder. Do you see any emails stuck there?",
        type: "check"
      },
      {
        id: "step-1-3",
        text: "Check recipient email address format",
        expected: "Email address is properly formatted",
        say_to_customer: "Let's verify the recipient's email address is correct and properly formatted (e.g., name@example.com)",
        type: "check"
      },
      {
        id: "step-1-4",
        text: "Review SMTP settings",
        expected: "SMTP server and port are configured correctly",
        say_to_customer: "We need to check your email account settings. Go to File > Account Settings > Account Settings, then double-click your email account and verify the outgoing server (SMTP) settings.",
        type: "action"
      },
      {
        id: "step-1-5",
        text: "Test with different recipient",
        expected: "Email sends successfully to another address",
        say_to_customer: "Try sending a test email to yourself or another email address you own. Does it go through?",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-1-1",
        trigger_keywords: ["stuck", "outbox", "not sending", "pending"],
        reason_category: "emails_stuck_in_outbox",
        steps: [
          {
            id: "fb-1-1-1",
            text: "Clear Outbox by deleting stuck emails",
            say_to_customer: "Let's clear your Outbox. Delete any stuck emails and try sending a new test message.",
            type: "action"
          },
          {
            id: "fb-1-1-2",
            text: "Work offline and back online",
            say_to_customer: "Click 'Send/Receive' tab, then click 'Work Offline' to toggle it off if it's on, then toggle it back on.",
            type: "action"
          },
          {
            id: "fb-1-1-3",
            text: "Restart Outlook in safe mode",
            say_to_customer: "Close Outlook completely. Hold Ctrl while clicking the Outlook icon to start it in Safe Mode. Try sending an email again.",
            type: "action"
          }
        ]
      },
      {
        id: "fallback-1-2",
        trigger_keywords: ["server", "smtp", "authentication", "settings"],
        reason_category: "server_configuration_issue",
        steps: [
          {
            id: "fb-1-2-1",
            text: "Verify SMTP server address",
            say_to_customer: "Let's verify your outgoing server address. It should be something like 'smtp.office365.com' or 'smtp.gmail.com' depending on your provider.",
            type: "check"
          },
          {
            id: "fb-1-2-2",
            text: "Check SMTP port number",
            say_to_customer: "Check that the port is set correctly. Common ports are 587 (TLS) or 465 (SSL).",
            type: "check"
          },
          {
            id: "fb-1-2-3",
            text: "Enable SMTP authentication",
            say_to_customer: "Make sure 'My outgoing server (SMTP) requires authentication' is checked in your account settings.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Test email sends successfully",
      "Email appears in Sent Items folder",
      "Recipient confirms email receipt"
    ],
    escalation: {
      when: "After 30 minutes of troubleshooting or if server-side issue suspected",
      target: "IT Support - Email Team"
    }
  },

  // Article 2: Email Not Sending - Gmail Web
  {
    id: 2,
    title: "Email Not Sending - Gmail Web Interface",
    tags: ["email", "gmail", "send", "web", "browser", "not-working"],
    product: "Gmail",
    version: "Web",
    summary: "Troubleshooting for Gmail emails not sending in web browser",
    prechecks: [
      "Verify internet connection is active",
      "Check if other websites load properly",
      "Confirm you're logged into the correct Gmail account"
    ],
    steps: [
      {
        id: "step-2-1",
        text: "Check internet connectivity",
        expected: "Internet connection is stable and active",
        say_to_customer: "First, let's verify your internet connection is working. Can you open another website in a new tab?",
        type: "check"
      },
      {
        id: "step-2-2",
        text: "Check for error messages in Gmail",
        expected: "Error message provides clue to issue",
        say_to_customer: "Do you see any error message when you try to send? If so, what does it say?",
        type: "check"
      },
      {
        id: "step-2-3",
        text: "Verify recipient email format",
        expected: "Email addresses are valid",
        say_to_customer: "Let's check that all recipient email addresses are correctly formatted without any typos.",
        type: "check"
      },
      {
        id: "step-2-4",
        text: "Check attachment size",
        expected: "Attachments are under 25MB limit",
        say_to_customer: "Are you trying to send any attachments? Gmail has a 25MB limit for attachments.",
        type: "check"
      },
      {
        id: "step-2-5",
        text: "Clear browser cache and cookies",
        expected: "Gmail works after clearing cache",
        say_to_customer: "Let's clear your browser's cache and cookies for Gmail. In Chrome, go to Settings > Privacy > Clear browsing data, select 'Cookies' and 'Cached images', then click Clear data.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-2-1",
        trigger_keywords: ["attachment", "size", "large", "file"],
        reason_category: "attachment_too_large",
        steps: [
          {
            id: "fb-2-1-1",
            text: "Use Google Drive for large files",
            say_to_customer: "For files larger than 25MB, we'll use Google Drive. Click the Google Drive icon in the compose window and upload your file there instead.",
            type: "action"
          },
          {
            id: "fb-2-1-2",
            text: "Compress files before sending",
            say_to_customer: "Alternatively, you can compress your files into a ZIP archive to reduce the size.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Email sends successfully",
      "Email appears in Sent folder",
      "No error messages displayed"
    ],
    escalation: {
      when: "After 20 minutes of troubleshooting or if account suspension suspected",
      target: "Google Workspace Admin or Gmail Support"
    }
  },

  // Article 3: Cannot Connect to WiFi Network
  {
    id: 3,
    title: "Cannot Connect to WiFi Network",
    tags: ["wifi", "network", "connection", "wireless", "internet", "connectivity"],
    product: "Windows PC",
    version: "10/11",
    summary: "Steps to resolve WiFi connection issues on Windows computers",
    prechecks: [
      "Check if WiFi is enabled on the device",
      "Verify the WiFi network is visible in available networks",
      "Confirm you have the correct WiFi password"
    ],
    steps: [
      {
        id: "step-3-1",
        text: "Verify WiFi adapter is enabled",
        expected: "WiFi adapter shows as enabled",
        say_to_customer: "Let's check if your WiFi is turned on. Look for the WiFi icon in your system tray (bottom-right corner). Is it showing available networks?",
        type: "check"
      },
      {
        id: "step-3-2",
        text: "Toggle airplane mode off and on",
        expected: "Network adapters reset successfully",
        say_to_customer: "Click the network icon, turn Airplane mode ON, wait 5 seconds, then turn it OFF. This resets your wireless adapter.",
        type: "action"
      },
      {
        id: "step-3-3",
        text: "Restart the WiFi router",
        expected: "Router restarts and broadcasts network",
        say_to_customer: "Please unplug your WiFi router's power cable, wait 30 seconds, then plug it back in. Wait for all the lights to stabilize (about 2 minutes).",
        type: "action"
      },
      {
        id: "step-3-4",
        text: "Forget and reconnect to network",
        expected: "Fresh connection established",
        say_to_customer: "Right-click on your WiFi network in the list and select 'Forget'. Then click on it again and enter the password to reconnect.",
        type: "action"
      },
      {
        id: "step-3-5",
        text: "Run Windows Network Troubleshooter",
        expected: "Troubleshooter identifies and fixes issues",
        say_to_customer: "Let's run the built-in troubleshooter. Right-click the network icon and select 'Troubleshoot problems'. Follow the prompts.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-3-1",
        trigger_keywords: ["password", "incorrect", "wrong", "authentication"],
        reason_category: "authentication_failure",
        steps: [
          {
            id: "fb-3-1-1",
            text: "Verify WiFi password is correct",
            say_to_customer: "Let's double-check the WiFi password. It's case-sensitive, so make sure caps lock is off. Do you have the router nearby to verify the password?",
            type: "check"
          },
          {
            id: "fb-3-1-2",
            text: "Check for MAC address filtering",
            say_to_customer: "Your router might have MAC address filtering enabled. You may need to add your device's MAC address to the router's allowed list.",
            type: "check"
          }
        ]
      }
    ],
    stop_conditions: [
      "Successfully connected to WiFi network",
      "Internet access verified by loading a webpage",
      "WiFi icon shows connected status"
    ],
    escalation: {
      when: "After 25 minutes or if router configuration access needed",
      target: "Network Administrator or ISP Support"
    }
  },

  // Article 4: Ethernet Connection Not Working
  {
    id: 4,
    title: "Ethernet Connection Not Working",
    tags: ["ethernet", "wired", "network", "lan", "connection", "cable"],
    product: "Windows PC",
    version: "10/11",
    summary: "Troubleshooting wired Ethernet connection problems",
    prechecks: [
      "Verify Ethernet cable is securely plugged in at both ends",
      "Check if the Ethernet port has lights when cable is connected",
      "Confirm the network switch/router is powered on"
    ],
    steps: [
      {
        id: "step-4-1",
        text: "Check physical cable connections",
        expected: "Cable is firmly connected and port lights are on",
        say_to_customer: "First, let's check the physical connection. Unplug the Ethernet cable from both your computer and the router/switch, then plug it back in firmly. Do you see any lights on the Ethernet port?",
        type: "check"
      },
      {
        id: "step-4-2",
        text: "Toggle airplane mode off and on",
        expected: "Network adapters reset successfully",
        say_to_customer: "Click the network icon, turn Airplane mode ON, wait 5 seconds, then turn it OFF. This resets your network adapter.",
        type: "action"
      },
      {
        id: "step-4-3",
        text: "Restart the network switch/router",
        expected: "Network equipment restarts successfully",
        say_to_customer: "Please unplug your router or network switch's power cable, wait 30 seconds, then plug it back in. Wait for all the lights to stabilize (about 2 minutes).",
        type: "action"
      },
      {
        id: "step-4-4",
        text: "Test with different Ethernet cable",
        expected: "Connection works with different cable",
        say_to_customer: "If you have another Ethernet cable available, let's try using that one to rule out a faulty cable.",
        type: "action"
      },
      {
        id: "step-4-5",
        text: "Update network adapter driver",
        expected: "Driver updates and connection works",
        say_to_customer: "Let's update your network adapter driver. Press Windows key + X, select Device Manager, expand 'Network adapters', right-click your Ethernet adapter, and select 'Update driver'.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-4-1",
        trigger_keywords: ["cable", "damaged", "broken", "port"],
        reason_category: "hardware_failure",
        steps: [
          {
            id: "fb-4-1-1",
            text: "Inspect cable for physical damage",
            say_to_customer: "Carefully inspect the Ethernet cable along its entire length. Look for any kinks, cuts, or damage to the connectors.",
            type: "check"
          },
          {
            id: "fb-4-1-2",
            text: "Test Ethernet port with different device",
            say_to_customer: "If possible, try connecting a different device to the same Ethernet port to see if the port itself is working.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Network status shows 'Connected'",
      "Successfully able to ping external servers",
      "Internet access verified by loading a webpage"
    ],
    escalation: {
      when: "After 20 minutes or if hardware failure suspected",
      target: "IT Hardware Support Team"
    }
  },

  // Article 5: Application Crashing on Startup
  {
    id: 5,
    title: "Application Crashing on Startup",
    tags: ["crash", "startup", "launch", "application", "error", "freeze"],
    product: "Desktop Applications",
    summary: "Resolving application crashes that occur during startup or launch",
    prechecks: [
      "Confirm system meets minimum application requirements",
      "Verify application was working previously",
      "Check if error message appears before crash"
    ],
    steps: [
      {
        id: "step-5-1",
        text: "Note any error messages",
        expected: "Error message captured for analysis",
        say_to_customer: "When the application crashes, does any error message appear? If so, what does it say?",
        type: "check"
      },
      {
        id: "step-5-2",
        text: "Restart computer",
        expected: "System memory and processes cleared",
        say_to_customer: "Let's start with a simple restart of your computer. This clears temporary memory issues that might be causing the crash.",
        type: "action"
      },
      {
        id: "step-5-3",
        text: "Run application as administrator",
        expected: "Application launches with elevated privileges",
        say_to_customer: "Right-click on the application icon and select 'Run as administrator'. Does the application open now?",
        type: "action"
      },
      {
        id: "step-5-4",
        text: "Clear application cache and temp files",
        expected: "Corrupted cache files removed",
        say_to_customer: "Let's clear the application's cache. Go to the application's settings or preferences and look for an option to clear cache or temporary files.",
        type: "action"
      },
      {
        id: "step-5-5",
        text: "Check for Windows updates",
        expected: "System is up to date",
        say_to_customer: "Let's make sure Windows is up to date. Go to Settings > Update & Security > Windows Update and install any pending updates.",
        type: "action"
      },
      {
        id: "step-5-6",
        text: "Repair or reinstall application",
        expected: "Application files restored to working state",
        say_to_customer: "We may need to repair the application. Go to Settings > Apps, find your application, and click on it. You should see options to 'Modify' or 'Repair'. Try repair first.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-5-1",
        trigger_keywords: ["dll", "missing", "file not found", "library"],
        reason_category: "missing_dependencies",
        steps: [
          {
            id: "fb-5-1-1",
            text: "Identify missing DLL file",
            say_to_customer: "The error message mentions a missing DLL file. What's the name of the file mentioned in the error?",
            type: "check"
          },
          {
            id: "fb-5-1-2",
            text: "Install Visual C++ Redistributables",
            say_to_customer: "Many applications need Visual C++ Redistributables. Download and install the latest versions from Microsoft's website.",
            type: "action"
          },
          {
            id: "fb-5-1-3",
            text: "Run System File Checker",
            say_to_customer: "Let's run Windows System File Checker. Open Command Prompt as administrator and type: sfc /scannow",
            type: "action"
          }
        ]
      },
      {
        id: "fallback-5-2",
        trigger_keywords: ["compatibility", "version", "windows 7", "windows 8"],
        reason_category: "compatibility_issue",
        steps: [
          {
            id: "fb-5-2-1",
            text: "Check application compatibility mode",
            say_to_customer: "Right-click the application, select Properties, go to the Compatibility tab. Try running it in compatibility mode for an earlier version of Windows.",
            type: "action"
          },
          {
            id: "fb-5-2-2",
            text: "Verify application version matches OS",
            say_to_customer: "Make sure you have the correct version of the application for your Windows version (32-bit vs 64-bit).",
            type: "check"
          }
        ]
      }
    ],
    stop_conditions: [
      "Application launches successfully",
      "Application remains stable for 5+ minutes",
      "Application functions normally without errors"
    ],
    escalation: {
      when: "After 35 minutes or if system-level corruption suspected",
      target: "Desktop Support Team or Application Vendor Support"
    }
  },

  // Article 6: Password Reset Not Working
  {
    id: 6,
    title: "Password Reset Link Not Working",
    tags: ["password", "reset", "forgot", "login", "account", "authentication"],
    product: "Web Applications",
    summary: "Troubleshooting password reset process issues",
    prechecks: [
      "Verify email address on file is accessible",
      "Check spam/junk folders for reset email",
      "Confirm account exists and is not locked"
    ],
    steps: [
      {
        id: "step-6-1",
        text: "Verify correct email address used",
        expected: "Email matches account registration",
        say_to_customer: "Let's make sure you're using the correct email address. Which email did you use when you registered the account?",
        type: "check"
      },
      {
        id: "step-6-2",
        text: "Check spam/junk folder",
        expected: "Reset email found in spam folder",
        say_to_customer: "Sometimes password reset emails end up in spam. Can you check your spam or junk folder?",
        type: "check"
      },
      {
        id: "step-6-3",
        text: "Request new reset link",
        expected: "New reset email sent",
        say_to_customer: "Let's request a fresh password reset link. Go back to the login page and click 'Forgot Password' again.",
        type: "action"
      },
      {
        id: "step-6-4",
        text: "Check link expiration",
        expected: "Using link within valid timeframe",
        say_to_customer: "Password reset links typically expire after 24 hours. When did you receive the reset email? If it's been more than a day, request a new one.",
        type: "check"
      },
      {
        id: "step-6-5",
        text: "Try different browser",
        expected: "Reset process works in alternate browser",
        say_to_customer: "Sometimes browser issues can interfere. Try copying the reset link and opening it in a different browser (Chrome, Firefox, Edge).",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-6-1",
        trigger_keywords: ["email", "not receiving", "no email", "didn't get"],
        reason_category: "email_not_received",
        steps: [
          {
            id: "fb-6-1-1",
            text: "Verify email server is not blocking",
            say_to_customer: "Your email provider might be blocking our emails. Can you add our domain to your email whitelist/safe senders list?",
            type: "action"
          },
          {
            id: "fb-6-1-2",
            text: "Check email account storage",
            say_to_customer: "If your email inbox is full, new messages won't be delivered. Can you check if your email storage is full?",
            type: "check"
          },
          {
            id: "fb-6-1-3",
            text: "Try alternative email if available",
            say_to_customer: "If you have an alternate email address associated with your account, we can send the reset link there instead.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Successfully reset password",
      "Able to login with new password",
      "Password meets complexity requirements"
    ],
    escalation: {
      when: "After 20 minutes or if account lockout suspected",
      target: "Account Services Team"
    }
  },

  // Article 7: Slow Computer Performance
  {
    id: 7,
    title: "Computer Running Slowly - Performance Issues",
    tags: ["slow", "performance", "lag", "freeze", "speed", "sluggish"],
    product: "Windows PC",
    version: "10/11",
    summary: "Diagnosing and resolving slow computer performance issues",
    prechecks: [
      "Check if issue started after recent software installation",
      "Verify available disk space (at least 10% free recommended)",
      "Check if specific application is causing slowdown"
    ],
    steps: [
      {
        id: "step-7-1",
        text: "Check Task Manager for resource usage",
        expected: "Identify processes consuming high CPU/Memory",
        say_to_customer: "Let's see what's using your computer's resources. Press Ctrl+Shift+Esc to open Task Manager. Click on the CPU and Memory columns to sort. What processes are at the top?",
        type: "check"
      },
      {
        id: "step-7-2",
        text: "Close unnecessary applications",
        expected: "System resources freed up",
        say_to_customer: "Close any applications you're not currently using. In Task Manager, you can right-click on applications and select 'End task'.",
        type: "action"
      },
      {
        id: "step-7-3",
        text: "Restart computer",
        expected: "Memory leaks cleared, system refreshed",
        say_to_customer: "A restart often helps clear memory issues. Please save your work and restart your computer.",
        type: "action"
      },
      {
        id: "step-7-4",
        text: "Check disk space",
        expected: "At least 10% of disk space is free",
        say_to_customer: "Let's check your available storage. Open File Explorer, right-click on C: drive and select Properties. How much free space do you have?",
        type: "check"
      },
      {
        id: "step-7-5",
        text: "Run Disk Cleanup",
        expected: "Temporary files and cache cleared",
        say_to_customer: "Let's free up some space. Type 'Disk Cleanup' in the Windows search box, select your C: drive, and check all the boxes to clean up temporary files.",
        type: "action"
      },
      {
        id: "step-7-6",
        text: "Disable startup programs",
        expected: "Fewer programs launch at startup",
        say_to_customer: "Many programs slow down your startup. In Task Manager, go to the Startup tab. Right-click on programs you don't need at startup and select 'Disable'.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-7-1",
        trigger_keywords: ["100%", "high cpu", "maxed out", "disk usage"],
        reason_category: "resource_exhaustion",
        steps: [
          {
            id: "fb-7-1-1",
            text: "Identify specific resource bottleneck",
            say_to_customer: "Which resource is at 100% - CPU, Memory, or Disk? This helps us narrow down the issue.",
            type: "check"
          },
          {
            id: "fb-7-1-2",
            text: "End high-usage processes if safe",
            say_to_customer: "If you see unfamiliar processes using high resources, we may need to end them. But let's verify they're safe to close first.",
            type: "action"
          },
          {
            id: "fb-7-1-3",
            text: "Run antivirus scan",
            say_to_customer: "High resource usage can indicate malware. Let's run a full antivirus scan using Windows Defender or your antivirus software.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Computer responds normally to user input",
      "Task Manager shows normal resource usage (<80%)",
      "Applications open and run smoothly"
    ],
    escalation: {
      when: "After 40 minutes or if malware/hardware failure suspected",
      target: "Desktop Support Team or Security Team"
    }
  },

  // Article 8: Printer Not Responding
  {
    id: 8,
    title: "Printer Not Responding or Offline",
    tags: ["printer", "print", "printing", "offline", "spooler", "queue"],
    product: "Network Printers",
    summary: "Troubleshooting printer connection and printing issues",
    prechecks: [
      "Verify printer is powered on",
      "Check printer display for error messages",
      "Confirm printer has paper and toner/ink"
    ],
    steps: [
      {
        id: "step-8-1",
        text: "Check printer power and connections",
        expected: "Printer is on with solid power light",
        say_to_customer: "First, let's verify the basics. Is the printer turned on? Do you see any lights on the printer? Are all cables (power and USB/network) securely connected?",
        type: "check"
      },
      {
        id: "step-8-2",
        text: "Check printer status in Windows",
        expected: "Printer shows as ready or online",
        say_to_customer: "Go to Settings > Devices > Printers & scanners. Find your printer in the list. What status does it show?",
        type: "check"
      },
      {
        id: "step-8-3",
        text: "Set printer as default",
        expected: "Printer is set as default device",
        say_to_customer: "In the Printers & scanners list, click on your printer and select 'Set as default'. Sometimes Windows switches to a different printer.",
        type: "action"
      },
      {
        id: "step-8-4",
        text: "Clear print queue",
        expected: "All stuck print jobs removed",
        say_to_customer: "Let's clear any stuck print jobs. Click on your printer, select 'Open queue', then click 'Printer' in the menu and select 'Cancel All Documents'.",
        type: "action"
      },
      {
        id: "step-8-5",
        text: "Restart Print Spooler service",
        expected: "Print Spooler service restarted successfully",
        say_to_customer: "We need to restart the Print Spooler. Press Windows+R, type 'services.msc', find 'Print Spooler', right-click it and select 'Restart'.",
        type: "action"
      },
      {
        id: "step-8-6",
        text: "Remove and re-add printer",
        expected: "Fresh printer connection established",
        say_to_customer: "Let's remove and re-add the printer. In Settings > Printers & scanners, click your printer and select 'Remove device'. Then click 'Add a printer or scanner' to add it back.",
        type: "action"
      }
    ],
    fallbacks: [
      {
        id: "fallback-8-1",
        trigger_keywords: ["offline", "not responding", "unavailable"],
        reason_category: "printer_offline",
        steps: [
          {
            id: "fb-8-1-1",
            text: "Uncheck 'Use Printer Offline' mode",
            say_to_customer: "Open the print queue, click 'Printer' in the menu, and make sure 'Use Printer Offline' is NOT checked. If it is, click it to uncheck it.",
            type: "action"
          },
          {
            id: "fb-8-1-2",
            text: "Restart printer",
            say_to_customer: "Turn off the printer completely, wait 30 seconds, then turn it back on. Wait for it to fully initialize.",
            type: "action"
          }
        ]
      },
      {
        id: "fallback-8-2",
        trigger_keywords: ["driver", "update", "software"],
        reason_category: "driver_issue",
        steps: [
          {
            id: "fb-8-2-1",
            text: "Update printer driver",
            say_to_customer: "Let's update the printer driver. Go to the printer manufacturer's website, find your printer model, and download the latest driver for your Windows version.",
            type: "action"
          },
          {
            id: "fb-8-2-2",
            text: "Uninstall and reinstall driver",
            say_to_customer: "If updating doesn't help, we'll need to completely uninstall the driver and reinstall it fresh from the manufacturer's website.",
            type: "action"
          }
        ]
      }
    ],
    stop_conditions: [
      "Test page prints successfully",
      "Printer shows as 'Ready' status",
      "Document prints without errors"
    ],
    escalation: {
      when: "After 30 minutes or if hardware/network infrastructure issue suspected",
      target: "IT Hardware Support or Network Team"
    }
  }
];

/**
 * Get all knowledge articles
 * @returns {KnowledgeArticle[]} All articles in the enhanced knowledge base
 */
function getAllEnhancedArticles() {
  return enhancedKnowledgeBase;
}

/**
 * Find article by ID
 * @param {number} id - Article ID to find
 * @returns {KnowledgeArticle|null} The article or null if not found
 */
function getArticleById(id) {
  return enhancedKnowledgeBase.find(article => article.id === id) || null;
}

/**
 * Search for articles by tags
 * @param {string[]} tags - Tags to search for
 * @returns {KnowledgeArticle[]} Articles matching any of the tags
 */
function findArticlesByTags(tags) {
  return enhancedKnowledgeBase.filter(article =>
    article.tags.some(tag => tags.includes(tag))
  );
}

/**
 * Search for articles by product
 * @param {string} product - Product name to filter by
 * @returns {KnowledgeArticle[]} Articles for the specified product
 */
function findArticlesByProduct(product) {
  return enhancedKnowledgeBase.filter(article =>
    article.product.toLowerCase() === product.toLowerCase()
  );
}

// Export for use in other modules
export {
  enhancedKnowledgeBase,
  getAllEnhancedArticles,
  getArticleById,
  findArticlesByTags,
  findArticlesByProduct
};
