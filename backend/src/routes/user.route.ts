import { Router } from 'express';
import {
    editAlmanac,
    editMoney,
    getAlmanac,
    getBait,
    getLuck,
    getMoney,
    getRod,
    incrementBait,
    incrementLuck,
    incrementRod,
    register,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);

router.route('/luck').all(requireAuth).get(getLuck).post(incrementLuck);
router.route('/rod').all(requireAuth).get(getRod).post(incrementRod);
router.route('/bait').all(requireAuth).get(getBait).post(incrementBait);
router.route('/money').all(requireAuth).get(getMoney).patch(editMoney);
router.route('/almanac').all(requireAuth).get(getAlmanac).patch(editAlmanac);

export default router;
