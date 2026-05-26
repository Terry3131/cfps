import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "../pages/Login";
import MemoRegistry from "../pages/MemoRegistry";
import CreateMemo from "../pages/CreateMemo";
import MemoDetails from "../pages/MemoDetails";
import ApproveMemo from "../pages/ApproveMemo";
import AssignMemo from "../pages/AssignMemo";
import CommenceMemo from "../pages/CommenceMemo";
import UpdateProgress from "../pages/UpdateProgress";
import ValidateMemo from "../pages/ValidateMemo";
import FundReleaseDesk from "../pages/FundReleaseDesk";
import ReleaseFund from "../pages/ReleaseFund";
import ValidationDesk from "../pages/ValidationDesk";
import AllFinancialApprovals from "../pages/AllFinancialApprovals";
import MonitorDashboard from "../pages/MonitorDashboard";
import CASDashboard from "../pages/CASDashboard";
import CABDashboard from "../pages/CABDashboard";
import CommandDashboard from "../pages/CommandDashboard";
import ReportsExport from "../pages/ReportsExport";
import Attachments from "../pages/Attachments";
import Notifications from "../pages/Notifications";
import UserManagement from "../pages/UserManagement";
import DesktopLogin from "../pages/DesktopLogin";
import DesktopSettings from "../pages/DesktopSettings";
import LocalMemoDrafts from "../pages/LocalMemoDrafts";
import Unauthorized from "../pages/Unauthorized";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import { isDesktopShell } from "../desktop/desktopApi";

function withRoles(element, roles) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      {element}
    </ProtectedRoute>
  );
}

function CommandDashboardRoute({ command, showAdmin = false }) {
  const { section } = useParams();

  return (
    <CommandDashboard
      command={command}
      section={section || "executive-metrics"}
      showAdmin={showAdmin}
    />
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/desktop/login" element={<DesktopLogin />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/dashboard" element={<Navigate to="/cas/dashboard" replace />} />
      <Route
        path="/projector"
        element={withRoles(
          <CASDashboard initialProjectorMode lockProjectorMode />,
          ["SUPER_ADMIN", "CAS"]
        )}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/cas/financial-approvals"
          element={withRoles(<AllFinancialApprovals />, ["SUPER_ADMIN", "CAS"])}
        />

        <Route
          path="/cas/dashboard"
          element={withRoles(<CommandDashboardRoute command="CAS" />, ["SUPER_ADMIN", "CAS"])}
        />

        <Route
          path="/cas/dashboard/:section"
          element={withRoles(<CommandDashboardRoute command="CAS" />, ["SUPER_ADMIN", "CAS"])}
        />

        <Route
          path="/aa-cas/financial-approvals"
          element={withRoles(<AllFinancialApprovals />, ["SUPER_ADMIN", "AA_CAS"])}
        />

        <Route
          path="/aa-cas/dashboard"
          element={withRoles(
            <CommandDashboardRoute command="AA-CAS" />,
            ["SUPER_ADMIN", "AA_CAS"]
          )}
        />

        <Route
          path="/aa-cas/dashboard/:section"
          element={withRoles(
            <CommandDashboardRoute command="AA-CAS" />,
            ["SUPER_ADMIN", "AA_CAS"]
          )}
        />

        <Route
          path="/paso-cas/financial-approvals"
          element={withRoles(<AllFinancialApprovals />, ["SUPER_ADMIN", "PASO_CAS"])}
        />

        <Route
          path="/paso-cas/dashboard"
          element={withRoles(
            <CommandDashboardRoute command="PASO-CAS" />,
            ["SUPER_ADMIN", "PASO_CAS"]
          )}
        />

        <Route
          path="/paso-cas/dashboard/:section"
          element={withRoles(
            <CommandDashboardRoute command="PASO-CAS" />,
            ["SUPER_ADMIN", "PASO_CAS"]
          )}
        />

        <Route
          path="/cab/dashboard"
          element={withRoles(<CABDashboard />, ["SUPER_ADMIN", "CAB", "CASH_OFFICE"])}
        />

        <Route
          path="/monitor/dashboard"
          element={withRoles(<MonitorDashboard />, ["SUPER_ADMIN", "MONITOR"])}
        />

        <Route
          path="/validator/dashboard"
          element={withRoles(<ValidationDesk />, ["SUPER_ADMIN", "VALIDATOR"])}
        />

        <Route
          path="/memos"
          element={withRoles(<MemoRegistry />, ["SUPER_ADMIN", "REGISTRY"])}
        />

        <Route
          path="/memos/create"
          element={withRoles(<CreateMemo />, ["SUPER_ADMIN", "REGISTRY"])}
        />

        <Route
          path="/memos/:id"
          element={withRoles(<MemoDetails />, ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "MONITOR", "VALIDATOR", "VIEWER"])}
        />

        <Route
          path="/memos/:id/approve"
          element={withRoles(<ApproveMemo />, ["SUPER_ADMIN", "REGISTRY"])}
        />

        <Route
          path="/memos/:id/assign"
          element={withRoles(<AssignMemo />, ["SUPER_ADMIN", "REGISTRY"])}
        />

        <Route
          path="/memos/:id/commence"
          element={withRoles(<CommenceMemo />, ["SUPER_ADMIN", "MONITOR"])}
        />

        <Route
          path="/memos/:id/progress"
          element={withRoles(<UpdateProgress />, ["SUPER_ADMIN", "MONITOR"])}
        />

        <Route
          path="/memos/:id/validate"
          element={withRoles(<ValidateMemo />, ["SUPER_ADMIN", "VALIDATOR"])}
        />

        <Route
          path="/memos/:id/attachments"
          element={withRoles(<Attachments />, ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "MONITOR", "VALIDATOR"])}
        />

        <Route
          path="/fund-release"
          element={withRoles(<FundReleaseDesk />, ["SUPER_ADMIN", "CAB", "CASH_OFFICE"])}
        />

        <Route
          path="/fund-release/:id"
          element={withRoles(<ReleaseFund />, ["SUPER_ADMIN", "CAB", "CASH_OFFICE"])}
        />

        <Route
          path="/validation"
          element={withRoles(<ValidationDesk />, ["SUPER_ADMIN", "VALIDATOR"])}
        />

        <Route
          path="/reports-export"
          element={withRoles(<ReportsExport />, ["SUPER_ADMIN"])}
        />

        <Route
          path="/users"
          element={withRoles(<UserManagement />, ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"])}
        />

        <Route
          path="/notifications"
          element={withRoles(
            <Notifications />,
            ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"]
          )}
        />

        <Route
          path="/desktop/settings"
          element={withRoles(
            isDesktopShell() ? <DesktopSettings /> : <Navigate to="/unauthorized" replace />,
            ["SUPER_ADMIN", "CAS", "REGISTRY"]
          )}
        />

        <Route
          path="/desktop/local-memos"
          element={withRoles(
            <LocalMemoDrafts />,
            ["SUPER_ADMIN", "CAS", "REGISTRY"]
          )}
        />
      </Route>
    </Routes>
  );
}
