import { Router } from "express";

import {
  deleteFijo,
  getFijos,
  putFijo,
} from "../controllers/gastoFijo.controller.js";

const router = Router();

router.get("/", getFijos);
router.put("/:id", putFijo);
router.delete("/:id", deleteFijo);

export default router;
