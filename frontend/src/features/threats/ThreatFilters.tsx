import { MenuItem, Select, FormControl } from '@mui/material'
import { useThreatsStore } from '../../stores/useThreatsStore'

const THREAT_TYPES = ['All', 'phishing', 'malicious_url', 'prompt_injection', 'deepfake', 'behavior_anomaly', 'benign']
const THREAT_LEVELS = ['All', 'High Risk', 'Suspicious', 'Safe']

export default function ThreatFilters() {
  const { filterType, filterLevel, setFilters } = useThreatsStore()

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <span className="text-xs text-theme-secondary mb-1">Threat Feature</span>
        <Select
          value={filterType}
          onChange={(e) => setFilters(e.target.value, filterLevel)}
          displayEmpty
          className="bg-theme-bg/50 text-sm text-theme-primary"
          sx={{
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' },
            '.MuiSvgIcon-root': { color: '#94A3B8' },
          }}
        >
          {THREAT_TYPES.map(type => (
            <MenuItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <span className="text-xs text-theme-secondary mb-1">Risk Level</span>
        <Select
          value={filterLevel}
          onChange={(e) => setFilters(filterType, e.target.value)}
          displayEmpty
          className="bg-theme-bg/50 text-sm text-theme-primary"
          sx={{
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' },
            '.MuiSvgIcon-root': { color: '#94A3B8' },
          }}
        >
          {THREAT_LEVELS.map(level => (
            <MenuItem key={level} value={level}>{level}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}
