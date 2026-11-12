import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const router = Router();

// PUT /api/users/reset-password
router.put('/reset-password', async (req, res) => {
  const { targetUsername, newPassword } = req.body;

  if (!targetUsername || !newPassword) {
    return res.status(400).json({ status: 'error', message: 'Username and new password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { username: targetUsername },
      data: { password: hashedPassword },
    });
    
    res.status(200).json({ status: 'success', message: `${targetUsername} password updated successfully` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update password. User may not exist.' });
  }
});

export default router;