import {
  Routes,
  Route,
  Navigate,
} from "react-router";

import Dashboard from "./pages/Dashboard";
import Movimientos from "./pages/Movimientos";
import Ingresos from "./pages/Ingresos";
import Ahorros from "./pages/Ahorros";
import Administrar from "./pages/Administrar";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import CambiarPassword from "./pages/CambiarPassword";

import RutaProtegida from "./components/RutaProtegida";
import OlvidePassword from "./pages/OlvidePassword";
import RestablecerPassword from "./pages/RestablecerPassword";

function App() {
  return (
    <Routes>

      {/* LOGIN - RUTA PÚBLICA */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* OLVIDÉ CONTRASEÑA - RUTA PÚBLICA */}

      <Route
        path="/olvide-password"
        element={<OlvidePassword />}
      />


      {/* RESTABLECER CONTRASEÑA - RUTA PÚBLICA */}

      <Route
        path="/restablecer-password"
        element={<RestablecerPassword />}
      />
      {/* REGISTRO - RUTA PÚBLICA */}

      <Route
        path="/registro"
        element={<Registro />}
      />


      {/* DASHBOARD - RUTA PRIVADA */}

      <Route
        path="/"
        element={
          <RutaProtegida>
            <Dashboard />
          </RutaProtegida>
        }
      />


      {/* CAMBIAR CONTRASEÑA - RUTA PRIVADA */}

      <Route
        path="/cambiar-password"
        element={
          <RutaProtegida>
            <CambiarPassword />
          </RutaProtegida>
        }
      />


      {/* MOVIMIENTOS - RUTA PRIVADA */}

      <Route
        path="/origen/:id"
        element={
          <RutaProtegida>
            <Movimientos />
          </RutaProtegida>
        }
      />


      {/* INGRESOS - RUTA PRIVADA */}

      <Route
        path="/ingresos"
        element={
          <RutaProtegida>
            <Ingresos />
          </RutaProtegida>
        }
      />


      {/* AHORROS - RUTA PRIVADA */}

      <Route
        path="/ahorros"
        element={
          <RutaProtegida>
            <Ahorros />
          </RutaProtegida>
        }
      />


      {/* ORÍGENES Y CATEGORÍAS - RUTA PRIVADA */}

      <Route
        path="/administrar"
        element={
          <RutaProtegida>
            <Administrar />
          </RutaProtegida>
        }
      />


      {/* CUALQUIER RUTA DESCONOCIDA */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;