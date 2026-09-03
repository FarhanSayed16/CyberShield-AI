import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import LoadingSpinner from '../components/common/LoadingSpinner'
import AnimatedPage from '../components/common/AnimatedPage'
import { createRule, deleteRule, getRules, toggleRule } from '../api/endpoints'
import type { CustomRule } from '../api/types'
import toast from 'react-hot-toast'

const DEFAULT_RULE: CustomRule = {
  name: '', description: '', is_active: true,
  condition: { field: 'url', operator: 'contains', value: '' },
  action: { override_score: null, override_level: null, add_indicator: null }
}

export default function RulesPage() {
  const [rules, setRules] = useState<CustomRule[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<CustomRule>(DEFAULT_RULE)

  const fetchRules = async () => {
    try {
      setLoading(true)
      setRules(await getRules())
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleSave = async () => {
    try {
      const payload = {
        ...editingRule,
        action: {
          override_score: editingRule.action.override_score ? Number(editingRule.action.override_score) : null,
          override_level: editingRule.action.override_level || null,
          add_indicator: editingRule.action.add_indicator || null
        }
      }
      
      await createRule(payload)
      toast.success('Rule saved')
      setOpenDialog(false)
      fetchRules()
    } catch (err: any) {
      toast.error('Failed to save rule: ' + (err?.response?.data?.detail?.[0]?.msg || 'Unknown error'))
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this rule?')) return
    try {
      await deleteRule(id)
      toast.success('Rule deleted')
      fetchRules()
    } catch (err) {
      toast.error('Failed to delete rule')
    }
  }

  const handleToggle = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleRule(id, !current)
      fetchRules()
    } catch (err) {
      toast.error('Failed to toggle rule')
    }
  }

  const openNewDialog = () => {
    setEditingRule(DEFAULT_RULE)
    setOpenDialog(true)
  }

  return (
    <AnimatedPage className="space-y-6 pb-6">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
           <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Custom Rules Engine</Typography>
           <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
             Create deterministic logic to override AI threat scoring.
           </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openNewDialog} color="primary">
          New Rule
        </Button>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Rule Name</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Condition</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Action</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>Manage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id} hover sx={{ '& td': { borderColor: 'divider' } }}>
                  <TableCell>
                    <Switch checked={rule.is_active} onChange={(e) => handleToggle(rule.id!, rule.is_active, e as any)} color="success" />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{rule.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{rule.description}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary' }}>
                    If <b>{rule.condition.field}</b> <i>{rule.condition.operator}</i> "<span style={{color: '#FCD34D'}}>{rule.condition.value}</span>"
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary' }}>
                    {rule.action.override_score !== null && <span style={{display: 'block'}}>Score → {rule.action.override_score}</span>}
                    {rule.action.override_level && <span style={{display: 'block'}}>Level → {rule.action.override_level}</span>}
                    {rule.action.add_indicator && <span style={{display: 'block'}}>+ Indicator: {rule.action.add_indicator}</span>}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleDelete(rule.id!, e)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No custom rules defined.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Editor Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary', minWidth: 500, border: 1, borderColor: 'divider' } }}>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Create Custom Rule</DialogTitle>
        <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField 
            label="Rule Name" fullWidth size="small"
            value={editingRule.name} onChange={e => setEditingRule({...editingRule, name: e.target.value})}
          />
          <TextField 
            label="Description" fullWidth size="small"
            value={editingRule.description || ''} onChange={e => setEditingRule({...editingRule, description: e.target.value})}
          />

          <Typography variant="subtitle2" color="primary" sx={{ mt: 2 }}>IF Condition</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Field" size="small" value={editingRule.condition.field}
              onChange={e => setEditingRule({...editingRule, condition: {...editingRule.condition, field: e.target.value}})}
              sx={{ flex: 1 }}
            >
              <MenuItem value="url">URL</MenuItem>
              <MenuItem value="domain">Domain</MenuItem>
              <MenuItem value="threat_type">Type</MenuItem>
              <MenuItem value="source">Source</MenuItem>
            </TextField>
            <TextField select label="Operator" size="small" value={editingRule.condition.operator}
              onChange={e => setEditingRule({...editingRule, condition: {...editingRule.condition, operator: e.target.value}})}
              sx={{ flex: 1 }}
            >
              <MenuItem value="contains">Contains</MenuItem>
              <MenuItem value="equals">Equals</MenuItem>
              <MenuItem value="starts_with">Starts With</MenuItem>
              <MenuItem value="ends_with">Ends With</MenuItem>
            </TextField>
          </Box>
          <TextField 
            label="Value" fullWidth size="small"
            value={editingRule.condition.value} onChange={e => setEditingRule({...editingRule, condition: {...editingRule.condition, value: e.target.value}})}
          />

          <Typography variant="subtitle2" color="primary" sx={{ mt: 2 }}>THEN Action (Overrides)</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Override Score (0-100)" type="number" size="small" sx={{ flex: 1 }}
              value={editingRule.action.override_score ?? ''} 
              onChange={e => setEditingRule({...editingRule, action: {...editingRule.action, override_score: e.target.value === '' ? null : Number(e.target.value)}})}
            />
            <TextField select label="Override Level" size="small" sx={{ flex: 1 }}
              value={editingRule.action.override_level ?? ''} 
              onChange={e => setEditingRule({...editingRule, action: {...editingRule.action, override_level: e.target.value || null}})}
            >
              <MenuItem value="">[None]</MenuItem>
              <MenuItem value="Safe">Safe</MenuItem>
              <MenuItem value="Suspicious">Suspicious</MenuItem>
              <MenuItem value="High Risk">High Risk</MenuItem>
            </TextField>
          </Box>
          <TextField 
            label="Append custom Indicator (optional)" fullWidth size="small"
            value={editingRule.action.add_indicator ?? ''} 
            onChange={e => setEditingRule({...editingRule, action: {...editingRule.action, add_indicator: e.target.value || null}})}
          />

        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Save Rule</Button>
        </DialogActions>
      </Dialog>
    </AnimatedPage>
  )
}
