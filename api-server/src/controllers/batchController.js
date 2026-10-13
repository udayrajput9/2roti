const db = require('../config/database');

// Helper: Convert HH:MM to minutes from midnight
function timeStringToMinutes(hhmm) {
  if (!hhmm) return 0;
  const parts = String(hhmm).trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Helper: Convert HH:MM (24h) to 12h AM/PM string
function format12Hour(hhmm) {
  if (!hhmm) return '';
  const parts = String(hhmm).trim().split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mStr = m < 10 ? `0${m}` : m;
  return `${h}:${mStr} ${period}`;
}

// Helper: Current IST time in minutes and string
function getCurrentIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const seconds = istTime.getUTCSeconds();
  const totalMinutes = hours * 60 + minutes;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { hours, minutes, seconds, totalMinutes, timeStr };
}

// Helper: Check if current time falls in a time window
function isTimeInWindow(currentMins, startHHMM, endHHMM) {
  const start = timeStringToMinutes(startHHMM);
  const end = timeStringToMinutes(endHHMM);
  if (start <= end) {
    return currentMins >= start && currentMins < end;
  }
  // Overnight batch (e.g., 22:00 to 02:00)
  return currentMins >= start || currentMins < end;
}

// Helper: Enrich batch with human-readable 12-hour labels and current operational status
function enrichBatch(batch, ist) {
  const currentMins = ist.totalMinutes;
  const isPaymentOpen = Boolean(batch.is_active && isTimeInWindow(currentMins, batch.payment_start_time, batch.payment_end_time));
  
  const cutoffMins = timeStringToMinutes(batch.kitchen_cutoff_time);
  const slipsMins = timeStringToMinutes(batch.slips_ready_time);
  const dispatchMins = timeStringToMinutes(batch.dispatch_time);

  return {
    ...batch,
    is_open: isPaymentOpen,
    is_cutoff_active: currentMins >= cutoffMins,
    is_slips_active: currentMins >= slipsMins,
    is_dispatch_active: currentMins >= dispatchMins,
    payment_start_12h: format12Hour(batch.payment_start_time),
    payment_end_12h: format12Hour(batch.payment_end_time),
    kitchen_cutoff_12h: format12Hour(batch.kitchen_cutoff_time),
    slips_ready_12h: format12Hour(batch.slips_ready_time),
    dispatch_12h: format12Hour(batch.dispatch_time)
  };
}

// Exported Verification Function: Used by Order & Payment Controllers
async function checkIfPaymentsAllowed() {
  try {
    const ist = getCurrentIST();
    const activeBatches = await db('order_batches').where({ is_active: true });

    if (!activeBatches || activeBatches.length === 0) {
      // Fallback: If no batches configured, fallback to standard 15:00 - 18:00
      const allowed = ist.totalMinutes >= 900 && ist.totalMinutes < 1080;
      return {
        allowed,
        currentBatch: allowed ? { name: 'Dinner Batch (3 PM – 6 PM)', payment_start_time: '15:00', payment_end_time: '18:00' } : null,
        nextBatch: null,
        message: allowed ? 'Payment window open' : 'Orders are accepted only during scheduled batch hours.'
      };
    }

    // Check if current time falls in ANY active batch
    for (const b of activeBatches) {
      if (isTimeInWindow(ist.totalMinutes, b.payment_start_time, b.payment_end_time)) {
        return {
          allowed: true,
          currentBatch: enrichBatch(b, ist),
          message: `Orders & payments open for ${b.name}`
        };
      }
    }

    // Outside all active batches: Find next upcoming batch
    let nextBatch = null;
    let minDiff = Infinity;
    for (const b of activeBatches) {
      const startMins = timeStringToMinutes(b.payment_start_time);
      let diff = startMins - ist.totalMinutes;
      if (diff < 0) diff += 1440; // Next day
      if (diff < minDiff) {
        minDiff = diff;
        nextBatch = b;
      }
    }

    const nextTimeStr = nextBatch ? `${format12Hour(nextBatch.payment_start_time)} (${nextBatch.name})` : 'scheduled batch hours';
    return {
      allowed: false,
      currentBatch: null,
      nextBatch: nextBatch ? enrichBatch(nextBatch, ist) : null,
      message: `Orders are currently closed. Next order batch opens at ${nextTimeStr} IST.`
    };
  } catch (err) {
    console.error('checkIfPaymentsAllowed error:', err);
    return { allowed: true, message: 'Batch check bypassed on error' };
  }
}

// Helper: Get Active Batches Data (used by public API and statsController)
async function getActiveBatchesData() {
  const ist = getCurrentIST();
  const batches = await db('order_batches').where({ is_active: true }).orderBy('payment_start_time', 'asc');
  const enriched = batches.map(b => enrichBatch(b, ist));

  const check = await checkIfPaymentsAllowed();

  return {
    is_open: check.allowed,
    current_batch: check.currentBatch,
    next_batch: check.nextBatch,
    message: check.message,
    active_batches: enriched,
    server_time_ist: ist.timeStr,
    server_time_12h: format12Hour(ist.timeStr)
  };
}

// 1. Public API: Get Active Batches & Current Open Batch
async function getActiveBatches(req, res) {
  try {
    const data = await getActiveBatchesData();
    return res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error('getActiveBatches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch active batches.' });
  }
}

// 2. Admin API: Get All Batches (Active + Inactive)
async function getAllBatches(req, res) {
  try {
    const ist = getCurrentIST();
    const batches = await db('order_batches').orderBy('id', 'asc');
    const enriched = batches.map(b => enrichBatch(b, ist));
    const check = await checkIfPaymentsAllowed();

    return res.json({
      success: true,
      batches: enriched,
      is_open: check.allowed,
      current_batch: check.currentBatch,
      next_batch: check.nextBatch,
      server_time_ist: ist.timeStr,
      server_time_12h: format12Hour(ist.timeStr)
    });
  } catch (err) {
    console.error('getAllBatches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch batches list.' });
  }
}

// 3. Admin API: Create New Batch
async function createBatch(req, res) {
  try {
    const {
      name,
      payment_start_time,
      payment_end_time,
      kitchen_cutoff_time,
      slips_ready_time,
      dispatch_time,
      is_active = true,
      description
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Batch Name is required.' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(payment_start_time) || !timeRegex.test(payment_end_time)) {
      return res.status(400).json({ success: false, message: 'Payment Start and End times must be in HH:MM format (24-hour).' });
    }

    // Default trigger event timings if not provided:
    // Trigger 1 (Cutoff): 1 min after payment_end
    // Trigger 2 (Slips): 10 min after payment_end
    // Trigger 3 (Dispatch): 90 min after payment_end
    const endMins = timeStringToMinutes(payment_end_time);
    const defCutoff = kitchen_cutoff_time && timeRegex.test(kitchen_cutoff_time)
      ? kitchen_cutoff_time
      : `${String(Math.floor((endMins + 1) / 60) % 24).padStart(2, '0')}:${String((endMins + 1) % 60).padStart(2, '0')}`;

    const defSlips = slips_ready_time && timeRegex.test(slips_ready_time)
      ? slips_ready_time
      : `${String(Math.floor((endMins + 10) / 60) % 24).padStart(2, '0')}:${String((endMins + 10) % 60).padStart(2, '0')}`;

    const defDispatch = dispatch_time && timeRegex.test(dispatch_time)
      ? dispatch_time
      : `${String(Math.floor((endMins + 90) / 60) % 24).padStart(2, '0')}:${String((endMins + 90) % 60).padStart(2, '0')}`;

    const [insertedId] = await db('order_batches').insert({
      name: name.trim().substring(0, 100),
      payment_start_time: payment_start_time.trim(),
      payment_end_time: payment_end_time.trim(),
      kitchen_cutoff_time: defCutoff.trim(),
      slips_ready_time: defSlips.trim(),
      dispatch_time: defDispatch.trim(),
      is_active: Boolean(is_active),
      description: description ? String(description).substring(0, 500) : null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('id');

    const newId = typeof insertedId === 'object' ? (insertedId.id || insertedId) : insertedId;
    const createdBatch = await db('order_batches').where({ id: newId }).first();

    const ist = getCurrentIST();
    return res.json({
      success: true,
      message: `Batch "${name}" created successfully!`,
      batch: enrichBatch(createdBatch, ist)
    });
  } catch (err) {
    console.error('createBatch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create batch: ' + err.message });
  }
}

// 4. Admin API: Update Existing Batch
async function updateBatch(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      payment_start_time,
      payment_end_time,
      kitchen_cutoff_time,
      slips_ready_time,
      dispatch_time,
      is_active,
      description
    } = req.body;

    const existing = await db('order_batches').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const updates = { updated_at: db.fn.now() };
    if (name) updates.name = String(name).trim().substring(0, 100);

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (payment_start_time && timeRegex.test(payment_start_time)) updates.payment_start_time = payment_start_time;
    if (payment_end_time && timeRegex.test(payment_end_time)) updates.payment_end_time = payment_end_time;
    if (kitchen_cutoff_time && timeRegex.test(kitchen_cutoff_time)) updates.kitchen_cutoff_time = kitchen_cutoff_time;
    if (slips_ready_time && timeRegex.test(slips_ready_time)) updates.slips_ready_time = slips_ready_time;
    if (dispatch_time && timeRegex.test(dispatch_time)) updates.dispatch_time = dispatch_time;
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (description !== undefined) updates.description = description ? String(description).substring(0, 500) : null;

    await db('order_batches').where({ id }).update(updates);
    const updatedBatch = await db('order_batches').where({ id }).first();

    const ist = getCurrentIST();
    return res.json({
      success: true,
      message: `Batch "${updatedBatch.name}" updated successfully!`,
      batch: enrichBatch(updatedBatch, ist)
    });
  } catch (err) {
    console.error('updateBatch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update batch: ' + err.message });
  }
}

// 5. Admin API: Toggle Batch Active Status
async function toggleBatch(req, res) {
  try {
    const { id } = req.params;
    const batch = await db('order_batches').where({ id }).first();
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const newStatus = !batch.is_active;
    await db('order_batches').where({ id }).update({ is_active: newStatus, updated_at: db.fn.now() });

    return res.json({
      success: true,
      message: `Batch "${batch.name}" is now ${newStatus ? 'ACTIVE' : 'PAUSED'}.`,
      is_active: newStatus
    });
  } catch (err) {
    console.error('toggleBatch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle batch status.' });
  }
}

// 6. Admin API: Delete Batch
async function deleteBatch(req, res) {
  try {
    const { id } = req.params;
    const batch = await db('order_batches').where({ id }).first();
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    // Safety guard: Don't delete if it's the only batch left
    const totalCountRow = await db('order_batches').count('id as cnt').first();
    if (parseInt(totalCountRow?.cnt || 0) <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only existing batch. At least one batch must remain.' });
    }

    await db('order_batches').where({ id }).del();
    return res.json({ success: true, message: `Batch "${batch.name}" has been deleted.` });
  } catch (err) {
    console.error('deleteBatch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete batch.' });
  }
}

module.exports = {
  checkIfPaymentsAllowed,
  getActiveBatchesData,
  getActiveBatches,
  getAllBatches,
  createBatch,
  updateBatch,
  toggleBatch,
  deleteBatch
};
