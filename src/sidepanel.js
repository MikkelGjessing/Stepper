// UI Module - Main controller for the Stepper side panel
import { retrieveArticles, getArticleById } from './retrieval.js';
import { StepManager } from './stepper.js';

// Initialize step manager
const stepManager = new StepManager();

// Get DOM elements
const searchSection = document.getElementById('searchSection');
const noResultsSection = document.getElementById('noResultsSection');
const articleSelectionSection = document.getElementById('articleSelectionSection');
const lowConfidenceWarning = document.getElementById('lowConfidenceWarning');
const articleMatches = document.getElementById('articleMatches');
const solutionSection = document.getElementById('solutionSection');
const stepSection = document.getElementById('stepSection');
const fullArticleSection = document.getElementById('fullArticleSection');
const feedbackSection = document.getElementById('feedbackSection');
const feedbackSuccessSection = document.getElementById('feedbackSuccessSection');

const issueInput = document.getElementById('issueInput');
const searchBtn = document.getElementById('searchBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const backToSearchFromSelection = document.getElementById('backToSearchFromSelection');
const startBtn = document.getElementById('startBtn');
const backToSearchBtn = document.getElementById('backToSearchBtn');
const continueBtn = document.getElementById('continueBtn');
const backBtn = document.getElementById('backBtn');
const didntWorkBtn = document.getElementById('didntWorkBtn');
const fullArticleBtn = document.getElementById('fullArticleBtn');
const resetBtn = document.getElementById('resetBtn');
const backToStepsBtn = document.getElementById('backToStepsBtn');
const closeArticleBtn = document.getElementById('closeArticleBtn');
const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
const continueFeedbackBtn = document.getElementById('continueFeedbackBtn');
const newSearchBtn = document.getElementById('newSearchBtn');

// Section visibility management
function showSection(section) {
  hideAllSections();
  section.classList.remove('hidden');
}

function hideAllSections() {
  searchSection.classList.add('hidden');
  noResultsSection.classList.add('hidden');
  articleSelectionSection.classList.add('hidden');
  solutionSection.classList.add('hidden');
  stepSection.classList.add('hidden');
  fullArticleSection.classList.add('hidden');
  feedbackSection.classList.add('hidden');
  feedbackSuccessSection.classList.add('hidden');
}

// Search for solution
function searchForSolution() {
  const query = issueInput.value.trim();
  
  if (!query) {
    alert('Please enter a description of your issue before searching');
    return;
  }

  const results = retrieveArticles(query, 3);
  
  if (results.matches.length === 0) {
    showSection(noResultsSection);
  } else {
    displayArticleSelection(results);
  }
}

// Display article selection with top 3 matches
function displayArticleSelection(results) {
  // Show or hide low confidence warning
  if (results.lowConfidence) {
    lowConfidenceWarning.classList.remove('hidden');
  } else {
    lowConfidenceWarning.classList.add('hidden');
  }
  
  // Clear previous matches
  articleMatches.innerHTML = '';
  
  // Create article cards for each match
  results.matches.forEach((match, index) => {
    const card = document.createElement('div');
    card.className = 'article-card';
    if (index === 0) {
      card.classList.add('top-match');
    }
    
    card.innerHTML = `
      <div class="article-card-header">
        <h3 class="article-card-title">${match.title}</h3>
        <span class="score-badge ${getScoreBadgeClass(match.score)}">
          Score: ${match.score}
        </span>
      </div>
      <p class="article-card-product">${match.product}</p>
      <p class="article-card-summary">${match.summary}</p>
      ${index === 0 ? '<div class="top-match-badge">Top Match</div>' : ''}
    `;
    
    // Add click handler to select this article
    card.addEventListener('click', () => selectArticle(match.article));
    
    articleMatches.appendChild(card);
  });
  
  showSection(articleSelectionSection);
}

// Get CSS class for score badge based on score
function getScoreBadgeClass(score) {
  if (score >= 6) return 'score-high';
  if (score >= 3) return 'score-medium';
  return 'score-low';
}

// Handle article selection
function selectArticle(article) {
  stepManager.setArticle(article);
  displaySolutionOverview();
}

// Display solution overview
function displaySolutionOverview() {
  const stepInfo = stepManager.getCurrentStep();
  
  document.getElementById('solutionTitle').textContent = stepInfo.articleTitle;
  document.getElementById('solutionSummary').textContent = stepInfo.articleSummary;
  document.getElementById('stepCount').textContent = `This solution has ${stepInfo.totalSteps} steps`;
  
  showSection(solutionSection);
}

// Display current step
function displayCurrentStep() {
  const stepInfo = stepManager.getCurrentStep();
  
  if (!stepInfo) {
    return;
  }

  // Update step display
  document.getElementById('stepNumber').textContent = `Step ${stepInfo.stepNumber} of ${stepInfo.totalSteps}`;
  document.getElementById('stepTitle').textContent = stepInfo.articleTitle;
  document.getElementById('stepText').textContent = stepInfo.stepText;
  
  // Update progress bar
  const progress = (stepInfo.stepNumber / stepInfo.totalSteps) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;
  
  // Update button states
  backBtn.disabled = stepInfo.isFirst;
  
  if (stepInfo.isLast) {
    continueBtn.textContent = '✓ Complete';
  } else {
    continueBtn.textContent = 'Continue →';
  }
  
  showSection(stepSection);
}

// Handle continue button
function handleContinue() {
  const stepInfo = stepManager.getCurrentStep();
  
  if (stepInfo.isLast) {
    // On last step, show completion message
    showCompletionMessage();
  } else {
    stepManager.nextStep();
    displayCurrentStep();
  }
}

// Handle back button
function handleBack() {
  stepManager.previousStep();
  displayCurrentStep();
}

// Handle reset button
function handleReset() {
  if (confirm('Are you sure you want to restart from step 1?')) {
    stepManager.reset();
    displayCurrentStep();
  }
}

// Show completion message
function showCompletionMessage() {
  if (confirm('Great! Did this solve your issue?')) {
    alert('Wonderful! We\'re glad we could help.');
    resetToSearch();
  } else {
    if (confirm('We\'re sorry to hear that. Would you like to provide feedback?')) {
      showSection(feedbackSection);
    } else {
      resetToSearch();
    }
  }
}

// Display full article
function displayFullArticle() {
  const article = stepManager.getArticle();
  
  if (!article) {
    return;
  }

  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleSummary').textContent = article.summary;
  
  const stepsList = document.getElementById('articleSteps');
  stepsList.innerHTML = '';
  
  // Handle both simple steps (strings) and enhanced steps (objects)
  article.steps.forEach((step, index) => {
    const li = document.createElement('li');
    if (typeof step === 'string') {
      li.textContent = step;
    } else {
      // Enhanced step object - use customer-facing text or internal text
      li.textContent = step.say_to_customer || step.text;
    }
    stepsList.appendChild(li);
  });
  
  showSection(fullArticleSection);
}

// Handle "This didn't work" feedback
function handleDidntWork() {
  showSection(feedbackSection);
  document.getElementById('feedbackText').value = '';
}

// Submit feedback
function submitFeedback() {
  const feedback = document.getElementById('feedbackText').value.trim();
  
  if (!feedback) {
    alert('Please describe what went wrong before submitting feedback');
    return;
  }

  // TODO: Replace with backend API call when implementing server integration
  console.log('Feedback submitted:', {
    article: stepManager.getArticle().title,
    step: stepManager.getCurrentStep().stepNumber,
    feedback: feedback
  });
  
  showSection(feedbackSuccessSection);
}

// Reset to search
function resetToSearch() {
  stepManager.clear();
  issueInput.value = '';
  showSection(searchSection);
  issueInput.focus();
}

// Event listeners
searchBtn.addEventListener('click', searchForSolution);
issueInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    searchForSolution();
  }
});

tryAgainBtn.addEventListener('click', resetToSearch);
backToSearchFromSelection.addEventListener('click', resetToSearch);
startBtn.addEventListener('click', displayCurrentStep);
backToSearchBtn.addEventListener('click', resetToSearch);

continueBtn.addEventListener('click', handleContinue);
backBtn.addEventListener('click', handleBack);
resetBtn.addEventListener('click', handleReset);

didntWorkBtn.addEventListener('click', handleDidntWork);
fullArticleBtn.addEventListener('click', displayFullArticle);

backToStepsBtn.addEventListener('click', displayCurrentStep);
closeArticleBtn.addEventListener('click', resetToSearch);

submitFeedbackBtn.addEventListener('click', submitFeedback);
cancelFeedbackBtn.addEventListener('click', displayCurrentStep);
continueFeedbackBtn.addEventListener('click', displayCurrentStep);
newSearchBtn.addEventListener('click', resetToSearch);

// Focus on input when page loads
issueInput.focus();
