"use client";

import { useState } from "react";
import { MemberForm, MemberList } from "@/components";
import { useDashboardFrameSender } from "../_components/DashboardProvider";

export default function MembersPage() {
  const { videoRef } = useDashboardFrameSender();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMemberAdded = () => {
    setRefreshKey((current) => current + 1);
  };

  return (
    <section className="dashboard-grid dashboard-grid-members">
      <div className="dashboard-panel">
        <div className="panel-heading">
          <h2>Member form</h2>
          <p>Capture a face from the shared camera session and store it in Supabase through Next API routes.</p>
        </div>

        <MemberForm videoRef={videoRef} onMemberAdded={handleMemberAdded} />
      </div>

      <div className="dashboard-panel">
        <div className="panel-heading">
          <h2>Member list</h2>
          <p>Loaded through app/api/members so the backend stays inside the Next.js app.</p>
        </div>

        <MemberList onRefresh={refreshKey} />
      </div>
    </section>
  );
}