import { Router } from "express";

import {
  deleteRegla,
  getReglas,
  postRegla,
  putRegla,
} from "../controllers/regla.controller.js";

const router = Router();

router.get("/", getReglas);
router.post("/", postRegla);
router.put("/:id", putRegla);
router.delete("/:id", deleteRegla);

export default router;
