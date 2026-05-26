export const DEPARTMENT_HIERARCHY: Record<string, string[]> = {
  Finance:   ['Budget Proposal', 'Liquidation', 'Financial Statement', 'Expense Receipts'],
  Secretary: ['Proposals', 'Permits', 'Minutes of Meetings', 'Reports'],
  MOPI:      ['Press Releases', 'Announcements', 'Newsletters'],
  Judiciary: ['Bylaws', 'Constitutions', 'Case Records'],
  Election:  ['Candidacy Profiles', 'Voter Registries', 'Election Results'],
  Event:     ['Freshmen Orientation', 'Election 2025', 'Foundation Day'],
}

export const DEPARTMENTS = Object.keys(DEPARTMENT_HIERARCHY)

export function subCategoryMatches(subCat: string, docCategory: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  return (
    (subCat === 'Budget Proposal'      && docCategory === 'Budgets') ||
    (subCat === 'Liquidation'          && docCategory === 'Financial Records') ||
    (subCat === 'Financial Statement'  && docCategory === 'Financial Records') ||
    (subCat === 'Expense Receipts'     && docCategory === 'Financial Records') ||
    (subCat === 'Proposals'            && docCategory === 'Proposals') ||
    (subCat === 'Permits'              && docCategory === 'Permits') ||
    (subCat === 'Minutes of Meetings'  && docCategory === 'Reports') ||
    (subCat === 'Reports'              && docCategory === 'Reports') ||
    norm(docCategory) === norm(subCat)
  )
}

export function deptCategoryMatches(dept: string, docCategory: string): boolean {
  if (dept === 'Finance') {
    return ['Budgets', 'Financial Records', 'Reports'].includes(docCategory)
  }
  return !['Budgets', 'Financial Records'].includes(docCategory)
}

export function subcategoryToUploadCategory(subCat: string): string {
  if (subCat === 'Budget Proposal') return 'Budgets'
  if (['Liquidation', 'Financial Statement', 'Expense Receipts'].includes(subCat)) return 'Financial Records'
  if (subCat === 'Proposals') return 'Proposals'
  if (subCat === 'Permits') return 'Permits'
  return 'Reports'
}

export function allowedDepartmentsForRole(role: string): string[] {
  if (role === 'chief_minister' || role === 'member') return DEPARTMENTS
  if (role === 'finance_minister') return ['Finance']
  if (role === 'secretary') return ['Secretary', 'Event', 'MOPI', 'Judiciary', 'Election']
  return []
}
