// Types for the admin support IVR & Routing builder.

export type IVRDestination =
  | "route_staff"
  | "route_department"
  | "send_sms"
  | "play_recording";

export type HoldMusic = "none" | "ambient" | "jazz" | "classical" | "upbeat";

export interface IVRMenuOption {
  id: string;
  key: string; // "1"–"9" or "0"
  label: string;
  destination: IVRDestination;
  target: string; // team / staff / link / recording name
}

export interface SmartRoutingRule {
  id: string;
  name: string;
  /** e.g. "Client tag includes VIP → Route to Management". */
  condition: string;
  enabled: boolean;
}

export interface SupportIvrConfig {
  enabled: boolean;
  greeting: string;
  afterHoursMessage: string;
  holdMusic: HoldMusic;
  menu: IVRMenuOption[];
  rules: SmartRoutingRule[];
}
