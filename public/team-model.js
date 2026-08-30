export function usernameFromEmail(email) {
  const normalized = typeof email === 'string' ? email.trim().toLocaleLowerCase() : '';
  if (!normalized) return '';
  const separator = normalized.indexOf('@');
  return separator > 0 ? normalized.slice(0, separator) : normalized;
}

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function teamGroups({ departments = [], members = [] } = {}) {
  const people = Array.isArray(members) ? members : [];
  const assignedMemberIds = new Set();
  const groups = (Array.isArray(departments) ? departments : []).flatMap(department => {
    const departmentId = numericId(department?.id);
    if (!departmentId) return [];
    const departmentMembers = people.filter(member => {
      const memberId = numericId(member?.id);
      if (!memberId || assignedMemberIds.has(memberId) || numericId(member?.departmentId) !== departmentId) {
        return false;
      }
      assignedMemberIds.add(memberId);
      return true;
    });
    const head = department?.headUser;
    const headMember = departmentMembers.find(member => numericId(member.id) === numericId(head?.id));
    const depAdminUsername = usernameFromEmail(head?.email ?? headMember?.email) || null;
    return [{
      id: `department:${departmentId}`,
      department: { ...department, id: departmentId },
      members: departmentMembers,
      depAdminUsername,
    }];
  });

  groups.push({
    id: 'unassigned',
    department: null,
    members: people.filter(member => {
      const memberId = numericId(member?.id);
      return memberId && !assignedMemberIds.has(memberId);
    }),
    depAdminUsername: null,
  });
  return groups;
}

export function reconcileExpandedGroups(expandedIds, groupIds) {
  const available = new Set(Array.from(groupIds ?? [], value => String(value)));
  return new Set(Array.from(expandedIds ?? [], value => String(value)).filter(value => available.has(value)));
}
