import { Router } from "express";

import {
  getAhorros,
  postCambiosAhorros,
} from "../controllers/ahorro.controller.js";

const router = Router();

router.get("/", getAhorros);

router.post("/cambios", postCambiosAhorros);

export default router;
