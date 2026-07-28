import { Router } from 'express';
import * as emailController from '../controllers/email.controller';

const router = Router();

router.post('/schedule', emailController.scheduleEmails);
router.get('/scheduled', emailController.getScheduled);
router.get('/sent', emailController.getSent);

export default router;
