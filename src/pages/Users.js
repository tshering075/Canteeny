import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAuth } from '../context/AuthContext';
import { addActivity } from '../services/activityService';

function Users() {
  const { getUsers, createUser, deleteUser, updateUserPermissions, updatePassword, canManageUsers, isAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', password: '', canRead: true, canWrite: false });
  const [changePwdUser, setChangePwdUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const refresh = useCallback(async () => {
    const u = await getUsers();
    setUsers(u || []);
  }, [getUsers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleOpen = () => {
    setForm({ userId: '', password: '', canRead: true, canWrite: false });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    try {
      await createUser(form);
      addActivity(currentUser?.userId || 'Unknown', `Created user: ${form.userId}`);
      await refresh();
      handleClose();
    } catch (err) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleDelete = async (user) => {
    if (user.userId?.toLowerCase() === 'admin') {
      alert('Cannot delete admin user');
      return;
    }
    if (window.confirm(`Delete user "${user.userId}"?`)) {
      try {
        await deleteUser(user.id);
        addActivity(currentUser?.userId || 'Unknown', `Deleted user: ${user.userId}`);
        await refresh();
      } catch (err) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const canChangePasswordFor = (user) => {
    if (isAdmin) return true;
    return (user.userId || '').toLowerCase() === (currentUser?.userId || '').toLowerCase();
  };

  const handleChangePassword = () => {
    setChangePwdUser(null);
    setNewPassword('');
  };

  const handleChangePasswordSubmit = async () => {
    if (!changePwdUser || !newPassword.trim()) return;
    try {
      await updatePassword(changePwdUser.id, newPassword.trim());
      addActivity(currentUser?.userId || 'Unknown', `Changed password for ${changePwdUser.userId}`);
      await refresh();
      handleChangePassword();
    } catch (err) {
      alert(err.message || 'Failed to change password');
    }
  };

  const handlePermissionChange = async (user, field, value) => {
    if (user.userId?.toLowerCase() === 'admin') return;
    try {
      await updateUserPermissions(user.id, { canRead: user.canRead, canWrite: user.canWrite, [field]: value });
      addActivity(currentUser?.userId || 'Unknown', `Updated permissions for ${user.userId}: ${field}=${value}`);
      await refresh();
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  if (!canManageUsers) {
    return (
      <Box>
        <Typography color="error">Access denied. Only users with write access can manage users.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Create users and assign read/write access. Any user with write access can manage this section.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Create User
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell align="center">Read</TableCell>
              <TableCell align="center">Write</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.userId}</TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={!!user.canRead}
                    disabled={user.userId?.toLowerCase() === 'admin'}
                    onChange={(e) => handlePermissionChange(user, 'canRead', e.target.checked)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={!!user.canWrite}
                    disabled={user.userId?.toLowerCase() === 'admin'}
                    onChange={(e) => handlePermissionChange(user, 'canWrite', e.target.checked)}
                  />
                </TableCell>
                <TableCell align="right">
                  {canChangePasswordFor(user) && (
                    <IconButton
                      size="small"
                      onClick={() => setChangePwdUser(user)}
                      title="Change password"
                    >
                      <LockResetIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(user)}
                    disabled={user.userId?.toLowerCase() === 'admin'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!changePwdUser} onClose={handleChangePassword} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {changePwdUser && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isAdmin ? `Changing password for: ${changePwdUser.userId}` : 'Enter your new password'}
              </Typography>
              <TextField
                fullWidth
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                autoFocus
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleChangePassword}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleChangePasswordSubmit}
            disabled={!newPassword.trim()}
          >
            Update password
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="User ID"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.canRead}
                onChange={(e) => setForm({ ...form, canRead: e.target.checked })}
              />
            }
            label="Read access"
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.canWrite}
                onChange={(e) => setForm({ ...form, canWrite: e.target.checked })}
              />
            }
            label="Write access"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.userId?.trim() || !form.password}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Users;
