# 📅 Google Calendar Integration Guide

## Overview

Your Daily Planner now integrates with **Google Calendar**, automatically syncing your daily task blocks and weekly milestones to your calendar.

---

## Setup Steps

### Step 1: Enable Google Calendar API (One-time)
1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. The script already includes Calendar permissions. Just ensure you authorize when prompted.

### Step 2: Connect Your Calendar
1. In the Sheet, go to **🚀 Tracker menu → 📅 Google Calendar Setup**
2. Enter your Calendar ID (or leave blank for default calendar)
   - To find your Calendar ID:
     - Go to Google Calendar Settings → Integrate calendar section
     - Copy the "Calendar ID" (looks like: `something@gmail.com`)
3. Click OK to confirm

✅ Your calendar is now connected!

---

## Features

### 📅 Sync Today's Tasks to Calendar
**Menu:** 🚀 Tracker → 📅 Sync Today to Calendar

This creates **3 time-blocked events** in your calendar for today:
- **🌅 MORNING ROUTINE** (6 AM - 10 AM)
  - Wake 6am, Morning routine, Plan day, University prep
- **💻 DEEP WORK BLOCK** (10 AM - 6 PM)
  - University (2h), Coding/CF (2h), Drone/Aero (1h), Other tasks (1h)
- **🌙 EVENING ROUTINE** (6 PM - 10 PM)
  - Physical activity, Pushups, Healthy dinner, Learning/reading

**Benefits:**
- ✅ Blocks time on your calendar
- ✅ Shows task descriptions in calendar event
- ✅ Prevents double-booking
- ✅ Sends calendar notifications at event times

### 📅 Add Weekly Milestones
**Menu:** 🚀 Tracker → 📅 Add Weekly Milestones

Adds 3 recurring weekly check-in events:
- **💪 Weekly Challenge Reset** (Monday, 6 AM)
- **📈 Progress Check-in** (Wednesday, 12 PM)
- **📊 Weekly Review & Reflection** (Sunday, 7 PM)

---

## Workflow Examples

### Example 1: Monday Morning

1. Open your Tracker sheet
2. Go to **🚀 Tracker → 📅 Sync Today to Calendar**
3. Your calendar now shows:
   - 6 AM: 🌅 MORNING ROUTINE
   - 10 AM: 💻 DEEP WORK BLOCK
   - 6 PM: 🌙 EVENING ROUTINE
4. Your phone gets calendar notifications at each time
5. Click on the calendar event to see the task list

### Example 2: Weekly Planning

1. Start of the week: Run **📅 Add Weekly Milestones**
2. Your calendar now shows:
   - **Monday 6 AM**: Start-of-week reset reminder
   - **Wednesday 12 PM**: Mid-week progress check
   - **Sunday 7 PM**: Weekly review time
3. These events remind you to:
   - Refocus on your goals
   - Track what worked/what didn't
   - Plan adjustments for next week

---

## Tips for Maximum Effectiveness

### 💡 Tip 1: Daily Sync Habit
- Sync your tasks to calendar **first thing in the morning**
- This gives you visual commitment to your schedule

### 💡 Tip 2: Calendar Notifications
- In Google Calendar, enable notifications for:
  - 15 minutes before each event
  - This gives you time to prepare for the next block

### 💡 Tip 3: Color Coding
Events are automatically color-coded:
- 🔵 MORNING ROUTINE (Blue)
- 🟢 DEEP WORK BLOCK (Green/Sage)
- 🔷 EVENING ROUTINE (Blueberry)

### 💡 Tip 4: Check-in During the Day
- When you complete a task in your Daily Master, open the calendar event
- Note your progress in the event comments
- This creates a live record of your day

---

## Troubleshooting

### ❌ "Calendar not found"
- Make sure you entered the correct Calendar ID
- Try leaving it blank to use your primary calendar
- Check: Google Calendar → Settings → Calendar ID

### ❌ "Permission denied"
- Go to **Extensions → Apps Script**
- Authorize the script to access your calendar
- Try the sync again

### ❌ Events not showing in calendar
- Check that you're looking at the correct calendar
- Refresh your browser (Ctrl+R or Cmd+R)
- Try syncing again

### ❌ Too many events
- Previous events are automatically deleted before creating new ones
- Only events matching our pattern (🌅, 💻, 🌙) are removed
- Your other calendar events are safe

---

## Advanced: Manual Event Creation

If you prefer, you can manually create events in Google Calendar following this pattern:

**Format:**
- **Title:** [emoji] [Block Name]
- **Time:** As per the schedule
- **Description:** Task list from Daily Master
- **Reminders:** 15 minutes before

**Example:**
```
📅 Event: 🌅 MORNING ROUTINE
⏰ Time: Monday, Dec 9, 6:00 AM - 10:00 AM
📝 Description:
   ✓ Wake 6am
   ✓ Morning routine (30min)
   ✓ Plan day (15min)
   ✓ University prep
🔔 Notification: 15 min before
```

---

## Integration with Other Services

### Google Assistant
- Ask: "Show me my calendar for today"
- Google Assistant will read your events aloud

### Gmail Calendar Preview
- Your events appear in Gmail's sidebar
- Quick reference when checking email

### Mobile Calendar App
- Events sync to Google Calendar mobile app
- Get phone notifications for each time block

---

## FAQ

**Q: Will this overwrite my existing calendar events?**
A: No, only our pattern-matched events (🌅, 💻, 🌙) are removed. Your other events are untouched.

**Q: Can I customize the times?**
A: Currently, times are fixed in the code. Contact support if you need custom scheduling.

**Q: Do I need to sync every day?**
A: For daily syncing, we recommend running the sync each morning (takes 10 seconds).

**Q: Can I sync multiple days at once?**
A: The current version syncs today only. Weekly milestones can be added for the full week.

**Q: Will notifications work on my phone?**
A: Yes! Google Calendar syncs to your phone, and notifications will appear based on your calendar notification settings.

---

## Next Steps

1. ✅ Run **📅 Google Calendar Setup**
2. ✅ Run **📅 Sync Today to Calendar**
3. ✅ Check your Google Calendar - you should see 3 time blocks!
4. ✅ Run **📅 Add Weekly Milestones** for recurring events

Enjoy your fully integrated productivity tracker! 🚀

---

Generated: December 7, 2025
