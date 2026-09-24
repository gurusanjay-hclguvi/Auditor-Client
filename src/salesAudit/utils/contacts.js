// Contacts (saleOwner, saleOwnerManager) are plain emails in the Zoho lead; older data used
// "Name - email". Without a name, the email is shown.
export function getContactEmail(contact) {
  return contact?.split(' - ').pop()?.trim() ?? ''
}

export function getContactName(contact) {
  return contact?.split(' - ')[0]?.trim() ?? ''
}
