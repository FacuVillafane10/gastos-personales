import { Router } from "express";

import { getResumenMensual } from "../controllers/resumen.controller.js";

const router = Router();

router.get("/", getResumenMensual);

export default router;