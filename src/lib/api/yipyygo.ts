import {
  saveYipyyGoForm as _saveForm,
  updateYipyyGoStaffStatus as _updateStaffStatus,
  setYipyyGoManuallyCompleted as _setManuallyCompleted,
  createStubYipyyGoFormManuallyCompleted as _createStub,
} from "@/data/yipyygo-forms";
import { saveYipyyGoConfig as _saveConfig } from "@/data/yipyygo-config";
import type { YipyyGoFormData, YipyyGoConfig } from "@/types/yipyygo";

export const yipyyGoMutations = {
  saveForm: (formData: YipyyGoFormData) => ({
    mutationFn: async () => _saveForm(formData),
  }),
  updateStaffStatus: (
    bookingId: number | string,
    update: {
      staffStatus: "approved" | "needs_review" | "corrections_requested";
      reviewedBy?: number;
      requestChangesMessage?: string;
      internalEditReason?: string;
    },
  ) => ({
    mutationFn: async () => _updateStaffStatus(bookingId, update),
  }),
  setManuallyCompleted: (bookingId: number | string, completedBy: number) => ({
    mutationFn: async () => _setManuallyCompleted(bookingId, completedBy),
  }),
  createStubManuallyCompleted: (params: {
    bookingId: number | string;
    facilityId: number;
    completedBy: number;
    clientId?: number;
    petId?: number;
    petName?: string;
  }) => ({
    mutationFn: async () => _createStub(params),
  }),
  saveConfig: (config: YipyyGoConfig) => ({
    mutationFn: async () => _saveConfig(config),
  }),
};
