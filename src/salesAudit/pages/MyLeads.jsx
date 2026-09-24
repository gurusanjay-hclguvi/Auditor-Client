import Leads from './Leads'

// The auditor's own leads: those whose auditCoordinator is the signed-in auditor.
function MyLeads() {
  return <Leads mine />
}

export default MyLeads
