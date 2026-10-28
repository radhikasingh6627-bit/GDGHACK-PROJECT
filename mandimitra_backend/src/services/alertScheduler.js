const config = require('../config/env');
const { evaluateAllAlerts } = require('./alertEvaluationService');

let timerId = null;
let isRunning = false;
let lastRunTimestamp = null;
let lastRunSummary = null;

/**
 * Starts the periodic background alert checker.
 */
function startScheduler() {
  if (timerId) {
    console.log('[AlertScheduler] Background scheduler is already running.');
    return;
  }

  // Interval in minutes from env (default: 30 minutes, minimum 1 minute)
  const intervalMinutes = Math.max(1, config.alertCheckIntervalMinutes || 30);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[AlertScheduler] Starting alert scheduler with interval of ${intervalMinutes} minutes.`);

  // Initial delayed evaluation on server start (gives server 5s to boot)
  setTimeout(async () => {
    try {
      console.log('[AlertScheduler] Running initial alert check...');
      isRunning = true;
      lastRunTimestamp = new Date().toISOString();
      lastRunSummary = await evaluateAllAlerts();
      console.log(`[AlertScheduler] Initial check completed. Evaluated: ${lastRunSummary.evaluatedCount}, Triggered: ${lastRunSummary.triggeredCount}`);
    } catch (err) {
      console.warn('[AlertScheduler] Initial check encountered an error:', err.message);
    } finally {
      isRunning = false;
    }
  }, 5000);

  // Periodic recurring check
  timerId = setInterval(async () => {
    if (isRunning) {
      console.log('[AlertScheduler] Previous evaluation still in progress, skipping cycle.');
      return;
    }

    try {
      isRunning = true;
      lastRunTimestamp = new Date().toISOString();
      console.log(`[AlertScheduler] Starting scheduled alert evaluation at ${lastRunTimestamp}...`);
      lastRunSummary = await evaluateAllAlerts();
      console.log(`[AlertScheduler] Check completed. Evaluated: ${lastRunSummary.evaluatedCount}, Triggered: ${lastRunSummary.triggeredCount}`);
    } catch (err) {
      console.error('[AlertScheduler] Evaluation cycle error:', err.message);
    } finally {
      isRunning = false;
    }
  }, intervalMs);
}

/**
 * Stops the background alert checker.
 */
function stopScheduler() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    console.log('[AlertScheduler] Stopped background scheduler.');
  }
}

/**
 * Returns current scheduler status.
 */
function getSchedulerStatus() {
  return {
    active: timerId !== null,
    intervalMinutes: Math.max(1, config.alertCheckIntervalMinutes || 30),
    isRunning,
    lastRunTimestamp,
    lastRunSummary
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus
};

