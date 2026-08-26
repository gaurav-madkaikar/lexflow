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

export function getWorkspaceSettings(db, organizationId = 1) {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE organization_id = ?')
    .get(organizationId);
  if (!row) {
    throw domainError(404, 'NOT_FOUND', 'Workspace settings not found.');
  }
  return {
    timeUnassignedHours: Number(row.time_unassigned_hours),
    timeAssignedUnmarkedHours: Number(row.time_assigned_unmarked_hours),
  };
}

export function listDepartments(db, organizationId = 1) {
  return db.prepare(`
    SELECT id, name, created_at
    FROM departments
    WHERE organization_id = ?
    ORDER BY name COLLATE NOCASE
  `).all(organizationId).map(row => ({
    id: Number(row.id),
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function createDepartment({ db, organizationId = 1, name, now = new Date() }) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized || normalized.length > 60) {
    throw invalid('name', 'Enter a department name of 60 characters or fewer.');
  }

  try {
    const result = db.prepare(`
      INSERT INTO departments (organization_id, name, created_at)
      VALUES (?, ?, ?)
    `).run(organizationId, normalized, now.toISOString());
    return { id: Number(result.lastInsertRowid), name: normalized };
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      throw invalid('name', 'A department with this name already exists.');
    }
    throw error;
  }
}

export function moveMemberToDepartment({ db, organizationId = 1, userId, departmentId }) {
  return transaction(db, () => {
    const member = db.prepare(`
      SELECT id FROM users
      WHERE id = ? AND organization_id = ? AND role = 'member'
    `).get(userId, organizationId);
    if (!member) {
      throw domainError(404, 'NOT_FOUND', 'Team member not found.');
    }
    const department = db.prepare(`
      SELECT id, name FROM departments
      WHERE id = ? AND organization_id = ?
    `).get(departmentId, organizationId);
    if (!department) {
      throw domainError(404, 'NOT_FOUND', 'Department not found.');
    }

    db.prepare('UPDATE users SET department = ? WHERE id = ? AND organization_id = ?')
      .run(department.name, userId, organizationId);
    return { id: Number(userId), department: department.name };
  });
}

export function updateWorkspaceSettings({
  db,
  organizationId = 1,
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
    WHERE organization_id = ?
  `).run(unassigned, assigned, organizationId);
  return getWorkspaceSettings(db, organizationId);
}
