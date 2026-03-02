# Booking Data Handling (Dev)

Shared components in this folder are **controlled**: they receive state and callbacks from the parent wizard. The parent is responsible for writing all selections to the correct stores.

## Where to persist

1. **Booking record**  
   On submit (or on step change if you persist drafts), write:
   - Service type and selections (e.g. `service`, `serviceType`, `groomingStyle`, `selectedGroomingPackage`, `groomingAddOns`)
   - Add-ons: `extraServices` (serviceId, quantity, petId)
   - Room choice: `kennel` / room assignments
   - Tip: include in payment or `tipAmount` on booking
   - Dates/times: `startDate`, `endDate`, `checkInTime`, `checkOutTime`, `daycareSelectedDates`, `daycareDateTimes`, etc.

2. **Pet stay instructions**  
   From `FeedingScheduleForm` and `MedicationForm`:
   - `feedingSchedule`: `FeedingScheduleItem[]` → booking.`feedingSchedule`
   - `medications`: `MedicationItem[]` → booking.`medications`  
   These are part of the same booking payload; link by `petId` on each item.

3. **Forms module**  
   Required forms (agreements, vaccination) are completed in the documents/pet profile flows. When the user completes a form:
   - Store submission/approval (e.g. document ID or “signed” flag) and link to **booking + pet** so the RequirementsGateStep can show completed/missing and so the booking is approved once all are done.

## Flow order (config-driven)

Use `@/lib/booking-step-config` for step order:

- **Daycare:** schedule → add-ons → (optional feeding/meds) → forms → tip → confirm  
- **Boarding:** schedule → room type → add-ons → feeding/meds → forms → tip → confirm  
- **Grooming:** package → date/time → add-ons → forms → tip → confirm  

Detail sub-steps are defined in `DETAIL_STEPS_BY_SERVICE`; main steps in `CUSTOMER_MAIN_STEPS` / `FACILITY_MAIN_STEPS`.
