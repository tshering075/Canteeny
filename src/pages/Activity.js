import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { getActivities, deleteActivity, deleteActivitiesByUser } from '../services/activityService';

function formatTimestamp(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString();
}

function Activity() {
  const [activities, setActivities] = useState(getActivities());
  const [userFilter, setUserFilter] = useState('');
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    setActivities(getActivities());
  }, []);

  const userIds = useMemo(() => {
    const set = new Set(activities.map((a) => a.userId).filter(Boolean));
    return Array.from(set).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    let list = activities;
    if (userFilter) {
      list = list.filter((a) => a.userId?.toLowerCase() === userFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.userId?.toLowerCase().includes(q) ||
          a.action?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activities, userFilter, search]);

  const handleDeleteActivity = (id) => {
    if (window.confirm('Delete this activity?')) {
      deleteActivity(id);
      refresh();
    }
  };

  const handleDeleteAllForUser = () => {
    if (!userFilter) return;
    const count = filtered.length;
    if (window.confirm(`Delete all ${count} activities for user "${userFilter}"?`)) {
      deleteActivitiesByUser(userFilter);
      setUserFilter('');
      refresh();
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View who logged in and what changes were made in the app.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>User</InputLabel>
          <Select
            value={userFilter}
            label="User"
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <MenuItem value="">All users</MenuItem>
            {userIds.map((uid) => (
              <MenuItem key={uid} value={uid}>
                {uid}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {userFilter && filtered.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={handleDeleteAllForUser}
          >
            Delete all for {userFilter}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell align="right" sx={{ width: 60 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {activities.length === 0
                    ? 'No activity recorded yet.'
                    : 'No matching activities.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(a.timestamp)}</TableCell>
                  <TableCell>{a.userId || '-'}</TableCell>
                  <TableCell>{a.action || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteActivity(a.id)}
                      title="Delete this activity"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Activity;
