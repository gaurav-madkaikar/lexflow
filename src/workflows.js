function runTransaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function runSavepoint(db, operation) {
  db.exec('SAVEPOINT apply_rule');
  try {
    const result = operation();
    db.exec('RELEASE SAVEPOINT apply_rule');
    return result;
  } catch (error) {
    db.exec('ROLLBACK TO SAVEPOINT apply_rule');
    db.exec('RELEASE SAVEPOINT apply_rule');
    throw error;
  }
}

function setSyncState(db, key, value) {
  db.prepare(`
    INSERT INTO sync_state (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function asMailMessage(row) {
  return {
    subject: row.subject,
    preview: row.preview,
    senderName: row.sender_name,
    senderAddress: row.sender_address,
  };
}

function assignEmail(db, email, rule, createdAt) {
  const updated = db.prepare(`
    UPDATE emails
    SET status = 'assigned', assignee_id = ?
    WHERE id = ? AND status = 'unassigned'
  `).run(rule.assignee_id, email.id);
  if (updated.changes !== 1) return false;

  const assignee = db.prepare('SELECT name FROM users WHERE id = ?').get(rule.assignee_id);
  db.prepare(`
    INSERT OR IGNORE INTO notifications
      (user_id, email_id, kind, message, created_at)
    VALUES (?, ?, 'assignment', ?, ?)
  `).run(rule.assignee_id, email.id, `New assignment: ${email.subject}`, createdAt);
  db.prepare(`
    INSERT INTO activity (actor_id, email_id, kind, message, created_at)
    VALUES (NULL, ?, 'assigned', ?, ?)
  `).run(email.id, `Assigned "${email.subject}" to ${assignee.name}`, createdAt);
  return true;
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/(client_secret|access_token|token)=([^\s&]+)/gi, '$1=[redacted]')
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300) || 'Mailbox sync failed.'
  );
}

export function matchRule(message, rules) {
  const searchable = `${message.subject} ${message.preview}`.toLocaleLowerCase();
  const sender = `${message.senderName} ${message.senderAddress}`.toLocaleLowerCase();
  return (
    rules
      .filter((rule) => rule.enabled)
      .sort((left, right) => left.priority - right.priority || left.id - right.id)
      .find((rule) => {
        const words = rule.keywords
          .split(',')
          .map((word) => word.trim().toLocaleLowerCase())
          .filter(Boolean);
        const keywordsMatch = words.every((word) => searchable.includes(word));
        const senderMatch =
          !rule.sender_filter || sender.includes(rule.sender_filter.toLocaleLowerCase());
        return keywordsMatch && senderMatch;
      }) ?? null
  );
}

export async function syncMailbox({ db, source }) {
  const cursorKey = source.cursorKey || 'mail_cursor';
  const cursor = db.prepare('SELECT value FROM sync_state WHERE key = ?').get(cursorKey)?.value ?? null;
  const { messages, nextCursor } = await source.fetchChanges(cursor);

  return runTransaction(db, () => {
    const rules = db.prepare('SELECT * FROM rules').all();
    const insertEmail = db.prepare(`
      INSERT OR IGNORE INTO emails
        (provider_id, subject, sender_name, sender_address, preview, received_at,
         outlook_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unassigned', ?)
    `);
    const updateEmail = db.prepare(`
      UPDATE emails
      SET subject = ?, sender_name = ?, sender_address = ?, preview = ?, received_at = ?, outlook_url = ?
      WHERE provider_id = ?
    `);
    const findEmail = db.prepare('SELECT * FROM emails WHERE provider_id = ?');
    const now = new Date().toISOString();
    let imported = 0;
    let assigned = 0;

    for (const message of messages) {
      const insertion = insertEmail.run(
        message.providerId,
        message.subject,
        message.senderName,
        message.senderAddress,
        message.preview,
        message.receivedAt,
        message.outlookUrl,
        now,
      );

      if (insertion.changes === 0) {
        updateEmail.run(
          message.subject,
          message.senderName,
          message.senderAddress,
          message.preview,
          message.receivedAt,
          message.outlookUrl,
          message.providerId,
        );
        continue;
      }

      imported += 1;
      const email = findEmail.get(message.providerId);
      const rule = matchRule(message, rules);
      if (rule && assignEmail(db, email, rule, now)) assigned += 1;
    }

    if (nextCursor === null) {
      db.prepare('DELETE FROM sync_state WHERE key = ?').run(cursorKey);
    } else {
      setSyncState(db, cursorKey, nextCursor);
    }
    setSyncState(db, 'last_sync_at', now);
    db.prepare("DELETE FROM sync_state WHERE key = 'last_sync_error'").run();

    return { imported, assigned };
  });
}

export function createSyncRunner({ db, source }) {
  let inFlight = null;

  function run() {
    if (inFlight) return inFlight;
    inFlight = syncMailbox({ db, source })
      .catch((error) => {
        setSyncState(db, 'last_sync_error', sanitizeError(error));
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  return { run };
}

export function applyRuleToUnassigned(db, ruleId) {
  return runSavepoint(db, () => {
    const rule = db.prepare('SELECT * FROM rules WHERE id = ? AND enabled = 1').get(ruleId);
    if (!rule) return { assigned: 0 };

    const emails = db.prepare("SELECT * FROM emails WHERE status = 'unassigned' ORDER BY id").all();
    const now = new Date().toISOString();
    let assigned = 0;
    for (const email of emails) {
      if (matchRule(asMailMessage(email), [rule]) && assignEmail(db, email, rule, now)) {
        assigned += 1;
      }
    }
    return { assigned };
  });
}

export function completeAssignedEmail({ db, emailId, userId }) {
  return runTransaction(db, () => {
    const completedAt = new Date().toISOString();
    const update = db.prepare(`
      UPDATE emails
      SET status = 'completed', completed_by = ?, completed_at = ?
      WHERE id = ? AND assignee_id = ? AND status = 'assigned'
    `).run(userId, completedAt, emailId, userId);

    if (update.changes === 1) {
      const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
      const actor = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
      db.prepare(`
        INSERT INTO activity (actor_id, email_id, kind, message, created_at)
        VALUES (?, ?, 'completed', ?, ?)
      `).run(userId, emailId, `${actor.name} completed "${email.subject}"`, completedAt);
      return email;
    }

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
    if (
      email?.status === 'completed' &&
      Number(email.assignee_id) === Number(userId) &&
      Number(email.completed_by) === Number(userId)
    ) {
      return email;
    }

    const error = new Error('This email is not assigned to this user.');
    error.code = 'FORBIDDEN';
    error.status = 403;
    throw error;
  });
}
