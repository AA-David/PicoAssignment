import { Router } from "express";
import {
  deleteInventory,
  getAlmanac,
  getBaits,
  getEquippedBait,
  getFish,
  getInventory,
  getLuck,
  getMoney,
  getRod,
  getState,
  postBaits,
  postEquippedBait,
  postLuck,
  postRegister,
  postRod,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", postRegister);

router.route("/luck").all(requireAuth).get(getLuck).post(postLuck);
router.route("/rod").all(requireAuth).get(getRod).post(postRod);
router
  .route("/equippedBait")
  .all(requireAuth)
  .get(getEquippedBait)
  .post(postEquippedBait);
router.route("/baits").all(requireAuth).get(getBaits).post(postBaits);
router.route("/money").all(requireAuth).get(getMoney);
router.route("/almanac").all(requireAuth).get(getAlmanac);
router
  .route("/inventory")
  .all(requireAuth)
  .get(getInventory)
  .delete(deleteInventory);
router.route("/fish").all(requireAuth).get(getFish);
router.route("/state").all(requireAuth).get(getState);

export default router;
