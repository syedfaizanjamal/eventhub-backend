import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/event.service';

export const getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await eventService.getAllEvents(page, limit, search);
    res.status(200).json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    if (error.message === 'Event not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return; // Checked by auth middleware
    const event = await eventService.createEvent(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    const event = await eventService.updateEvent(req.params.id as string, req.body, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error: any) {
    if (error.message === 'Event not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message.startsWith('Forbidden:')) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    if (error.message.startsWith('Cannot reduce')) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return;
    await eventService.deleteEvent(req.params.id as string, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Event not found') {
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
