import { getUser } from "../auth/authStore";

export default function RoleGuard({
  roles = [],
  fallback = null,
  children,
}) {
  const user = getUser();

  if (!user?.role) {
    return fallback;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}