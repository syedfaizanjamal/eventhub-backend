import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await paymentService.handleWebhook(req.body, signature);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.statusCode === 400) {
      res.status(400).send(error.message);
      return;
    }
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string;
    const result = await paymentService.verifyPayment(bookingId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
