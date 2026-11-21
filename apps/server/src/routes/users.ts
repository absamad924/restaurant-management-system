import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const router = Router();

// PUT /api/users/reset-password
router.put('/reset-password', async (req, res) => {
  const { targetUsername, newPassword } = req.body;

  if (!targetUsername || !newPassword) {
    return res.status(400).json({ status: 'error', message: 'Username and new password are required' });
  }

  try {
    const existingUser = await prisma.orm.public.User
      .where((u) => u.username.eq(targetUsername))
      .first();

    if (!existingUser) {
      return res.status(404).json({ status: 'error', message: 'Failed to update password. User may not exist.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.orm.public.User
      .where((u) => u.username.eq(targetUsername))
      .update({ password: hashedPassword });

    res.status(200).json({ status: 'success', message: `${targetUsername} password updated successfully` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update password. User may not exist.' });
  }
});

export default router;