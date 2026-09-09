import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const bookingSession = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Booking created, pending payment',
      data: bookingSession,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const bookingsData = await bookingService.getMyBookings(req.user.id, page, limit, status);
    res.status(200).json({
      success: true,
      data: bookingsData.bookings,
      pagination: bookingsData.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const booking = await bookingService.getBookingById(req.params.id as string, req.user);
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const booking = await bookingService.cancelBooking(req.params.id as string, req.user);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getManageBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const bookingsData = await bookingService.getManageBookings(req.user, page, limit);
    res.status(200).json({
      success: true,
      data: bookingsData.bookings,
      pagination: bookingsData.pagination,
    });
  } catch (error) {
    next(error);
  }
};
