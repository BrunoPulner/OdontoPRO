"use server";

import { Session } from "next-auth";
import { addDays, isAfter } from "date-fns";
import { ResultPermissionProps } from "./canPermission";
import { TRIAL_DAYS } from "../permissions/trial-limits";

export async function checkSubscriptionExpired(
  session: Session
): Promise<ResultPermissionProps> {
  const trailEndDate = addDays(session?.user?.createdAt!, TRIAL_DAYS);

  if (isAfter(new Date(), trailEndDate)) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: true,
      plan: null,
    };
  }

  return {
    hasPermission: true,
    planId: "TRIAL",
    expired: false,
    plan: null,
  };
}
