import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { sendWelcomeEmail } from '../utils/email';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.registerUser(req.body);
    await sendWelcomeEmail(user.email, user.name);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user },
    });
  } catch (error: any) {
    if (error.message === 'Email is already registered' || error.message === 'Cannot register as ADMIN') {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.loginUser(req.body);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data,
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
