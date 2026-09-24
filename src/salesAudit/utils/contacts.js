// Contacts are stored as "Name - email" (saleOwner, saleOwnerManager).
export function getContactEmail(contact) {
  return contact?.split(' - ').pop()?.trim() ?? ''
}

export function getContactName(contact) {
  return contact?.split(' - ')[0]?.trim() ?? ''
}
