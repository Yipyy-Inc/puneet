import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
}

export function EvaluationModal({ isOpen, onClose, bookingId }: EvaluationModalProps) {
  const [evaluator, setEvaluator] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [room, setRoom] = useState("");

  const handleSave = () => {
    // TODO: call API to save evaluation
    console.log({ bookingId, evaluator, dateTime, room, status: "pending" });
    onClose();
  };

  return (
    <Modal
      type="form"
      title="Add Evaluation"
      open={isOpen}
      onOpenChange={onClose}
      size="md"
    >
      <div className="p-6 space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium mb-1">Assign Evaluator</label>
          <Select value={evaluator} onValueChange={setEvaluator}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff1">Staff 1</SelectItem>
              <SelectItem value="staff2">Staff 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date & Time</label>
          <Input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Room / Lodging</label>
          <Input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
``
