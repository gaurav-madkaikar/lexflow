import { replacementRequired } from './department-access.js';
import { recordUserLifecycle } from './reporting-events.js';

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

function mailboxValue(value) {
  const mailbox = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!mailbox || mailbox.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(mailbox)) {
    throw invalid('sharedMailbox', 'Enter a valid shared mailbox email address.');
  }
  return mailbox;
}

function departmentPayload(row) {
  return {
    id: Number(row.id),
    name: row.name,
    sharedMailbox: row.shared_mailbox,
    headUser: row.head_user_id ? {
      id: Number(row.head_user_id),
      name: row.head_name,
      email: row.head_email,
      status: row.head_status,
    } : null,
    createdAt: row.created_at,
  };
}

export function getWorkspaceSettings(db, organizationId = 1) {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE organization_id = ? ORDER BY id LIMIT 1').get(organizationId)
    ?? db.prepare('SELECT * FROM workspace_settings WHERE id = 1').get();
  return {
    timeUnassignedHours: Number(row.time_unassigned_hours),
    timeAssignedUnmarkedHours: Number(row.time_assigned_unmarked_hours),
  };
}

export function listDepartments(db, organizationId = 1) {
  return db.prepare(`
    SELECT departments.id, departments.name, departments.shared_mailbox,
      departments.created_at, departments.head_user_id,
      head.name AS head_name, head.email AS head_email,
      head.account_status AS head_status
    FROM departments
    LEFT JOIN users head
      ON head.id = departments.head_user_id
      AND head.organization_id = departments.organization_id
    WHERE departments.organization_id = ?
    ORDER BY departments.name COLLATE NOCASE
  `).all(organizationId).map(departmentPayload);
}

export function createDepartment({ db, name, sharedMailbox, organizationId = 1, now = new Date() }) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized || normalized.length > 60) {
    throw invalid('name', 'Enter a department name of 60 characters or fewer.');
  }
  const mailbox = mailboxValue(sharedMailbox);
  if (db.prepare(`
    SELECT 1 FROM departments WHERE organization_id = ? AND lower(name) = lower(?)
  `).get(organizationId, normalized)) {
    throw invalid('name', 'A department with this name already exists.');
  }
  if (db.prepare(`
    SELECT 1 FROM departments
    WHERE organization_id = ? AND lower(trim(shared_mailbox)) = lower(?)
  `).get(organizationId, mailbox)) {
    throw domainError(409, 'MAILBOX_IN_USE', 'Another department already uses this shared mailbox.', 'sharedMailbox');
  }

  try {
    const result = db.prepare(`
      INSERT INTO departments (name, shared_mailbox, created_at, organization_id)
      VALUES (?, ?, ?, ?)
    `).run(normalized, mailbox, now.toISOString(), organizationId);
    return listDepartments(db, organizationId).find(department => department.id === Number(result.lastInsertRowid));
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      if (String(error.message).includes('departments_organization_mailbox_unique')
        || String(error.message).includes("index 'departments_organization_mailbox_unique'")) {
        throw domainError(409, 'MAILBOX_IN_USE', 'Another department already uses this shared mailbox.', 'sharedMailbox');
      }
      throw invalid('name', 'A department with this name already exists.');
    }
    throw error;
  }
}

export function updateDepartment({ db, departmentId, name, sharedMailbox, organizationId = 1 }) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized || normalized.length > 60) throw invalid('name', 'Enter a department name of 60 characters or fewer.');
  const mailbox = mailboxValue(sharedMailbox);
  const current = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(departmentId, organizationId);
  if (!current) throw domainError(404, 'NOT_FOUND', 'Department not found.');
  if (db.prepare(`
    SELECT 1 FROM departments
    WHERE organization_id = ? AND id <> ? AND lower(name) = lower(?)
  `).get(organizationId, departmentId, normalized)) {
    throw invalid('name', 'A department with this name already exists.');
  }
  if (db.prepare(`
    SELECT 1 FROM departments
    WHERE organization_id = ? AND id <> ? AND lower(trim(shared_mailbox)) = lower(?)
  `).get(organizationId, departmentId, mailbox)) {
    throw domainError(409, 'MAILBOX_IN_USE', 'Another department already uses this shared mailbox.', 'sharedMailbox');
  }
  try {
    db.prepare(`
      UPDATE departments
      SET name = ?, shared_mailbox = ?, organization_id = ?
      WHERE id = ? AND organization_id = ?
    `).run(normalized, mailbox, organizationId, departmentId, organizationId);
    db.prepare('UPDATE users SET department = ? WHERE department_id = ? AND organization_id = ?').run(normalized, departmentId, organizationId);
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      if (String(error.message).includes('departments_organization_mailbox_unique')
        || String(error.message).includes("index 'departments_organization_mailbox_unique'")) {
        throw domainError(409, 'MAILBOX_IN_USE', 'Another department already uses this shared mailbox.', 'sharedMailbox');
      }
      throw invalid('name', 'A department with this name already exists.');
    }
    throw error;
  }
  return listDepartments(db, organizationId).find(department => department.id === Number(departmentId));
}

export function deleteDepartment({
  db,
  departmentId,
  organizationId = 1,
  actorId = null,
  now = new Date(),
}) {
  return transaction(db, () => {
    const department = db.prepare(`
      SELECT id, name, shared_mailbox, head_user_id
      FROM departments
      WHERE id = ? AND organization_id = ?
    `).get(departmentId, organizationId);
    if (!department) throw domainError(404, 'NOT_FOUND', 'Department not found.');

    const members = db.prepare(`
      SELECT id, name, department, department_id
      FROM users
      WHERE organization_id = ? AND department_id = ? AND role = 'member'
      ORDER BY id
    `).all(organizationId, departmentId);
    const memberCount = members.length;

    db.prepare(`
      UPDATE departments SET head_user_id = NULL
      WHERE id = ? AND organization_id = ?
    `).run(departmentId, organizationId);
    db.prepare(`
      UPDATE users
      SET department = '', department_id = NULL
      WHERE organization_id = ? AND department_id = ?
    `).run(organizationId, departmentId);
    const occurredAt = now.toISOString();
    for (const member of members) {
      recordUserLifecycle(db, {
        organizationId,
        userId: member.id,
        actorId,
        eventType: 'department_moved',
        departmentIdBefore: department.id,
        departmentIdAfter: null,
        departmentNameBefore: department.name,
        departmentNameAfter: null,
        roleBefore: Number(department.head_user_id) === Number(member.id) ? 'dep_admin' : 'member',
        roleAfter: 'member',
        userNameSnapshot: member.name,
        occurredAt,
      });
      if (Number(department.head_user_id) === Number(member.id)) {
        recordUserLifecycle(db, {
          organizationId,
          userId: member.id,
          actorId,
          eventType: 'role_changed',
          departmentIdBefore: department.id,
          departmentIdAfter: null,
          departmentNameBefore: department.name,
          departmentNameAfter: null,
          roleBefore: 'dep_admin',
          roleAfter: 'member',
          userNameSnapshot: member.name,
          occurredAt,
        });
      }
    }
    db.prepare('DELETE FROM departments WHERE id = ? AND organization_id = ?')
      .run(departmentId, organizationId);

    const mailboxStillUsed = db.prepare(`
      SELECT 1
      FROM departments
      WHERE organization_id = ? AND lower(shared_mailbox) = lower(?)
      LIMIT 1
    `).get(organizationId, department.shared_mailbox);
    if (!mailboxStillUsed) {
      const cursorKey = `mail_cursor:graph:${String(department.shared_mailbox).toLocaleLowerCase()}`;
      const scoped = key => Number(organizationId) === 1 ? key : `organization:${organizationId}:${key}`;
      const removeSyncState = db.prepare('DELETE FROM sync_state WHERE organization_id = ? AND key = ?');
      for (const key of [cursorKey, `last_sync_at:${cursorKey}`, `last_sync_error:${cursorKey}`]) {
        removeSyncState.run(organizationId, scoped(key));
      }
    }

    return {
      id: Number(department.id),
      name: department.name,
      sharedMailbox: department.shared_mailbox,
      unassignedMemberCount: memberCount,
    };
  });
}

export function listDepartmentMembers(db, departmentId, organizationId = 1) {
  return db.prepare(`
    SELECT * FROM users
    WHERE organization_id = ? AND department_id = ? AND role = 'member'
    ORDER BY name COLLATE NOCASE, id
  `).all(organizationId, departmentId).map(row => ({
    id: Number(row.id), email: row.email, name: row.name, initials: row.initials,
    departmentId: Number(row.department_id), department: row.department, status: row.account_status,
    role: Number(row.id) === Number(
      db.prepare('SELECT head_user_id FROM departments WHERE id = ? AND organization_id = ?')
        .get(departmentId, organizationId)?.head_user_id,
    ) ? 'dep_admin' : 'member',
  }));
}

export function setDepartmentHead({
  db,
  departmentId,
  memberId,
  organizationId = 1,
  actorId = null,
  now = new Date(),
}) {
  return transaction(db, () => {
    const department = db.prepare(`
      SELECT id, name, head_user_id
      FROM departments
      WHERE id = ? AND organization_id = ?
    `).get(departmentId, organizationId);
    if (!department) throw domainError(404, 'NOT_FOUND', 'Department not found.');

    const member = db.prepare(`
      SELECT id, name
      FROM users
      WHERE id = ? AND organization_id = ? AND department_id = ?
        AND role = 'member' AND account_status IN ('pending', 'active')
    `).get(memberId, organizationId, departmentId);
    if (!member) {
      throw invalid('memberId', 'Choose an active or pending member of this department.');
    }

    const otherDepartment = db.prepare(`
      SELECT id FROM departments
      WHERE organization_id = ? AND head_user_id = ? AND id <> ?
    `).get(organizationId, memberId, departmentId);
    if (otherDepartment) {
      throw domainError(409, 'DEPARTMENT_HEAD_CONFLICT', 'That member already leads another department.', 'memberId');
    }

    if (Number(department.head_user_id) === Number(memberId)) {
      return listDepartments(db, organizationId)
        .find(item => item.id === Number(departmentId));
    }

    const previousHead = department.head_user_id
      ? db.prepare('SELECT id, name FROM users WHERE id = ? AND organization_id = ?')
        .get(department.head_user_id, organizationId)
      : null;

    db.prepare(`
      UPDATE departments SET head_user_id = ?
      WHERE id = ? AND organization_id = ?
    `).run(memberId, departmentId, organizationId);
    const occurredAt = now.toISOString();
    if (previousHead) {
      recordUserLifecycle(db, {
        organizationId,
        userId: previousHead.id,
        actorId,
        eventType: 'role_changed',
        departmentIdBefore: department.id,
        departmentIdAfter: department.id,
        departmentNameBefore: department.name,
        departmentNameAfter: department.name,
        roleBefore: 'dep_admin',
        roleAfter: 'member',
        userNameSnapshot: previousHead.name,
        occurredAt,
      });
    }
    recordUserLifecycle(db, {
      organizationId,
      userId: member.id,
      actorId,
      eventType: 'role_changed',
      departmentIdBefore: department.id,
      departmentIdAfter: department.id,
      departmentNameBefore: department.name,
      departmentNameAfter: department.name,
      roleBefore: 'member',
      roleAfter: 'dep_admin',
      userNameSnapshot: member.name,
      occurredAt,
    });
    return listDepartments(db, organizationId)
      .find(item => item.id === Number(departmentId));
  });
}

export function moveMemberToDepartment({
  db,
  userId,
  departmentId,
  organizationId = 1,
  actorId = null,
  now = new Date(),
}) {
  return transaction(db, () => {
    const member = db.prepare("SELECT id, name, department_id, department FROM users WHERE id = ? AND organization_id = ? AND role = 'member'").get(userId, organizationId);
    if (!member) {
      throw domainError(404, 'NOT_FOUND', 'Team member not found.');
    }
    const department = db.prepare('SELECT id, name, shared_mailbox FROM departments WHERE id = ? AND organization_id = ?').get(departmentId, organizationId);
    if (!department) {
      throw domainError(404, 'NOT_FOUND', 'Department not found.');
    }
    if (Number(member.department_id) !== Number(department.id)) {
      const headed = db.prepare(`
        SELECT id FROM departments
        WHERE organization_id = ? AND head_user_id = ?
      `).get(organizationId, userId);
      if (headed) throw replacementRequired();
    }

    const changedDepartment = Number(member.department_id) !== Number(department.id);
    db.prepare('UPDATE users SET department = ?, department_id = ? WHERE id = ? AND organization_id = ?').run(department.name, department.id, userId, organizationId);
    db.prepare(`
      UPDATE departments
      SET head_user_id = ?
      WHERE id = ? AND organization_id = ? AND head_user_id IS NULL
    `).run(userId, department.id, organizationId);
    const isHead = Number(db.prepare('SELECT head_user_id FROM departments WHERE id = ?').get(department.id)?.head_user_id) === Number(userId);
    if (changedDepartment) {
      const occurredAt = now.toISOString();
      recordUserLifecycle(db, {
        organizationId,
        userId,
        actorId,
        eventType: 'department_moved',
        departmentIdBefore: member.department_id,
        departmentIdAfter: department.id,
        departmentNameBefore: member.department || null,
        departmentNameAfter: department.name,
        roleBefore: 'member',
        roleAfter: 'member',
        userNameSnapshot: member.name,
        occurredAt,
      });
      if (isHead) {
        recordUserLifecycle(db, {
          organizationId,
          userId,
          actorId,
          eventType: 'role_changed',
          departmentIdBefore: department.id,
          departmentIdAfter: department.id,
          departmentNameBefore: department.name,
          departmentNameAfter: department.name,
          roleBefore: 'member',
          roleAfter: 'dep_admin',
          userNameSnapshot: member.name,
          occurredAt,
        });
      }
    }
    return {
      id: Number(userId),
      department: department.name,
      departmentId: Number(department.id),
      role: isHead ? 'dep_admin' : 'member',
    };
  });
}

export function updateWorkspaceSettings({
  db,
  timeUnassignedHours,
  timeAssignedUnmarkedHours,
  organizationId = 1,
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
