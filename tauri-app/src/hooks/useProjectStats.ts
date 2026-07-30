import { getProjectStats } from "../api/stats";
import { useEffect, useState } from "react";
import type { ProjectStats } from "../types";
import { apiErrorMessage } from "../utils/apiError";

export function useProjectStats(projectId: number | null, revision: number) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId == null) {
      setStats(null);
      setLoaded(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setError("");

    getProjectStats(projectId)
      .then((result) => {
        if (!cancelled) {
          setStats(result);
          setLoaded(true);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(
            apiErrorMessage(
              reason,
              "Projektinformationen konnten nicht geladen werden.",
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, revision]);

  return { stats, loaded, error };
}
