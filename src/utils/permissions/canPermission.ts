"use server";

import { auth } from "@/lib/auth";
import { PlanDetailInfo } from "./get-plans";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";

// Perguntar se você tem permissão para fazer algo...
// 4 tipos de planos: BASIC / PROFESSIONAL / EXPIRED / TRIAL

export type PLAN_PROP = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service";

export interface ResultPermissionProps {
  hasPermission: boolean;
  planId: string;
  expired: boolean;
  plan: PlanDetailInfo | null;
}

interface CanPermissionProps {
  type: TypeCheck;
}

export async function canPermission({
  type,
}: CanPermissionProps): Promise<ResultPermissionProps> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: true,
      plan: null,
    };
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session?.user?.id,
    },
  });

  switch (type) {
    case "service":
      //verificar se esse user pode criar quantos serviços com base no plano dele...

      const permission = await canCreateService(subscription, session);

      return permission;

    default:
      return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
      };
  }
}
