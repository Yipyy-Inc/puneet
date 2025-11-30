import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { InfoCard } from "@/components/ui/DateCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building, Mail, Phone, Heart } from "lucide-react";
import { clients } from "@/data/clients";

interface ClientModalProps {
  client: (typeof clients)[number];
}

export function ClientModal({ client }: ClientModalProps) {
  return (
    <DetailsModal
      title={client.name}
      badges={[
        <StatusBadge
          key="status"
          type="status"
          value={client.status}
          showIcon
        />,
      ]}
      linkHref={`/dashboard/clients/${client.id}`}
      linkText="View Full Profile"
    >
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <InfoCard
            title="Facility"
            value={client.facility}
            subtitle="Associated facility"
            icon={Building}
            variant="primary"
          />
          <InfoCard
            title="Status"
            value={client.status}
            subtitle="Account status"
            icon={Heart}
            variant="info"
          />
        </div>

        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5 pb-5">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{client.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10 text-success">
                <Heart className="h-4 w-4" />
              </div>
              Pets ({client.pets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {client.pets.length > 0 ? (
              <div className="space-y-2.5">
                {client.pets.map((pet, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Heart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{pet.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">{pet.type}</span> •{" "}
                          {pet.age} {pet.age === 1 ? "year" : "years"} old
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {pet.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  No pets registered for this client.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DetailsModal>
  );
}
