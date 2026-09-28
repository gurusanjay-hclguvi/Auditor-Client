import Leads from './Leads'

// The audit coordinator's own leads (the TL has none: they monitor from All Leads).
function MyLeads() {
  return <Leads mine />
}

export default MyLeads
