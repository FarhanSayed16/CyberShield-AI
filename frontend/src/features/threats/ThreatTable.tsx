import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThreatsStore } from '../../stores/useThreatsStore'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Button,
  Checkbox
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import Papa from 'papaparse'
import RiskBadge from '../../components/common/RiskBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function ThreatTable() {
  const { threats, total, page, pageSize, isLoading, setPage, selectThreat } = useThreatsStore()
  const navigate = useNavigate()
  
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const handleExportCSV = () => {
    const csv = Papa.unparse(threats.map(t => ({
      ID: t.id,
      Date: new Date(t.created_at).toISOString(),
      Source: t.source,
      Type: t.type,
      ThreatType: t.threat_type,
      RiskScore: t.risk_score,
      ThreatLevel: t.threat_level,
      Snippet: t.raw_input_snippet
    })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `threat_history_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const toggleCompareMode = () => {
    setIsCompareMode(!isCompareMode)
    setCompareIds([])
  }

  const toggleCompareId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id))
    } else if (compareIds.length < 2) {
      setCompareIds([...compareIds, id])
    }
  }

  const runComparison = () => {
    if (compareIds.length === 2) {
      navigate(`/threats/${compareIds[0]}/compare/${compareIds[1]}`)
    }
  }

  if (isLoading && threats.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      <div className="flex justify-between mb-2">
        <div>
          {isCompareMode && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-theme-secondary">
                Select 2 threats to compare ({compareIds.length}/2)
              </span>
              <Button
                variant="contained"
                size="small"
                onClick={runComparison}
                disabled={compareIds.length !== 2}
                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
              >
                View Comparison
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={isCompareMode ? "contained" : "outlined"}
            size="small"
            startIcon={<CompareArrowsIcon />}
            onClick={toggleCompareMode}
            sx={isCompareMode 
              ? { bgcolor: '#1E293B', color: '#E2E8F0', border: '1px solid #334155' }
              : { borderColor: '#334155', color: '#94A3B8', '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' } }
            }
          >
            {isCompareMode ? 'Cancel Compare' : 'Compare'}
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={threats.length === 0}
            sx={{ borderColor: '#334155', color: '#94A3B8', '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' } }}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <TableContainer className="bg-transparent border border-theme-border rounded-xl mb-4 overflow-hidden flex-1">
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {isCompareMode && <TableCell sx={{ bg: '#1E293B', width: 50 }} />}
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Date/Time</TableCell>
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Source</TableCell>
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Input Snip</TableCell>
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Risk Score</TableCell>
              <TableCell sx={{ bg: '#1E293B', color: '#94A3B8', fontWeight: 600 }}>Risk Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {threats.map((row) => (
              <TableRow
                key={row.id}
                hover
                onClick={() => selectThreat(row.id)}
                className="cursor-pointer transition-colors hover:bg-theme-secondary/10"
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {isCompareMode && (
                  <TableCell onClick={(e) => toggleCompareId(row.id, e)}>
                    <Checkbox
                      checked={compareIds.includes(row.id)}
                      disabled={!compareIds.includes(row.id) && compareIds.length >= 2}
                      sx={{ color: '#475569', '&.Mui-checked': { color: '#8B5CF6' } }}
                    />
                  </TableCell>
                )}
                <TableCell className="text-theme-secondary whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString([], {
                    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="capitalize text-theme-secondary">{row.source}</TableCell>
                <TableCell className="capitalize text-theme-secondary font-medium">
                  {row.threat_type.replace('_', ' ')}
                </TableCell>
                <TableCell className="text-theme-secondary max-w-[200px] truncate" title={row.raw_input_snippet}>
                  {row.raw_input_snippet}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-theme-bg rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${row.risk_score >= 80 ? 'bg-high-risk' : row.risk_score >= 50 ? 'bg-suspicious' : row.risk_score >= 30 ? 'bg-low-risk' : 'bg-safe'}`} 
                        style={{ width: `${row.risk_score}%` }} 
                      />
                    </div>
                    <span className="text-xs text-theme-secondary w-6">{row.risk_score}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge level={row.threat_level} />
                </TableCell>
              </TableRow>
            ))}
            {threats.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 12, borderBottom: 0 }}>
                  <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-theme-bg/50 border border-theme-border flex items-center justify-center">
                      <svg className="w-10 h-10 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-theme-primary">No threats detected</h3>
                      <p className="text-sm text-theme-secondary mt-1 max-w-sm mx-auto">
                        Your environment is secure. Adjust your filters or initiate a new scan from the dashboard to analyze suspicious content.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {total > pageSize && (
        <div className="flex justify-center mt-auto py-2">
          <Pagination 
            count={Math.ceil(total / pageSize)} 
            page={page} 
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="small"
            sx={{
              '.MuiPaginationItem-root': { color: '#94A3B8' },
              '.Mui-selected': { color: '#fff' }
            }}
          />
        </div>
      )}
    </div>
  )
}
