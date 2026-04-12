import type { AbandonmentRecoverySettings } from "@/types/unfinished-booking";

/**
 * Default abandonment recovery settings for a facility.
 * Each step has a pre-written template; adjust channel/delay per step.
 * The payment step defaults to "both" (email + SMS) with a 1-hour delay
 * since it has the highest recovery rate.
 */
export const DEFAULT_ABANDONMENT_RECOVERY_SETTINGS: AbandonmentRecoverySettings =
  {
    enabled: true,
    defaultChannel: "email",
    defaultDelayHours: 2,
    stepRules: {
      service_selection: {
        enabled: false, // Too early — likely just browsing
        channel: "inherit",
        delayHours: "inherit",
        emailSubject: "Still looking for the right service for {{pet_name}}?",
        emailBody: `Hi {{client_name}},

We noticed you were browsing our services for {{pet_name}} but didn't complete your booking.

We offer daycare, boarding, grooming, training, and more — all tailored for your pet's needs.

Ready to find the perfect fit? Resume your booking here:
{{resume_link}}

We'd love to have {{pet_name}} with us!

Warm regards,
{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, still looking for a service for {{pet_name}}? Resume your booking: {{resume_link}}",
      },

      pet_selection: {
        enabled: true,
        channel: "inherit",
        delayHours: "inherit",
        emailSubject: "Your booking for {{pet_name}} is waiting!",
        emailBody: `Hi {{client_name}},

You started a booking at {{facility_name}} but didn't quite finish!

Pick up right where you left off — it only takes a few more minutes to complete it.

Resume your booking: {{resume_link}}

See you soon,
{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, your booking at {{facility_name}} is waiting! Resume here: {{resume_link}}",
      },

      date_and_details: {
        enabled: true,
        channel: "inherit",
        delayHours: "inherit",
        emailSubject:
          "Don't forget to pick a date for {{pet_name}}'s {{service}}!",
        emailBody: `Hi {{client_name}},

It looks like you didn't finish selecting dates for {{pet_name}}'s {{service}} at {{facility_name}}.

Availability fills up fast — lock in your preferred dates before they're gone!

Resume your booking: {{resume_link}}

Talk soon,
{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, don't forget to choose dates for {{pet_name}}'s {{service}}! Resume: {{resume_link}}",
      },

      add_ons: {
        enabled: true,
        channel: "inherit",
        delayHours: "inherit",
        emailSubject: "Finish customizing {{pet_name}}'s stay!",
        emailBody: `Hi {{client_name}},

You were so close! Just select your add-ons to complete {{pet_name}}'s {{service}} booking at {{facility_name}}.

Optional extras like additional playtime and grooming are available to make {{pet_name}}'s stay even better.

Resume your booking: {{resume_link}}

See you soon,
{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, finish choosing add-ons for {{pet_name}}'s {{service}}! Resume: {{resume_link}}",
      },

      forms: {
        enabled: true,
        channel: "inherit",
        delayHours: "inherit",
        emailSubject: "One last step: complete {{pet_name}}'s intake forms",
        emailBody: `Hi {{client_name}},

Your {{service}} booking for {{pet_name}} is almost done — we just need you to complete a quick intake form so we can take the best care of {{pet_name}}.

It only takes a few minutes. Complete it here:
{{resume_link}}

Thank you,
{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, fill out {{pet_name}}'s intake form to complete your booking: {{resume_link}}",
      },

      review: {
        enabled: true,
        channel: "inherit",
        delayHours: "inherit",
        emailSubject:
          "Review and confirm {{pet_name}}'s {{service}} — almost there!",
        emailBody: `Hi {{client_name}},

You're just one step away from confirming {{pet_name}}'s {{service}} at {{facility_name}}!

Everything looks great — just review the details and hit confirm to secure your spot.

Resume your booking: {{resume_link}}

We can't wait to meet {{pet_name}}!

{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, confirm {{pet_name}}'s {{service}} booking to secure your spot! {{resume_link}}",
      },

      payment: {
        enabled: true,
        channel: "both", // Highest recovery rate — use both channels
        delayHours: 1, // Act fast — payment intent is high
        emailSubject:
          "Complete your payment to secure {{pet_name}}'s booking",
        emailBody: `Hi {{client_name}},

Your {{service}} booking for {{pet_name}} is almost confirmed — just complete the payment to lock it in!

Your spot is being held, but availability is limited.

Complete your booking: {{resume_link}}

Questions? Reply to this email or call us directly.

{{facility_name}}`,
        smsBody:
          "Hi {{client_name}}, complete payment for {{pet_name}}'s {{service}} before your spot is released: {{resume_link}}",
      },
    },
  };
