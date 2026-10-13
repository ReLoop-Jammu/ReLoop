"use client";

import { useEffect, useState } from "react";
import { fetchAccount, type Account } from "./auth-client";

/** Loads the signed-in account once. `loading` is true until the first answer. */
export function useAccount(): { account: Account | null; loading: boolean } {
  const [state, setState] = useState<{ account: Account | null; loading: boolean }>({
    account: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    fetchAccount().then((account) => {
      if (alive) setState({ account, loading: false });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
