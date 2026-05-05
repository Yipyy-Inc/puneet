import { ServiceCatalogClient } from "@/components/hq/ServiceCatalogClient";
import {
  masterServices,
  locationServiceOverrides,
} from "@/data/service-catalog";
import { getLocationsByFacility } from "@/data/locations";

export default function HQServicesPage() {
  return (
    <ServiceCatalogClient
      masterServices={masterServices}
      overrides={locationServiceOverrides}
      locations={getLocationsByFacility(11)}
    />
  );
}
