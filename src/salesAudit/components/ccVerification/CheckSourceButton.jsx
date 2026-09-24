import { Button } from '@mui/material'
import { PictureAsPdfOutlined as PictureAsPdfOutlinedIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { paths } from '../../utils/routePaths'

// Opens the lead's CC PDF (confirmationCallLink) next to its database record.
function CheckSourceButton({ leadId, link, size }) {
  if (!link) return null
  return (
    <Button
      component={RouterLink}
      to={paths.ccVerification(leadId)}
      size={size}
      startIcon={<PictureAsPdfOutlinedIcon />}
    >
      Check source PDF
    </Button>
  )
}

export default CheckSourceButton
