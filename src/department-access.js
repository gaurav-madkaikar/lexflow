function accessError(status, code, message, field) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  if (field) error.field = field;
  return error;
}

export function replacementRequired(
  message = 'Select a replacement DepAdmin before changing this member.',
) {
  return accessError(409, 'DEPARTMENT_HEAD_REPLACEMENT_REQUIRED', message);
}

export function headedDepartment(db, { userId, organizationId }) {
  if (!userId || !organizationId) return null;
  return db.prepare(`
    SELECT departments.*
    FROM departments
    JOIN users
      ON users.id = departments.head_user_id
      AND users.organization_id = departments.organization_id
      AND users.department_id = departments.id
      AND users.role = 'member'
      AND users.account_status IN ('pending', 'active')
    WHERE departments.head_user_id = ?
      AND departments.organization_id = ?
    LIMIT 1
  `).get(userId, organizationId) ?? null;
}

export function effectiveWorkspaceRole(user, department = null) {
  if (user?.is_platform_admin) return 'platform_admin';
  if (user?.role === 'admin') return 'org_admin';
  return department ? 'dep_admin' : 'member';
}

export function assertDepartmentHead(db, { userId, organizationId, departmentId }) {
  const department = headedDepartment(db, { userId, organizationId });
  if (!department || Number(department.id) !== Number(departmentId)) {
    throw accessError(404, 'NOT_FOUND', 'Resource not found.');
  }
  return department;
}

export function departmentHeadRecipient(db, { organizationId, departmentId }) {
  if (!departmentId) return null;
  return db.prepare(`
    SELECT users.id, users.email, users.name
    FROM departments
    JOIN users
      ON users.id = departments.head_user_id
      AND users.organization_id = departments.organization_id
      AND users.department_id = departments.id
      AND users.role = 'member'
      AND users.account_status = 'active'
    WHERE departments.id = ? AND departments.organization_id = ?
    LIMIT 1
  `).get(departmentId, organizationId) ?? null;
}
