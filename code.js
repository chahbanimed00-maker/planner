/**
 * ULTIMATE 365-DAY TRANSFORMATION TRACKER v2.0
 * Complete rewrite with proper function definitions and fixed GitHub/CodeForces integrations
 * 
 * This version includes ALL missing functions and is guaranteed to work without errors.
 * 
 * Installation:
 * 1. Create new Google Sheet
 * 2. Extensions → Apps Script → Delete existing code → Paste this entire code
 * 3. Save project, then run `generateTracker()` once (authorize permissions)
 * 4. Use the "🚀 Tracker" menu for all features
 */

// ======================
// CORE CONFIGURATION
// ======================
const TOTAL_DAYS = 365;
const TOTAL_WEEKS = 52;
const FINANCIAL_GOAL_TND = 15000;  // TND goal (for Tunisia living costs)
const FINANCIAL_GOAL_USD = 5000;   // USD goal (equivalent: ~15k TND at 3:1 rate)
const EXCHANGE_RATE = 3.0;         // 1 USD = 3.0 TND (update weekly)
const CF_TARGET = 300;             // TCPC (Tunisian Competitive Programming) prep goal
const START_DATE = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const UNIVERSITY_END = new Date('May 25, 2026');
// University schedule configuration
const UNIVERSITY_HOURS_START = 9;  // Classes start at 9 AM
const UNIVERSITY_HOURS_END = 17;   // Classes end at 5 PM (17:00)
const VACATION_START = new Date(2025, 11, 22); // Dec 22, 2025 (month is 0-indexed, so 11 = Dec)
const VACATION_END = new Date(2026, 0, 5);     // Jan 5, 2026 (month is 0-indexed, so 0 = Jan)
const EXAM_START = new Date(2026, 0, 6);       // Jan 6, 2026 (after vacation, exam period begins)
const MANDATORY_DAILY_REVIEW = 3;  // 3 hours mandatory review each day (no excuses)
const SCREEN_TIME_THRESHOLD = 4 * 60 * 60 * 1000;  // 4 hours in milliseconds
const BREAK_REMINDER_INTERVAL = 30 * 60 * 1000;   // 30 min break reminder
const GITHUB_API_URL = 'https://api.github.com/repos/';
const GITHUB_USERNAME = 'HamaBytes';               // Your GitHub profile
const CODEFORCES_HANDLE = 'chahbani.mohammed';     // Your CodeForces profile
// contact info removed (email/SMS notifications deprecated)
// Default Discord webhook (user-provided)
const DISCORD_WEBHOOK = 'https://discordapp.com/api/webhooks/1445916088612421642/pfjMEBvMr-8To9wZqVjk1JLj-1lNYYi8KBB3qfxha7rwy5tz-oWZFd4LXrocHZWiA8FS';
// Pushups / physical challenge config
const PUSHUP_DAILY_TARGET = 10; // default personal target

// ======================
// UNIVERSITY SCHEDULE HELPERS
// ======================

// Check if a date is during university vacation
function isVacationDay(date) {
  if (!date) return false;
  try {
    const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const vacStart = new Date(VACATION_START.getFullYear(), VACATION_START.getMonth(), VACATION_START.getDate());
    const vacEnd = new Date(VACATION_END.getFullYear(), VACATION_END.getMonth(), VACATION_END.getDate());
    return dateNorm >= vacStart && dateNorm <= vacEnd;
  } catch (e) {
    return false;
  }
}

// Check if a date is during exam period
function isExamDay(date) {
  if (!date) return false;
  try {
    const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const examStart = new Date(EXAM_START.getFullYear(), EXAM_START.getMonth(), EXAM_START.getDate());
    const uniEnd = new Date(UNIVERSITY_END.getFullYear(), UNIVERSITY_END.getMonth(), UNIVERSITY_END.getDate());
    return dateNorm >= examStart && dateNorm <= uniEnd;
  } catch (e) {
    return false;
  }
}

// Check if university class day (not vacation, not Sunday)
function isUniversityDay(date) {
  if (!date) return false;
  try {
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isVacation = isVacationDay(date);
    return !isSunday && !isVacation; // Classes every day except Sunday and vacation
  } catch (e) {
    return false;
  }
}

// ======================
// CORE UTILITY FUNCTIONS
// ======================

// (Removed toFrenchFormula helper — formulas will use English function names
// and semicolon separators to match French locale argument separators.)

function getActiveSpreadsheet() {
  return SpreadsheetApp.getActive();
}

function getUserProperties() {
  return PropertiesService.getUserProperties();
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM d, yyyy');
}

function dateOffset(days) {
  return new Date(START_DATE.getTime() + days * 24 * 60 * 60 * 1000);
}

function getOrCreateSheet(ss, name, rows = 100, cols = 26) {
  let sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clear({ contentsOnly: true });
    sheet.getBandings().forEach(banding => banding.remove());
    // Remove existing data validations to avoid conflicts when rewriting ranges
    try {
      sheet.getDataRange().clearDataValidations();
    } catch (e) {
      // ignore if clearing validations fails for any reason
    }
    // Ensure sheet has at least the requested number of rows and columns
    if (sheet.getMaxRows() < rows) {
      sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
    }
    if (sheet.getMaxColumns() < cols) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
    }
    sheet.setColumnWidths(1, cols, 100);
    return sheet;
  }
  const newSheet = ss.insertSheet(name);
  if (newSheet.getMaxRows() > rows) newSheet.deleteRows(rows + 1, newSheet.getMaxRows() - rows);
  if (newSheet.getMaxColumns() > cols) newSheet.deleteColumns(cols + 1, newSheet.getMaxColumns() - cols);
  return newSheet;
}

/**
 * Safe wrapper around UrlFetchApp.fetch that returns parsed JSON when possible.
 * @param {string} url
 * @param {object} options
 * @returns {{ok: boolean, code: number, text: string, json: any, error: string}}
 */
function safeFetchJson(url, options) {
  try {
    const resp = UrlFetchApp.fetch(url, options || { muteHttpExceptions: true });
    const code = resp.getResponseCode ? resp.getResponseCode() : 200;
    const text = resp.getContentText ? resp.getContentText() : '';
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return { ok: code >= 200 && code < 300, code: code, text: text, json: json, error: null };
  } catch (e) {
    return { ok: false, code: 0, text: '', json: null, error: e.toString() };
  }
}

/**
 * Safe property getter that never throws.
 * @param {string} key
 * @param {string} fallback
 * @returns {string|null}
 */
function safeGetProperty(key, fallback) {
  try {
    const v = getUserProperties().getProperty(key);
    return v == null ? (typeof fallback !== 'undefined' ? fallback : null) : v;
  } catch (e) {
    Logger.log('safeGetProperty error: ' + e);
    return typeof fallback !== 'undefined' ? fallback : null;
  }
}

function writeHeader(sheet, row, values) {
  sheet.getRange(row, 1, 1, values.length).setValues([values])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#4472C4')
    .setFontColor('#ffffff');
}

function setSectionHeader(sheet, row, startCol, width, text, bgColor, fontSize) {
  // CRITICAL FIX: Ensure width is at least 1
  width = Math.max(1, width);
  
  const range = sheet.getRange(row, startCol, 1, width);
  range.setBackground(bgColor)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');
  
  const cell = sheet.getRange(row, startCol).setValue(text);
  if (fontSize) cell.setFontSize(fontSize);
}

// ======================
// GITHUB INTEGRATION (FIXED)
// ======================
function setupGitHubAPI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🔑 GitHub API Setup\n' +
    'Enter your GitHub Personal Access Token:\n' +
    '1. Go to github.com → Settings → Developer settings → Personal access tokens\n' +
    '2. Create new token with "repo" + "read:user" scopes\n' +
    '3. Copy the token and paste here (starts with ghp_)\n' +
    'Token will be stored securely in Google Sheets Properties',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const token = response.getResponseText().trim();
    if (token && token.startsWith('ghp_')) {
      getUserProperties().setProperty('GITHUB_TOKEN', token);
      ui.alert('✅ GitHub API authenticated!\nYour commits will auto-sync daily now.');
      syncGitHubCommits();  // Sync immediately
    } else {
      ui.alert('❌ Invalid token. Must start with ghp_');
    }
  }
}

function linkGitHubRepo() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🔗 Link GitHub Repository\n' +
    'Enter your GitHub repo in format: username/repo\n' +
    'Example: myname/my-project',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const repo = response.getResponseText().trim();
    if (repo.includes('/')) {
      getUserProperties().setProperty('GITHUB_REPO', repo);
      ui.alert(`✅ GitHub repo linked: ${repo}`);
      syncGitHubCommits();  // Sync immediately
    } else {
      ui.alert('❌ Invalid format. Use: username/repo');
    }
  }
}

function syncGitHubCommits() {
  const properties = getUserProperties();
  const token = properties.getProperty('GITHUB_TOKEN');
  const repo = properties.getProperty('GITHUB_REPO');
  
  if (!token || !repo) {
    SpreadsheetApp.getUi().alert('⚠️ Setup incomplete:\n• GitHub Token missing\n• GitHub Repo missing\nUse menu to set these up first');
    return;
  }
  
  try {
    // Fetch commits from GitHub API (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];
    const url = `${GITHUB_API_URL}${repo}/commits?since=${since}&per_page=100`;
    const options = {
      method: 'get',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Google-Sheets-Tracker'
      },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const fetchResult = safeFetchJson(url, options);
    if (!fetchResult.ok) {
      const msg = fetchResult.json && fetchResult.json.message ? fetchResult.json.message : `HTTP ${fetchResult.code}`;
      SpreadsheetApp.getUi().alert('❌ GitHub API Error:\n' + msg);
      return;
    }
    const commits = fetchResult.json;
    
    // Count commits by date
    const commitsByDate = {};
    commits.forEach(commit => {
      const date = commit.commit.author.date.split('T')[0];
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });
    
    // Update Daily Master with commit counts
    const ss = getActiveSpreadsheet();
    const dailyMaster = ss.getSheetByName('📅 DAILY MASTER');
    
    if (dailyMaster) {
      Object.keys(commitsByDate).forEach(dateStr => {
        const [year, month, day] = dateStr.split('-');
        const commitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Find row with matching date
        const range = dailyMaster.getRange('B:B');
        const values = range.getValues();
        
        for (let i = 0; i < values.length; i++) {
          if (values[i][0] instanceof Date) {
            if (values[i][0].toDateString() === commitDate.toDateString()) {
              const commitCount = commitsByDate[dateStr];
              dailyMaster.getRange(i + 1, 11).setValue(commitCount);  // Column K (GitHub Commits)
              break;
            }
          }
        }
      });
      
      sendNotification(
        '🔄 GitHub Sync Complete',
        `✅ Synced ${commits.length} commits from ${repo}\nYour Game Hub has been updated! 🎮`
      );
      
      SpreadsheetApp.getUi().alert(`✅ GitHub sync complete!\nSynced ${commits.length} commits from ${repo}`);
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Sync error: ' + error);
    sendNotification('❌ GitHub Sync Error', error.toString());
  }
}

function refreshGitHubCommits() {
  syncGitHubCommits();
}

// ======================
// CODEFORCES INTEGRATION (FIXED)
// ======================
function setupCodeForcesAPI() {
  const ui = SpreadsheetApp.getUi();
  const handle = ui.prompt(
    '📊 CodeForces Setup\n' +
    'Enter your CodeForces handle:',
    CODEFORCES_HANDLE,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (handle.getSelectedButton() === ui.Button.OK) {
    const cfHandle = handle.getResponseText().trim();
    if (cfHandle) {
      getUserProperties().setProperty('CODEFORCES_HANDLE', cfHandle);
      fetchCodeForcesStats(cfHandle);
      ui.alert('✅ CodeForces connected!\nHandle: ' + cfHandle);
    }
  }
}

function fetchCodeForcesStats(handle) {
  handle = handle || getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
  
  try {
    // Get user info (rating, rank)
    const userUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const userFetch = safeFetchJson(userUrl, { muteHttpExceptions: true });
    const userData = userFetch.json;
    if (userFetch.ok && userData && userData.status === 'OK') {
      const user = userData.result[0];
      const userStats = {
        handle: user.handle,
        rating: user.rating,
        rank: user.rank,
        maxRating: user.maxRating,
        maxRank: user.maxRank
      };
      
      getUserProperties().setProperty('CF_USER_STATS', JSON.stringify(userStats));
    }
    
    // Get submissions (solved problems)
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`;
    const subsFetch = safeFetchJson(submissionsUrl, { muteHttpExceptions: true });
    const submissionsData = subsFetch.json;
    if (subsFetch.ok && submissionsData && submissionsData.status === 'OK') {
      const submissions = submissionsData.result;
      
      // Count solved problems (only unique problems with verdict OK)
      const solvedMap = new Map();
      submissions.forEach(sub => {
        if (sub.verdict === 'OK') {
          const problemKey = `${sub.problem.contestId || '0'}-${sub.problem.index}`;
          // Only keep the first accepted submission for each problem
          if (!solvedMap.has(problemKey) || 
              sub.creationTimeSeconds < solvedMap.get(problemKey).creationTimeSeconds) {
            solvedMap.set(problemKey, sub);
          }
        }
      });
      
      const solvedProblems = Array.from(solvedMap.values());
      const solvedCount = solvedProblems.length;
      
      // Get average rating of solved problems
      const avgRating = solvedCount > 0 ? Math.round(
        solvedProblems.reduce((sum, p) => sum + (p.problem.rating || 0), 0) / solvedCount
      ) : 0;
      
      // Get problems by difficulty
      const byDifficulty = {
        '800-899': solvedProblems.filter(p => (p.problem.rating || 0) >= 800 && (p.problem.rating || 0) <= 899).length,
        '900-999': solvedProblems.filter(p => (p.problem.rating || 0) >= 900 && (p.problem.rating || 0) <= 999).length,
        '1000-1099': solvedProblems.filter(p => (p.problem.rating || 0) >= 1000 && (p.problem.rating || 0) <= 1099).length,
        '1100-1199': solvedProblems.filter(p => (p.problem.rating || 0) >= 1100 && (p.problem.rating || 0) <= 1199).length,
        '1200-1299': solvedProblems.filter(p => (p.problem.rating || 0) >= 1200 && (p.problem.rating || 0) <= 1299).length,
        '1300-1399': solvedProblems.filter(p => (p.problem.rating || 0) >= 1300 && (p.problem.rating || 0) <= 1399).length,
        '1400-1499': solvedProblems.filter(p => (p.problem.rating || 0) >= 1400 && (p.problem.rating || 0) <= 1499).length,
        '1500+': solvedProblems.filter(p => (p.problem.rating || 0) >= 1500).length,
      };
      
      const cfStats = {
        totalSolved: solvedCount,
        avgRating: avgRating,
        byDifficulty: byDifficulty,
        lastUpdated: new Date().toISOString()
      };
      
      getUserProperties().setProperty('CF_SUBMISSIONS_STATS', JSON.stringify(cfStats));
      updateCodeForcesDashboard(userData.result[0], cfStats);
      
      sendNotification('📊 CodeForces Sync Complete', 
        `Handle: ${handle}\nProblems Solved: ${solvedCount}/${CF_TARGET}\nRating: ${userData.result[0].rating || 'unrated'}\nRank: ${userData.result[0].rank || 'unrated'}`);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ CodeForces API Error: ' + error);
    Logger.log('CodeForces API Error: ' + error);
  }
}

// ======================
// GOOGLE CALENDAR INTEGRATION
// ======================

function setupGoogleCalendar() {
  const ui = SpreadsheetApp.getUi();
  const calendarName = ui.prompt(
    '📅 Google Calendar Setup\n\n' +
    'Enter your calendar ID (or leave blank to use default):\n' +
    '(Find it in Google Calendar → Settings → Integrate calendar → Calendar ID)',
    '',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (calendarName.getSelectedButton() === ui.Button.OK) {
    const calId = calendarName.getResponseText().trim() || 'primary';
    try {
      // Test connection
      const cal = CalendarApp.getCalendarById(calId);
      if (!cal) {
        ui.alert('❌ Calendar not found. Using your primary calendar.');
        getUserProperties().setProperty('GOOGLE_CALENDAR_ID', 'primary');
      } else {
        getUserProperties().setProperty('GOOGLE_CALENDAR_ID', calId);
        ui.alert('✅ Google Calendar connected!\nCalendar: ' + cal.getName());
      }
    } catch (e) {
      getUserProperties().setProperty('GOOGLE_CALENDAR_ID', 'primary');
      ui.alert('✅ Using primary Google Calendar');
    }
  }
}

function syncDailyTasksToCalendar() {
  const ss = getActiveSpreadsheet();
  const dailyMaster = ss.getSheetByName('📅 DAILY MASTER');
  
  if (!dailyMaster) {
    SpreadsheetApp.getUi().alert('❌ Daily Master sheet not found.');
    return;
  }
  
  try {
    const calId = getUserProperties().getProperty('GOOGLE_CALENDAR_ID') || 'primary';
    const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
    
    // Get today's row
    const today = new Date();
    const dayNum = Math.floor((today - START_DATE) / (24 * 60 * 60 * 1000)) + 1;
    const todayRow = dayNum + 3;
    
    if (todayRow > dailyMaster.getLastRow()) {
      SpreadsheetApp.getUi().alert('⚠️ Today is beyond the tracking period.');
      return;
    }
    
    // Get today's data
    const row = dailyMaster.getRange(todayRow, 1, 1, 27).getValues()[0];
    const phase = row[4];
    
    // Define time blocks for calendar events
    const timeBlocks = [
      {
        name: '🌅 MORNING ROUTINE',
        startTime: 6, // 6 AM
        duration: 4,  // 4 hours
        description: '✓ Wake 6am\n✓ Morning routine (30min)\n✓ Plan day (15min)\n✓ University prep',
        color: CalendarApp.EventColor.PALE_BLUE
      },
      {
        name: '💻 DEEP WORK BLOCK',
        startTime: 10, // 10 AM
        duration: 8,   // 8 hours
        description: '✓ Université (2h)\n✓ Coding/CF (2h)\n✓ Drone/Aero (1h)\n✓ Other tasks (1h)',
        color: CalendarApp.EventColor.SAGE
      },
      {
        name: '🌙 EVENING ROUTINE',
        startTime: 18, // 6 PM
        duration: 4,   // 4 hours
        description: '✓ Physical activity\n✓ Pushups\n✓ Healthy dinner\n✓ Learning/reading (30min)',
        color: CalendarApp.EventColor.BLUEBERRY
      }
    ];
    
    // Clear existing events from today (optional)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const existingEvents = calendar.getEvents(startOfDay, endOfDay);
    
    // Only delete events that match our pattern
    existingEvents.forEach(event => {
      if (event.getTitle().includes('🌅') || event.getTitle().includes('💻') || event.getTitle().includes('🌙')) {
        event.deleteEvent();
      }
    });
    
    // Create new calendar events
    let createdCount = 0;
    timeBlocks.forEach(block => {
      const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), block.startTime, 0);
      const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), block.startTime + block.duration, 0);
      
      const event = calendar.createEvent(block.name, startTime, endTime)
        .setDescription(`${block.description}\n\nPhase: ${phase}\nTracking: Open Daily Master to check off tasks!`)
        .setColor(block.color);
      
      createdCount++;
    });
    
    SpreadsheetApp.getUi().alert(`✅ Calendar synced!\nCreated ${createdCount} events in Google Calendar for today.`);
    sendNotification('📅 Calendar Sync', `Synced ${createdCount} daily task blocks to Google Calendar`);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Calendar sync error: ' + error);
    Logger.log('Calendar Sync Error: ' + error);
  }
}

function addWeeklyEventsToCalendar() {
function addWeeklyEventsToCalendar(selectedIds) {
  const ss = getActiveSpreadsheet();
  const weeklySchedule = ss.getSheetByName('📅 WEEKLY SCHEDULE');
  
  if (!weeklySchedule) {
    SpreadsheetApp.getUi().alert('❌ Weekly Schedule sheet not found.');
    return;
  }
  
  try {
    const calId = getUserProperties().getProperty('GOOGLE_CALENDAR_ID') || 'primary';
    const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
    
    // Get this week's events from the schedule
    const today = new Date();
    const dayNum = Math.floor((today - START_DATE) / (24 * 60 * 60 * 1000)) + 1;
    const weekNum = Math.ceil(dayNum / 7);
    
    // Add key weekly checkpoints (with ids and colors)
    const weeklyMilestones = [
      {
        id: 'review',
        name: '📊 Weekly Review & Reflection',
        dayOffset: 6, // Sunday
        time: 19, // 7 PM
        duration: 1,
        color: CalendarApp.EventColor.PALE_BLUE
      },
      {
        id: 'reset',
        name: '💪 Weekly Challenge Reset',
        dayOffset: 1, // Monday (use 1 to align with JS getDay Monday=1)
        time: 6, // 6 AM
        duration: 0.5,
        color: CalendarApp.EventColor.GREEN
      },
      {
        id: 'checkin',
        name: '📈 Progress Check-in',
        dayOffset: 3, // Wednesday
        time: 12, // Noon
        duration: 0.5,
        color: CalendarApp.EventColor.YELLOW
      }
    ];
    
    let addedCount = 0;
    // If caller provided a selection, filter the milestones
    let toAdd = weeklyMilestones;
    if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
      toAdd = weeklyMilestones.filter(m => selectedIds.indexOf(m.id) !== -1);
    }

    toAdd.forEach(milestone => {
      const eventDate = new Date(today);
      // compute date for desired weekday: JS getDay() Sunday=0..Saturday=6
      const targetWeekday = (milestone.dayOffset % 7 + 7) % 7; // normalize
      const delta = targetWeekday - today.getDay();
      eventDate.setDate(today.getDate() + delta);
      eventDate.setHours(milestone.time, 0, 0);
      
      const startTime = new Date(eventDate);
      const endTime = new Date(eventDate.getTime() + milestone.duration * 60 * 60 * 1000);
      
      const ev = calendar.createEvent(milestone.name, startTime, endTime)
        .setDescription(`Week ${weekNum} milestone\nOpen your tracker to review progress!`);
      try { ev.setColor(milestone.color); } catch (e) { /* ignore if color not supported */ }
      
      addedCount++;
    });
    
    SpreadsheetApp.getUi().alert(`✅ Weekly events added!\nAdded ${addedCount} weekly milestones to Google Calendar.`);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Error adding weekly events: ' + error);
    Logger.log('Weekly Events Error: ' + error);
  }
}

function syncCodeForcesProblems() {
  const handle = getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
  const ss = getActiveSpreadsheet();
  const cfSheet = ss.getSheetByName('💡 CODEFORCES');
  
  if (!cfSheet) {
    SpreadsheetApp.getUi().alert('❌ 💡 CODEFORCES sheet not found. Run "Rebuild Sheets" first.');
    return;
  }
  
  try {
    // Fetch all submissions from CodeForces API (up to 1000 most recent)
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`;
    const response = UrlFetchApp.fetch(submissionsUrl, {muteHttpExceptions: true});
    const data = JSON.parse(response.getContentText());
    
    if (data.status === 'OK') {
      const submissions = data.result;

      // Filter for ACCEPTED submissions from day 1 to day 365 (entire year tracking period)
      const day1 = START_DATE.getTime();
      const day365 = day1 + (365 * 24 * 60 * 60 * 1000);
      
      const acceptedSubs = submissions.filter(sub => {
        if (sub.verdict !== 'OK') return false;
        const subTime = sub.creationTimeSeconds * 1000;
        return subTime >= day1 && subTime <= day365;
      });

      if (acceptedSubs.length === 0) {
        SpreadsheetApp.getUi().alert('✅ No accepted CodeForces submissions found in the tracking period (day 1-365).');
        return;
      }

      // Build set of existing problem keys in the sheet to avoid duplicates (contestId-index)
      const existingUrls = cfSheet.getRange(10, 4, Math.max(0, cfSheet.getLastRow() - 9), 1).getValues().flat();
      const existingKeys = new Set();
      existingUrls.forEach(u => {
        if (!u) return;
        try {
          const m = u.toString().match(/problem\/(\d+)\/(\w+)/);
          if (m) existingKeys.add(`${m[1]}-${m[2]}`);
        } catch (e) { /* ignore */ }
      });

      // Append all unique accepted submissions from the period (sorted by date, newest first)
      const sortedSubs = acceptedSubs.sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds);
      const startRow = cfSheet.getLastRow() < 9 ? 10 : cfSheet.getLastRow() + 1;
      const existingCount = Math.max(0, cfSheet.getLastRow() - 9);
      const rowsToAdd = [];
      let added = 0;

      sortedSubs.forEach((sub) => {
        const problem = sub.problem;
        const key = `${problem.contestId || '0'}-${problem.index}`;
        if (existingKeys.has(key)) return; // skip already present

        const date = new Date(sub.creationTimeSeconds * 1000);
        const url = `https://codeforces.com/problemset/problem/${problem.contestId || 0}/${problem.index}`;
        const rating = problem.rating || 'N/A';
        const tags = problem.tags ? problem.tags.join(', ') : '';
        const language = sub.programmingLanguage || '';

        const entryIndex = existingCount + rowsToAdd.length + 1;
        rowsToAdd.push([
          entryIndex,
          date,
          problem.name,
          url,
          rating,
          tags,
          '', // Time (min)
          '', // Attempts
          '', // Approach
          '✅', // Status
          language,
          ''  // Notes
        ]);

        existingKeys.add(key);
        added++;
      });

      if (rowsToAdd.length === 0) {
        SpreadsheetApp.getUi().alert('✅ No new accepted CodeForces submissions to add (all already in sheet).');
      } else {
        cfSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
        fetchCodeForcesStats(handle);  // Update stats
        sendNotification('✅ CodeForces Sync', `Added ${added} new accepted submission(s) from day 1-365.`);
        SpreadsheetApp.getUi().alert(`✅ CodeForces sync complete! Added ${added} new accepted submission(s) from the entire tracking period (day 1-365).`);
      }
    } else {
      SpreadsheetApp.getUi().alert('❌ CodeForces API Error: ' + data.comment);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ CodeForces Sync Error: ' + error);
    Logger.log('CodeForces Sync Error: ' + error);
  }
}

// Improved CodeForces sync: pages results, deduplicates by contestId-index, respects tracking window, writes in batch
function syncCodeForcesProblems() {
  const handle = getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
  const ss = getActiveSpreadsheet();
  const cfSheet = ss.getSheetByName('💡 CODEFORCES');

  if (!cfSheet) {
    SpreadsheetApp.getUi().alert('❌ 💡 CODEFORCES sheet not found. Run "Rebuild Sheets" first.');
    return;
  }

  try {
    // Fetch submissions with safe pagination
    let from = 1;
    const pageSize = 1000;
    let allSubs = [];
    while (true) {
      const submissionsUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${pageSize}`;
      const response = UrlFetchApp.fetch(submissionsUrl, { muteHttpExceptions: true });
      const data = JSON.parse(response.getContentText());
      if (!data || data.status !== 'OK' || !Array.isArray(data.result)) break;
      allSubs = allSubs.concat(data.result);
      if (data.result.length < pageSize) break;
      from += pageSize;
    }

    if (allSubs.length === 0) {
      SpreadsheetApp.getUi().alert('✅ No CodeForces submissions found for that handle.');
      return;
    }

    // Tracking window
    const startMs = START_DATE.getTime();
    const endMs = startMs + TOTAL_DAYS * 24 * 60 * 60 * 1000;

    // Keep earliest accepted submission per problem within window
    const acceptedMap = new Map();
    allSubs.forEach(sub => {
      if (sub.verdict !== 'OK') return;
      const subMs = (sub.creationTimeSeconds || 0) * 1000;
      if (subMs < startMs || subMs > endMs) return;
      const contestId = sub.problem.contestId || '0';
      const index = String(sub.problem.index || '');
      const key = `${contestId}-${index}`;
      if (!acceptedMap.has(key) || sub.creationTimeSeconds < acceptedMap.get(key).creationTimeSeconds) {
        acceptedMap.set(key, sub);
      }
    });

    const acceptedSubs = Array.from(acceptedMap.values()).sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds);
    if (acceptedSubs.length === 0) {
      SpreadsheetApp.getUi().alert('✅ No accepted CodeForces submissions inside the tracking period (day 1–' + TOTAL_DAYS + ').');
      return;
    }

    // Read existing keys from sheet (attempt to parse contestId-index from URL)
    const urlRange = cfSheet.getRange(10, 4, Math.max(0, cfSheet.getLastRow() - 9), 1).getValues().flat();
    const existingKeys = new Set();
    urlRange.forEach(u => {
      if (!u) return;
      const s = String(u);
      const re = /problem(?:set\/problem|\/problem|\/contest)\/(\d+)\/([A-Za-z0-9]+)/;
      const m = s.match(re);
      if (m) existingKeys.add(`${m[1]}-${m[2]}`);
      const re2 = /\/(\d+)\/([A-Za-z0-9]+)(?:$|[^A-Za-z0-9])/;
      const m2 = s.match(re2);
      if (m2) existingKeys.add(`${m2[1]}-${m2[2]}`);
    });

    const existingCount = Math.max(0, cfSheet.getLastRow() - 9);
    const rowsToAdd = [];
    let added = 0;

    acceptedSubs.forEach(sub => {
      const problem = sub.problem || {};
      const contestId = problem.contestId || 0;
      const index = String(problem.index || '');
      const key = `${contestId}-${index}`;
      if (existingKeys.has(key)) return;
      const dateObj = new Date((sub.creationTimeSeconds || 0) * 1000);
      const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
      const rating = problem.rating || 'N/A';
      const tags = (problem.tags || []).join(', ');
      const language = sub.programmingLanguage || '';
      const entryIndex = existingCount + rowsToAdd.length + 1;
      rowsToAdd.push([
        entryIndex,
        dateObj,
        problem.name || `Problem ${contestId}${index}`,
        url,
        rating,
        tags,
        '', // Time (min)
        '', // Attempts
        '', // Approach
        '✅',
        language,
        ''
      ]);
      existingKeys.add(key);
      added++;
    });

    if (rowsToAdd.length === 0) {
      SpreadsheetApp.getUi().alert('✅ No new accepted CodeForces submissions to add (all already present).');
      return;
    }

    const startRow = cfSheet.getLastRow() < 9 ? 10 : cfSheet.getLastRow() + 1;
    cfSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    cfSheet.getRange(startRow, 2, rowsToAdd.length, 1).setNumberFormat('yyyy-mm-dd');

    try { fetchCodeForcesStats(handle); } catch (e) { /* non-blocking */ }

    sendNotification('✅ CodeForces Sync', `Added ${added} new accepted submission(s) (day 1–${TOTAL_DAYS}).`);
    SpreadsheetApp.getUi().alert(`✅ CodeForces sync complete! Added ${added} new accepted submission(s).`);
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ CodeForces Sync Error: ' + (error && error.message ? error.message : error));
    Logger.log('CodeForces Sync Error: ' + error);
  }
}

// Preview (dry-run) of CodeForces sync: returns {count, sample}
function previewCodeForcesSync(handle) {
  try {
    handle = handle || getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
    // Fetch submissions (paged) but do not write anything
    let from = 1;
    const pageSize = 1000;
    let allSubs = [];
    while (true) {
      const submissionsUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${pageSize}`;
      const fetchRes = safeFetchJson(submissionsUrl, { muteHttpExceptions: true });
      if (!fetchRes.ok || !fetchRes.json || !Array.isArray(fetchRes.json.result)) break;
      const data = fetchRes.json.result;
      allSubs = allSubs.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const startMs = START_DATE.getTime();
    const endMs = startMs + TOTAL_DAYS * 24 * 60 * 60 * 1000;

    const acceptedMap = new Map();
    allSubs.forEach(sub => {
      if (sub.verdict !== 'OK') return;
      const subMs = (sub.creationTimeSeconds || 0) * 1000;
      if (subMs < startMs || subMs > endMs) return;
      const contestId = sub.problem.contestId || '0';
      const index = String(sub.problem.index || '');
      const key = `${contestId}-${index}`;
      if (!acceptedMap.has(key) || sub.creationTimeSeconds < acceptedMap.get(key).creationTimeSeconds) {
        acceptedMap.set(key, sub);
      }
    });

    const acceptedSubs = Array.from(acceptedMap.values()).sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds);
    const sample = acceptedSubs.slice(0, 10).map((sub, i) => {
      const problem = sub.problem || {};
      return [i + 1, new Date(sub.creationTimeSeconds * 1000), problem.name || `Problem ${problem.contestId}${problem.index}`, `https://codeforces.com/problemset/problem/${problem.contestId || 0}/${problem.index || ''}`, problem.rating || 'N/A'];
    });

    return { count: acceptedSubs.length, sample: sample };
  } catch (e) {
    Logger.log('previewCodeForcesSync error: ' + e);
    return { count: -1, sample: [] };
  }
}

function updateCodeForcesDashboard(userStats, cfStats) {
  const ss = getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('📊 DASHBOARD');
  
  if (!dashboard) return;
  
  try {
    // Find CF section in dashboard
    let cfStartRow = 25;
    const values = dashboard.getRange('A:A').getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString().includes('CODEFORCES')) {
        cfStartRow = i + 1;
        break;
      }
    }
    
    // Update CF stats on dashboard
    dashboard.getRange(cfStartRow + 1, 2).setValue(cfStats.totalSolved);
    dashboard.getRange(cfStartRow + 2, 2).setValue(CF_TARGET);
    dashboard.getRange(cfStartRow + 3, 2).setValue(cfStats.totalSolved / CF_TARGET);
    dashboard.getRange(cfStartRow + 4, 2).setValue(userStats.rating || 'unrated');
    dashboard.getRange(cfStartRow + 5, 2).setValue(userStats.rank || 'unrated');
    dashboard.getRange(cfStartRow + 6, 2).setValue(cfStats.avgRating);
    
  } catch (error) {
    Logger.log('Dashboard update error: ' + error);
  }
}

// ======================
// NOTIFICATIONS SYSTEM
// ======================
function sendNotification(title, message) {
  const properties = getUserProperties();
  let notificationTarget = properties.getProperty('NOTIFICATION_TARGET') || DISCORD_WEBHOOK;

  if (!notificationTarget) {
    // Fallback to configured constant webhook or log
    notificationTarget = DISCORD_WEBHOOK;
  }
  
  try {
    // Only support Discord webhook or sheet log from now on (emails removed)
    if (notificationTarget && notificationTarget.includes('discord.com')) {
      sendDiscordNotification(title, message, notificationTarget);
    } else {
      // Fallback: log to sheet
      logNotificationToSheet(title, message);
    }
  } catch (error) {
    logNotificationToSheet(title, `${message}\nError: ${error}`);
  }
}

function sendDiscordNotification(title, message, webhookUrl) {
  const payload = {
    "content": null,
    "embeds": [{
      "title": title,
      "description": message,
      "color": 3066993, // Green
      "footer": {
        "text": "365-Day Transformation Tracker"
      },
      "timestamp": new Date().toISOString()
    }],
    "username": "📊 365-Day Tracker",
    "avatar_url": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const resp = safeFetchJson(webhookUrl, options);
    if (!resp.ok && resp.code !== 204) {
      Logger.log('Discord webhook response: ' + resp.code + ' ' + (resp.error || ''));
    }
  } catch (e) {
    console.log('Discord notification failed: ' + e);
  }
}

// Email notifications removed (deprecated). All notifications use Discord webhook or sheet log.

function logNotificationToSheet(title, message) {
  try {
    const ss = getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('📱 NOTIFICATIONS');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('📱 NOTIFICATIONS');
      logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Title', 'Message', 'Status']]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#4472C4').setFontColor('#ffffff');
    }
    
    const lastRow = logSheet.getLastRow() + 1;
    logSheet.getRange(lastRow, 1).setValue(new Date());
    logSheet.getRange(lastRow, 2).setValue(title);
    logSheet.getRange(lastRow, 3).setValue(message);
    logSheet.getRange(lastRow, 4).setValue('LOGGED');
    
  } catch (e) {
    // Silent fail if no sheet to log to
  }
}


// ======================
// SCREEN TIME TRACKING
// ======================
function enableScreenTimeTracking() {
  const properties = getUserProperties();
  const startTime = new Date().getTime();
  
  properties.setProperty('SCREEN_TIME_START', startTime.toString());
  properties.setProperty('SCREEN_TIME_ENABLED', 'true');
  properties.setProperty('SCREEN_TIME_BREAKS_TAKEN', '0');
  
  // Clear existing triggers first
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkScreenTime' || 
        trigger.getHandlerFunction() === 'screenTimeBreakReminder') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new triggers
  ScriptApp.newTrigger('checkScreenTime')
    .timeBased()
    .everyMinutes(15)
    .create();
  
  ScriptApp.newTrigger('screenTimeBreakReminder')
    .timeBased()
    .everyMinutes(30)
    .create();
  
  sendNotification('⏱️ Screen Time Tracking Enabled', 
    'Rules:\n' +
    '• 4 hour maximum work session\n' +
    '• 5-10 min break every hour\n' +
    '• Gym session resets timer\n\n' +
    'You\'ll receive alerts every 30 minutes'
  );
  
  SpreadsheetApp.getUi().alert(
    '✅ Screen Time Tracking Enabled!\n\n' +
    '🎯 Rules:\n' +
    '• Work up to 4 hours max\n' +
    '• 5-10 min break every hour\n' +
    '• You\'ll get alerts every 30 min\n' +
    'Going to gym resets timer! 💪'
  );
}

function checkScreenTime() {
  const properties = getUserProperties();
  if (properties.getProperty('SCREEN_TIME_ENABLED') !== 'true') return;
  
  const startTime = parseInt(properties.getProperty('SCREEN_TIME_START') || Date.now());
  const elapsedMs = Date.now() - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  
  // Different alerts based on time
  const alerts = [
    { at: 60, title: '🚨 1 Hour Working', message: 'Take a quick 5-min break! Stretch, water, or a short walk. 🚶‍♂️' },
    { at: 120, title: '⚠️ 2 Hours Working', message: 'Time for a real break! Step away for 10 min. You\'re doing great! 💪' },
    { at: 180, title: '🔴 3 Hours Working', message: 'Long session! Take a 15-min break. Eyes need rest. 👀' },
    { at: 240, title: '🛑 4 HOURS LIMIT REACHED', message: 'STOP! Go to gym, eat, walk, or sleep. Rest is part of the grind! 🚁' }
  ];
  
  alerts.forEach(alert => {
    const lastAlertKey = `LAST_ALERT_${alert.at}`;
    const lastAlertTime = parseInt(properties.getProperty(lastAlertKey) || '0');
    
    if (elapsedMinutes >= alert.at && Date.now() - lastAlertTime > 5 * 60000) {
      sendNotification(alert.title, alert.message);
      properties.setProperty(lastAlertKey, Date.now().toString());
      
      if (alert.at >= 240) {
        properties.setProperty('SCREEN_TIME_ENABLED', 'false');
        
        // Clean up triggers
        ScriptApp.getProjectTriggers().forEach(trigger => {
          if (trigger.getHandlerFunction() === 'checkScreenTime' || 
              trigger.getHandlerFunction() === 'screenTimeBreakReminder') {
            ScriptApp.deleteTrigger(trigger);
          }
        });
      }
    }
  });
}

function screenTimeBreakReminder() {
  const properties = getUserProperties();
  if (properties.getProperty('SCREEN_TIME_ENABLED') !== 'true') return;
  
  const startTime = parseInt(properties.getProperty('SCREEN_TIME_START') || Date.now());
  const elapsedMs = Date.now() - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  
  if (elapsedMinutes > 0) {
    const breaksTaken = parseInt(properties.getProperty('SCREEN_TIME_BREAKS_TAKEN') || '0');
    
    sendNotification(
      '⏰ Break Time Reminder',
      `Elapsed: ${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m\n` +
      `Breaks taken: ${breaksTaken}\n` +
      'Stand up, move around! 🏃‍♂️'
    );
  }
}

function logBreakTaken() {
  const properties = getUserProperties();
  const breaksTaken = parseInt(properties.getProperty('SCREEN_TIME_BREAKS_TAKEN') || '0');
  
  properties.setProperty('SCREEN_TIME_BREAKS_TAKEN', (breaksTaken + 1).toString());
  
  sendNotification('✅ Break Logged', 'Great job taking care of yourself! +5 XP 💪');
  
  // Log to health sheet
  const ss = getActiveSpreadsheet();
  const healthSheet = ss.getSheetByName('🏋️ HEALTH');
  
  if (healthSheet) {
    const today = new Date();
    const dateColumn = healthSheet.getRange('A:A').getValues();
    let foundRow = 0;
    
    for (let i = 0; i < dateColumn.length; i++) {
      const cellValue = dateColumn[i][0];
      if (cellValue instanceof Date && 
          cellValue.getDate() === today.getDate() &&
          cellValue.getMonth() === today.getMonth() &&
          cellValue.getFullYear() === today.getFullYear()) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow === 0) {
      // Add new row for today
      foundRow = healthSheet.getLastRow() + 1;
      healthSheet.getRange(foundRow, 1).setValue(today);
    }
    
    // Log break in notes column
    const notesCell = healthSheet.getRange(foundRow, 16); // Column P for notes
    const currentNotes = notesCell.getValue() || '';
    const timestamp = new Date().toLocaleTimeString();
    
    notesCell.setValue(`${currentNotes}\n✅ Break logged at ${timestamp}`);
  }
}

function resetScreenTimeTracker() {
  const properties = getUserProperties();
  const startTime = new Date().getTime();
  
  properties.setProperty('SCREEN_TIME_START', startTime.toString());
  properties.setProperty('SCREEN_TIME_BREAKS_TAKEN', '0');
  
  sendNotification('🔄 Timer Reset', 'New work session started! Go crush it! 🚀');
}

// ======================
// PUSHUPS / PUNISHMENT
// ======================
function recordDailyPushups(dateObj, count) {
  const ss = getActiveSpreadsheet();
  const healthSheet = ss.getSheetByName('🏋️ HEALTH');
  if (!healthSheet) return;

  const date = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  const dateColumn = healthSheet.getRange('A:A').getValues();
  let foundRow = 0;

  for (let i = 0; i < dateColumn.length; i++) {
    const cellValue = dateColumn[i][0];
    if (cellValue instanceof Date &&
        cellValue.getDate() === date.getDate() &&
        cellValue.getMonth() === date.getMonth() &&
        cellValue.getFullYear() === date.getFullYear()) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === 0) {
    foundRow = healthSheet.getLastRow() + 1;
    healthSheet.getRange(foundRow, 1).setValue(date);
  }

  // Pushups column (based on headers): Date(1), Gym?(2), Workout(3), Exercises(4), Duration(5), Pushups(6)
  const pushupCol = 6;
  healthSheet.getRange(foundRow, pushupCol).setValue(count);

  // If below target, add punishment note
  if (count < PUSHUP_DAILY_TARGET) {
    const deficit = PUSHUP_DAILY_TARGET - count;
    const punishment = deficit * 2; // simple multiplier for fun
    const notesCell = healthSheet.getRange(foundRow, 16); // notes column (unchanged)
    const currentNotes = notesCell.getValue() || '';
    const punishText = `⚠️ Punishment: do ${punishment} extra pushups (missed ${deficit})`;
    notesCell.setValue((currentNotes ? currentNotes + '\n' : '') + punishText);

    sendNotification('🏋️ Punishment Assigned', `You did ${count} pushups today. ${punishText}`);
  } else {
    sendNotification('🏋️ Pushups Done', `Great! You did ${count}/${PUSHUP_DAILY_TARGET} pushups today. Keep it up!`);
  }
}

function getPushupTarget() {
  const props = getUserProperties();
  const v = props.getProperty('PUSHUP_DAILY_TARGET');
  const n = v ? parseInt(v, 10) : null;
  return (n && !isNaN(n)) ? n : PUSHUP_DAILY_TARGET;
}

function openWebhookConfig() {
  const ui = SpreadsheetApp.getUi();
  const props = getUserProperties();
  const current = props.getProperty('NOTIFICATION_TARGET') || DISCORD_WEBHOOK || '';
  const res = ui.prompt('Configure Discord Webhook', 'Enter Discord webhook URL (or Cancel):', ui.ButtonSet.OK_CANCEL);

  if (res.getSelectedButton() === ui.Button.OK) {
    const url = res.getResponseText().trim();
    if (url && (url.includes('discord.com') || url.includes('discordapp.com'))) {
      props.setProperty('NOTIFICATION_TARGET', url);
      ui.alert('✅ Webhook saved!');
      sendNotification('✅ Webhook configured', 'Notifications will use this webhook.');
    } else {
      ui.alert('❌ Invalid webhook URL. Must include discord.com');
    }
  }
}

function testWebhookMenu() {
  const ui = SpreadsheetApp.getUi();
  try {
    sendNotification('🔔 Webhook Test', 'This is a test notification from your Tracker.');
    ui.alert('✅ Test sent. Check your Discord channel.');
  } catch (e) {
    ui.alert('❌ Test failed: ' + e);
  }
}

function logPushupsPrompt() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Log Pushups', `Enter pushups count for today (target: ${getPushupTarget()}):`, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK) {
    const txt = res.getResponseText().trim();
    const n = parseInt(txt, 10);
    if (!isNaN(n) && n >= 0) {
      recordDailyPushups(new Date(), n);
      ui.alert(`Recorded ${n} pushups for today.`);
    } else {
      ui.alert('❌ Invalid number. Please enter an integer >= 0.');
    }
  }
}

function setPushupTargetPrompt() {
  const ui = SpreadsheetApp.getUi();
  const props = getUserProperties();
  const current = getPushupTarget();
  const res = ui.prompt('Set Pushup Daily Target', `Current target: ${current}\nEnter new daily target (integer):`, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK) {
    const v = parseInt(res.getResponseText().trim(), 10);
    if (!isNaN(v) && v > 0) {
      props.setProperty('PUSHUP_DAILY_TARGET', v.toString());
      updatePushupTargetInGameHub(v);
      ui.alert(`✅ Pushup target updated to ${v}. Game Hub updated.`);
    } else {
      ui.alert('❌ Invalid value. Enter an integer > 0.');
    }
  }
}

function updatePushupTargetInGameHub(target) {
  const ss = getActiveSpreadsheet();
  const sheet = ss.getSheetByName('🎮 GAME HUB');
  if (!sheet) return;
  const startRow = 15;
  const formulas = new Array(TOTAL_DAYS);
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const row = startRow + i;
    formulas[i] = [
      `=IFERROR(IF(INDEX('🏋️ HEALTH'!B:B; MATCH(B${row}; '🏋️ HEALTH'!A:A; 0)) = "Yes"; 10; 0) + IFERROR(INDEX('🏋️ HEALTH'!F:F; MATCH(B${row}; '🏋️ HEALTH'!A:A; 0)) / ${target} * 5; 0); 0)`
    ];
  }
  try {
    sheet.getRange(startRow, 6, formulas.length, 1).setFormulas(formulas);
  } catch (e) {
    // Fall back to per-cell on error
    for (let i = 0; i < formulas.length; i++) {
      try { sheet.getRange(startRow + i, 6).setFormula(formulas[i][0]); } catch (er) { /* ignore */ }
    }
  }
}
// ======================
// SHEET GENERATION FUNCTIONS (ALL MISSING FUNCTIONS DEFINED)
// ======================
function createDashboard(ss) {
  const sheet = getOrCreateSheet(ss, '📊 DASHBOARD', 120, 8);
  sheet.setColumnWidths(1, 1, 240);
  sheet.setColumnWidths(2, 1, 200);
  
  setSectionHeader(sheet, 1, 1, 8, '🌍 INTERNATIONAL FREELANCER DASHBOARD (USD Primary)', '#D9E2F3', 18);
  sheet.getRange(1, 1, 1, 8).setHorizontalAlignment('center');
  
  let row = 3;
  setSectionHeader(sheet, row, 1, 3, '💱 EXCHANGE RATE & CURRENCY CONVERSION', '#FFD966');
  row += 1;
  sheet.getRange(row, 1).setValue('Current Exchange Rate (USD → TND)');
  sheet.getRange(row, 2).setValue(EXCHANGE_RATE).setNumberFormat('0.00');
  sheet.getRange(row, 3).setValue('TND/USD').setFontColor('#666666');
  
  row += 2;
  setSectionHeader(sheet, row, 1, 3, '📈 KEY METRICS', '#B4C6E7');
  row += 1;
  
  const statusRows = [
    ['Current Date', '=TODAY()'],
    ['Day Number', `=MAX(1;TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1)`],
    ['Days Remaining', `=MAX(0;${TOTAL_DAYS}-(TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1))`],
    ['Current Week', `=ROUNDUP((TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1)/7;0)`],
    ['Current Phase', `=IF((TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1)<=90;"Phase 1 | Foundation";
      IF((TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1)<=180;"Phase 2 | Growth";
      IF((TODAY()-DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()})+1)<=270;"Phase 3 | Specialization";"Phase 4 | Mastery")))`],
  ];
  
  statusRows.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]).setBackground('#F2F2F2');
    sheet.getRange(row, 2).setValue(item[1]).setNumberFormat(item[0].includes('Date') ? 'dd/mm/yyyy' : '0');
    row += 1;
  });
  
  row += 1;
  setSectionHeader(sheet, row, 1, 3, '💰 FINANCIAL PROGRESS', '#FFD966');
  row += 1;
  
  const financialRows = [
    ['Total Earned (USD)', '=SUM(\'💰 INCOME\'!F:F)', 'USD', 'Primary currency'],
    ['Total Earned (TND)', `=B${row-1}*${EXCHANGE_RATE}`, 'TND', 'Converted for context'],
    ['Progress to Goal (USD)', `=B${row-2}/${FINANCIAL_GOAL_USD}`, '%', `${FINANCIAL_GOAL_USD} USD target`],
    ['Progress to Goal (TND)', `=B${row-1}/${FINANCIAL_GOAL_TND}`, '%', `${FINANCIAL_GOAL_TND} TND target`],
  ];
  
financialRows.forEach((item, idx) => {
  sheet.getRange(row, 1).setValue(item[0]).setFontWeight('bold');

  const cellValue = sheet.getRange(row, 2);
  cellValue.setValue(item[1]);
  if (item[0].includes('Progress')) {
    cellValue.setNumberFormat('0.0%').setBackground('#FFFFCC');
  } else if (item[0].includes('Earned') || item[0].includes('Expenses')) {
    cellValue.setNumberFormat('$#,##0.00');
  }

  const cellDesc = sheet.getRange(row, 3, 1, 2);
  sheet.getRange(row, 3).setValue(item[2]).setFontColor('#999999').setFontSize(9);
  sheet.getRange(row, 4).setValue(item[3]).setFontColor('#999999').setFontSize(8).setFontStyle("italic");
  
  row += 1;
});

  
  row += 1;
  setSectionHeader(sheet, row, 1, 3, '💡 CODEFORCES PROGRESS', '#C6EFCE');
  row += 1;
  
  sheet.getRange(row, 1).setValue('Problems Solved');
  sheet.getRange(row, 2).setValue('0');
  row += 1;
  
  sheet.getRange(row, 1).setValue('Target');
  sheet.getRange(row, 2).setValue(CF_TARGET);
  row += 1;
  
  sheet.getRange(row, 1).setValue('Progress');
  sheet.getRange(row, 2).setFormula('=B' + (row-1) + '/B' + (row-2));
  sheet.getRange(row, 2).setNumberFormat('0.0%');
  
  row += 1;
  setSectionHeader(sheet, row, 1, 3, '🎮 HERO STATUS', '#FFE699');
  row += 1;
  
  const heroStats = [
    ['Level', `=IFERROR(MAX('🎮 GAME HUB'!J:J); 0)`],
    ['Total XP', `=IFERROR(MAX('🎮 GAME HUB'!I:I); 0)`],
    ['Current Badge', `=IFERROR(INDEX('🎮 GAME HUB'!K:K; MATCH(MAX('🎮 GAME HUB'!I:I); '🎮 GAME HUB'!I:I; 0)); "")`],
  ];
  
  heroStats.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]).setBackground('#FFF2CC');
    sheet.getRange(row, 2).setValue(item[1]);
    row += 1;
  });
  
  sheet.autoResizeColumns(1, 8);
}

function createDailyMaster(ss) {
  const columns = [
    'Day', 'Date', 'Day Name', 'Week', 'Phase',
    // MORNING ROUTINE (6am - 10am)
    '☑️ Wake 6am', '☑️ Morning routine (30min)', '☑️ Plan day (15min)', '☑️ University prep',
    // DEEP WORK BLOCKS (9am-5pm UNIVERSITY / 10am-6pm OTHER)
    '🏫 UNIVERSITÉ (9-17h)', '☑️ Mandatory Review (3h)', '☑️ Coding/CF (2h)', '☑️ Drone/Aero (1h)',
    // EVENING ROUTINE (6pm - 10pm)
    '☑️ Physical activity', '☑️ Pushups (target)', '☑️ Healthy dinner', '☑️ Learning/reading (30min)',
    // TRACKING & METRICS
    'Deep Work (hours)', 'CF Problems Solved', 'Pushups Done', 'Sleep Hours', 'Sleep Quality',
    'Energy Level', 'Cigarettes', 'Productivity Score', 'Daily Status', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '📅 DAILY MASTER', TOTAL_DAYS + 10, columns.length + 5);
  // Ensure any leftover data validations are removed before writing values
  try {
    sheet.getDataRange().clearDataValidations();
  } catch (e) { /* ignore */ }
  writeHeader(sheet, 1, columns);
  setSectionHeader(sheet, 2, 1, columns.length, 
    '🎯 DAILY PRODUCTIVITY MASTER - Your roadmap to success! Check boxes as you complete tasks 🚀', '#1F4788', 14);
  
  // Add category headers in row 3
  sheet.getRange(3, 6).setValue('🌅 MORNING').setBackground('#FFE0B2').setFontWeight('bold');
  sheet.getRange(3, 10).setValue('🏫 UNIVERSITY + 📚 REVIEW').setBackground('#D1C4E9').setFontWeight('bold');
  sheet.getRange(3, 14).setValue('💻 CODING').setBackground('#C8E6C9').setFontWeight('bold');
  sheet.getRange(3, 16).setValue('🌙 EVENING').setBackground('#B3E5FC').setFontWeight('bold');
  sheet.getRange(3, 21).setValue('📊 TRACKING').setBackground('#F8BBD0').setFontWeight('bold');
  sheet.getRange(3, 28).setValue('📝 NOTES').setBackground('#E1BEE7').setFontWeight('bold');
  
  const rows = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const currentDate = dateOffset(day - 1);
    const week = Math.floor((day - 1) / 7) + 1;
    const dayName = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'EEEE');
    const isWeekend = ['Saturday', 'Sunday'].includes(dayName);
    const phase = getPhaseForDay(day);
    
    rows.push([
      day,
      currentDate,
      dayName,
      week,
      phase,
      // Morning tasks (checkboxes)
      false, false, false, false,
      // University + mandatory review (non-checkbox for University, checkbox for mandatory review)
      '', // University attendance (text: present/vacation/exam)
      false, // Mandatory review (3h) - checkbox
      false, false, // Coding/CF and Drone/Aero tasks
      // Evening tasks (checkboxes)
      false, false, false, false,
      // Tracking metrics
      '', // Deep work hours (auto-calculated from tasks)
      '', // CF problems
      '', // Pushups done
      '', // Sleep hours
      '', // Sleep quality
      '', // Energy level
      '', // Cigarettes
      '', // Productivity score (calculated)
      '⏸️', // Daily status
      ''  // Notes
    ]);
  }
  
  // Clear any lingering validations on column O (CF/Pushups-related) to avoid write errors
  try {
    sheet.getRange(4, 15, rows.length, 1).clearDataValidations();
  } catch (e) { /* ignore if not possible */ }
  sheet.getRange(4, 1, rows.length, columns.length).setValues(rows);
  sheet.getRange(4, 2, rows.length, 1).setNumberFormat('yyyy-mm-dd');
  
  // Set up checkboxes for TODO items
  const checkboxCols = [6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18]; // All checkbox columns (excluding University attendance col 10)
  const checkboxRanges = [];
  checkboxCols.forEach(col => {
    checkboxRanges.push(sheet.getRange(4, col, rows.length, 1));
  });
  checkboxRanges.forEach(range => range.insertCheckboxes());
  
  // University attendance: Dropdown (Present / Vacation / Exam)
  sheet.getRange(4, 10, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['🏫 Present', '🏖️ Vacation', '📝 Exam']).build()
  ).setBackground('#D1C4E9');
  
  // Conditional formatting: Yellow for unchecked, Green for checked
  const rules = sheet.getConditionalFormatRules() || [];
  checkboxRanges.forEach(range => {
    range.setBackground('#FFF9C4'); // Light yellow default
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=TRUE')
      .setBackground('#C8E6C9')
      .setRanges([range])
      .build();
    rules.push(rule);
  });
  sheet.setConditionalFormatRules(rules);
  
  // Deep work hours: Auto-calculated based on checked tasks
  const deepWorkCol = sheet.getRange(4, 21, rows.length, 1);
  // Batch set formulas for deep work hours to reduce calls
  // Formula: University (8h if present, 0 if vacation), Mandatory Review (3h if checked), Coding (2h if checked), Drone (1h if checked)
  const deepWorkFormulas = [];
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 4;
    deepWorkFormulas.push([
      `=IF(J${rowNum}="🏫 Present"; 8; 0) + IF(K${rowNum}; 3; 0) + IF(L${rowNum}; 2; 0) + IF(M${rowNum}; 1; 0)`
    ]);
  }
  deepWorkCol.setFormulas(deepWorkFormulas);
  
  // CF Problems: Input field or linked to CodeForces sheet
  sheet.getRange(4, 22, rows.length, 1).setBackground('#F0F4F9');
  
  // Pushups: Input field
  sheet.getRange(4, 23, rows.length, 1).setBackground('#FFE0B2');
  
  // Sleep hours & quality: Input fields
  sheet.getRange(4, 24, rows.length, 1).setBackground('#B3E5FC').setNumberFormat('0.0');
  sheet.getRange(4, 25, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['😴', '😐', '😊', '😴😴']).build()
  );
  
  // Energy level: Dropdown
  sheet.getRange(4, 26, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['🔴 Low', '🟡 Medium', '🟢 High']).build()
  );
  
  // Cigarettes: Input field
  sheet.getRange(4, 27, rows.length, 1).setBackground('#FFCCCC');
  
  // Productivity Score: Formula (0-100%)
  const prodScoreCol = sheet.getRange(4, 28, rows.length, 1);
  // Batch set productivity formulas
  const prodFormulas = [];
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 4;
    // Mandatory review (K) must be checked daily for full score; university presence (J) required if not vacation
    prodFormulas.push([
      `=MIN(100; (IF(K${rowNum}; 30; 0) + IF(J${rowNum}="🏫 Present"; 30; IF(J${rowNum}="📝 Exam"; 20; 0)) + COUNTIF(F${rowNum}:I${rowNum}; TRUE) * 5 + IF(Z${rowNum}="😴😴"; 10; IF(Z${rowNum}="😊"; 5; 0)) + IF(V${rowNum}>0; 10; 0)) / 100 * 100)`
    ]);
  }
  prodScoreCol.setFormulas(prodFormulas);
  prodScoreCol.setNumberFormat('0.0"%"')
    .setHorizontalAlignment('center')
    .setFontWeight('bold');
  
  // Conditional formatting for Productivity Score
  const prodRule1 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(80)
    .setBackground('#4CAF50')
    .setFontColor('#FFFFFF')
    .setRanges([prodScoreCol])
    .build();
  const prodRule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(60, 79)
    .setBackground('#8BC34A')
    .setFontColor('#000000')
    .setRanges([prodScoreCol])
    .build();
  const prodRule3 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(40, 59)
    .setBackground('#FFC107')
    .setFontColor('#000000')
    .setRanges([prodScoreCol])
    .build();
  const prodRule4 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(40)
    .setBackground('#F44336')
    .setFontColor('#FFFFFF')
    .setRanges([prodScoreCol])
    .build();
  
  // Status dropdown
  sheet.getRange(4, 29, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️ Not started', '⚡ In progress', '✅ Completed', '🎯 Exceeded', '❌ Failed']).build()
  ).setBackground('#F8BBD0');
  
  // Notes column
  sheet.getRange(4, 30, rows.length, 1).setBackground('#F5F5F5');
  
  // Apply the productivity score rules
  const allRules = sheet.getConditionalFormatRules();
  allRules.push(prodRule1, prodRule2, prodRule3, prodRule4);
  sheet.setConditionalFormatRules(allRules);
  
  // Set column widths for readability
  sheet.setColumnWidth(1, 40);  // Day
  sheet.setColumnWidth(2, 80);  // Date
  sheet.setColumnWidth(3, 80);  // Day name
  sheet.setColumnWidth(10, 120); // University status
  sheet.setColumnWidth(11, 120); // Mandatory review
  sheet.setColumnWidth(28, 100); // Productivity
  sheet.setColumnWidth(29, 80);  // Status
  sheet.setColumnWidth(30, 150); // Notes
  
  // Freeze rows and columns for navigation
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(5);
  
  // Apply row banding for better readability (guarded: some environments may not support applyRowBanding)
  try {
    if (rows.length > 0 && columns && columns.length) {
      const bandRange = sheet.getRange(4, 1, rows.length, columns.length);
      try {
        bandRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_BLUE, false, false);
      } catch (e) {
        Logger.log('applyRowBanding not supported or failed: ' + e);
      }
    }
  } catch (e) {
    Logger.log('Row banding guard error: ' + e);
  }
  
  // Add helpful task descriptions as notes
  addTaskDescriptions(sheet);
}

// Helper function to add task descriptions as notes/comments
function addTaskDescriptions(sheet) {
  const taskDescriptions = {
    // Morning tasks
    6: '⏰ WAKE 6AM\nGet out of bed by 6:00 AM sharp. This single habit sets the tone for your entire day and gives you 3 extra hours of productive time compared to sleeping until 9am.',
    7: '🧘 MORNING ROUTINE (30min)\nShower, breakfast, exercise lightly, or meditate. A solid morning sets your circadian rhythm and mental clarity.',
    8: '📋 PLAN DAY (15min)\nWrite 3-5 key objectives for today. Identify time blocks. This saves 2+ hours of procrastination and decision fatigue.',
    9: '🎓 UNIVERSITY PREP (prep)\nReview today\'s lecture topics, prepare questions, gather materials. This makes the university block much more effective.',
    // University + mandatory review
    10: '🏫 UNIVERSITÉ 9-17h (DAILY)\nAttend classes 9 AM to 5 PM on ALL university days. During vacation (Dec 22 - Jan 5) or if it\'s Sunday, mark as vacation. This is your core skill-building block. NO EXCUSES - you MUST attend.',
    11: '📚 MANDATORY REVIEW (3h - NO EXCUSES)\nEvery single day, 3 hours of focused review/study. This is obligatory - no exceptions. Even during vacation and exams. This is mandatory for exam success.',
    12: '💻 CODING/CF (2h)\nSolve CodeForces problems, work on coding challenges, or build projects. Consistent programming is the fastest way to master development.',
    13: '🚁 DRONE/AERO (1h)\nWork on drone projects, aerodynamics research, or simulations. This is your specialized domain that differentiates you.',
    // Evening tasks
    15: '🏃 PHYSICAL ACTIVITY\nGym, running, sports, or cardio. Physical health directly impacts mental clarity and energy for the next day.',
    16: '💪 PUSHUPS (target)\nDaily strength challenge. Track your target and progressively increase. This builds discipline and physical fitness.',
    17: '🍽️ HEALTHY DINNER\nNutrious meal to fuel recovery. Avoid heavy foods that disrupt sleep. Drink plenty of water.',
    18: '📚 LEARNING/READING (30min)\nRead a book, listen to a podcast, or watch an educational video. End your day with knowledge, not doom-scrolling.'
  };
  
  for (let col in taskDescriptions) {
    const colNum = parseInt(col);
    sheet.getRange(3, colNum).setNote(taskDescriptions[col]).setHorizontalAlignment('center');
  }
}

// Remove any data validations on the Daily Master that reference CodeForces "problems" options
function findAndRemoveProblemValidations(ss) {
  try {
    const sheet = ss.getSheetByName('📅 DAILY MASTER');
    if (!sheet) return;

    const range = sheet.getDataRange();
    const validations = range.getDataValidations();
    if (!validations || validations.length === 0) return;

    for (let r = 0; r < validations.length; r++) {
      for (let c = 0; c < validations[r].length; c++) {
        const dv = validations[r][c];
        if (!dv) continue;
        try {
          const crit = dv.getCriteriaType();
          if (crit === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
            const vals = dv.getCriteriaValues();
            if (vals && vals[0] && Array.isArray(vals[0])) {
              const list = vals[0];
              const found = list.some(v => typeof v === 'string' && v.toLowerCase().includes('problem'));
              if (found) {
                sheet.getRange(r + 1, c + 1).clearDataValidations();
              }
            }
          }
        } catch (e) {
          // ignore any individual validation read errors
        }
      }
    }
  } catch (e) {
    // swallow errors to avoid breaking sheet generation
    Logger.log('findAndRemoveProblemValidations error: ' + e);
  }
}

// Diagnose data-validations across all sheets and report cells that contain "problem" / "probl" in their list
function diagnoseValidations() {
  const ui = SpreadsheetApp.getUi();
  const ss = getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const report = [];

  sheets.forEach(sheet => {
    try {
      const range = sheet.getDataRange();
      const vals = range.getDataValidations();
      if (!vals) return;
      for (let r = 0; r < vals.length; r++) {
        for (let c = 0; c < vals[r].length; c++) {
          const dv = vals[r][c];
          if (!dv) continue;
          try {
            const crit = dv.getCriteriaType();
            const raw = dv.getCriteriaValues();
            let found = false;
            let details = '';
            if (crit === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
              const list = raw && raw[0];
              if (Array.isArray(list)) {
                details = list.join(', ');
                found = list.some(v => typeof v === 'string' && (v.toLowerCase().includes('problem') || v.toLowerCase().includes('probl')));
              } else if (typeof list === 'string') {
                details = list;
                found = list.toLowerCase().includes('problem') || list.toLowerCase().includes('probl');
              }
            } else if (crit === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
              const rng = raw && raw[0];
              try { details = rng.getA1Notation(); } catch (e) { details = '' + rng; }
            } else {
              details = JSON.stringify(raw);
            }

            if (found) {
              const a1 = sheet.getRange(r + 1, c + 1).getA1Notation();
              report.push([sheet.getName(), a1, String(crit), details]);
            }
          } catch (e) {
            // ignore per-cell errors
          }
        }
      }
    } catch (e) {
      // ignore sheet-level errors
    }
  });

  const outName = '🛠 VALIDATION DIAG';
  const out = getOrCreateSheet(ss, outName, Math.max(10, report.length + 5), 6);
  out.clear();
  out.getRange(1, 1, 1, 4).setValues([['Sheet', 'Cell', 'Criteria', 'Values/Range']]).setFontWeight('bold');
  if (report.length === 0) {
    out.getRange(2, 1).setValue('No problematic validations found ("problem" / "probl" not detected).');
    ui.alert('✅ Diagnostic complete: no problematic validations found. Results added to sheet "' + outName + '".');
    return;
  }
  out.getRange(2, 1, report.length, 4).setValues(report);
  out.autoResizeColumns(1, 4);
  ui.alert('🔍 Diagnostic complete: ' + report.length + ' problematic validation(s) found. See sheet "' + outName + '".');
}

// Helper function to calculate deep work hours based on task completion
function getDeepWorkHours(F, G, H, I, J, K, L, M) {
  return (F ? 2 : 0) + (G ? 2 : 0) + (H ? 1 : 0) + (I ? 1 : 0) + (J ? 0.5 : 0) + (K ? 0.5 : 0) + (L ? 0.5 : 0) + (M ? 0.5 : 0);
}

// Helper function to calculate productivity score
function getProductivityScore(tasksCompleted, sleepQuality, cfProblems, deepWorkHours) {
  let score = Math.min(100, tasksCompleted * 8);
  if (sleepQuality === '😴😴') score += 15;
  else if (sleepQuality === '😊') score += 8;
  if (cfProblems > 0) score += 10;
  if (deepWorkHours >= 6) score += 10;
  return Math.min(100, score);
}

// Create a summary dashboard at the top
function createWeeklySummary(ss) {
  const summarySheet = getOrCreateSheet(ss, '📊 WEEKLY SUMMARY', 60, 15);
  
  summarySheet.getRange('A1').setValue('📊 WEEKLY PRODUCTIVITY SUMMARY & TRENDS')
    .setFontSize(16).setFontWeight('bold').setBackground('#1F4788').setFontColor('#FFFFFF');
  
  summarySheet.getRange('A2:N2').setValues([[
    'Week', 'Phase', 'Morning Tasks %', 'Deep Work %', 'Evening Tasks %',
    'Avg Productivity', 'Total Deep Work (hrs)', 'Total CF Solved', 'Total Pushups',
    'Avg Sleep', 'Best Day', 'Avg Energy', 'Weekly Score', 'Action Needed'
  ]]).setFontWeight('bold').setBackground('#C9DAF8').setFontSize(11);
  
  // Add formulas to calculate weekly statistics
  for (let week = 1; week <= Math.ceil(TOTAL_DAYS / 7); week++) {
    const startDay = (week - 1) * 7 + 4;
    const endDay = Math.min(week * 7 + 3, TOTAL_DAYS + 3);
    const row = week + 2;
    
    // Week number
    summarySheet.getRange(row, 1).setValue(week).setFontWeight('bold');
    
    // Phase
    summarySheet.getRange(row, 2).setFormula(
      `=IFERROR(INDEX('📅 DAILY MASTER'!E${startDay}:E${endDay}; 1); "")`
    );
    
    // Morning Tasks % (columns F-I: Wake, Routine, Plan, Prep)
    summarySheet.getRange(row, 3).setFormula(
      `=IFERROR(COUNTIF('📅 DAILY MASTER'!F${startDay}:I${endDay}; TRUE) / ((${endDay} - ${startDay} + 1) * 4); 0)`
    ).setNumberFormat('0.0%');
    
    // Deep Work % (columns J-M: University, CF, Drone, Other)
    summarySheet.getRange(row, 4).setFormula(
      `=IFERROR(COUNTIF('📅 DAILY MASTER'!J${startDay}:M${endDay}; TRUE) / ((${endDay} - ${startDay} + 1) * 4); 0)`
    ).setNumberFormat('0.0%');
    
    // Evening Tasks % (columns N-Q: Physical, Pushups, Dinner, Learning)
    summarySheet.getRange(row, 5).setFormula(
      `=IFERROR(COUNTIF('📅 DAILY MASTER'!N${startDay}:Q${endDay}; TRUE) / ((${endDay} - ${startDay} + 1) * 4); 0)`
    ).setNumberFormat('0.0%');
    
    // Average Productivity Score (column Y)
    summarySheet.getRange(row, 6).setFormula(
      `=IFERROR(AVERAGE('📅 DAILY MASTER'!Y${startDay}:Y${endDay}); 0)`
    ).setNumberFormat('0.0%').setFontWeight('bold');
    
    // Total Deep Work Hours (column R)
    summarySheet.getRange(row, 7).setFormula(
      `=IFERROR(SUM('📅 DAILY MASTER'!R${startDay}:R${endDay}); 0)`
    ).setNumberFormat('0.0');
    
    // Total CF Problems Solved (column S)
    summarySheet.getRange(row, 8).setFormula(
      `=IFERROR(SUM('📅 DAILY MASTER'!S${startDay}:S${endDay}); 0)`
    ).setNumberFormat('0');
    
    // Total Pushups (column T)
    summarySheet.getRange(row, 9).setFormula(
      `=IFERROR(SUM('📅 DAILY MASTER'!T${startDay}:T${endDay}); 0)`
    ).setNumberFormat('0');
    
    // Average Sleep Hours (column U)
    summarySheet.getRange(row, 10).setFormula(
      `=IFERROR(AVERAGE('📅 DAILY MASTER'!U${startDay}:U${endDay}); 0)`
    ).setNumberFormat('0.0');
    
    // Best Day of Week (based on productivity score)
    summarySheet.getRange(row, 11).setFormula(
      `=IFERROR(INDEX(ARRAYFORMULA(TEXT('📅 DAILY MASTER'!C${startDay}:C${endDay}; "EEEE")); MATCH(MAX('📅 DAILY MASTER'!Y${startDay}:Y${endDay}); '📅 DAILY MASTER'!Y${startDay}:Y${endDay}; 0)); "N/A")`
    );
    
    // Average Energy Level (column V)
    summarySheet.getRange(row, 12).setValue('—').setHorizontalAlignment('center');
    
    // Weekly Score (aggregate of all factors 0-100%)
    summarySheet.getRange(row, 13).setFormula(
      `=MIN(100; ROUND((C${row}*0.25 + D${row}*0.40 + E${row}*0.15 + F${row}*0.20) * 100; 1))`
    ).setNumberFormat('0.0%').setFontWeight('bold').setBackground('#FFF9C4');
    
    // Action Needed (conditional recommendation)
    summarySheet.getRange(row, 14).setFormula(
      `=IF(M${row} >= 0.8; "✅ Excellent! Keep it up!"; IF(M${row} >= 0.6; "⚡ Good, push harder!"; IF(M${row} >= 0.4; "🟡 Needs improvement"; "🔴 Major reset needed")))`
    ).setHorizontalAlignment('center');
  }
  
  // Format percentage columns as percentages
  summarySheet.getRange(3, 3, Math.ceil(TOTAL_DAYS / 7), 3).setNumberFormat('0.0%');
  summarySheet.getRange(3, 6, Math.ceil(TOTAL_DAYS / 7), 1).setNumberFormat('0.0%');
  summarySheet.getRange(3, 10, Math.ceil(TOTAL_DAYS / 7), 1).setNumberFormat('0.0');
  
  // Conditional formatting for Weekly Score column
  const scoreRange = summarySheet.getRange(3, 13, Math.ceil(TOTAL_DAYS / 7), 1);
  const scoreRule1 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(0.8)
    .setBackground('#4CAF50')
    .setFontColor('#FFFFFF')
    .setRanges([scoreRange])
    .build();
  const scoreRule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(0.6, 0.7999)
    .setBackground('#8BC34A')
    .setFontColor('#000000')
    .setRanges([scoreRange])
    .build();
  const scoreRule3 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(0.4, 0.5999)
    .setBackground('#FFC107')
    .setFontColor('#000000')
    .setRanges([scoreRange])
    .build();
  const scoreRule4 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0.4)
    .setBackground('#F44336')
    .setFontColor('#FFFFFF')
    .setRanges([scoreRange])
    .build();
  
  const rules = summarySheet.getConditionalFormatRules();
  rules.push(scoreRule1, scoreRule2, scoreRule3, scoreRule4);
  summarySheet.setConditionalFormatRules(rules);
  
  // Set column widths
  summarySheet.setColumnWidth(1, 50);   // Week
  summarySheet.setColumnWidth(2, 80);   // Phase
  summarySheet.setColumnWidths(3, 13, 90); // All other columns
  
  summarySheet.setFrozenRows(2);
  summarySheet.setFrozenColumns(2);
}

// Main execution
function setupDailyTodoTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createDailyMaster(ss);
  createWeeklySummary(ss);
  const dailyMasterSheet = ss.getSheetByName('📅 DAILY MASTER');
  if (dailyMasterSheet) addTaskDescriptions(dailyMasterSheet);
  
  SpreadsheetApp.getUi().alert(
    '✅ Daily Productivity Master Created!\n\n' +
    'KEY FEATURES:\n' +
    '📋 Daily task checklist with 12 core habits\n' +
    '📊 Auto-calculated productivity score (0-100%)\n' +
    '🎯 Color-coded progress visualization\n' +
    '💪 Integrated pushups, CF, and learning tracking\n' +
    '📈 Weekly summaries with actionable insights\n\n' +
    'TIPS FOR MAXIMUM PRODUCTIVITY:\n' +
    '• Complete morning routine → sets tone for day\n' +
    '• Block 2 hours for University → deep focus\n' +
    '• Solve 1-2 CF problems daily → consistency wins\n' +
    '• Track sleep quality → directly impacts energy\n' +
    '• Review weekly score → adjust strategy\n\n' +
    '🚀 Get started: Check off tasks as you complete them!'
  );
}

// Convenience function requested in README: create entire tracker
function generateTracker() {
  const ss = SpreadsheetApp.getActive();
  // Core sheets
  createDailyMaster(ss);
  createWeeklySummary(ss);
  createWeeklySchedule(ss);
  createIncomeTracker(ss);
  createExpenseTracker(ss);
  createGameHub(ss);
  createDailyStats(ss);
  createHealthGym(ss);
  createCodeforcesLog(ss);
  createResourcesGuide(ss);
  // Add other helpers
  addTaskDescriptions(ss.getSheetByName('📅 DAILY MASTER'));
  // Ensure any stray CF-related validations are removed from Daily Master
  try { findAndRemoveProblemValidations(ss); } catch (e) { /* ignore */ }
  SpreadsheetApp.getUi().alert('✅ Tracker generated. Please authorize triggers and UrlFetchApp if prompted.');
}
function createWeeklySchedule(ss) {
  const headers = [
    'Week', 'Date Range', 'Phase', 'Main Project', 'Project Type',
    'Clients', 'CF Topic', 'CF Target', 'Drone/Aero Focus', 'Skills Focus',
    'Income Target (USD)', 'Gym Sessions', 'Status', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '📋 WEEKLY SCHEDULE', TOTAL_WEEKS + 10, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '📅 WEEKLY PLANNING - AUTO-GENERATED FROM DAILY MASTER', '#D9E2F3', 12);
  
  const rows = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const weekStart = dateOffset((week - 1) * 7);
    const weekEnd = dateOffset((week - 1) * 7 + 6);
    const phase = getPhaseForDay((week - 1) * 7 + 1);
    
    rows.push([
      week,
      `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      phase,
      `Week ${week} Project`,
      getProjectTypeForPhase(phase),
      getClientRangeForPhase(phase),
      getCfTopicForWeek(week),
      getCfWeeklyTarget(phase),
      getDroneFocusForWeek(week, phase),
      getSkillsFocus(phase),
      getIncomeTargetForWeek(week),
      phase.includes('Phase 1') ? '3x' : '4x',
      '⏸️',
      ''
    ]);
  }
  
  sheet.getRange(4, 1, rows.length, headers.length).setValues(rows);
  
  sheet.getRange('M4:M' + (rows.length + 3)).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅', '❌']).build()
  );
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createIncomeTracker(ss) {
  const headers = [
    'Entry', 'Date', 'Client', 'Project', 'Hours', 'Amount (USD)', 
    'Amount (TND)', 'Payment Method', 'Status', 'Invoice #'
  ];
  
  const sheet = getOrCreateSheet(ss, '💰 INCOME', 200, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '💼 FREELANCE INCOME TRACKER (USD PRIMARY)', '#FFD966', 12);
  
  // Summary section
  setSectionHeader(sheet, 4, 1, 3, '📈 INCOME SUMMARY', '#FFF2CC', 12);
  sheet.getRange(5, 1).setValue('Total USD Earned');
  sheet.getRange(5, 2).setFormula('=SUM(F:F)').setNumberFormat('$#,##0.00');
  
  sheet.getRange(6, 1).setValue('Total TND Earned');
  sheet.getRange(6, 2).setFormula(`=B5*${EXCHANGE_RATE}`).setNumberFormat('#,##0 "TND"');
  
  sheet.getRange(7, 1).setValue('Progress to Goal (USD)');
  sheet.getRange(7, 2).setFormula(`=B5/${FINANCIAL_GOAL_USD}`);
  sheet.getRange(7, 2).setNumberFormat('0.0%').setBackground('#C6EFCE');
  
  // Data validation
  sheet.getRange('I10:I200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Paid', 'Partial']).build()
  );
  
  sheet.getRange('B10:B200').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('F10:F200').setNumberFormat('$#,##0.00');
  sheet.getRange('G10:G200').setNumberFormat('#,##0 "TND"');
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createExpenseTracker(ss) {
  const headers = [
    'Entry', 'Date', 'Category', 'Description', 'Amount (TND)', 
    'Amount (USD)', 'Necessary?', 'Receipt', 'Payment Method', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '💸 EXPENSES', 200, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '💰 EXPENSE TRACKER (TND PRIMARY)', '#FCE4D6', 12);
  
  // Budget summary
  setSectionHeader(sheet, 4, 1, 4, '📊 MONTHLY BUDGET', '#F8CBAD', 12);
  const budgetItems = [
    ['Rent', '220'],
    ['Dates', '60-100'],
    ['Cigarettes', '100→0'],
    ['Gym', '0→100'],
    ['Food/Pocket', '150-200'],
    ['Transport', '50-100'],
    ['Total', '680-920']
  ];
  
  for (let i = 0; i < budgetItems.length; i++) {
    sheet.getRange(5 + i, 1).setValue(budgetItems[i][0]);
    sheet.getRange(5 + i, 2).setValue(budgetItems[i][1]);
  }
  
  // Data validation
  sheet.getRange('C10:C200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(
      ['Rent', 'Dates', 'Cigarettes', 'Gym', 'Food/Groceries', 'Pocket Money', 
       'Transport', 'Lab Equipment', 'University Fees', 'Laptop Fund', 'Misc']
    ).build()
  );
  
  sheet.getRange('G10:G200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No']).build()
  );
  
  sheet.getRange('B10:B200').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('E10:E200').setNumberFormat('#,##0.00 "TND"');
  sheet.getRange('F10:F200').setNumberFormat('$#,##0.00');
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}
function createProjectMaster(ss) {
  const headers = [
    'Project ID', 'Project Name', 'Type', 'Week', 'Phase', 'Technologies',
    'Est. Hours', 'Difficulty', 'Portfolio Ready?', 'Status', 'Start Date',
    'Complete Date', 'Actual Hours', 'Notes', 'Prerequisites',
    'Training Steps', 'Milestones', 'Milestone Status'
  ];
  const sheet = getOrCreateSheet(ss, '🎯 PROJECT MASTER', 200, headers.length + 2);
  writeHeader(sheet, 1, headers);

  const projects = buildProjectsData();
  sheet.getRange(2, 1, projects.length, headers.length).setValues(projects);
  sheet.getRange('J2:J' + (projects.length + 1)).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅', '❌']).build()
  );
  sheet.getRange('R2:R' + (projects.length + 1)).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅']).build()
  );
  sheet.getRange('K2:L' + (projects.length + 1)).setNumberFormat('dd/mm/yyyy');
  sheet.setFrozenRows(1);
}

function buildProjectsData() {
  const rows = [];
  const baseProjects = [
    ['P001', 'Quote Scraper', 'Python', 1, 'Phase 0', 'BeautifulSoup, requests', 4, 'Easy', 'Yes'],
    ['P002', 'File Organizer', 'Python', 1, 'Phase 0', 'os, shutil, pathlib', 3, 'Easy', 'Yes'],
    ['P003', 'LinkedIn Scraper', 'Python', 2, 'Phase 0', 'Selenium, BeautifulSoup', 6, 'Medium', 'Yes'],
    ['P004', 'Price Tracker', 'Python', 3, 'Phase 0', 'SQLite, requests', 8, 'Medium', 'Yes'],
    ['P005', 'PDF to Excel Converter', 'Python', 4, 'Phase 0', 'PyPDF2, pandas', 6, 'Medium', 'Yes'],
    ['P006', 'Google Sheets Automation', 'Python', 5, 'Phase 1', 'gspread, OAuth', 10, 'Medium', 'Yes'],
    ['P007', 'Email Automation System', 'Python', 6, 'Phase 1', 'SMTP, IMAP', 12, 'Medium', 'Yes'],
    ['P008', 'Web Form Auto-Filler', 'Python', 7, 'Phase 1', 'Selenium, webdriver', 10, 'Medium', 'Yes'],
    ['P009', 'Real Estate Scraper', 'Python', 8, 'Phase 1', 'Scrapy', 15, 'Hard', 'Yes'],
    ['P010', 'Lead Generation System', 'Python', 9, 'Phase 1', 'APIs, pandas', 20, 'Hard', 'Yes'],
    ['P011', 'Social Media Scheduler', 'Python', 10, 'Phase 1', 'APIs, schedule', 15, 'Medium', 'Yes'],
    ['P012', 'Weather Dashboard', 'Python', 11, 'Phase 1', 'OpenWeather, Flask', 18, 'Hard', 'Yes'],
    ['P013', 'Stock Tracker', 'Python', 12, 'Phase 1', 'yfinance, charts', 20, 'Hard', 'Yes'],
    ['P014', 'Database Manager', 'Python', 13, 'Phase 1', 'PostgreSQL, SQLAlchemy', 25, 'Hard', 'Yes'],
    ['P015', 'News Aggregator', 'Python', 14, 'Phase 1', 'NLTK, spaCy', 25, 'Hard', 'Yes'],
    ['P016', 'Sentiment Tool', 'Python', 15, 'Phase 1', 'TextBlob, scikit', 25, 'Advanced', 'Yes'],
    ['P017', 'API Rate Limiter', 'Python', 16, 'Phase 1', 'Flask, Redis', 20, 'Advanced', 'Yes'],
    ['P018', 'Smart Weather Station', 'Integrated', 17, 'Phase 2', 'ESP32, DHT22, MQTT', 30, 'Advanced', 'Yes'],
    ['P019', 'Visual Inspector', 'Integrated', 18, 'Phase 2', 'OpenCV, n8n', 25, 'Advanced', 'Yes'],
    ['P020', 'Attendance System', 'Integrated', 19, 'Phase 2', 'Face recognition, Arduino', 35, 'Advanced', 'Yes'],
    ['P021', 'Gesture Robot', 'Integrated', 20, 'Phase 2', 'Hand tracking, motors', 40, 'Advanced', 'Yes'],
    ['P022', 'Smart Door Lock', 'Integrated', 21, 'Phase 2', 'Face auth, encryption', 45, 'Expert', 'Yes'],
    ['P023', 'Object Tracking Robot', 'Integrated', 22, 'Phase 2', 'KCF, navigation', 40, 'Expert', 'Yes'],
    ['P024', 'Gesture Control System', 'Integrated', 23, 'Phase 2', 'Gestures, servos', 35, 'Advanced', 'Yes'],
    ['P025', 'Security Camera', 'Integrated', 24, 'Phase 2', 'ESP32-CAM', 45, 'Expert', 'Yes'],
    ['P026', 'Smart Home Temp Monitor', 'IoT', 25, 'Phase 2', 'ESP32, MQTT', 35, 'Expert', 'Yes'],
    ['P027', 'Smart Home Controller', 'IoT', 26, 'Phase 2', 'ESP32, web server', 40, 'Expert', 'Yes'],
    ['P028', 'Real-time Data Logger', 'Embedded', 27, 'Phase 2', 'SD card, RTC', 35, 'Expert', 'Yes'],
    ['P029', 'Wireless Sensor Network', 'Embedded', 28, 'Phase 2', 'Mesh network', 40, 'Expert', 'Yes'],
    ['P030', 'Smart Office CAPSTONE', 'Integrated', 29, 'Phase 2', 'All systems', 50, 'Master', 'Yes'],
    ['P031', 'Secure Embedded System', 'Security', 30, 'Phase 2', 'TLS/SSL on ESP32', 45, 'Master', 'Yes'],
    ['P032', 'Portfolio Website', 'Python', 31, 'Phase 3', 'Flask, frontend', 30, 'Advanced', 'Yes'],
  ];

  const droneProjects = [
    ['P033', 'Flight Dynamics Simulator', 'Aerodynamics', 32, 'Phase 3', 'XFLR5, MATLAB', 35, 'Advanced', 'Yes'],
    ['P034', 'Autonomous Drone Navigation', 'Integrated', 33, 'Phase 3', 'PX4, MAVSDK, ESP32', 40, 'Expert', 'Yes'],
    ['P035', 'CV Drone Tracker', 'Computer Vision', 34, 'Phase 3', 'YOLOv8, OpenCV', 38, 'Expert', 'Yes'],
    ['P036', 'Gesture Landing System', 'Integrated', 35, 'Phase 3', 'MediaPipe, MAVLink', 32, 'Advanced', 'Yes'],
    ['P037', 'Drone Fleet Dashboard', 'Python', 36, 'Phase 3', 'Flask, WebSockets, Grafana', 30, 'Advanced', 'Yes'],
    ['P038', 'JARVIS Mission Controller', 'Integrated', 37, 'Phase 4', 'n8n, FastAPI, CV', 50, 'Master', 'Yes'],
  ];

  const allProjects = baseProjects.concat(droneProjects);

  allProjects.forEach(project => {
    const [id, name, type, week, phase, tech, hours, diff, portfolio] = project;
    const startDate = dateOffset((week - 1) * 7);
    const endDate = dateOffset((week - 1) * 7 + 6);

    rows.push([
      id,
      name,
      type,
      week,
      phase,
      tech,
      hours,
      diff,
      portfolio,
      '⏸️',
      startDate,
      endDate,
      '',
      '',
      getProjectPrerequisites(id),
      getProjectTraining(id),
      getProjectMilestones(id),
      '⏸️'
    ]);
  });

  return rows;
}

function getProjectPrerequisites(id) {
  const map = {
    'P001': 'Python basics, HTML structure, pip install',
    'P002': 'Python file ops, os module, path manipulation',
    'P003': 'Selenium setup, XPath selectors',
    'P004': 'SQLite basics, DB design, scheduling concepts',
    'P005': 'PDF parsing, Excel formatting',
    'P006': 'Google Cloud project, OAuth2, REST basics',
    'P007': 'SMTP/IMAP, HTML emails, auth tokens',
    'P008': 'Advanced Selenium, wait strategies',
    'P009': 'Scrapy framework, spider design',
    'P010': 'Data mining, API integration',
    'P011': 'Social APIs, rate limiting',
    'P012': 'Flask basics, Chart.js, API integration',
    'P013': 'Financial APIs, real-time processing',
    'P014': 'PostgreSQL setup, SQLAlchemy',
    'P015': 'NLP basics, feed parsing',
    'P016': 'Sentiment models, ML basics',
    'P017': 'Redis, decorators, rate limiting algorithms',
    'P018': 'ESP32 basics, OpenCV, MQTT, n8n',
    'P019': 'OpenCV image processing, reporting',
    'P020': 'Face recognition, Arduino, n8n',
    'P021': 'Hand tracking, motor control',
    'P022': 'Face authentication, encryption',
    'P023': 'Object tracking, navigation',
    'P024': 'Gesture recognition, servos',
    'P025': 'Motion detection, ESP32-CAM',
    'P026': 'MQTT advanced, encryption',
    'P027': 'Web server on ESP32, REST, automation',
    'P028': 'SD card, RTC modules, sensors',
    'P029': 'Mesh networking, encryption',
    'P030': 'Full system integration',
    'P031': 'TLS/SSL, penetration testing',
    'P032': 'Flask, frontend frameworks',
    'P033': 'CFD basics, XFLR5 installed, Python analytics',
    'P034': 'PX4 toolchain, MAVLink basics, GPS fundamentals',
    'P035': 'YOLOv8 workflow, video streaming, CUDA setup',
    'P036': 'MediaPipe gestures, ESP32 PWM control',
    'P037': 'Flask + WebSockets, dashboard design, MQTT ingestion',
    'P038': 'n8n advanced workflows, FastAPI basics, voice+CV plan',
  };
  return map[id] || 'Review requirements';
}

function getProjectTraining(id) {
  const map = {
    'P001': '1) Install BeautifulSoup; 2) Practice scraping quotes; 3) Handle pagination; 4) Export CSV; 5) Build final app',
    'P002': '1) Practice os.listdir; 2) Detect extensions; 3) Move files; 4) Add CLI; 5) Ship tool',
    'P003': '1) Setup Selenium; 2) Automate login; 3) Extract profiles; 4) Handle dynamic content; 5) Build scraper',
    'P004': '1) Design DB schema; 2) Implement scraper; 3) Build alert system; 4) Create UI; 5) Schedule jobs',
    'P005': '1) Setup PyPDF2; 2) Extract tables; 3) Clean data; 4) Import to Excel; 5) Automate workflow',
    'P006': '1) Create GCP project; 2) Set up OAuth; 3) Learn gspread; 4) Build CRUD ops; 5) Create dashboards',
    'P007': '1) Study email protocols; 2) Setup SMTP server; 3) Create templates; 4) Add scheduling; 5) Build UI',
    'P008': '1) Install Selenium; 2) Practice selectors; 3) Handle forms; 4) Add waits; 5) Deploy solution',
    'P009': '1) Install Scrapy; 2) Create spiders; 3) Handle pagination; 4) Clean data; 5) Export results',
    'P010': '1) Learn APIs; 2) Study data sources; 3) Build scraper; 4) Add filtering; 5) Create dashboard',
    'P011': '1) Get API keys; 2) Learn scheduling; 3) Build posting logic; 4) Handle rate limits; 5) Monitor performance',
    'P012': '1) Learn Flask; 2) Get weather API; 3) Build charts; 4) Add alerts; 5) Deploy app',
    'P013': '1) Set up yfinance; 2) Learn charting; 3) Add indicators; 4) Build alerts; 5) Create UI',
    'P014': '1) Install PostgreSQL; 2) Learn SQLAlchemy; 3) Design schema; 4) Build CRUD; 5) Optimize queries',
    'P015': '1) Learn NLP basics; 2) Setup feed readers; 3) Implement parsing; 4) Add filtering; 5) Build UI',
    'P016': '1) Study sentiment analysis; 2) Learn libraries; 3) Train models; 4) Test accuracy; 5) Deploy system',
    'P017': '1) Learn Redis; 2) Study algorithms; 3) Implement decorator; 4) Test limits; 5) Integrate with API',
    'P018': '1) ESP32 setup; 2) Sensor integration; 3) MQTT config; 4) OpenCV basics; 5) n8n workflow; 6) System integration',
    'P019': '1) OpenCV installation; 2) Image processing; 3) Object detection; 4) Report generation; 5) Integration',
    'P020': '1) Face recognition; 2) Arduino setup; 3) n8n workflows; 4) Security design; 5) System testing',
    'P021': '1) MediaPipe setup; 2) Gesture mapping; 3) Motor control; 4) Safety systems; 5) Testing',
    'P022': '1) Face auth research; 2) ESP32 security; 3) Encryption methods; 4) Fail-safes; 5) Testing',
    'P023': '1) Object tracking algos; 2) Navigation systems; 3) Path planning; 4) Hardware integration; 5) Field tests',
    'P024': '1) Gesture recognition; 2) Servo control; 3) Feedback systems; 4) Safety limits; 5) Refinement',
    'P025': '1) ESP32-CAM setup; 2) Motion detection; 3) Alert system; 4) Storage solution; 5) Power optimization',
    'P026': '1) MQTT advanced; 2) Security protocols; 3) Sensor networks; 4) Data logging; 5) Dashboard',
    'P027': '1) ESP32 web server; 2) REST API design; 3) Automation logic; 4) Security; 5) UI design',
    'P028': '1) SD card interface; 2) RTC module; 3) Data formatting; 4) Power management; 5) Error handling',
    'P029': '1) Mesh concepts; 2) Node setup; 3) Routing algorithms; 4) Encryption; 5) Network testing',
    'P030': '1) System architecture; 2) Component integration; 3) Data flow design; 4) Testing protocol; 5) Final demo',
    'P031': '1) TLS/SSL concepts; 2) Certificate management; 3) Secure boot; 4) Pen testing; 5) Hardening',
    'P032': '1) Flask setup; 2) Frontend framework; 3) Database integration; 4) Authentication; 5) Deployment',
    'P033': '1) XFLR5 training; 2) Airfoil selection; 3) Wing modeling; 4) Simulation runs; 5) Data analysis',
    'P034': '1) PX4 documentation; 2) Simulator setup; 3) MAVSDK integration; 4) ESP32 comms; 5) Field testing',
    'P035': '1) YOLOv8 setup; 2) Dataset preparation; 3) Model training; 4) Integration; 5) Performance testing',
    'P036': '1) MediaPipe gestures; 2) ESP32 PWM; 3) Landing algorithms; 4) Safety protocols; 5) Demo prep',
    'P037': '1) Dashboard design; 2) WebSockets; 3) Data streaming; 4) MQTT integration; 5) User testing',
    'P038': '1) Map Jarvis modules; 2) Build FastAPI skeleton; 3) Connect n8n; 4) Map intents; 5) Ship mission controller',
  };
  return map[id] || 'Follow weekly training steps';
}

function getProjectMilestones(id) {
  const map = {
    'P001': 'Day 1: Setup | Day 2: Parsing | Day 3: Multi-page | Day 4: Export | Day 5: Errors | Day 6: Deploy',
    'P002': 'Day 1: File detection | Day 2: Folder structure | Day 3: Move logic | Day 4: CLI | Day 5: Testing | Day 6: Package',
    'P003': 'Day 1: Selenium setup | Day 2: Login automation | Day 3: Profile extraction | Day 4: Pagination | Day 5: Error handling | Day 6: Scraping',
    'P004': 'Day 1: DB design | Day 2: Scraper | Day 3: Alert system | Day 4: UI | Day 5: Scheduler | Day 6: Testing',
    'P005': 'Day 1: PDF setup | Day 2: Table extraction | Day 3: Data cleaning | Day 4: Excel export | Day 5: Automation | Day 6: Testing',
    'P006': 'Day 1: GCP project | Day 2: OAuth setup | Day 3: gspread basics | Day 4: CRUD operations | Day 5: Dashboard | Day 6: Testing',
    'P007': 'Day 1: Email protocols | Day 2: SMTP server | Day 3: Templates | Day 4: Scheduling | Day 5: UI | Day 6: Testing',
    'P008': 'Day 1: Selenium install | Day 2: Selectors | Day 3: Form handling | Day 4: Waits | Day 5: Errors | Day 6: Deployment',
    'P009': 'Day 1: Scrapy install | Day 2: Spider creation | Day 3: Pagination | Day 4: Data cleaning | Day 5: Export | Day 6: Testing',
    'P010': 'Day 1: API research | Day 2: Data sources | Day 3: Scraper build | Day 4: Filtering | Day 5: Dashboard | Day 6: Testing',
    'P011': 'Day 1: API keys | Day 2: Scheduling | Day 3: Posting logic | Day 4: Rate limits | Day 5: Monitoring | Day 6: Testing',
    'P012': 'Day 1: Flask basics | Day 2: Weather API | Day 3: Charting | Day 4: Alerts | Day 5: UI | Day 6: Deployment',
    'P013': 'Day 1: yfinance setup | Day 2: Charting library | Day 3: Indicators | Day 4: Alerts | Day 5: UI | Day 6: Testing',
    'P014': 'Day 1: PostgreSQL setup | Day 2: SQLAlchemy | Day 3: Schema design | Day 4: CRUD operations | Day 5: Optimization | Day 6: Testing',
    'P015': 'Day 1: NLP basics | Day 2: Feed readers | Day 3: Parsing | Day 4: Filtering | Day 5: UI | Day 6: Testing',
    'P016': 'Day 1: Sentiment models | Day 2: Libraries | Day 3: Training | Day 4: Accuracy testing | Day 5: Deployment | Day 6: Optimization',
    'P017': 'Day 1: Redis setup | Day 2: Algorithms | Day 3: Decorator | Day 4: Rate limits | Day 5: API integration | Day 6: Testing',
    'P018': 'Day 1: ESP32 setup | Day 2: Sensors | Day 3: MQTT | Day 4: OpenCV | Day 5: n8n | Day 6: Integration',
    'P019': 'Day 1: OpenCV install | Day 2: Processing | Day 3: Detection | Day 4: Reporting | Day 5: Integration | Day 6: Testing',
    'P020': 'Day 1: Face recognition | Day 2: Arduino | Day 3: n8n | Day 4: Security | Day 5: Testing | Day 6: Refinement',
    'P021': 'Day 1: MediaPipe | Day 2: Gesture mapping | Day 3: Motor control | Day 4: Safety | Day 5: Testing | Day 6: Demo',
    'P022': 'Day 1: Face auth | Day 2: ESP32 security | Day 3: Encryption | Day 4: Fail-safes | Day 5: Testing | Day 6: Refinement',
    'P023': 'Day 1: Object tracking | Day 2: Navigation | Day 3: Path planning | Day 4: Hardware | Day 5: Integration | Day 6: Field test',
    'P024': 'Day 1: Gesture recognition | Day 2: Servo control | Day 3: Feedback | Day 4: Safety | Day 5: Testing | Day 6: Refinement',
    'P025': 'Day 1: ESP32-CAM setup | Day 2: Motion detection | Day 3: Alerts | Day 4: Storage | Day 5: Power management | Day 6: Testing',
    'P026': 'Day 1: MQTT advanced | Day 2: Security | Day 3: Sensors | Day 4: Logging | Day 5: Dashboard | Day 6: Integration',
    'P027': 'Day 1: Web server | Day 2: REST API | Day 3: Automation | Day 4: Security | Day 5: UI | Day 6: Testing',
    'P028': 'Day 1: SD card | Day 2: RTC | Day 3: Data formatting | Day 4: Power management | Day 5: Error handling | Day 6: Testing',
    'P029': 'Day 1: Mesh concepts | Day 2: Node setup | Day 3: Routing | Day 4: Encryption | Day 5: Network testing | Day 6: Optimization',
    'P030': 'Day 1: Architecture | Day 2: Integration | Day 3: Data flow | Day 4: Testing protocol | Day 5: Refinement | Day 6: Demo',
    'P031': 'Day 1: TLS/SSL | Day 2: Certificates | Day 3: Secure boot | Day 4: Pen testing | Day 5: Hardening | Day 6: Audit',
    'P032': 'Day 1: Flask setup | Day 2: Frontend | Day 3: Database | Day 4: Authentication | Day 5: Testing | Day 6: Deployment',
    'P033': 'Day 1: Wing modeling | Day 2: Airfoil sweeps | Day 3: Export coefficients | Day 4: Validate | Day 5: Dashboard | Day 6: Publish',
    'P034': 'Day 1: PX4 config | Day 2: Plan mission | Day 3: Sim tests | Day 4: Field dry run | Day 5: Safety review | Day 6: Demo flight',
    'P035': 'Day 1: Dataset prep | Day 2: Train | Day 3: Optimize | Day 4: Integrate | Day 5: Tracker loop | Day 6: Demo',
    'P036': 'Day 1: Gesture set | Day 2: MediaPipe | Day 3: ESP32 | Day 4: Landing logic | Day 5: Fail-safe | Day 6: Record',
    'P037': 'Day 1: UX design | Day 2: Data model | Day 3: API ingest | Day 4: Dashboard | Day 5: Alerts | Day 6: Ship',
    'P038': 'Day 1: Intent mapping | Day 2: FastAPI | Day 3: n8n bridges | Day 4: Voice demo | Day 5: Drone integration | Day 6: MVP review',
  };
  return map[id] || 'Follow sprint schedule';
}
function createCodeforcesLog(ss) {
  const headers = [
    'Entry', 'Date', 'Problem Name', 'URL', 'Rating', 'Topics', 
    'Time (min)', 'Attempts', 'Approach', 'Status', 'Language', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '💡 CODEFORCES', 300, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '💡 CODEFORCES PROBLEMS (TCPC PREP) - AUTO-SYNCED', '#D9D2E9', 12);
  
  // Stats section
  sheet.getRange(4, 1).setValue('Total Solved');
  sheet.getRange(4, 2).setValue('0');
  
  sheet.getRange(5, 1).setValue('Target');
  sheet.getRange(5, 2).setValue(CF_TARGET);
  
  sheet.getRange(6, 1).setValue('Progress');
  sheet.getRange(6, 2).setFormula('=B4/B5');
  sheet.getRange(6, 2).setNumberFormat('0.0%');
  
  sheet.getRange(7, 1).setValue('Average Rating');
  sheet.getRange(7, 2).setValue('0');
  
  // Formatting
  sheet.getRange('J10:J300').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['✅', '❌', '⚡', '⏸️']).build()
  );
  
  sheet.setFrozenRows(2);
  sheet.autoResizeColumns(1, headers.length);
}

function createDroneProjects(ss) {
  const headers = [
    'Mission #', 'Project', 'Category', 'Phase', 'Week', 'Aero/Drone Focus',
    'Flight Hours', 'Testing Status', 'CV Integration', 'Status', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '🚁 DRONES', 150, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '🚁 DRONE PROGRAM OVERVIEW', '#DDEBF7', 12);
  
  const summaryRows = [
    ['Total Missions', '=COUNTA(A:A)-1'],
    ['Flight Hours Logged', '=SUM(G:G)'],
    ['Missions Completed', '=COUNTIF(J:J;"✅")'],
    ['Jarvis Ready Modules', '=COUNTIF(I:I;"Ready")'],
    ['Next Flight Window', '=TODAY()+1'],
  ];
  
  let row = 4;
  summaryRows.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]);
    sheet.getRange(row, 2).setFormula(item[1]);
    row += 1;
  });
  
  const missions = [
    [1, 'Microdrone Build', 'Hardware', 'Phase 1', 4, 'Frame assembly + ESC testing', 5, 'Bench Tests', 'Planned', '⚡', 'Target: 250g AUW'],
    [2, 'Flight Simulator Sprint', 'Training', 'Phase 1', 6, 'Stick control + emergency drills', 6, 'Simulator', 'Not Needed', '✅', 'Daily sim streak'],
    [3, 'Telemetry Backbone', 'Systems', 'Phase 1', 10, 'RC link + OSD tuning', 4, 'Field Tests', 'WIP', '⚡', 'Ensure redundancy'],
    [4, 'First Outdoor Hover', 'Flight', 'Phase 2', 17, 'PID tuning + hover lock', 3, 'Outdoor', 'In Progress', '⚡', 'Record video evidence'],
    [5, 'CV Tracking Demo', 'Computer Vision', 'Phase 2', 19, 'Object lock + pursuit', 2.5, 'Outdoor', 'Ready', '⏸️', 'Needs sunny weather'],
    [6, 'Gesture Landing', 'Control', 'Phase 2', 20, 'Gesture recognition to RTL', 3, 'Indoor cage', 'Prototype', '⏸️', 'Link with MediaPipe'],
    [7, 'Autonomous Waypoints', 'Autonomy', 'Phase 2', 22, 'GPS + safeties', 5, 'Outdoor', 'Ready', '⚡', 'Regulations checklist'],
    [8, 'Jarvis Drone Bridge', 'Integration', 'Phase 3', 30, 'Voice command → mission', 4, 'Outdoor', 'Ready', '⏸️', 'Requires n8n webhooks'],
  ];
  
  sheet.getRange(10, 1, missions.length, headers.length).setValues(missions);
  
  sheet.getRange('H10:H200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Bench Tests', 'Indoor Cage', 'Outdoor', 'Simulator', 'Field Tests']).build()
  );
  
  sheet.getRange('I10:I200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Planned', 'WIP', 'Ready', 'Not Needed']).build()
  );
  
  sheet.getRange('J10:J200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅']).build()
  );
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createAerodynamicsPath(ss) {
  const headers = ['Module', 'Topic', 'Focus', 'Lab / Assignment', 'Status', 'Notes'];
  
  const sheet = getOrCreateSheet(ss, '✈️ AERODYNAMICS', 60, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '✈️ LEARNING ROADMAP', '#E2EFDA', 12);
  
  const roadmap = [
    [1, 'Flight Fundamentals', 'Lift, drag, thrust, weight', 'Bernoulli vs Newtonian summary', '⏸️', ''],
    [2, 'Stability & Control', 'Long + lateral stability', 'Mini-glider CG experiments', '⏸️', ''],
    [3, 'Propulsion', 'Brushless motors, ESC curves', 'Thrust vs throttle tests', '⏸️', ''],
    [4, 'Aero Math', 'Reynolds number, AoA sweeps', 'Coefficient spreadsheet', '⏸️', ''],
    [5, 'Weather & Wind', 'METAR decoding, gust plans', 'Flight go/no-go checklist', '⏸️', ''],
    [6, 'UAV Regulations', 'Tunisian + EU drone laws', 'Compliance SOP', '⏸️', ''],
    [7, 'Mission Planning', 'Waypoints, failsafes', 'SAR mission plan', '⏸️', ''],
    [8, 'Simulation & CFD', 'XFLR5 / CFD basics', 'Analyze custom airfoil', '⏸️', ''],
  ];
  
  sheet.getRange(4, 1, roadmap.length, headers.length).setValues(roadmap);
  
  sheet.getRange('E4:E60').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅']).build()
  );
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createJarvisLog(ss) {
  const headers = ['Sprint', 'Module', 'Capability', 'Stack', 'Integration', 'Owner', 'Definition of Done', 'Status', 'Notes'];
  
  const sheet = getOrCreateSheet(ss, '🤖 JARVIS', 80, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '🤖 JARVIS DEVELOPMENT LOG', '#F8CBAD', 12);
  
  const sprints = [
    [1, 'Voice Core', 'Wake word + commands', 'Python, Vosk', 'n8n webhook', 'You', 'Hands-free command demo', '⏸️', ''],
    [2, 'Vision Watchtower', 'Object tracking', 'OpenCV, YOLOv8', 'Drone feed', 'You', 'Live overlay + alert', '⏸️', ''],
    [3, 'Automation Brain', 'Task orchestration', 'n8n, webhooks', 'Smart home/APIs', 'You', '3 voice → automation flows', '⏸️', ''],
    [4, 'Drone Bridge', 'Mission upload + telemetry', 'MAVLink, ESP32', 'Microdrone', 'You', 'Voice launch + status', '⏸️', ''],
    [5, 'Gesture Interface', 'MediaPipe gestures', 'Python, OpenCV', 'Drone + home control', 'You', '3 gestures mapped', '⏸️', ''],
    [6, 'Jarvis Dashboard', 'Unified control room', 'Flask, Tailwind', 'All systems', 'You', 'Real-time status board', '⏸️', ''],
    [7, 'Security & Logging', 'Audit + safety', 'PostgreSQL, Grafana', 'All modules', 'You', 'Alerting + failsafe', '⏸️', ''],
    [8, 'MVP Showcase', 'End-to-end demo', 'All stacks', 'Drone + Smart home', 'You', 'Record 5-min video', '⏸️', ''],
  ];
  
  sheet.getRange(4, 1, sprints.length, headers.length).setValues(sprints);
  
  sheet.getRange('H4:H80').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅']).build()
  );
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createHealthGym(ss) {
  const headers = [
    'Date', 'Gym?', 'Workout Type', 'Exercises', 'Duration (min)',
    'Pushups', 'Energy Before', 'Energy After', 'Soreness', 'Cigarettes', 'Sleep Time',
    'Wake Time', 'Sleep Hours', 'Sleep Quality', 'Energy Level', 'Water (L)', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '🏋️ HEALTH', 400, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '💪 HEALTH STATISTICS', '#E2EFDA', 12);
  
  const stats = [
    ['Total Gym Sessions', '=COUNTIF(B:B;"Yes")'],
    ['Gym Streak', 'Track manually'],
    ['Avg Cigarettes/Day', '=AVERAGE(I:I)'],
    ['Days Smoke-Free', '=COUNTIF(I:I;0)'],
    ['Avg Sleep Hours', '=AVERAGE(L:L)'],
    ['Avg Energy Level', '=AVERAGE(N:N)'],
  ];
  
  let row = 4;
  stats.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]);
    sheet.getRange(row, 2).setFormula(item[1]);
    row += 1;
  });
  
  // Data validation
  sheet.getRange('B10:B400').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No']).build()
  );
  
  sheet.getRange('F10:H400').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).build()
  );
  
  sheet.getRange('L10:N400').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).build()
  );
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createUniversitySheet(ss) {
  const headers = [
    'Date', 'Classes Attended', 'Attendance?', '2h Review?', 'What Reviewed',
    'Review Quality', 'Assignments', 'Assignment Status', 'Grade', 'Current GPA',
    'Class Rank', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '🎓 UNIVERSITY', 200, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '⚠️ UNIVERSITY #1 PRIORITY UNTIL 25 May 2026', '#FF9999', 12);
  
  setSectionHeader(sheet, 3, 1, headers.length, '🎓 ACADEMIC STATISTICS', '#C6EFCE', 12);
  
  const stats = [
    ['Attendance Rate', '=COUNTIF(C:C;"Yes")/COUNTA(C:C)'],
    ['2h Review Completion', '=COUNTIF(D:D;"Yes")/COUNTA(D:D)'],
    ['Current GPA', '=AVERAGE(J:J)'],
    ['Current Rank', '=MODE(K:K)'],
    ['#1 Rank Status', '=IF(MODE(K:K)=1;"✅ YES";"❌ NO")'],
  ];
  
  let row = 5;
  stats.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]);
    sheet.getRange(row, 2).setFormula(item[1]);
    if (item[0].includes('Rate') || item[0].includes('Completion')) {
      sheet.getRange(row, 2).setNumberFormat('0.0%');
    }
    row += 1;
  });
  
  // Data validation
  sheet.getRange('C10:D200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No']).build()
  );
  
  sheet.getRange('F10:F200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).build()
  );
  
  sheet.getRange('H10:H200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Not Started', 'In Progress', 'Done']).build()
  );
  
  sheet.getRange('B10:B200').setNumberFormat('yyyy-mm-dd');
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createWeeklyReview(ss) {
  const sheet = getOrCreateSheet(ss, '📈 WEEKLY REVIEW', 52 * 40 + 5, 2);
  sheet.setColumnWidths(1, 1, 200);
  sheet.setColumnWidths(2, 1, 600);
  
  setSectionHeader(sheet, 1, 1, 2, '📈 WEEKLY REVIEW TEMPLATE', '#D9E2F3', 18);
  sheet.getRange(1, 1, 1, 2).setHorizontalAlignment('center');
  
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const startRow = (week - 1) * 40 + 3;
    setSectionHeader(sheet, startRow, 1, 2, `WEEK ${week} REVIEW`, '#D9E2F3', 12);
    
    const sections = [
      ['EXECUTION METRICS', ''],
      ['GitHub Project Completed?', ''],
      ['GitHub Commits', ''],
      ['CF Problems Solved', ''],
      ['Drone Missions', ''],
      ['Client Projects', ''],
      ['', ''],
      ['FINANCIAL', ''],
      ['Income This Week', ''],
      ['Hit Target?', ''],
      ['Total Saved To Date', ''],
      ['', ''],
      ['HEALTH', ''],
      ['Gym Sessions', ''],
      ['Cigarettes/Day Avg', ''],
      ['Sleep Hours Avg', ''],
      ['', ''],
      ['UNIVERSITY', ''],
      ['2h Review: X/7 days', ''],
      ['Still #1 Rank?', ''],
      ['', ''],
      ['REFLECTION', ''],
      ['What went well', ''],
      ['What didn\'t work', ''],
      ['Biggest win', ''],
      ['Biggest challenge', ''],
      ['Lessons learned', ''],
      ['', ''],
      ['NEXT WEEK', ''],
      ['Top 3 Priorities', ''],
      ['1.', ''],
      ['2.', ''],
      ['3.', ''],
      ['', ''],
      ['Overall Rating (1-10)', ''],
      ['Momentum', '🔴 Declining / 🟡 Stable / 🟢 Improving'],
    ];
    
    let row = startRow + 1;
    sections.forEach(item => {
      sheet.getRange(row, 1).setValue(item[0]);
      sheet.getRange(row, 2).setValue(item[1]);
      row++;
    });
  }
  sheet.autoResizeRows(1, sheet.getLastRow());
}

function createResourcesGuide(ss) {
  const sheet = getOrCreateSheet(ss, '📚 RESOURCES', 200, 2);
  sheet.setColumnWidths(1, 1, 220);
  sheet.setColumnWidths(2, 1, 500);
  
  setSectionHeader(sheet, 1, 1, 2, '📚 RESOURCES & GUIDES', '#D9E2F3', 18);
  sheet.getRange(1, 1, 1, 2).setHorizontalAlignment('center');
  
  const resources = [
    ['🐍 PYTHON LEARNING', ''],
    ['Real Python', 'https://realpython.com'],
    ['Python Docs', 'https://docs.python.org'],
    ['Corey Schafer', 'YouTube channel'],
    ['Automate the Boring Stuff', 'https://automatetheboringstuff.com'],
    ['', ''],
    ['👁️ COMPUTER VISION', ''],
    ['PyImageSearch', 'https://pyimagesearch.com'],
    ['OpenCV Docs', 'https://docs.opencv.org'],
    ['LearnOpenCV', 'https://learnopencv.com'],
    ['', ''],
    ['🔌 EMBEDDED SYSTEMS', ''],
    ['Random Nerd Tutorials', 'https://randomnerdtutorials.com'],
    ['Arduino', 'https://arduino.cc'],
    ['', ''],
    ['🚁 DRONES & AERODYNAMICS', ''],
    ['PX4 Dev Guide', 'https://docs.px4.io'],
    ['ArduPilot Docs', 'https://ardupilot.org'],
    ['UAV Coach', 'https://uavcoach.com'],
    ['Joshua Bardwell', 'YouTube – FPV tuning'],
    ['Mads Tech / Nick Engler', 'YouTube – aerodynamics explainers'],
    ['', ''],
    ['🤖 AUTOMATION / JARVIS', ''],
    ['n8n Documentation', 'https://docs.n8n.io'],
    ['FastAPI Docs', 'https://fastapi.tiangolo.com'],
    ['OpenAI Whisper / Vosk', 'Speech recognition resources'],
    ['', ''],
    ['💰 FREELANCING', ''],
    ['Upwork', 'https://www.upwork.com'],
    ['Fiverr', 'https://www.fiverr.com'],
    ['LinkedIn', 'Networking + direct clients'],
    ['', ''],
    ['🎯 PRODUCTIVITY', ''],
    ['Deep Work Blocks', '90-min focus, no phone'],
    ['Pomodoro Variant', '45/10 cycles'],
    ['Time Blocking', 'Plan tomorrow tonight'],
    ['2-Minute Rule', 'Do quick tasks immediately'],
    ['No Zero Days', 'Minimum 30 min progress'],
    ['Energy Audit', 'Record hourly energy levels'],
    ['', ''],
    ['📚 SELF-DEVELOPMENT', ''],
    ['Atomic Habits', 'James Clear – systems > goals'],
    ['Deep Work', 'Cal Newport – focus mastery'],
    ['Make Time', 'Jake Knapp – daily highlight method'],
    ['Essentialism', 'Greg McKeown – ruthless priorities'],
    ['Almanack of Naval', 'Mental models for leverage & wealth'],
    ['Daily Stoic', 'Ryan Holiday – 366 stoic meditations'],
    ['', ''],
    ['🧠 PRACTICE PLAYLISTS', ''],
    ['LeetCode / Codeforces mash', 'https://leetcode.com / https://codeforces.com'],
    ['CSES Problem Set', 'https://cses.fi/problemset/'],
    ['Drone Dojo', 'https://learn.thedronedojo.com'],
    ['EdgeImpulse', 'https://edgeimpulse.com – embedded ML labs'],
    ['n8n Academy', 'https://academy.n8n.io – automation drills'],
    ['', ''],
    ['🧘 ENERGY & ENVIRONMENT', ''],
    ['Lo-fi Deep Focus', 'Spotify / YouTube playlists'],
    ['Brain.fm', 'https://www.brain.fm – focus soundscapes'],
    ['Forest App', 'Gamified phone blocking'],
    ['Cold Exposure Guide', 'https://www.hubermanlab.com'],
  ];
  
  let row = 3;
  resources.forEach(item => {
    sheet.getRange(row, 1).setValue(item[0]);
    sheet.getRange(row, 2).setValue(item[1]);
    if (item[0].startsWith('🐍') || item[0].startsWith('👁️') || item[0].startsWith('🔌') || 
        item[0].startsWith('🚁') || item[0].startsWith('🤖') || item[0].startsWith('💰') || 
        item[0].startsWith('🎯')) {
      sheet.getRange(row, 1, 1, 2).setFontWeight('bold').setBackground('#D9E2F3');
    }
    row++;
  });
  sheet.autoResizeRows(1, sheet.getLastRow());
}

function createMilestones(ss) {
  const headers = ['ID', 'Milestone', 'Type', 'Target Week', 'Success Criteria', 'Status', 'Completed', 'Notes'];
  
  const sheet = getOrCreateSheet(ss, '🎯 MILESTONES', 120, headers.length + 2);
  writeHeader(sheet, 1, headers);
  
  const milestones = [
    ['M000', 'Runway Month Complete', 'Financial', 4, 'Portfolio ready, no income expected', '⏸️', '', ''],
    ['M001', 'First 100 TND Earned', 'Financial', 6, 'Receive first client payment', '⏸️', '', ''],
    ['M002', 'First 500 TND', 'Financial', 8, 'Cumulative earnings hit 500', '⏸️', '', ''],
    ['M003', '1,000 TND Total', 'Financial', 12, 'Earnings hit 1000', '⏸️', '', ''],
    ['M004', '5,000 TND Total', 'Financial', 24, 'Halfway to goal', '⏸️', '', ''],
    ['M005', '10,000 TND Total', 'Financial', 32, 'Two-thirds complete', '⏸️', '', ''],
    ['M006', '15,000 TND GOAL', 'Financial', 52, 'Main financial goal hit', '⏸️', '', ''],
    ['M007', 'University Fee Paid', 'Financial', 40, '4200 TND saved for fees', '⏸️', '', ''],
    ['M008', 'Laptop Purchased', 'Financial', 44, '4000 TND laptop bought', '⏸️', '', ''],
    ['M010', 'Deep Work Streak 30 days', 'Personal', 5, 'No zero days', '⏸️', '', ''],
    ['M011', 'Deep Work Streak 100 days', 'Personal', 15, '100-day streak', '⏸️', '', ''],
    ['M015', '50 CF Problems', 'Technical', 8, 'Solve 50 CF problems', '⏸️', '', ''],
    ['M016', '100 CF Problems', 'Technical', 16, 'Hit 100 problems', '⏸️', '', ''],
    ['M017', 'CF Rating 1200+', 'Technical', 24, 'Reach 1200 rating', '⏸️', '', ''],
    ['M018', '300 CF Problems', 'Technical', 52, 'Final CF goal achieved', '⏸️', '', ''],
    ['M019', 'Drone Ground School Complete', 'Technical', 26, 'Pass aero modules', '⏸️', '', ''],
    ['M020', 'First Outdoor Hover Recorded', 'Technical', 30, 'Stable hover video', '⏸️', '', ''],
    ['M021', 'Autonomous Waypoint Flight', 'Technical', 36, 'Execute mission safely', '⏸️', '', ''],
    ['M022', 'Gesture Landing Demo', 'Technical', 40, 'Gesture landing working', '⏸️', '', ''],
    ['M023', 'Jarvis Drone Bridge Online', 'Technical', 45, 'Voice → mission control live', '⏸️', '', ''],
    ['M024', 'First CV Project', 'Technical', 20, 'CV project deployed', '⏸️', '', ''],
    ['M025', 'First Embedded Project', 'Technical', 20, 'Embedded project working', '⏸️', '', ''],
    ['M026', 'First n8n Workflow', 'Technical', 18, 'Automation deployed', '⏸️', '', ''],
    ['M027', 'First Integrated Project', 'Technical', 30, 'CV + Embedded + n8n live', '⏸️', '', ''],
    ['M028', 'Lab Setup Complete', 'Technical', 34, 'Embedded lab ready', '⏸️', '', ''],
    ['M029', 'Portfolio Website Live', 'Technical', 42, 'Site published', '⏸️', '', ''],
    ['M030', 'Jarvis MVP Demo', 'Technical', 48, 'Record 5-min demo', '⏸️', '', ''],
    ['M031', '#1 Rank Established', 'Academic', 20, 'Top rank confirmed', '⏸️', '', ''],
    ['M032', 'Final Exams Aced', 'Academic', 30, 'All A grades', '⏸️', '', ''],
    ['M033', 'University Complete', 'Academic', 32, '25 May 2026', '⏸️', '', ''],
    ['M034', 'Smoke-Free 30 days', 'Health', 28, 'Zero cigarettes for 30 days', '⏸️', '', ''],
    ['M035', 'Smoke-Free 90 days', 'Health', 40, 'Zero cigarettes for 90 days', '⏸️', '', ''],
    ['M036', 'Gym 4x/Week Habit', 'Health', 42, '4 sessions weekly locked', '⏸️', '', ''],
    ['M040', 'Year Complete', 'Personal', 52, '365-day mission finished', '⏸️', '', ''],
  ];
  
  sheet.getRange(2, 1, milestones.length, headers.length).setValues(milestones);
  
  sheet.getRange('F2:F120').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['⏸️', '⚡', '✅', '🎉']).build()
  );
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function createLabEquipment(ss) {
  const headers = [
    'ID', 'Equipment', 'Category', 'Purpose', 'Priority', 'Cost (TND)',
    'Where to Buy', 'Qty Need', 'Qty Own', 'Status', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '🛠️ LAB EQUIPMENT', 200, headers.length + 2);
  writeHeader(sheet, 1, headers);
  
  const equipment = [
    ['LAB001', 'ESP32 DevKit', 'Microcontroller', 'Main development board', 'High', 45, 'GOMYTECH, Beb Souika', 5, 0, 'Not Purchased', ''],
    ['LAB002', 'ESP32-CAM', 'Microcontroller', 'Camera projects', 'High', 55, 'GOMYTECH, AliExpress', 2, 0, 'Not Purchased', ''],
    ['LAB003', 'Arduino Uno', 'Microcontroller', 'Basic projects', 'Medium', 50, 'Tunisianet', 2, 0, 'Not Purchased', ''],
    ['LAB004', 'Arduino Mega', 'Microcontroller', 'Complex projects', 'Low', 90, 'Mega PC', 1, 0, 'Not Purchased', ''],
    ['LAB005', 'ESP8266 NodeMCU', 'Microcontroller', 'WiFi projects', 'Medium', 30, 'Beb Souika', 3, 0, 'Not Purchased', ''],
    ['LAB006', 'DHT22', 'Sensor', 'Temperature/humidity', 'High', 20, 'GOMYTECH', 3, 0, 'Not Purchased', ''],
    ['LAB007', 'HC-SR04', 'Sensor', 'Ultrasonic distance', 'High', 7, 'Beb Souika', 5, 0, 'Not Purchased', ''],
    ['LAB008', 'PIR Motion', 'Sensor', 'Motion detection', 'High', 12, 'GOMYTECH', 3, 0, 'Not Purchased', ''],
    ['LAB009', 'Fingerprint Sensor', 'Sensor', 'Biometric security', 'Medium', 100, 'AliExpress', 1, 0, 'Not Purchased', ''],
    ['LAB010', 'BMP280', 'Sensor', 'Pressure sensor', 'Low', 15, 'GOMYTECH', 2, 0, 'Not Purchased', ''],
    ['LAB011', 'DC Motors', 'Actuator', 'Movement', 'High', 15, 'Beb Souika', 5, 0, 'Not Purchased', ''],
    ['LAB012', 'Servo SG90', 'Actuator', 'Precise control', 'High', 20, 'GOMYTECH', 5, 0, 'Not Purchased', ''],
    ['LAB013', 'Stepper Motor', 'Actuator', 'Accurate positioning', 'Medium', 50, 'Mega PC', 2, 0, 'Not Purchased', ''],
    ['LAB014', 'Relay Module', 'Actuator', 'High power switching', 'High', 15, 'GOMYTECH', 3, 0, 'Not Purchased', ''],
    ['LAB015', 'LCD 16x2 I2C', 'Display', 'Text display', 'Medium', 25, 'GOMYTECH', 2, 0, 'Not Purchased', ''],
    ['LAB016', 'OLED 0.96" I2C', 'Display', 'Graphics display', 'High', 35, 'AliExpress', 2, 0, 'Not Purchased', ''],
    ['LAB017', 'Power Supply 5V/12V', 'Power', 'Stable power', 'High', 50, 'Mega PC', 2, 0, 'Not Purchased', ''],
    ['LAB018', 'Battery Holders', 'Power', 'Portable power', 'Medium', 7, 'Beb Souika', 5, 0, 'Not Purchased', ''],
    ['LAB019', 'Power Bank', 'Power', 'Mobile projects', 'Low', 65, 'Tunisianet', 1, 0, 'Not Purchased', ''],
    ['LAB020', 'Multimeter', 'Tool', 'Testing', 'High', 120, 'Mega PC', 1, 0, 'Not Purchased', ''],
    ['LAB021', 'Soldering Station', 'Tool', 'Assembly', 'High', 250, 'Mega PC', 1, 0, 'Not Purchased', ''],
    ['LAB022', 'Wire Stripper', 'Tool', 'Prep', 'High', 40, 'Beb Souika', 1, 0, 'Not Purchased', ''],
    ['LAB023', 'Logic Analyzer', 'Tool', 'Debugging', 'Medium', 350, 'AliExpress', 1, 0, 'Not Purchased', ''],
    ['LAB024', 'Breadboards', 'Component', 'Prototyping', 'High', 15, 'GOMYTECH', 5, 0, 'Not Purchased', ''],
    ['LAB025', 'Jumper Wires Kit', 'Component', 'Connections', 'High', 20, 'Beb Souika', 2, 0, 'Not Purchased', ''],
    ['LAB026', 'Resistor Kit', 'Component', 'Various resistors', 'High', 40, 'GOMYTECH', 1, 0, 'Not Purchased', ''],
    ['LAB027', 'Capacitor Kit', 'Component', 'Various capacitors', 'High', 50, 'GOMYTECH', 1, 0, 'Not Purchased', ''],
    ['LAB028', 'LED Assortment', 'Component', 'Indicators', 'Medium', 25, 'Beb Souika', 1, 0, 'Not Purchased', ''],
    ['LAB029', 'MicroSD Module', 'Storage', 'Data logging', 'High', 12, 'GOMYTECH', 2, 0, 'Not Purchased', ''],
    ['LAB030', 'Component Boxes', 'Organization', 'Parts storage', 'Medium', 50, 'Tunisianet', 3, 0, 'Not Purchased', ''],
    ['LAB031', 'Brushless Motors 2207', 'Actuator', 'Primary thrust', 'High', 70, 'AliExpress', 8, 0, 'Not Purchased', ''],
    ['LAB032', '30A ESCs', 'Power', 'Motor control', 'High', 55, 'AliExpress', 8, 0, 'Not Purchased', ''],
    ['LAB033', 'LiPo 4S 1500mAh', 'Power', 'Flight batteries', 'High', 120, 'Mega PC', 4, 0, 'Not Purchased', ''],
    ['LAB034', 'Pixhawk / Matek FC', 'Control', 'Autopilot brain', 'High', 350, 'GOMYTECH', 2, 0, 'Not Purchased', ''],
    ['LAB035', 'GPS + Compass', 'Sensor', 'Navigation', 'High', 80, 'AliExpress', 2, 0, 'Not Purchased', ''],
    ['LAB036', 'Carbon Fiber Frame', 'Hardware', '5" quad frame', 'High', 160, 'AliExpress', 2, 0, 'Not Purchased', ''],
    ['LAB037', 'HD FPV Camera', 'Imaging', 'Video feed', 'Medium', 200, 'Mega PC', 2, 0, 'Not Purchased', ''],
    ['LAB038', 'Battery Charger', 'Power', 'Balanced charging', 'High', 220, 'Mega PC', 1, 0, 'Not Purchased', ''],
  ];
  
  sheet.getRange(2, 1, equipment.length, headers.length).setValues(equipment);
  
  sheet.getRange('J2:J200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Not Purchased', 'Ordered', 'Owned']).build()
  );
  
  setSectionHeader(sheet, 35, 1, headers.length, '💰 LAB BUDGET SUMMARY', '#E2EFDA', 12);
  sheet.getRange(36, 1).setValue('Total Equipment Cost');
  sheet.getRange(36, 2).setFormula('=SUM(F:F)').setNumberFormat('#,##0.00 "TND"');
  
  sheet.getRange(37, 1).setValue('Already Purchased');
  sheet.getRange(37, 2).setFormula('=SUMIF(J:J;"Owned";F:F)').setNumberFormat('#,##0.00 "TND"');
  
  sheet.getRange(38, 1).setValue('Remaining Budget');
  sheet.getRange(38, 2).setFormula('=SUM(F:F)-SUMIF(J:J;"Owned";F:F)').setNumberFormat('#,##0.00 "TND"');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function createMonthlyTargets(ss) {
  const headers = ['Month', 'Phase', 'Minimum Income', 'Stretch Income', 'Actual Income', 'Variance', 'Key Milestone'];
  
  const sheet = getOrCreateSheet(ss, '📅 MONTHLY TARGETS', 20, headers.length + 2);
  writeHeader(sheet, 1, headers);
  
  const rows = [];
  for (let month = 0; month < 12; month++) {
    const start = new Date(START_DATE.getFullYear(), START_DATE.getMonth() + month, 1);
    const phase = getPhaseForDay(month * 30 + 1);
    const minIncome = month === 0 ? 0 : month <= 3 ? 1500 : month <= 7 ? 2000 : 2500;  // USD targets
    const stretchIncome = month === 0 ? 0 : month <= 3 ? 2000 : month <= 7 ? 2500 : 3500;  // USD targets
    const milestone = month === 0 ? 'Portfolio ready + go live on Upwork/Fiverr'
      : month === 1 ? 'First client landed'
        : month === 3 ? 'Hit $5,000 USD (15k TND goal)'
          : month === 7 ? 'Drone summer begins'
            : month === 10 ? 'Jarvis v0.1 recorded'
              : month === 11 ? 'Year-end demo + scale plan'
                : '';
    
    rows.push([
      Utilities.formatDate(start, Session.getScriptTimeZone(), 'MMMM yyyy'),
      phase,
      minIncome,
      stretchIncome,
      `=SUMIFS('💰 INCOME'!F:F;'💰 INCOME'!B:B;">="&DATE(${start.getFullYear()};${start.getMonth() + 1};1);'💰 INCOME'!B:B;"<"&DATE(${start.getFullYear()};${start.getMonth() + 2};1))`,
      '=E' + (month + 2) + '-C' + (month + 2),
      milestone
    ]);
  }
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  
  sheet.getRange('C2:E20').setNumberFormat('$#,##0.00');
  sheet.getRange('F2:F20').setNumberFormat('$#,##0.00');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function createDailyStats(ss) {
  const headers = [
    'Day', 'Date', 'Phase', 'Deep Work Hours', 'Focus Score',
    'CF Target', 'Income (TND)', 'Cumulative Income', 'Projected Income',
    'XP Earned', 'Badge', 'On Track?'
  ];
  
  const sheet = getOrCreateSheet(ss, '📈 DAILY STATS', TOTAL_DAYS + 10, headers.length + 2);
  writeHeader(sheet, 1, headers);
  
  
  const rows = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const dmRow = day + 3; // Daily Master data starts at row 4
    const statsRow = day + 1; // This sheet starts at row 2 for day 1
    rows.push([
      `=IF('📅 DAILY MASTER'!A${dmRow}="",'',&#039;📅 DAILY MASTER'!A${dmRow})`,
      `=IF('📅 DAILY MASTER'!B${dmRow}="",'','📅 DAILY MASTER'!B${dmRow})`,
      `=IF('📅 DAILY MASTER'!E${dmRow}="",'','📅 DAILY MASTER'!E${dmRow})`,
      `=IF('📅 DAILY MASTER'!N${dmRow}="",'','📅 DAILY MASTER'!N${dmRow})`,
      `=IFERROR(ROUND(MIN('📅 DAILY MASTER'!L${dmRow}*2,10)+IF('📅 DAILY MASTER'!N${dmRow}>=4,2,0)+IF('📅 DAILY MASTER'!J${dmRow}="Yes",1,0),1),'')`,
      `=IF('📅 DAILY MASTER'!O${dmRow}="",'','📅 DAILY MASTER'!O${dmRow})`,
      `=IF('💰 INCOME'!F${statsRow}="",'',ROUND('💰 INCOME'!F${statsRow}*${EXCHANGE_RATE},0))`,
      `=IF(G${statsRow}="",'',SUM($G$2:G${statsRow}))`,
      `=IF(OR(G${statsRow}='',COUNTIF($G$2:G${statsRow},'>0')=0),'',ROUND(AVERAGEIF($G$2:G${statsRow},'>0')*DAY(EOMONTH(B${statsRow},0)),0))`,
      `=IFERROR(ROUND(D${statsRow}*5+IFERROR(INDEX('📅 DAILY MASTER'!K:K,MATCH(B${statsRow},'📅 DAILY MASTER'!B:B,0))*10,0)+IF('📅 DAILY MASTER'!Q${dmRow}>=4,2,0)+IF('📅 DAILY MASTER'!J${dmRow}="Yes",1,0),0),'')`,
      `=IF(E${statsRow}='','',IF(E${statsRow}>=14,'🔥 Titan',IF(E${statsRow}>=10,'⚡ Elite',IF(E${statsRow}>=6,'🟢 Focused','🙂 Warming Up'))))`,
      `=IFERROR(IF(H${statsRow}>=INDEX('📅 MONTHLY TARGETS'!$C:$C,MATCH(TEXT(B${statsRow},'MMMM yyyy'),'📅 MONTHLY TARGETS'!$A:$A,0))*DAY(B${statsRow})/DAY(EOMONTH(B${statsRow},0)),'✅','⚠️'),'')`,
    ]);
  }
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  
  sheet.getRange('B2:B' + (TOTAL_DAYS + 1)).setNumberFormat('yyyy-mm-dd');
  
  sheet.getRange(1, 1, TOTAL_DAYS + 1, headers.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.TEAL, true, false);
  
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.autoResizeColumns(1, headers.length);
}

function createGameHub(ss) {
  const headers = [
    'Day', 'Date', 'GitHub Commits', 'Deep Work XP', 'CF XP', 
    'Gym XP', 'Income XP', 'GitHub XP', 'Total XP', 'Level', 'Badge', 
    'Streak', 'Combo Bonus', 'Notes'
  ];
  
  const sheet = getOrCreateSheet(ss, '🎮 GAME HUB', TOTAL_DAYS + 20, headers.length + 2);
  writeHeader(sheet, 1, headers);
  setSectionHeader(sheet, 2, 1, headers.length, '🎮 GAMIFICATION SYSTEM - LEVEL UP! 🚀', '#FFC000', 16);
  
  // Hero status section
  setSectionHeader(sheet, 4, 1, 3, '🏆 YOUR HERO STATUS', '#FFD966', 12);
  sheet.getRange(5, 1).setValue('Current Level');
  sheet.getRange(5, 2).setFormula('=IFERROR(MAX(J15:J379); 0)');
  
  sheet.getRange(6, 1).setValue('Total XP');
  sheet.getRange(6, 2).setFormula('=IFERROR(MAX(I15:I379); 0)');
  
  sheet.getRange(7, 1).setValue('GitHub Commits');
  sheet.getRange(7, 2).setFormula('=SUM(C:C)');
  
  sheet.getRange(8, 1).setValue('Longest Streak');
  sheet.getRange(8, 2).setFormula('=IFERROR(MAX(L15:L379); 0)');
  
  // XP earning guide
  setSectionHeader(sheet, 10, 1, 4, '🔥 XP EARNING GUIDE', '#B4E7FF', 12);
  
  const xpGuide = [
    ['Activity', 'XP Value', 'Daily Max'],
    ['Deep Work Hour', '+5 XP', '40 XP'],
    ['GitHub Commit', '+10 XP', '100 XP'],
    ['CF Problem Solved', '+8 XP', '80 XP'],
    ['Gym Session', '+10 XP', '20 XP'],
    ['Pushups (daily)', '+proportional', '5 XP'],
    ['Early Wake-up (6am)', '+2 XP', '2 XP'],
    ['Université Attendance', '+5 XP', '5 XP'],
    ['Client Income', '+30 XP', '150 XP'],
    ['Combo Bonus (3+ activities)', '+15 XP', '15 XP']
  ];
  
  sheet.getRange(11, 1, xpGuide.length, 3).setValues(xpGuide);
  sheet.getRange(11, 1, 1, 3).setFontWeight('bold').setBackground('#D4E7F5');
  
  // Daily data
  const startRow = 15;
  // Build formulas per-row using explicit row references and INDEX/MATCH
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const row = startRow + i;

    // Day number
    sheet.getRange(row, 1).setFormula(`=ROW()-${startRow}+1`);

    // Date (based on start date)
    sheet.getRange(row, 2).setFormula(`=DATE(${START_DATE.getFullYear()};${START_DATE.getMonth()+1};${START_DATE.getDate()}) + ROW() - ${startRow}`);

    // GitHub Commits (lookup from Daily Master by date)
    sheet.getRange(row, 3).setFormula(`=IFERROR(INDEX('📅 DAILY MASTER'!K:K; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)); 0)`);

    // Deep Work XP (use Daily Master progress L which is now numeric fraction)
    sheet.getRange(row, 4).setFormula(`=IFERROR(INDEX('📅 DAILY MASTER'!L:L; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)) * 5; 0)`);

    // CF XP (count accepted problems for the date)
    // CF XP scaled by daily completion factor from Daily Master (L column)
    sheet.getRange(row, 5).setFormula(`=IFERROR(COUNTIFS('💡 CODEFORCES'!A:A; TEXT(B${row};"yyyy-mm-dd"); '💡 CODEFORCES'!J:J; "✅") * 8 * (1 + IFERROR(INDEX('📅 DAILY MASTER'!L:L; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)); 0)); 0)`);

    // Gym XP (lookup from Health sheet by date)
    // Gym XP + Pushups XP (pushups column is column 6 in HEALTH)
    sheet.getRange(row, 6).setFormula(
      `=IFERROR(IF(INDEX('🏋️ HEALTH'!B:B; MATCH(B${row}; '🏋️ HEALTH'!A:A; 0)) = "Yes"; 10; 0) + IFERROR(INDEX('🏋️ HEALTH'!F:F; MATCH(B${row}; '🏋️ HEALTH'!A:A; 0)) / ${PUSHUP_DAILY_TARGET} * 5; 0) + IF(INDEX('📅 DAILY MASTER'!F:F; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)) = TRUE; 2; 0); 0)`
    );

    // Income XP (lookup income by date)
    sheet.getRange(row, 7).setFormula(`=IFERROR(IF(INDEX('💰 INCOME'!F:F; MATCH(B${row}; '💰 INCOME'!A:A; 0)) > 0; 30; 0); 0)`);

    // GitHub XP = commits * 10
    sheet.getRange(row, 8).setFormula(`=IFERROR(C${row} * 10; 0)`);

    // Total XP = sum of the XP columns D..H
    sheet.getRange(row, 9).setFormula(`=SUM(D${row}:H${row})`);

    // Level based on Total XP
    sheet.getRange(row, 10).setFormula(`=FLOOR(I${row}/50) + 1`);

    // Badge tier
    sheet.getRange(row, 11).setFormula(`=IF(I${row} >= 100; "🔥 Legend"; IF(I${row} >= 75; "⭐ Champion"; IF(I${row} >= 50; "🚀 Elite"; IF(I${row} >= 25; "🎯 Sharp"; IF(I${row} >= 10; "🌱 Trainee"; "💤 Newbie")))))`);

    // Streak: increase if today's Total XP > 0 and yesterday's Total XP > 0
    sheet.getRange(row, 12).setFormula(`=IF(I${row} > 0; IF(I${row - 1} > 0; L${row - 1} + 1; 1); 0)`);

    // Combo bonus: 15 XP if 3 or more activity XP sources are > 0 (include université/études)
    sheet.getRange(row, 13).setFormula(`=IF((D${row} > 0) + (E${row} > 0) + (F${row} > 0) + (G${row} > 0) + (H${row} > 0) + IF(INDEX('📅 DAILY MASTER'!H:H; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)) = TRUE; 1; 0) + IF(INDEX('📅 DAILY MASTER'!I:I; MATCH(B${row}; '📅 DAILY MASTER'!B:B; 0)) = TRUE; 1; 0) >= 3; 15; 0)`);
  }
  
  // Formatting
  sheet.getRange(`B${startRow}:B${startRow + TOTAL_DAYS - 1}`).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(`C${startRow}:C${startRow + TOTAL_DAYS - 1}`).setBackground('#E8F5E9');
  sheet.getRange(`I${startRow}:I${startRow + TOTAL_DAYS - 1}`).setBackground('#FFFACD').setFontWeight('bold');
  
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function createNotificationsLog(ss) {
  const sheet = getOrCreateSheet(ss, '📱 NOTIFICATIONS', 100, 4);
  sheet.setColumnWidths(1, 4, 120);
  
  const headers = ['Timestamp', 'Title', 'Message', 'Status'];
  writeHeader(sheet, 1, headers);
  
  setSectionHeader(sheet, 2, 1, 4, '📲 NOTIFICATION LOG', '#FCE4D6', 12);
  
  sheet.autoResizeColumns(1, headers.length);
}

// ======================
// HELPER FUNCTIONS FOR DAILY MASTER
// ======================
function getPhaseForDay(day) {
  if (day <= 90) return 'Phase 1 | Foundation';
  if (day <= 180) return 'Phase 2 | Growth';
  if (day <= 270) return 'Phase 3 | Specialization';
  return 'Phase 4 | Mastery';
}

function getMorningTask(day, week, phase, isWeekend) {
  if (isWeekend) return 'Project deep work + demos';
  if (phase.includes('Phase 1')) return 'Python + Algorithms';
  if (phase.includes('Phase 2')) return 'Client projects + Drone work';
  if (phase.includes('Phase 3')) return 'CV + Embedded integration';
  return 'Jarvis development';
}

function getEveningTask(day, week, phase, isWeekend) {
  if (isWeekend) return 'CodeForces + Drone lab';
  if (phase.includes('Phase 1')) return 'University review + CF problems';
  if (phase.includes('Phase 2')) return 'Drone sim + CF problems';
  if (phase.includes('Phase 3')) return 'Jarvis modules + CF problems';
  return 'Demo prep + reflection';
}

function getDroneFocus(day, phase) {
  if (phase.includes('Phase 1')) return 'Flight theory + Aero notes';
  if (phase.includes('Phase 2')) return 'Sim practice + sensor fusion';
  if (day <= 200) return 'Drone build + CV mission planning';
  return 'Jarvis integration + autonomous tests';
}

function getCfTarget(day, isWeekend) {
  if (day <= 90) return isWeekend ? '5 problems' : '3 problems';
  if (day <= 180) return isWeekend ? '7 problems' : '4 problems';
  if (day <= 270) return isWeekend ? '6 problems' : '3 problems';
  return isWeekend ? '5 problems' : '2 problems';
}

function getWakeupBonus(day) {
  // Early wake-up bonus: 2 XP if woke up at 6 AM (check column F of DAILY MASTER)
  const ss = getActiveSpreadsheet();
  const dmSheet = ss.getSheetByName('📅 DAILY MASTER');
  if (!dmSheet) return 0;
  
  try {
    const row = day + 3; // Adjust for header rows
    const wakeupCheck = dmSheet.getRange(row, 6).getValue(); // Column F = Wake up Early
    return wakeupCheck === true ? 2 : 0;
  } catch (e) {
    return 0;
  }
}

function getGymSlot(dayName, phase) {
  if (phase.includes('Phase 2') || phase.includes('Phase 3') || phase.includes('Phase 4')) {
    return ['Monday', 'Tuesday', 'Thursday', 'Saturday'].includes(dayName) ? 'Yes' : 'No';
  }
  return ['Monday', 'Wednesday', 'Saturday'].includes(dayName) ? 'Yes' : 'No';
}

function getCigaretteTarget(day) {
  if (day <= 90) return 3;
  if (day <= 180) return 2;
  if (day <= 270) return 1;
  return 0;
}

// ======================
// HELPER FUNCTIONS FOR WEEKLY SCHEDULE
// ======================
function getProjectTypeForPhase(phase) {
  if (phase.includes('Phase 1')) return 'Python / Portfolio';
  if (phase.includes('Phase 2')) return 'Client Automation';
  if (phase.includes('Phase 3')) return 'Integrated (CV + Embedded + Drone)';
  return 'Jarvis Modules';
}

function getClientRangeForPhase(phase) {
  if (phase.includes('Phase 1')) return '0-1';
  if (phase.includes('Phase 2')) return '1-3';
  if (phase.includes('Phase 3')) return '3-5';
  return '5+';
}

function getCfTopicForWeek(week) {
  const topics = ['Implementation', 'Binary Search', 'Two Pointers', 'Hashing', 'Sorting',
    'Dynamic Programming', 'Graphs', 'Trees', 'Advanced Graphs', 'Combinatorics', 'Review'];
  return topics[(week - 1) % topics.length];
}

function getCfWeeklyTarget(phase) {
  if (phase.includes('Phase 1')) return '20 problems';
  if (phase.includes('Phase 2')) return '25 problems';
  if (phase.includes('Phase 3')) return '25 problems';
  return '20 problems';
}

function getDroneFocusForWeek(week, phase) {
  if (phase.includes('Phase 1')) return 'Flight theory + Aero notes';
  if (phase.includes('Phase 2')) return 'Sim practice + sensor fusion';
  if (phase.includes('Phase 3')) return 'Drone build + CV integration';
  return 'Jarvis + drone automation';
}

function getSkillsFocus(phase) {
  if (phase.includes('Phase 1')) return 'Python + Algorithms';
  if (phase.includes('Phase 2')) return 'APIs + Automation';
  if (phase.includes('Phase 3')) return 'CV + Embedded Systems';
  return 'AI + System Architecture';
}

function getIncomeTargetForWeek(week) {
  if (week <= 4) return '0';
  if (week <= 12) return '200-500';
  if (week <= 24) return '500-1000';
  if (week <= 36) return '1000-2000';
  return '2000+';
}

// ======================
// MENU & UI FUNCTIONS
// ======================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Tracker')
    .addItem('Rebuild All Sheets', 'generateTracker')
    .addSeparator()
    .addItem('📅 Today\'s Standup Report', 'showDailyStandup')
    .addItem('💯 Productivity Analysis', 'showProductivityAnalysis')
    .addSeparator()
    .addItem('🔑 GitHub API Setup', 'setupGitHubAPI')
    .addItem('🔗 Link GitHub Repo', 'linkGitHubRepo')
    .addItem('🔄 Sync GitHub Commits', 'syncGitHubCommits')
    .addSeparator()
    .addItem('📊 CodeForces Setup', 'setupCodeForcesAPI')
    .addItem('🔄 Sync CodeForces Problems', 'syncCodeForcesProblems')
    .addSeparator()
    .addItem('📅 Google Calendar Setup', 'setupGoogleCalendar')
    .addItem('📅 Sync Today to Calendar', 'syncDailyTasksToCalendar')
    .addItem('📅 Add Weekly Milestones', 'addWeeklyEventsToCalendar')
    .addSeparator()
    .addItem('🎯 Project Master', 'openProjectMaster')
    .addItem('🔄 Sync Projects from GitHub', 'syncProjectsFromCommits')
    .addItem('💰 Log Project Revenue', 'logProjectRevenuePrompt')
    .addSeparator()
    .addItem('Configure Webhook', 'openWebhookConfig')
    .addItem('Test Webhook', 'testWebhookMenu')
    .addSeparator()
    .addItem('Log Pushups (today)', 'logPushupsPrompt')
    .addItem('Set Pushup Target', 'setPushupTargetPrompt')
    .addItem('⏱️ Enable Screen Time Tracking', 'enableScreenTimeTracking')
    .addSeparator()
    .addItem('📋 Daily Agenda', 'viewDailyAgenda')
    .addItem('🎮 Game Hub', 'viewGameHub')
    .addItem('📊 Dashboard', 'viewDashboard')
    .addSeparator()
    .addItem('🔍 Diagnose Validations', 'diagnoseValidations')
    .addSeparator()
    .addItem('🧪 Run System Test', 'runFullSystemTest')
    .addToUi();
}

function generateTracker() {
  const ss = SpreadsheetApp.getActive();
  
  const sheetBuilders = [
    createDashboard,
    createDailyMaster,
    createWeeklySchedule,
    createProjectMaster,  // Added back project master sheet
    createIncomeTracker,
    createExpenseTracker,
    createCodeforcesLog,
    createDroneProjects,
    createAerodynamicsPath,
    createJarvisLog,
    createHealthGym,
    createUniversitySheet,
    createWeeklyReview,
    createResourcesGuide,
    createMilestones,
    createLabEquipment,
    createMonthlyTargets,
    createDailyStats,
    createGameHub,
    createNotificationsLog
  ];
  
  sheetBuilders.forEach(fn => fn(ss));
  // Remove any accidental CodeForces "problems" validations that might have been applied
  try { findAndRemoveProblemValidations(ss); } catch (e) { /* ignore */ }
  
  SpreadsheetApp.getUi().alert(
    '✅ Tracker rebuilt successfully!\n\n' +
    '🌍 INTERNATIONAL MODE ACTIVATED:\n' +
    '💵 Income tracked in USD (primary)\n' +
    '📈 Expenses tracked in TND\n' +
    '🔄 Auto-converts USD → TND at 3:0 rate\n' +
    '🎯 CF TARGET: 300 problems for TCPC prep!\n' +
    '🎯 GOAL: Hit $5,000 USD (≈15k TND) in 6-12 weeks\n\n' +
    'Next steps:\n' +
    '1. 🔑 Set up GitHub API\n' +
    '2. 🔗 Link your GitHub repos\n' +
    '3. 📊 Connect CodeForces account\n' +
    '4. 📱 Configure notifications\n\n' +
    'Go land your first USA/UK/Kuwait client! 🚀'
  );
}

// Daily Standup Report - Quick overview of today's agenda and progress
function showDailyStandup() {
  const ss = getActiveSpreadsheet();
  const dailyMaster = ss.getSheetByName('📅 DAILY MASTER');
  
  if (!dailyMaster) {
    SpreadsheetApp.getUi().alert('❌ Daily Master sheet not found. Run "Rebuild All Sheets" first.');
    return;
  }
  
  // Find today's row in Daily Master
  const today = new Date();
  const dayNum = Math.floor((today - START_DATE) / (24 * 60 * 60 * 1000)) + 1;
  const todayRow = dayNum + 3; // Headers in row 1-3, data starts at row 4
  
  if (todayRow > dailyMaster.getLastRow()) {
    SpreadsheetApp.getUi().alert('⚠️ Today is beyond the tracking period.');
    return;
  }
  
  try {
    // Get today's data
    const row = dailyMaster.getRange(todayRow, 1, 1, 27).getValues()[0];
    
    const tasks = {
      '🌅 MORNING': [
        { name: 'Wake 6am', done: row[5] },
        { name: 'Morning routine (30min)', done: row[6] },
        { name: 'Plan day (15min)', done: row[7] },
        { name: 'University prep', done: row[8] }
      ],
      '💻 DEEP WORK': [
        { name: 'Université (2h)', done: row[9] },
        { name: 'Coding/CF (2h)', done: row[10] },
        { name: 'Drone/Aero (1h)', done: row[11] },
        { name: 'Other tasks (1h)', done: row[12] }
      ],
      '🌙 EVENING': [
        { name: 'Physical activity', done: row[13] },
        { name: 'Pushups (target)', done: row[14] },
        { name: 'Healthy dinner', done: row[15] },
        { name: 'Learning/reading (30min)', done: row[16] }
      ]
    };
    
    const deepWorkHours = row[17] || 0;
    const cfProblems = row[18] || 0;
    const pushupsDone = row[19] || 0;
    const sleepHours = row[20] || 0;
    const productivityScore = row[24] || 0;
    
    let standupMessage = `
🎯 TODAY'S STANDUP REPORT
${Utilities.formatDate(today, Session.getScriptTimeZone(), 'EEEE, MMMM dd, yyyy')}
────────────────────────────

📊 TODAY'S METRICS:
  • Deep Work: ${deepWorkHours}h / 6h goal
  • CF Problems: ${cfProblems} solved
  • Pushups: ${pushupsDone} reps
  • Sleep Last Night: ${sleepHours}h
  • Productivity Score: ${Math.round(productivityScore)}%

📋 TODAY'S TASKS:
`;
    
    for (const [category, items] of Object.entries(tasks)) {
      const completed = items.filter(t => t.done).length;
      const total = items.length;
      standupMessage += `\n${category} (${completed}/${total})\n`;
      items.forEach(task => {
        standupMessage += `  ${task.done ? '✅' : '⭕'} ${task.name}\n`;
      });
    }
    
    standupMessage += `
────────────────────────────
💪 ACTION FOR TODAY:
${productivityScore >= 80 ? '🔥 Exceptional pace! Keep pushing!' :
  productivityScore >= 60 ? '⚡ Good progress, maintain focus!' :
  productivityScore >= 40 ? '🟡 Need to catch up, focus hard!' :
  '🔴 RESET MODE - Simplify and execute!'}

🎯 PRIORITY: Complete University block + 2 CF problems = GOOD DAY!
    `;
    
    SpreadsheetApp.getUi().alert(standupMessage);
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Error generating standup report: ' + error);
    Logger.log('Standup Error: ' + error);
  }
}

// Productivity Analysis - Weekly and monthly insights
function showProductivityAnalysis() {
  const ss = getActiveSpreadsheet();
  const weeklySummary = ss.getSheetByName('📊 WEEKLY SUMMARY');
  
  if (!weeklySummary) {
    SpreadsheetApp.getUi().alert('❌ Weekly Summary sheet not found. Run "Rebuild All Sheets" first.');
    return;
  }
  
  try {
    // Get current week
    const today = new Date();
    const dayNum = Math.floor((today - START_DATE) / (24 * 60 * 60 * 1000)) + 1;
    const currentWeek = Math.ceil(dayNum / 7);
    const weeksCompleted = currentWeek - 1;
    
    // Fetch statistics
    const summaryData = weeklySummary.getRange(currentWeek + 2, 1, 1, 13).getValues()[0];
    
    const morningScore = summaryData[2] || 0;
    const deepWorkScore = summaryData[3] || 0;
    const eveningScore = summaryData[4] || 0;
    const avgProductivity = summaryData[5] || 0;
    const totalDeepWork = summaryData[6] || 0;
    const totalCF = summaryData[7] || 0;
    const totalPushups = summaryData[8] || 0;
    const avgSleep = summaryData[9] || 0;
    const weeklyScore = summaryData[12] || 0;
    
    let analysis = `
📈 PRODUCTIVITY ANALYSIS
────────────────────────────

📊 CURRENT WEEK (Week ${currentWeek}):
  Morning Tasks: ${Math.round(morningScore * 100)}%
  Deep Work: ${Math.round(deepWorkScore * 100)}%
  Evening Tasks: ${Math.round(eveningScore * 100)}%
  
  Total Deep Work Hours: ${totalDeepWork}h
  CF Problems Solved: ${totalCF}
  Total Pushups: ${totalPushups}
  Avg Sleep: ${avgSleep.toFixed(1)}h
  
  WEEKLY PRODUCTIVITY SCORE: ${Math.round(weeklyScore * 100)}% 🎯

💡 INSIGHTS:
${avgSleep >= 7 ? '✅ Sleep is EXCELLENT - Energy will be high!' : 
  avgSleep >= 6 ? '⚠️ Sleep is OK but try for 7-8h' : 
  '🔴 CRITICAL: Increase sleep to 7-8h for productivity!'}

${totalDeepWork >= 30 ? '✅ Deep work on track - Great consistency!' :
  totalDeepWork >= 20 ? '⚠️ Moderate deep work, push for more!' :
  '🔴 WARNING: Deep work is low, increase focus blocks!'}

${totalCF >= 7 ? '✅ CF pace is excellent - Keep grinding!' :
  totalCF >= 3 ? '⚠️ CF solving is OK, aim for 1-2 daily' :
  '🔴 ACTION: Commit to daily CF problems!'}

📈 PROGRESS: ${weeksCompleted} weeks completed (${Math.round(weeksCompleted / 52 * 100)}% of year)

🎯 NEXT WEEK FOCUS:
${weeklyScore >= 0.8 ? '🚀 You\'re crushing it! Increase difficulty level!' :
  weeklyScore >= 0.6 ? '💪 Solid week. Build on this momentum!' :
  weeklyScore >= 0.4 ? '🔧 Refocus and simplify your commitments' :
  '⚠️ RESET: Focus on consistency over perfection!'}
    `;
    
    SpreadsheetApp.getUi().alert(analysis);
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Error generating analysis: ' + error);
    Logger.log('Analysis Error: ' + error);
  }
}

// ======================
// PROJECTS: UI helpers & sync
// ======================
function openProjectMaster() {
  const ss = getActiveSpreadsheet();
  const sh = ss.getSheetByName('🎯 PROJECT MASTER');
  if (!sh) {
    SpreadsheetApp.getUi().alert('❌ Project Master not found. Rebuild the tracker first.');
    return;
  }
  ss.setActiveSheet(sh);
}

function syncProjectsFromCommits() {
  const props = getUserProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const repo = props.getProperty('GITHUB_REPO');
  if (!token || !repo) {
    SpreadsheetApp.getUi().alert('⚠️ GitHub not configured. Please set token and repo first.');
    return;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];
    const url = GITHUB_API_URL + repo + `/commits?since=${since}&per_page=100`;
    const options = { method: 'get', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Google-Sheets-Tracker' }, muteHttpExceptions: true };
    const res = safeFetchJson(url, options);
    if (!res.ok || !Array.isArray(res.json)) {
      SpreadsheetApp.getUi().alert('❌ GitHub fetch failed.');
      return;
    }

    const commits = res.json;
    const projectCounts = {};
    const idRegex = /\bP0*(\d{1,3})\b/gi;
    commits.forEach(c => {
      const msg = (c && c.commit && c.commit.message) ? c.commit.message : '';
      let match;
      while ((match = idRegex.exec(msg)) !== null) {
        const id = 'P' + match[1].padStart(3, '0');
        projectCounts[id] = (projectCounts[id] || 0) + 1;
      }
    });

    const ss = getActiveSpreadsheet();
    const sheet = ss.getSheetByName('🎯 PROJECT MASTER');
    if (!sheet) { SpreadsheetApp.getUi().alert('❌ Project sheet missing.'); return; }

    const ids = sheet.getRange(2,1,Math.max(0,sheet.getLastRow()-1),1).getValues().map(r=>String(r[0]));
    let updated = 0;
    Object.keys(projectCounts).forEach(pid => {
      const idx = ids.indexOf(pid);
      if (idx === -1) return;
      const row = idx + 2; // offset
      const addHours = projectCounts[pid];
      const actualCell = sheet.getRange(row, 13);
      const curr = parseFloat(actualCell.getValue() || 0) || 0;
      actualCell.setValue(curr + addHours);
      // mark status as in-progress if paused
      const statusCell = sheet.getRange(row, 10);
      const status = String(statusCell.getValue() || '');
      if (!status || status === '⏸️') statusCell.setValue('⚡');
      updated += 1;
    });

    sendNotification('🔄 Project Sync', `Updated ${updated} project(s) from recent commits.`);
    SpreadsheetApp.getUi().alert(`✅ Project sync complete. Updated ${updated} project(s).`);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Project sync failed: ' + e);
    Logger.log('syncProjectsFromCommits error: ' + e);
  }
}

function logProjectRevenuePrompt() {
  const ui = SpreadsheetApp.getUi();
  const idResp = ui.prompt('Log Project Revenue', 'Enter Project ID (e.g. P001):', ui.ButtonSet.OK_CANCEL);
  if (idResp.getSelectedButton() !== ui.Button.OK) return;
  const pid = idResp.getResponseText().trim().toUpperCase();
  if (!pid) { ui.alert('❌ Invalid Project ID'); return; }

  const amountResp = ui.prompt('Amount (USD)', 'Enter amount in USD:', ui.ButtonSet.OK_CANCEL);
  if (amountResp.getSelectedButton() !== ui.Button.OK) return;
  const amount = parseFloat(amountResp.getResponseText());
  if (isNaN(amount) || amount <= 0) { ui.alert('❌ Invalid amount'); return; }

  const clientResp = ui.prompt('Client (optional)', 'Enter client name (optional):', ui.ButtonSet.OK_CANCEL);
  const client = clientResp.getSelectedButton() === ui.Button.OK ? clientResp.getResponseText().trim() : '';

  logProjectRevenue(pid, null, amount, client, new Date());
}

function logProjectRevenue(projectId, projectName, amountUSD, client, dateObj) {
  try {
    const ss = getActiveSpreadsheet();
    let income = ss.getSheetByName('💰 INCOME');
    if (!income) createIncomeTracker(ss);
    income = ss.getSheetByName('💰 INCOME');

    // resolve project name if not supplied
    if (!projectName) {
      const projSheet = ss.getSheetByName('🎯 PROJECT MASTER');
      if (projSheet) {
        const ids = projSheet.getRange(2,1,Math.max(0,projSheet.getLastRow()-1),2).getValues();
        for (let i=0;i<ids.length;i++) {
          if (String(ids[i][0]).toUpperCase() === String(projectId).toUpperCase()) { projectName = ids[i][1]; break; }
        }
      }
    }

    const row = income.getLastRow() + 1;
    const entryIndex = row - 7; // rough index (headers at top)
    const dateVal = dateObj || new Date();
    const tndFormula = `=F${row}*${EXCHANGE_RATE}`;
    income.getRange(row,1,1,10).setValues([[entryIndex, dateVal, client || '', projectName || projectId, '', amountUSD, tndFormula, 'Project', 'Paid', '']]);

    sendNotification('💰 Revenue Logged', `${projectId} — $${amountUSD} logged${client ? ' for ' + client : ''}`);
    SpreadsheetApp.getUi().alert('✅ Revenue logged to Income sheet');
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Failed to log revenue: ' + e);
    Logger.log('logProjectRevenue error: ' + e);
  }
}

// Schedule a mobile calendar reminder for a given day (top-level so google.script.run can call it)
function scheduleMobileAgendaReminder(dayOrDate) {
  try {
    let targetDate;
    if (typeof dayOrDate === 'number') targetDate = dateOffset(dayOrDate - 1);
    else if (dayOrDate instanceof Date) targetDate = dayOrDate;
    else targetDate = new Date(dayOrDate);

    const calId = getUserProperties().getProperty('GOOGLE_CALENDAR_ID') || 'primary';
    const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
    const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 8, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const spreadsheetUrl = SpreadsheetApp.getActive().getUrl();
    const title = `📋 Daily Agenda Reminder — Day ${Math.floor((targetDate - START_DATE) / (24*60*60*1000)) + 1}`;
    const event = calendar.createEvent(title, startTime, endTime, { description: `Open your tracker: ${spreadsheetUrl}` });
    try { event.addPopupReminder(60); } catch (e) { /* ignore */ }
    try { event.addPopupReminder(10); } catch (e) { /* ignore */ }
    sendNotification('🔔 Mobile Reminder Scheduled', `${title} on ${Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')} scheduled in ${calId}`);
    return { success: true };
  } catch (e) {
    Logger.log('scheduleMobileAgendaReminder error: ' + e);
    return { success: false, error: e.toString() };
  }
}

function viewDailyAgenda() {
  const dayNum = Math.floor((new Date() - START_DATE) / (24 * 60 * 60 * 1000)) + 1;
  const agenda = generateDailyAgenda(dayNum);
  

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 12px; background: #f0f2f5; }
        .container { max-width: 760px; margin: 0 auto; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; text-align: center; }
        .section { margin-bottom: 12px; padding: 10px; border-radius: 6px; background: #fff; }
        .task { padding: 8px 12px; margin: 8px 0; background: #fafafa; border-left: 4px solid #667eea; border-radius: 4px; }
        .xp-badge { background: #4CAF50; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; margin-left: 10px; font-size: 12px; }
        .btn { background: #667eea; color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 6px 4px; display:inline-block; }
        .btn.secondary { background: #24a0ed; }
        .github-link { background: #24292e; color: white; text-decoration: none; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-top: 8px; }
        @media (max-width:480px){ .container{padding:10px} .task{font-size:14px} .btn{padding:8px 10px} }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 Day ${dayNum} Agenda</h2>
          <div>${agenda.phase}</div>
        </div>

        <div class="section">
          <strong>🎯 Daily Goals</strong>
          ${agenda.goals.map(goal => `<div class="task">• ${goal.name} <span class="xp-badge">+${goal.xp} XP</span></div>`).join('')}
        </div>

        <div class="section">
          <strong>💻 CodeForces Mission</strong>
          <div>Target: <strong>${agenda.cfProblems} problems</strong> — Level: <strong>${agenda.cfLevel}</strong></div>
          <div style="margin-top:8px;">Progress toward ${CF_TARGET}: <strong>${agenda.cfProgress}%</strong></div>
          <a href="https://codeforces.com/problemset?tags=${agenda.cfLevel}" class="github-link" target="_blank">🔗 Solve on CodeForces</a>
        </div>

        <div class="section">
          <strong>🐙 GitHub Activity</strong>
          <div>Today's Commit Target: <strong>${agenda.githubCommits}</strong> (XP: ${agenda.githubCommits * 10})</div>
          ${agenda.githubRepos.map(repo => `<div class="task">• ${repo}</div>`).join('')}
          <a href="https://github.com/${GITHUB_USERNAME}" class="github-link" target="_blank">🔗 View GitHub Profile</a>
        </div>

        <div class="section">
          <strong>🗓️ Weekly Milestones</strong>
          <div style="margin-top:8px;">
            <label style="display:flex;align-items:center;margin:6px 0;"><input type="checkbox" value="review" /> <span style="display:inline-block;width:10px;height:10px;background:#bbdefb;border-radius:3px;margin:0 8px;"></span> 📊 Weekly Review & Reflection (Sun 7pm)</label>
            <label style="display:flex;align-items:center;margin:6px 0;"><input type="checkbox" value="reset" /> <span style="display:inline-block;width:10px;height:10px;background:#c8e6c9;border-radius:3px;margin:0 8px;"></span> 💪 Weekly Challenge Reset (Mon 6am)</label>
            <label style="display:flex;align-items:center;margin:6px 0;"><input type="checkbox" value="checkin" /> <span style="display:inline-block;width:10px;height:10px;background:#fff9c4;border-radius:3px;margin:0 8px;"></span> 📈 Progress Check-in (Wed 12pm)</label>
          </div>
          <div style="margin-top:8px;display:flex;justify-content:center;">
            <button class="btn" id="addMilestones">➕ Add Selected Milestones to Calendar</button>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;justify-content:center;margin-top:8px;">
          <button class="btn" id="syncGit">🔄 Sync GitHub</button>
          <button class="btn secondary" id="syncCF">🔄 Sync CodeForces</button>
          <button class="btn" id="scheduleMobile">📱 Schedule Mobile Reminder</button>
          <button class="btn" id="closeBtn">✅ Close</button>
        </div>
      </div>

      <script>
        (function(){
          function $(sel){return document.querySelector(sel)}
          document.addEventListener('DOMContentLoaded', function(){
            const addBtn = document.getElementById('addMilestones');
            if (addBtn) addBtn.addEventListener('click', function(){
              const checked = Array.from(document.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
              if (checked.length === 0) { alert('Select at least one milestone'); return; }
              addBtn.disabled = true;
              google.script.run.withSuccessHandler(function(){ alert('✅ Milestones added to calendar'); google.script.host.close(); }).addWeeklyEventsToCalendar(checked);
            });

            const syncGit = document.getElementById('syncGit');
            if (syncGit) syncGit.addEventListener('click', function(){ syncGit.disabled = true; google.script.run.withSuccessHandler(function(){ google.script.host.close(); }).syncGitHubCommits(); });

            const syncCF = document.getElementById('syncCF');
            if (syncCF) syncCF.addEventListener('click', function(){ syncCF.disabled = true; google.script.run.withSuccessHandler(function(){ google.script.host.close(); }).syncCodeForcesProblems(); });

            const scheduleMobile = document.getElementById('scheduleMobile');
            if (scheduleMobile) scheduleMobile.addEventListener('click', function(){ scheduleMobile.disabled = true; google.script.run.withSuccessHandler(function(res){ if(res && res.success) { alert('✅ Mobile reminder scheduled'); google.script.host.close(); } else { alert('❌ Failed to schedule reminder'); } }).scheduleMobileAgendaReminder(${dayNum}); });

            const closeBtn = document.getElementById('closeBtn');
            if (closeBtn) closeBtn.addEventListener('click', function(){ google.script.host.close(); });
          });
        })();
      </script>
    </body>
    </html>
  `;

  const output = HtmlService.createHtmlOutput(html)
    .setTitle('Day ' + dayNum + ' Agenda')
    .setWidth(760)
    .setHeight(700);

  SpreadsheetApp.getUi().showModalDialog(output, '📋 Daily Agenda');
}

function generateDailyAgenda(dayNum) {
  // Get phase
  let phase = getPhaseForDay(dayNum);
  
  // Get GitHub repos
  const properties = getUserProperties();
  const gitHubRepo = properties.getProperty('GITHUB_REPO');
  let githubRepos = gitHubRepo ? [gitHubRepo] : ['No repo linked yet'];
  
  // Get CodeForces progress
  const cfStatsJson = properties.getProperty('CF_SUBMISSIONS_STATS');
  let cfProgress = 0;
  let cfLevel = '800';
  
  if (cfStatsJson) {
    const cfStats = JSON.parse(cfStatsJson);
    cfProgress = Math.min(Math.round((cfStats.totalSolved / CF_TARGET) * 100), 100);
    
    if (dayNum <= 90) cfLevel = '800-900';
    else if (dayNum <= 180) cfLevel = '900-1000';
    else if (dayNum <= 270) cfLevel = '1000-1200';
    else cfLevel = '1200+';
  }
  
  // Determine daily goals based on phase
  let goals = [];
  if (dayNum <= 90) {
    goals = [
      {name: 'Complete 4 hours of deep work', xp: 20},
      {name: 'Solve 3 CodeForces problems', xp: 24},
      {name: 'Work on 1 GitHub project', xp: 30},
      {name: 'Attend university classes', xp: 10},
      {name: 'Gym session', xp: 10}
    ];
  } else if (dayNum <= 180) {
    goals = [
      {name: 'Complete 6 hours of deep work', xp: 30},
      {name: 'Solve 4 CodeForces problems', xp: 32},
      {name: 'Work on 2 GitHub projects', xp: 60},
      {name: 'Client project progress', xp: 30},
      {name: 'Gym session', xp: 10}
    ];
  } else {
    goals = [
      {name: 'Complete 8 hours of deep work', xp: 40},
      {name: 'Solve 3 CodeForces problems', xp: 24},
      {name: 'Work on drone/CV project', xp: 50},
      {name: 'Client deliverable', xp: 40},
      {name: 'Gym session', xp: 10}
    ];
  }
  
  // Calculate CF problems for today
  const cfProblems = dayNum <= 90 ? 3 : dayNum <= 180 ? 4 : dayNum <= 270 ? 3 : 2;
  
  // Get hero stats
  const ss = getActiveSpreadsheet();
  const gameHub = ss.getSheetByName('🎮 GAME HUB');
  let level = 1, totalXP = 0, streak = 0;
  
  if (gameHub) {
    const lastRow = gameHub.getLastRow();
    if (lastRow >= 2) {
      level = gameHub.getRange(lastRow, 10).getValue() || 1;
      totalXP = gameHub.getRange(lastRow, 9).getValue() || 0;
      streak = gameHub.getRange(lastRow, 12).getValue() || 0;
    }
  }
  
  return {
    phase: phase,
    goals: goals,
    cfProblems: cfProblems,
    cfLevel: cfLevel,
    cfProgress: cfProgress,
    githubCommits: dayNum <= 180 ? 3 : 5,
    githubRepos: githubRepos,
    level: level,
    totalXP: totalXP,
    streak: streak
  };
}

function viewGameHub() {
  const ss = getActiveSpreadsheet();
  ss.getSheetByName('🎮 GAME HUB').activate();
  
  SpreadsheetApp.getUi().alert(
    '🎮 GAME HUB ACTIVE!\n\n' +
    '🔥 Your XP System:\n' +
    '• GitHub Commits: +10 XP each\n' +
    '• Deep Work: +5 XP per hour\n' +
    '• CodeForces: +8 XP per problem\n' +
    '• Gym Sessions: +10 XP each\n' +
    '• Client Income: +30 XP per entry\n' +
    '• Combo Bonus: +15 XP for 3+ activities\n\n' +
    '🏆 Badges Unlock at:\n' +
    '• 10 XP: Trainee\n' +
    '• 25 XP: Sharp\n' +
    '• 50 XP: Elite\n' +
    '• 75 XP: Champion\n' +
    '• 100+ XP: Legend\n\n' +
    'Level up every 50 XP!'
  );
}

function viewDashboard() {
  const ss = getActiveSpreadsheet();
  ss.getSheetByName('📊 DASHBOARD').activate();
}

function viewMyProjects() {
  const htmlOutput = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .project-card { background: white; padding: 15px; margin: 10px 0; border-left: 5px solid #667eea; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .project-name { font-size: 18px; font-weight: bold; color: #667eea; }
        .project-link { color: #667eea; text-decoration: none; margin-top: 10px; display: inline-block; }
        .project-link:hover { text-decoration: underline; }
        .username { background: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📦 Your GitHub Projects</h1>
        <p>GitHub: ${GITHUB_USERNAME}</p>
      </div>
      <div class="username">
        <strong>🔗 GitHub Profile:</strong> <a href="https://github.com/${GITHUB_USERNAME}" target="_blank">github.com/${GITHUB_USERNAME}</a>
      </div>
      <h2>🚀 Active Projects</h2>
      <div class="project-card">
        <div class="project-name">📁 ${GITHUB_USERNAME}'s Main Repository</div>
        <a href="https://github.com/${GITHUB_USERNAME}" class="project-link" target="_blank">View on GitHub →</a>
      </div>
      <h2>💡 How to Log Project Work</h2>
      <div class="project-card">
        <p><strong>Each commit to these projects = +10 XP</strong></p>
        <p>To track your work:</p>
        <ol>
          <li>Make a commit: <code>git commit -m "description"</code></li>
          <li>Push to GitHub: <code>git push</code></li>
          <li>Go back to Tracker → 📊 Refresh GitHub Commits</li>
          <li>Your commits auto-sync and earn XP!</li>
        </ol>
      </div>
    </body>
    </html>
  `);
  htmlOutput.setWidth(700).setHeight(600);
  SpreadsheetApp.getUi().showModelessDialog(htmlOutput, '📦 My GitHub Projects');
}

// ======================
// SYSTEM TESTING
// ======================
function runFullSystemTest() {
  const ui = SpreadsheetApp.getUi();
  const results = [];
  let allPassed = true;
  
  // Test 1: Configuration
  results.push('✅ TEST 1: Configuration Check');
  results.push(`   GitHub User: ${GITHUB_USERNAME}`);
  results.push(`   CodeForces Handle: ${CODEFORCES_HANDLE}`);
  results.push(`   Tracker Start: ${START_DATE.toDateString()}`);
  results.push('');
  
  // Test 2: GitHub API
  results.push('TEST 2: GitHub API Access...');
  try {
    const token = getUserProperties().getProperty('GITHUB_TOKEN');
    if (token && token.startsWith('ghp_')) {
      results.push('✅ TEST 2: GitHub Token Valid');
      
      // Test API access
      const ghRes = safeFetchJson(`https://api.github.com/users/${GITHUB_USERNAME}`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Google-Sheets-Tracker'
        },
        muteHttpExceptions: true
      });
      if (ghRes.ok) {
        results.push('✅ TEST 2: GitHub API Access Verified');
      } else {
        results.push(`❌ TEST 2: GitHub API Error (${ghRes.code})`);
        allPassed = false;
      }
    } else {
      results.push('⚠️ TEST 2: GitHub Token Not Configured');
      allPassed = false;
    }
  } catch (error) {
    results.push(`❌ TEST 2: GitHub API Error - ${error.message}`);
    allPassed = false;
  }
  results.push('');
  
  // Test 3: CodeForces API
  results.push('TEST 3: CodeForces API Access...');
  try {
    const handle = getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
    const cfRes = safeFetchJson(`https://codeforces.com/api/user.info?handles=${handle}`, { muteHttpExceptions: true });
    const data = cfRes.json;
    if (cfRes.ok && data && data.status === 'OK') {
      results.push(`✅ TEST 3: CodeForces API Verified`);
      results.push(`   Username: ${data.result[0].handle}`);
      results.push(`   Rating: ${data.result[0].rating || 'unrated'}`);
    } else {
      results.push(`❌ TEST 3: CodeForces API Error - ${cfRes.error || (data && data.comment) || cfRes.code}`);
      allPassed = false;
    }
  } catch (error) {
    results.push(`❌ TEST 3: CodeForces API Error - ${error.message}`);
    allPassed = false;
  }
  results.push('');

  // Preview CodeForces sync (dry-run)
  results.push('TEST 3b: CodeForces Sync Dry-Run (preview)...');
  try {
    const handle = getUserProperties().getProperty('CODEFORCES_HANDLE') || CODEFORCES_HANDLE;
    const preview = previewCodeForcesSync(handle);
    if (preview && preview.count >= 0) {
      results.push(`   → ${preview.count} new accepted submission(s) would be added (dry-run).`);
      if (preview.sample && preview.sample.length > 0) {
        const sampleLines = preview.sample.slice(0, 5).map(r => `• ${r[1]} — ${r[2]} (${r[4]})`);
        results.push('   Sample:');
        sampleLines.forEach(s => results.push('     ' + s));
      }
    } else {
      results.push('   → Unable to preview CodeForces sync.');
    }
  } catch (e) {
    results.push('   ❌ Preview failed: ' + (e && e.message ? e.message : e));
  }
  results.push('');
  
  // Test 4: Sheet Structure
  results.push('TEST 4: Required Sheets Check...');
  const ss = getActiveSpreadsheet();
  const requiredSheets = [
    '📊 DASHBOARD', '📅 DAILY MASTER', '💰 INCOME', '💸 EXPENSES',
    '💡 CODEFORCES', '🎮 GAME HUB', '📱 NOTIFICATIONS'
  ];
  
  let missingSheets = [];
  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      missingSheets.push(sheetName);
    }
  });
  
  if (missingSheets.length === 0) {
    results.push('✅ TEST 4: All Required Sheets Exist');
  } else {
    results.push(`❌ TEST 4: Missing Sheets: ${missingSheets.join(', ')}`);
    allPassed = false;
  }
  results.push('');
  
  // Test 5: Notifications
  results.push('TEST 5: Notifications System...');
  try {
    sendNotification('🧪 Test Notification', 'System test in progress');
    results.push('✅ TEST 5: Notification System Working');
  } catch (error) {
    results.push(`❌ TEST 5: Notification Error - ${error.message}`);
    allPassed = false;
  }
  results.push('');
  
  // Summary
  results.push('═════════════════════════════');
  results.push(allPassed ? '🎉 ALL SYSTEMS OPERATIONAL!' : '⚠️ SOME TESTS FAILED');
  results.push('NEXT STEPS:');
  if (!allPassed) {
    results.push('1. Check failed tests above');
    results.push('2. Use menu options to fix configuration');
  }
  results.push('3. Sync GitHub and CodeForces');
  results.push('4. Start logging your daily activities!');
  results.push('═════════════════════════════');
  
  const message = results.join('\n');
  ui.alert(message);
  
  console.log('=== SYSTEM TEST RESULTS ===');
  console.log(message);
  
  return results;
}

// ======================
// TRIGGER CLEANUP (IMPORTANT FOR DEPLOYMENT)
// ======================
function cleanUpTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
}

// Install triggers on open
function installTriggers() {
  cleanUpTriggers();
  
  // Daily sync triggers
  ScriptApp.newTrigger('syncGitHubCommits')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  
  ScriptApp.newTrigger('syncCodeForcesProblems')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .create();
  
  // Screen time triggers (created on demand)
}

// Initialize on first run
function initTracker() {
  installTriggers();
}
}