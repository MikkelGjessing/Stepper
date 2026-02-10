// Mock Knowledge Base Module
// This module handles article storage and retrieval

const knowledgeBase = [
  {
    id: 1,
    title: "Email Not Sending",
    keywords: ["email", "send", "sending", "not working", "smtp", "mail"],
    summary: "Troubleshooting steps for email delivery issues",
    steps: [
      "Check your internet connection and ensure you're online",
      "Verify that the recipient's email address is correct and properly formatted",
      "Check your email account settings (SMTP server, port, authentication)",
      "Look in your Sent folder to confirm if the email was actually sent",
      "Check your spam/junk folder for bounce-back messages",
      "Try sending a test email to yourself to isolate the issue",
      "If using a corporate account, contact your IT administrator"
    ]
  },
  {
    id: 2,
    title: "Password Reset Not Working",
    keywords: ["password", "reset", "forgot", "login", "authentication", "account"],
    summary: "How to successfully reset your password",
    steps: [
      "Click on the 'Forgot Password' link on the login page",
      "Enter your registered email address exactly as it was registered",
      "Check your email inbox for the password reset link (may take 2-5 minutes)",
      "Check your spam/junk folder if you don't see the email in your inbox",
      "Click the reset link in the email within 24 hours (links expire)",
      "Create a new strong password with at least 8 characters, including uppercase, lowercase, and numbers",
      "Try logging in with your new password"
    ]
  },
  {
    id: 3,
    title: "Application Crashing on Startup",
    keywords: ["crash", "crashing", "startup", "won't open", "not opening", "launch", "error"],
    summary: "Steps to fix application crashes at startup",
    steps: [
      "Close the application completely using Task Manager (Ctrl+Shift+Esc on Windows)",
      "Restart your computer to clear temporary memory issues",
      "Check if your operating system has pending updates and install them",
      "Verify that your system meets the minimum requirements for the application",
      "Try running the application as Administrator (right-click > Run as Administrator)",
      "Clear the application cache and temporary files",
      "Uninstall and reinstall the application to get a fresh installation",
      "If the issue persists, check the application's log files for specific error messages"
    ]
  },
  {
    id: 4,
    title: "Slow Internet Connection",
    keywords: ["slow", "internet", "connection", "speed", "bandwidth", "wifi", "network"],
    summary: "Steps to diagnose and improve internet speed",
    steps: [
      "Run a speed test at speedtest.net to measure your actual internet speed",
      "Restart your modem and router by unplugging them for 30 seconds",
      "Check if multiple devices or applications are using bandwidth simultaneously",
      "Move closer to your WiFi router or switch to a wired Ethernet connection",
      "Close unnecessary browser tabs and applications",
      "Check for background downloads or updates on your device",
      "Scan your computer for malware that might be using bandwidth",
      "Contact your Internet Service Provider if speeds are consistently below your plan"
    ]
  },
  {
    id: 5,
    title: "Printer Not Responding",
    keywords: ["printer", "print", "printing", "not working", "offline", "spooler"],
    summary: "Troubleshooting printer connection and printing issues",
    steps: [
      "Check that the printer is turned on and has paper loaded",
      "Verify that all cables are securely connected (power and USB/network)",
      "Check the printer's display panel for any error messages",
      "Open Devices and Printers and ensure the printer is set as default",
      "Clear the print queue by canceling all pending print jobs",
      "Restart the Print Spooler service in Windows Services",
      "Update or reinstall the printer drivers from the manufacturer's website",
      "Try printing a test page directly from the printer's control panel"
    ]
  }
];

/**
 * Search for the best matching article based on the user's issue
 * @param {string} query - The user's issue description
 * @returns {object|null} - The best matching article or null if no match
 */
function findBestMatch(query) {
  if (!query || query.trim().length === 0) {
    return null;
  }

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let bestMatch = null;
  let highestScore = 0;

  knowledgeBase.forEach(article => {
    let score = 0;
    
    // Check keyword matches
    article.keywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        score += 10; // Strong match for keyword
      }
      
      // Check for partial word matches
      queryWords.forEach(word => {
        if (word.length > 3 && keyword.includes(word)) {
          score += 5;
        }
      });
    });
    
    // Check title matches
    if (queryLower.includes(article.title.toLowerCase())) {
      score += 15;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = article;
    }
  });

  // Return match only if score is above threshold
  return highestScore > 5 ? bestMatch : null;
}

/**
 * Get all available articles (for potential future features)
 * @returns {array} - All articles in the knowledge base
 */
function getAllArticles() {
  return knowledgeBase;
}

// Export functions for use in other modules
export { findBestMatch, getAllArticles };
