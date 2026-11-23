import { Router } from "express";

import {
  getGastos,
  postCambiosGastos,
  postCuotasSiguientes,
} from "../controllers/gasto.controller.js";

const router = Router();

router.get("/", getGastos);

router.post(
  "/cambios",
  postCambiosGastos
);

router.post(
  "/cuotas-siguientes",
  postCuotasSiguientes
);

export default router;