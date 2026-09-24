import { Button } from '@mui/material'
import {
  HeadphonesOutlined as HeadphonesOutlinedIcon,
  PictureAsPdfOutlined as PictureAsPdfOutlinedIcon,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { getPdfSource } from '../../utils/pdfSource'
import { paths } from '../../utils/routePaths'

// Opens the lead's CC source next to its database record; named after what the source is.
function CheckSourceButton({ leadId, link, size }) {
  if (!link) return null
  const isRecording = getPdfSource(link)?.kind === 'audio'
  return (
    <Button
      component={RouterLink}
      to={paths.ccVerification(leadId)}
      size={size}
      startIcon={isRecording ? <HeadphonesOutlinedIcon /> : <PictureAsPdfOutlinedIcon />}
    >
      {isRecording ? 'Check source recording' : 'Check source PDF'}
    </Button>
  )
}

export default CheckSourceButton
