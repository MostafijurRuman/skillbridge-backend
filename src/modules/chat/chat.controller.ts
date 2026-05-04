import { Request, Response } from 'express';
import { processChatMessage } from './chat.service';

export const chatController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, history } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const result = await processChatMessage(message, history || []);

        res.status(200).json(result);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
