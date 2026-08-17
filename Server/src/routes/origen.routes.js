import { Router } from "express";

import {
  getOrigenes,
  getOrigen,
  postOrigen,
  putOrigen,
  deleteOrigen,
} from "../controllers/origen.controller.js";

const router = Router();

router.get("/", getOrigenes);
router.get("/:id", getOrigen);
router.post("/", postOrigen);
router.put("/:id", putOrigen);
router.delete("/:id", deleteOrigen);

export default router;