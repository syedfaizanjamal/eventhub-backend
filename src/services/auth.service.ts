import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ROLES } from '../constants';
import { AppError } from '../utils/appError';

export const registerUser = async (data: any) => {
  if (data.role === ROLES.ADMIN) {
    throw new AppError('Cannot register as ADMIN', 409);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || ROLES.CUSTOMER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

export const loginUser = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokenPayload = {
    id: user.id,
    role: user.role,
  };

  const accessToken = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const { password, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token: accessToken,
    accessToken,
    refreshToken,
  };
};

export const refreshUserToken = async (refreshToken: string) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new AppError('User not found or account deactivated', 401);
  }

  const tokenPayload = {
    id: user.id,
    role: user.role,
  };

  const newAccessToken = generateToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return {
    token: newAccessToken,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};
