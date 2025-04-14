"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { start } from "repl";
import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { cancelAppointment } from "../../_actions/cancel-appointment";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DialogAppointment } from "./dialog-appointment";
import { ButtonPickerAppointment } from "./button-date";

export type appointmentWithService = Prisma.AppointmentGetPayload<{
  include: {
    service: true;
  };
}>;

interface AppointmentsListProps {
  times: string[];
}

export function AppointmentsList({ times }: AppointmentsListProps) {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] =
    useState<appointmentWithService | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["get-appointments", date],
    queryFn: async () => {
      // Aqui vamos buscar da nossa rota..

      let activeDate = date;

      if (!activeDate) {
        const today = format(new Date(), "yyyy-MM-dd"); // Ano - mes - dia
        activeDate = today;
      }

      const url = `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments?date=${activeDate}`;

      const response = await fetch(url);

      const json = (await response.json()) as appointmentWithService[];

      console.log(json[0]);

      if (!response.ok) {
        return [];
      }

      return json;
    },
    staleTime: 20000, //20 segundos de staleTime
    refetchInterval: 50000,
  });

  //Montar occupantMap slot > appointment
  //Se um agendamento começa no time (15:00) e tem requiredSlot de 2 então
  // occupantMap["15:00", appointment] ocuppantMap["15:30", appointment]

  const occupantMap: Record<string, appointmentWithService> = {};

  if (data && data.length > 0) {
    // Preencher os slots ocupados...
    for (const appointment of data) {
      //calcular quantos slots necessarios ocupa o agendamento
      const requiredSlot = Math.ceil(appointment.service.duration / 30);

      //Descobrir qual é o indice do nosso array de horarios esse agendamento começa
      const startIndex = times.indexOf(appointment.time);

      //Se encontrou o index
      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlot; i++) {
          const slotIndex = startIndex + i;

          if (slotIndex < times.length) {
            // occupantMap recebe index
            occupantMap[times[slotIndex]] = appointment;
          }
        }
      }
    }
  }

  async function handleCancelAppointment(appointmentId: string) {
    const response = await cancelAppointment({ appointmentId: appointmentId });

    if (response.error) {
      toast.error(response.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
    refetch();
    toast.success(response.data);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl md:text-2xl font-bold">
            Agendamentos
          </CardTitle>

          <ButtonPickerAppointment />
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[calc(100vh-13rem)] lg:h-[calc(100vh-15rem)] pr-4">
            {isLoading ? (
              <p>Carregando agenda...</p>
            ) : (
              times.map((slot) => {
                const occupant = occupantMap[slot];

                if (occupant) {
                  return (
                    <div
                      key={slot}
                      className="flex items-center py-2 border-t last:border-b"
                    >
                      <div className="w-16 text-sm font-semibold">{slot}</div>
                      <div className="flex-1 text-sm text-gray-500">
                        <div className="font-semibold"> {occupant.name}</div>
                        <div className="text-sm text-gray-500">
                          {occupant.phone}
                        </div>
                      </div>

                      <div className="ml-auto">
                        <div className="flex ">
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDetailAppointment(occupant)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelAppointment(occupant.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={slot}
                    className="flex items-center py-2 border-t last:border-b"
                  >
                    <div className="w-16 text-sm font-semibold">{slot}</div>
                    <div className="flex-1 text-sm text-gray-500">
                      Disponível
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <DialogAppointment appointment={detailAppointment} />
    </Dialog>
  );
}
