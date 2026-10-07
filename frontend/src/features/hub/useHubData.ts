"use client";

import { useCallback, useEffect, useState } from "react";
import type { Handover, Institution, Item, Partner, RepairJob } from "@/features/inventory/model";
import {
  getHandovers,
  getInstitutions,
  getItems,
  getPartners,
  getRepairJobs,
} from "@/features/inventory/store";

export type HubData = {
  items: Item[];
  partners: Partner[];
  institutions: Institution[];
  handovers: Handover[];
  repairJobs: RepairJob[];
};

const EMPTY: HubData = {
  items: [],
  partners: [],
  institutions: [],
  handovers: [],
  repairJobs: [],
};

/** Loads everything the hub screens need from the data layer, with a refresh(). */
export function useHubData() {
  const [data, setData] = useState<HubData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [items, partners, institutions, handovers, repairJobs] = await Promise.all([
      getItems(),
      getPartners(),
      getInstitutions(),
      getHandovers(),
      getRepairJobs(),
    ]);
    setData({ items, partners, institutions, handovers, repairJobs });
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Reading browser storage must happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { ...data, loaded, refresh };
}
