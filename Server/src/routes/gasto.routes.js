import { Router } from "express";

import {
  getGastos,
  postCambiosGastos,
} from "../controllers/gasto.controller.js";

const router = Router();

router.get("/", getGastos);

router.post(
  "/cambios",
  postCambiosGastos
);

export default router;