// Mock Knowledge Base Data
// Enhanced schema with detailed article structure

export const mockArticles = [
  {
    id: 1,
    title: "Email Not Sending - Gmail",
    tags: ["email", "gmail", "delivery"],
    product: "Gmail",
    version: "2024",
    summary: "Troubleshoot Gmail email delivery issues",
    keywords: ["email", "gmail", "not sending", "delivery"],
    prechecks: [
      "Verify internet connection is active",
      "Check if Gmail is accessible in browser"
    ],
    steps: [
      {
        id: "step1",
        text: "Check the outbox for stuck emails",
        expectedResult: "Outbox should be empty or show pending emails",
        sayToCustomer: "Let me check if there are any emails stuck in your outbox"
      },
      {
        id: "step2",
        text: "Verify SMTP Server and Port Number match requirements",
        expectedResult: "SMTP Server should be smtp.gmail.com and Port Number should be 587"
      },
      {
        id: "step3",
        text: "Check App Password is correctly configured (if using 2FA)",
        expectedResult: "App password is set up and valid",
        sayToCustomer: "We need to verify your app password is set up correctly for secure access"
      },
      {
        id: "step4",
        text: "Verify Customer ID and Account Type are active",
        expectedResult: "Customer ID shows valid account with correct Account Type"
      },
      {
        id: "step5",
        text: "Test sending a simple email using Terminal ID for tracking",
        expectedResult: "Email should appear in inbox within 1 minute with Terminal ID in headers",
        sayToCustomer: "Please try sending a test email to yourself now"
      },
      {
        id: "step6",
        text: "Check Google Account security settings for blocked sign-ins",
        expectedResult: "No recent blocked sign-in attempts shown"
      }
    ],
    fallbacks: [
      {
        id: "fallback1",
        condition: "If step2 fails",
        reason_category: "system-error",
        trigger_keywords: ["smtp", "settings", "configuration", "error"],
        steps: [
          {
            id: "fb1-step1",
            text: "Reset SMTP Server configuration to default (smtp.gmail.com) and verify Port Number is 587",
            expectedResult: "Settings restored to correct SMTP Server and Port Number"
          },
          {
            id: "fb1-step2",
            text: "Restart email client and verify Terminal ID is logged",
            expectedResult: "Client restarts successfully with Terminal ID in logs"
          }
        ]
      }
    ],
    stop_conditions: [
      "Customer confirms emails are now sending successfully",
      "Issue requires escalation to Gmail support"
    ],
    escalation: {
      when: "All steps completed without resolution",
      target: "Gmail Tier 2 Support"
    }
  },
  {
    id: 2,
    title: "Email Not Sending - Outlook",
    tags: ["email", "outlook", "delivery"],
    product: "Outlook",
    summary: "Troubleshoot Outlook email delivery issues",
    keywords: ["email", "outlook", "not sending"],
    prechecks: [
      "Check internet connectivity",
      "Verify Outlook is running"
    ],
    steps: [
      {
        id: "step1",
        text: "Check the outbox for stuck emails",
        expectedResult: "Outbox should be empty or show pending emails",
        sayToCustomer: "Let me check if there are any emails stuck in your outbox"
      },
      {
        id: "step2",
        text: "Verify account is online (not in offline mode)",
        expectedResult: "Status bar shows 'Connected' or 'Online'"
      },
      {
        id: "step3",
        text: "Check mailbox size is not at quota",
        expectedResult: "Mailbox usage is below 95%",
        sayToCustomer: "I need to verify your mailbox isn't full"
      },
      {
        id: "step4",
        text: "Test with a small test email",
        expectedResult: "Email sends successfully"
      }
    ],
    fallbacks: [
      {
        id: "fallback1",
        condition: "If mailbox quota issue",
        reason_category: "system-error",
        trigger_keywords: ["quota", "mailbox", "full", "space"],
        steps: [
          {
            id: "fb1-step1",
            text: "Archive old emails to free up space",
            expectedResult: "Mailbox usage drops below 90%"
          },
          {
            id: "fb1-step2",
            text: "Empty deleted items folder",
            expectedResult: "Deleted items folder is empty"
          }
        ]
      },
      {
        id: "fallback2",
        condition: "If offline mode persists",
        reason_category: "no-change",
        trigger_keywords: ["offline", "online", "connection", "mode"],
        steps: [
          {
            id: "fb2-step1",
            text: "Restart Outlook in safe mode",
            expectedResult: "Outlook opens in safe mode"
          },
          {
            id: "fb2-step2",
            text: "Recreate Outlook profile",
            expectedResult: "New profile is created and working"
          }
        ]
      }
    ],
    stop_conditions: [
      "Email successfully sends",
      "Mailbox quota issue confirmed"
    ],
    escalation: {
      when: "Quota exceeded and user cannot delete emails",
      target: "IT Admin"
    }
  },
  {
    id: 3,
    title: "Network Connection Lost - Windows",
    tags: ["network", "windows", "connectivity"],
    product: "Windows",
    version: "10/11",
    summary: "Restore network connectivity on Windows systems",
    keywords: ["network", "connection", "wifi", "ethernet"],
    prechecks: [
      "Check if other devices can connect to network",
      "Verify router lights are normal"
    ],
    steps: [
      {
        id: "step1",
        text: "Check airplane mode is OFF",
        expectedResult: "Airplane mode toggle is disabled",
        sayToCustomer: "Let's make sure airplane mode isn't accidentally turned on"
      },
      {
        id: "step2",
        text: "Verify WiFi adapter is enabled in Network Settings",
        expectedResult: "WiFi adapter shows as 'Enabled'",
        sayToCustomer: "I'll help you check if your WiFi adapter is enabled"
      },
      {
        id: "step3",
        text: "Run Windows Network Troubleshooter",
        expectedResult: "Troubleshooter completes and reports findings"
      },
      {
        id: "step4",
        text: "Restart network adapter: Open Device Manager, find adapter, right-click and restart",
        expectedResult: "Adapter restarts without errors"
      },
      {
        id: "step5",
        text: "Restart router and modem (power cycle for 30 seconds)",
        expectedResult: "Devices restart and lights stabilize",
        sayToCustomer: "We're going to restart your network equipment. This will take about 2 minutes"
      },
      {
        id: "step6",
        text: "Try connecting to the network again",
        expectedResult: "Connection established successfully"
      }
    ],
    fallbacks: [
      {
        id: "fallback1",
        condition: "If adapter restart fails",
        reason_category: "no-change",
        trigger_keywords: ["adapter", "driver", "network", "restart"],
        steps: [
          {
            id: "fb1-step1",
            text: "Uninstall and reinstall network adapter driver",
            expectedResult: "Driver reinstalls successfully"
          }
        ]
      }
    ],
    stop_conditions: [
      "Network connection restored",
      "Hardware failure suspected"
    ],
    escalation: {
      when: "Suspected hardware or ISP issue",
      target: "Network Specialist"
    }
  },
  {
    id: 4,
    title: "Network Connection Lost - Mac",
    tags: ["network", "mac", "connectivity"],
    product: "MacOS",
    summary: "Restore network connectivity on Mac systems",
    keywords: ["network", "connection", "wifi", "mac"],
    prechecks: [
      "Check if other devices can connect to network",
      "Verify router lights are normal"
    ],
    steps: [
      {
        id: "step1",
        text: "Check airplane mode is OFF in Control Center",
        expectedResult: "WiFi icon is active and not crossed out"
      },
      {
        id: "step2",
        text: "Verify WiFi is enabled: Click WiFi icon in menu bar",
        expectedResult: "WiFi shows as 'On' with available networks"
      },
      {
        id: "step3",
        text: "Forget the network and reconnect: System Preferences > Network > WiFi > Advanced",
        expectedResult: "Network is removed from preferred list"
      },
      {
        id: "step4",
        text: "Restart network preferences: Delete /Library/Preferences/SystemConfiguration/NetworkInterfaces.plist",
        expectedResult: "File is deleted (requires admin password)"
      },
      {
        id: "step5",
        text: "Restart the Mac",
        expectedResult: "System restarts successfully"
      },
      {
        id: "step6",
        text: "Try connecting to the network again",
        expectedResult: "Connection established successfully"
      }
    ],
    fallbacks: [
      {
        id: "fallback1",
        condition: "If WiFi preferences don't work",
        reason_category: "no-change",
        trigger_keywords: ["wifi", "preferences", "network", "settings"],
        steps: [
          {
            id: "fb1-step1",
            text: "Reset SMC (System Management Controller)",
            expectedResult: "SMC reset completes successfully"
          },
          {
            id: "fb1-step2",
            text: "Reset NVRAM/PRAM",
            expectedResult: "NVRAM reset completes successfully"
          }
        ]
      },
      {
        id: "fallback2",
        condition: "If permission issues",
        reason_category: "permission-issue",
        trigger_keywords: ["permission", "access", "admin", "password"],
        steps: [
          {
            id: "fb2-step1",
            text: "Verify admin account credentials",
            expectedResult: "Admin password is correct"
          },
          {
            id: "fb2-step2",
            text: "Boot into recovery mode and reset permissions",
            expectedResult: "Permissions reset successfully"
          }
        ]
      }
    ],
    stop_conditions: [
      "Network connection restored",
      "Hardware failure suspected"
    ],
    escalation: {
      when: "Network preferences reset doesn't help",
      target: "Apple Support"
    }
  },
  {
    id: 5,
    title: "Software Installation Fails",
    tags: ["installation", "software", "error"],
    product: "General",
    summary: "Resolve common software installation failures",
    keywords: ["install", "installation", "fails", "error"],
    prechecks: [
      "Verify sufficient disk space (at least 1GB free)",
      "Check user has admin rights"
    ],
    steps: [
      {
        id: "step1",
        text: "Check available disk space",
        expectedResult: "At least 1GB free space available",
        sayToCustomer: "Let me verify you have enough disk space for the installation"
      },
      {
        id: "step2",
        text: "Verify antivirus is not blocking installation",
        expectedResult: "Antivirus shows no blocked actions"
      },
      {
        id: "step3",
        text: "Run installer as Administrator (right-click > Run as Administrator)",
        expectedResult: "UAC prompt appears for admin credentials"
      },
      {
        id: "step4",
        text: "Check Windows Update is not in progress",
        expectedResult: "No pending updates blocking installation"
      },
      {
        id: "step5",
        text: "Retry installation with detailed logging enabled",
        expectedResult: "Installation completes or produces detailed error log"
      }
    ],
    fallbacks: [],
    stop_conditions: [
      "Installation succeeds",
      "Specific error identified requiring vendor support"
    ],
    escalation: {
      when: "Persistent installation failure after all steps",
      target: "Software Vendor Support"
    }
  }
];
