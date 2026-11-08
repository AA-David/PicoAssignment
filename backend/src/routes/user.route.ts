import { Router } from 'express';
import {
    addToAlmanac,
    adjustMoney,
    buyBait,
    equipBait,
    getAlmanac,
    getEquippedBait,
    getLuckLevel,
    getMoney,
    getOwnedBaits,
    getRodLevel,
    registerUser,
    upgradeLuck,
    upgradeRod,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);

router.route('/luck').all(requireAuth).get(getLuckLevel).post(upgradeLuck);
router.route('/rod').all(requireAuth).get(getRodLevel).post(upgradeRod);
router
    .route('/equippedBait')
    .all(requireAuth)
    .get(getEquippedBait)
    .post(equipBait);
router.route('/baits').all(requireAuth).get(getOwnedBaits).post(buyBait);
router.route('/money').all(requireAuth).get(getMoney).post(adjustMoney);
router.route('/almanac').all(requireAuth).get(getAlmanac).post(addToAlmanac);

export default router;
