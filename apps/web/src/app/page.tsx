/**
 * Scaffold landing page. The web app carries NO business logic — the state machine, RBAC,
 * and numbering all live behind the NestJS API. Routes (encode form, queue, dashboard,
 * employees) are added per docs/implementation/frontend/.
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">11FTC Ticketing</h1>
      <p className="mt-2 text-gray-600">
        Scaffold. See <code>docs/implementation/frontend/</code> for the route plan.
      </p>
    </main>
  );
}
