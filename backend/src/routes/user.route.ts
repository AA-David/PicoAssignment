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
    login,
    register,
} from '../controllers/user.controller.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);

router.route('/luck').get(getLuck).post(incrementLuck);
router.route('/rod').get(getRod).post(incrementRod);
router.route('/bait').get(getBait).post(incrementBait);
router.route('/money').get(getMoney).patch(editMoney);
router.route('/almanac').get(getAlmanac).patch(editAlmanac);

export default router;
