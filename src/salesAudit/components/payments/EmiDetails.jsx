import { Box, Chip, Grid, Typography } from '@mui/material'
import { orEmpty } from '../../utils/formatters'
import { overlineSx } from '../../styles/tableSx'

const STATUS_COLORS = { disbursed: 'success', approved: 'primary', rejected: 'error' }

// The EMI loan application (see toEmi). The student's own email is shown at the top of the page,
// so it's left out here.
function getItems(emi) {
  return [
    { label: 'EMI Vendor', value: orEmpty(emi.vendor) },
    {
      label: 'EMI Status',
      value: emi.status ? (
        <Chip
          label={emi.status}
          size="small"
          color={STATUS_COLORS[emi.status.toLowerCase()] ?? 'default'}
          variant="outlined"
        />
      ) : (
        orEmpty(emi.status)
      ),
    },
    { label: 'Application ID', value: orEmpty(emi.applicationId) },
    { label: 'Application Created By', value: orEmpty(emi.applicationCreatedBy) },
    { label: 'Application Created On', value: orEmpty(emi.applicationCreatedOn) },
    { label: 'Applicant Name', value: orEmpty(emi.applicantName) },
    { label: 'Co-applicant Name', value: orEmpty(emi.coApplicantName) },
    { label: 'Co-applicant Email', value: orEmpty(emi.coApplicantEmail) },
    { label: 'Relationship', value: orEmpty(emi.relationship) },
    { label: 'Loan Amount', value: orEmpty(emi.loanAmount) },
    { label: 'Tenure', value: orEmpty(emi.tenure) },
    { label: 'ROI', value: orEmpty(emi.roi) },
    { label: 'Monthly EMI', value: orEmpty(emi.monthlyEmi) },
    { label: 'Disbursed Amount', value: orEmpty(emi.disbursedAmount) },
    { label: 'Disbursement Date', value: orEmpty(emi.disbursedOn) },
    { label: 'Remarks', value: orEmpty(emi.remarks), wide: true },
  ]
}

function EmiDetails({ emi }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        EMI details
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
        <Grid container spacing={2}>
          {getItems(emi).map((item) => (
            <Grid item xs={12} sm={item.wide ? 12 : 6} md={item.wide ? 12 : 3} key={item.label}>
              <Typography sx={overlineSx}>{item.label}</Typography>
              <Box sx={{ mt: 0.5, fontSize: 14, wordBreak: 'break-word' }}>{item.value}</Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}

export default EmiDetails
