import React from "react";

const ActivitiesPastPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Past activities</h2>
      <p className="text-sm text-gray-500">
        Past activities will appear here once you&apos;ve attended a camp or
        class.
      </p>

      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        You don&apos;t have any past activities yet.
      </div>
    </div>
  );
};

export default ActivitiesPastPage;
export { ActivitiesPastPage };
