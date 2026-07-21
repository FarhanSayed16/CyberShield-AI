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
    <div className="flex flex-col flex-1 animate-fade-in relative z-10 h-full mt-6 border-t border-theme-border pt-6">
      <div className="flex justify-between mb-4">
        <div>
          {isCompareMode && (
            <div className="flex items-center gap-4 bg-theme-surface/50 px-4 py-2 rounded-xl border border-theme-border backdrop-blur-sm animate-fade-in shadow-sm">
              <span className="text-xs font-bold text-theme-text-secondary uppercase tracking-wider">
                Select 2 threats to compare ({compareIds.length}/2)
              </span>
              <button
                onClick={runComparison}
                disabled={compareIds.length !== 2}
                className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Comparison
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleCompareMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isCompareMode 
                ? 'bg-high-risk/10 text-high-risk border border-high-risk/30 hover:bg-high-risk/20'
                : 'glass-panel text-theme-text-secondary border border-theme-border hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <CompareArrowsIcon fontSize="small" />
            {isCompareMode ? 'Cancel Compare' : 'Compare Mode'}
          </button>
          <button 
            onClick={handleExportCSV}
            disabled={threats.length === 0}
            className="glass-panel flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-theme-text-secondary border border-theme-border hover:text-theme-text hover:bg-theme-surface uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <DownloadIcon fontSize="small" />
            Export CSV
          </button>
        </div>
      </div>
      
      <TableContainer className="flex-1 overflow-auto rounded-xl">
        <Table stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: '0 8px', px: 1 }}>
          <TableHead>
            <TableRow>
              {isCompareMode && <TableCell sx={{ border: 'none', py: 1 }} />}
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1 }}>Date/Time</TableCell>
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1 }}>Source</TableCell>
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1 }}>Type</TableCell>
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1 }}>Input Snippet</TableCell>
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1 }}>Risk Score</TableCell>
              <TableCell sx={{ border: 'none', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 1, textAlign: 'right', pr: 4 }}>Risk Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {threats.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => selectThreat(row.id)}
                className="cursor-pointer group transition-all duration-300"
                sx={{
                  backgroundColor: 'rgba(var(--color-surface), 0.3)',
                  backdropFilter: 'blur(12px)',
                  '&:hover': {
                    backgroundColor: 'rgba(var(--color-surface), 0.8)',
                    transform: 'translateY(-1px)'
                  },
                  '& td': { border: 'none', borderTop: '1px solid rgba(var(--color-border), 0.5)', borderBottom: '1px solid rgba(var(--color-border), 0.5)', py: 1.5 },
                  '& td:first-of-type': { borderLeft: '1px solid rgba(var(--color-border), 0.5)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' },
                  '& td:last-of-type': { borderRight: '1px solid rgba(var(--color-border), 0.5)', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' },
                }}
              >
                {isCompareMode && (
                  <TableCell onClick={(e) => toggleCompareId(row.id, e)} sx={{ width: 50, pl: 2 }}>
                    <Checkbox
                      checked={compareIds.includes(row.id)}
                      disabled={!compareIds.includes(row.id) && compareIds.length >= 2}
                      sx={{ color: 'var(--color-text-secondary)', '&.Mui-checked': { color: '#3B82F6' } }}
                    />
                  </TableCell>
                )}
                <TableCell className="text-theme-text-secondary font-mono text-xs whitespace-nowrap" sx={{ pl: isCompareMode ? 0 : 3 }}>
                  {new Date(row.created_at).toLocaleString([], {
                    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="capitalize text-theme-text-secondary text-sm font-medium">
                  {row.source}
                </TableCell>
                <TableCell className="capitalize text-theme-text text-sm font-bold">
                  {row.threat_type.replace('_', ' ')}
                </TableCell>
                <TableCell className="text-theme-text-secondary text-sm max-w-[200px] truncate group-hover:text-theme-text transition-colors" title={row.raw_input_snippet}>
                  {row.raw_input_snippet}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 bg-theme-surface p-1.5 rounded-lg border border-theme-border inline-flex backdrop-blur-md">
                    <div className="w-16 h-1.5 bg-theme-border rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full ${row.risk_score >= 80 ? 'bg-high-risk' : row.risk_score >= 50 ? 'bg-suspicious' : row.risk_score >= 30 ? 'bg-low-risk' : 'bg-safe'} relative`} 
                        style={{ width: `${row.risk_score}%` }} 
                      >
                      </div>
                    </div>
                    <span className="text-xs font-bold text-theme-text w-6">{row.risk_score}</span>
                  </div>
                </TableCell>
                <TableCell sx={{ textAlign: 'right', pr: 3 }}>
                  <RiskBadge level={row.threat_level} />
                </TableCell>
              </TableRow>
            ))}
            {threats.length === 0 && (
              <TableRow>
                <TableCell colSpan={isCompareMode ? 7 : 6} align="center" sx={{ py: 12, border: 'none' }}>
                  <div className="flex flex-col items-center justify-center space-y-5 animate-fade-in">
                    <div className="w-24 h-24 rounded-3xl bg-theme-surface border border-theme-border flex items-center justify-center shadow-sm">
                      <svg className="w-12 h-12 text-theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-theme-text drop-shadow-sm tracking-tight">No threats detected</h3>
                      <p className="text-sm text-theme-text-secondary mt-2 max-w-sm mx-auto font-medium">
                        Your environment is secure. Adjust your filters or initiate a new scan from the dashboard.
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
        <div className="flex justify-center mt-6 pt-4 border-t border-theme-border relative z-10">
          <Pagination 
            count={Math.ceil(total / pageSize)} 
            page={page} 
            onChange={(_, p) => setPage(p)}
            sx={{
              '.MuiPaginationItem-root': { color: 'var(--color-text-secondary)', fontWeight: 600, fontFamily: 'inherit' },
              '.Mui-selected': { bgcolor: 'rgba(37, 99, 235, 0.2) !important', color: '#fff', border: '1px solid rgba(37, 99, 235, 0.5)' },
              '.MuiPaginationItem-root:hover': { bgcolor: 'rgba(var(--color-surface), 0.5)' }
            }}
          />
        </div>
      )}
    </div>
  )
}
