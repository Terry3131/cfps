import ActionButton from "../components/ActionButton";
import { getUser } from "../auth/authStore";
import { getDefaultRoute } from "../auth/roleAccess";

export default function Unauthorized() {
  const user = getUser();
  const homePath = getDefaultRoute(user?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-700">
          Unauthorized
        </h1>

        <p className="mt-3 text-slate-600">
          You do not have permission to access this page.
        </p>

        <div className="mt-6 flex justify-center">
          <ActionButton to={homePath}>
            Go to My Dashboard
          </ActionButton>
        </div>
      </div>
    </div>
  );
}