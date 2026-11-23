import { Router } from "express";

import {
  getCategoriasSugeridas,
  getGastos,
  getVencimiento,
  postCambiosGastos,
  postCuotasSiguientes,
} from "../controllers/gasto.controller.js";

const router = Router();

router.get("/", getGastos);

router.get("/vencimiento", getVencimiento);

router.get(
  "/categorias-sugeridas",
  getCategoriasSugeridas
);

router.post(
  "/cambios",
  postCambiosGastos
);

router.post(
  "/cuotas-siguientes",
  postCuotasSiguientes
);

export default router;