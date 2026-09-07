import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';
import { sendBookingCancellationEmail } from '../utils/email';

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const result = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Booking created, pending payment',
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'Event not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message === 'Event date has already passed' || error.message === 'Not enough seats available') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const result = await bookingService.getMyBookings(req.user.id, page, limit, status);
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const booking = await bookingService.getBookingById(req.params.id as string, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    if (error.message === 'Booking not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message.startsWith('Forbidden:')) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const booking = await bookingService.cancelBooking(req.params.id as string, req.user.id, req.user.role);
    
    // Send cancellation email
    await sendBookingCancellationEmail(
      (booking as any).user.email,
      (booking as any).user.name,
      (booking as any).event,
      booking
    );

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error: any) {
    if (error.message === 'Booking not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message.startsWith('Forbidden:')) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    if (error.message.startsWith('Conflict:')) {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAdminBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await bookingService.getAdminBookings(page, limit);
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizerBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await bookingService.getOrganizerBookings(req.user.id, page, limit);
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
