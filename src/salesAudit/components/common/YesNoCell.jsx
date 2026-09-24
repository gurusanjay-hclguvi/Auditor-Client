import { Chip } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MUTED_TEXT } from '../../styles/tableSx'

// "Yes" becomes a clickable chip when it has a drill-down target; "No" is always inert.
function YesNoCell({ value, to }) {
  if (!value) {
    return <Chip label="No" size="small" variant="outlined" sx={{ color: MUTED_TEXT }} />
  }

  const linkProps = to ? { component: RouterLink, to, clickable: true } : {}
  return <Chip label="Yes" size="small" color="primary" variant="outlined" {...linkProps} />
}

export default YesNoCell
