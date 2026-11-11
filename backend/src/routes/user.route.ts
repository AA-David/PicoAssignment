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
  postAlmanac,
  postBaits,
  postEquippedBait,
  postInventory,
  postLuck,
  postMoney,
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
router.route("/money").all(requireAuth).get(getMoney).post(postMoney);
router.route("/almanac").all(requireAuth).get(getAlmanac).post(postAlmanac);
router
  .route("/inventory")
  .all(requireAuth)
  .get(getInventory)
  .post(postInventory)
  .delete(deleteInventory);
router.route("/fish").all(requireAuth).get(getFish);
router.route("/state").all(requireAuth).get(getState);

export default router;
