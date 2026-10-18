import { Router } from "express";

import {
  login,
  logout,
  me,
  register,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

import {
  requerirAutenticacion,
} from "../middlewares/auth.middleware.js";

import {
  limitarLogin,
  limitarRecuperacion,
} from "../middlewares/limitador.middleware.js";

const router = Router();


// ===================================
// RUTAS PÚBLICAS
// ===================================

router.post(
  "/register",
  register
);

router.post(
  "/login",
  limitarLogin,
  login
);

router.post(
  "/forgot-password",
  limitarRecuperacion,
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);


// ===================================
// RUTAS PRIVADAS
// ===================================

router.post(
  "/logout",
  logout
);

router.get(
  "/me",
  requerirAutenticacion,
  me
);

router.patch(
  "/password",
  requerirAutenticacion,
  changePassword
);


export default router;