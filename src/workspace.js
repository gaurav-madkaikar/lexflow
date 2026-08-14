function domainError(status, code, message, field) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (field) error.field = field;
  return error;
}

function invalid(field, message) {
  return domainError(400, 'INVALID_INPUT', message, field);
}

function transaction(db, operation) {
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

function settingValue(value, field, label) {
  if (!Number.isInteger(value) || value < 1 || value > 8_760) {
    throw invalid(field, `${label} must be a whole number from 1 to 8760 hours.`);
  }
  return value;
}

export function getWorkspaceSettings(db) {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE id = 1').get();
  return {
    timeUnassignedHours: Number(row.time_unassigned_hours),
    timeAssignedUnmarkedHours: Number(row.time_assigned_unmarked_hours),
  };
}

export function listDepartments(db) {
  return db.prepare(`
    SELECT id, name, created_at
    FROM departments
    ORDER BY name COLLATE NOCASE
  `).all().map(row => ({
    id: Number(row.id),
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function createDepartment({ db, name, now = new Date() }) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized || normalized.length > 60) {
    throw invalid('name', 'Enter a department name of 60 characters or fewer.');
  }

  try {
    const result = db.prepare(`
      INSERT INTO departments (name, created_at)
      VALUES (?, ?)
    `).run(normalized, now.toISOString());
    return { id: Number(result.lastInsertRowid), name: normalized };
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      throw invalid('name', 'A department with this name already exists.');
    }
    throw error;
  }
}

export function moveMemberToDepartment({ db, userId, departmentId }) {
  return transaction(db, () => {
    const member = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'member'").get(userId);
    if (!member) {
      throw domainError(404, 'NOT_FOUND', 'Team member not found.');
    }
    const department = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(departmentId);
    if (!department) {
      throw domainError(404, 'NOT_FOUND', 'Department not found.');
    }

    db.prepare('UPDATE users SET department = ? WHERE id = ?').run(department.name, userId);
    return { id: Number(userId), department: department.name };
  });
}

export function updateWorkspaceSettings({
  db,
  timeUnassignedHours,
  timeAssignedUnmarkedHours,
}) {
  const unassigned = settingValue(
    timeUnassignedHours,
    'timeUnassignedHours',
    'Time unassigned',
  );
  const assigned = settingValue(
    timeAssignedUnmarkedHours,
    'timeAssignedUnmarkedHours',
    'Time assigned but not complete',
  );

  db.prepare(`
    UPDATE workspace_settings
    SET time_unassigned_hours = ?, time_assigned_unmarked_hours = ?
    WHERE id = 1
  `).run(unassigned, assigned);
  return getWorkspaceSettings(db);
}
