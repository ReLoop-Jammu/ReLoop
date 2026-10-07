"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Handover,
  Institution,
  Item,
  Partner,
  RepairJob,
  Submission,
} from "@/features/inventory/model";
import {
  getHandovers,
  getInstitutions,
  getItems,
  getPartners,
  getRepairJobs,
  getSubmissions,
} from "@/features/inventory/store";

export type HubData = {
  items: Item[];
  partners: Partner[];
  institutions: Institution[];
  handovers: Handover[];
  repairJobs: RepairJob[];
  submissions: Submission[];
};

const EMPTY: HubData = {
  items: [],
  partners: [],
  institutions: [],
  handovers: [],
  repairJobs: [],
  submissions: [],
};

/** Loads everything the hub screens need from the data layer, with a refresh(). */
export function useHubData() {
  const [data, setData] = useState<HubData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [items, partners, institutions, handovers, repairJobs, submissions] = await Promise.all([
      getItems(),
      getPartners(),
      getInstitutions(),
      getHandovers(),
      getRepairJobs(),
      getSubmissions(),
    ]);
    setData({ items, partners, institutions, handovers, repairJobs, submissions });
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Reading browser storage must happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { ...data, loaded, refresh };
}
