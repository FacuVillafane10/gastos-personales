import { Router } from "express";

import {
  getIngresos,
  postCambiosIngresos,
} from "../controllers/ingreso.controller.js";

const router = Router();

router.get("/", getIngresos);

router.post("/cambios", postCambiosIngresos);

export default router;
