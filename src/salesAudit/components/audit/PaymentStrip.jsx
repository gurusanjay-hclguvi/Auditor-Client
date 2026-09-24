import { Box, Grid, Paper, Typography } from '@mui/material'
import CreditStatusCell from '../leads/CreditStatusCell'
import { paths } from '../../utils/routePaths'
import { overlineSx } from '../../styles/tableSx'

const CREDITS = [
  { key: 'bookingAmount', label: 'Down payment', category: 'downPayment' },
  { key: 'part1', label: 'Initial payment', category: 'partial' },
  { key: 'remainingBalance', label: 'Remaining balance', category: 'remainingBalance' },
]

// The three credits that decide payment verification, each linked to its transactions.
function PaymentStrip({ lead }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {CREDITS.map((credit) => (
          <Grid item xs={12} sm={4} key={credit.key}>
            <Typography sx={overlineSx}>{credit.label}</Typography>
            <Box sx={{ mt: 0.75 }}>
              <CreditStatusCell
                credit={lead.credits?.[credit.key]}
                to={paths.studentPayments(lead.id, credit.category)}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  )
}

export default PaymentStrip
